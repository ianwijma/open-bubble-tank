/**
 * swf-symbols.mjs — full symbol inventory + vector→SVG extraction for SWFs.
 *
 * Companion to swf.mjs (reuses its primitives). Parses every definition tag
 * into structured data and, for vector shapes/morphshapes, generates SVG:
 *
 *   - DefineShape 1-4  → SVG (solid fills, linear/radial/focal gradients,
 *                        bitmap fills via extracted bitmaps, strokes)
 *   - DefineMorphShape 1-2 → paired geometry/styles for ratio-driven SVG rendering
 *   - DefineSprite     → placement graph (child ids, depths, matrices, names,
 *                        frames, sound starts) + nested tag census
 *   - DefineText/2     → glyph runs decoded to real strings (via font code tables)
 *   - DefineEditText   → initial text, font, size, color, flags
 *   - DefineFont2/3    → name, glyph count, code table (character coverage)
 *   - DefineFontName   → font name + copyright
 *   - DefineButton1/2  → state → character map
 *   - DefineBinaryData, DefineVideoStream → inventory rows
 *
 * Bit-level layouts were cross-checked against JPEXS FFDec's parser
 * (SWFInputStream.java et al., v26.4.0) — the same tool that produced the
 * ground-truth export in re/bt3/export/. Key facts locked down empirically
 * against this file: style counts are byte-aligned UI8 (0xFF→UI16), MATRIX
 * translate uses a 5-bit size prefix, edge numBits is stored n and read n+2,
 * and gradient space is ±819.2px (linear) / r=819.2px (radial) with the raw
 * SWF matrix scale and translate/20.
 */
import { u16, u32, iterTags, TAG_NAMES, readHeader } from './swf.mjs';

// ---------------------------------------------------------------------------
// Bit reader with aligned byte access
// ---------------------------------------------------------------------------

class BR {
  constructor(u8, bitPos = 0) {
    this.u8 = u8;
    this.p = bitPos;
  }
  ub(n) {
    let v = 0;
    for (let i = 0; i < n; i++) {
      const idx = this.p >> 3;
      // reads past the body yield zero bits (position still advances → loops terminate)
      const bit = idx < this.u8.length ? (this.u8[idx] >> (7 - (this.p & 7))) & 1 : 0;
      v = (v << 1) | bit;
      this.p++;
    }
    return v;
  }
  sb(n) {
    const v = this.ub(n);
    return n && v & (1 << (n - 1)) ? v - (1 << n) : v;
  }
  fb(n) {
    return this.sb(n) / 65536;
  } // 16.16 fixed point
  align() {
    this.p = (this.p + 7) & ~7;
  }
  bytes(n) {
    // aligned little-endian read of n bytes (always returns a number)
    this.align();
    const s = this.p >> 3;
    if (s + n > this.u8.length) throw new Error('read past end of tag body');
    this.p += n * 8;
    const u8 = this.u8;
    if (n === 1) return u8[s];
    if (n === 2) return u8[s] | (u8[s + 1] << 8);
    if (n === 4) return (u8[s] | (u8[s + 1] << 8) | (u8[s + 2] << 16) | (u8[s + 3] << 24)) >>> 0;
    return u8.slice(s, s + n);
  }
  string() {
    // null-terminated (aligned)
    this.align();
    let s = this.p >> 3;
    let e = s;
    while (e < this.u8.length && this.u8[e] !== 0) e++;
    this.p = (e + 1) << 3;
    return new TextDecoder('utf-8').decode(this.u8.subarray(s, e));
  }
  netString() {
    const len = this.bytes(1);
    return new TextDecoder('utf-8').decode(this.bytes(len));
  }
}

const rect = (br) => {
  const n = br.ub(5);
  const r = { xMin: br.sb(n), xMax: br.sb(n), yMin: br.sb(n), yMax: br.sb(n) };
  br.align();
  return r;
};
const matrix = (br) => {
  const m = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
  if (br.ub(1)) {
    const n = br.ub(5);
    m.a = br.fb(n);
    m.d = br.fb(n);
  }
  if (br.ub(1)) {
    const n = br.ub(5);
    m.b = br.fb(n); // RotateSkew0 = SVG b / y shear.
    m.c = br.fb(n); // RotateSkew1 = SVG c / x shear.
  }
  const n = br.ub(5);
  m.tx = br.sb(n);
  m.ty = br.sb(n);
  br.align();
  return m;
};
const rgba = (br, n) => {
  const c = [];
  for (let i = 0; i < n; i++) c.push(br.ub(8));
  return c;
}; // [r,g,b(,a)]
const fixed8 = (br) => {
  const n = br.bytes(2);
  return (n & 0x8000 ? n - 0x10000 : n) / 256;
};

// ---------------------------------------------------------------------------
// Fill & line styles
// ---------------------------------------------------------------------------

function readFillStyle(br, shapeNum, morph = false) {
  const type = br.bytes(1);
  /** @type {{type: number, [key: string]: any}} */
  const st = { type };
  if (type === 0x00) {
    st.kind = 'solid';
    if (morph) {
      st.start = rgba(br, 4);
      st.end = rgba(br, 4);
    } else st.color = rgba(br, shapeNum >= 3 ? 4 : 3);
  } else if (type === 0x10 || type === 0x12 || type === 0x13) {
    st.kind = type === 0x10 ? 'linear' : type === 0x13 ? 'focal' : 'radial';
    st.matrix = matrix(br);
    if (morph) {
      br.align(); // morph writers byte-align each matrix (verified: both matrices identical 7-byte blocks)
      st.endMatrix = matrix(br);
      br.align(); // the MORPHGRADIENT that follows is byte-aligned
      st.spreadMode = br.ub(2);
      br.ub(2); // spread, interpolation
      const n = br.ub(4);
      st.stops = [];
      for (let i = 0; i < n; i++) {
        const startRatio = br.ub(8);
        const start = rgba(br, 4);
        const endRatio = br.ub(8);
        const end = rgba(br, 4);
        st.stops.push({ ratio: startRatio, endRatio, start, end });
      }
      if (type === 0x13) {
        st.focal = fixed8(br);
        st.endFocal = fixed8(br);
      } // start/end focal
    } else {
      br.align(); // the GRADIENT structure that follows is byte-aligned (spec)
      st.spreadMode = br.ub(2);
      br.ub(2); // interpolation
      const n = br.ub(4);
      st.stops = [];
      for (let i = 0; i < n; i++)
        st.stops.push({ ratio: br.ub(8), color: rgba(br, shapeNum >= 3 ? 4 : 3) });
      if (type === 0x13) st.focal = fixed8(br);
    }
  } else if (type >= 0x40 && type <= 0x43) {
    st.kind = 'bitmap';
    st.mode = type & 1 ? 'clipped' : 'repeating';
    st.smooth = type < 0x42;
    st.bitmapId = br.bytes(2);
    st.matrix = matrix(br);
    if (morph) {
      br.align();
      st.endMatrix = matrix(br);
      br.align();
    }
  } else throw new Error(`fill style type 0x${type.toString(16)}`);
  return st;
}

function readFillStyleArray(br, shapeNum, morph = false) {
  let n = br.bytes(1);
  if (n === 0xff && (shapeNum > 1 || morph)) n = br.bytes(2); // morph arrays always allow the extended count
  const arr = [];
  for (let i = 0; i < n; i++) arr.push(readFillStyle(br, shapeNum, morph));
  return arr;
}

function readLineStyleArray(br, shapeNum, morph = false) {
  let n = br.bytes(1);
  if (n === 0xff) n = br.bytes(2);
  const arr = [];
  for (let i = 0; i < n; i++) {
    const ls = {};
    if (morph) {
      ls.startWidth = br.bytes(2);
      ls.endWidth = br.bytes(2);
      if (shapeNum >= 4) {
        // MORPHLINESTYLE2: caps block comes BEFORE the colors (verified vs FFDec)
        ls.startCap = br.ub(2);
        ls.join = br.ub(2);
        const hasFill = br.ub(1);
        ls.noHScale = br.ub(1);
        ls.noVScale = br.ub(1);
        ls.pixelHinting = br.ub(1);
        br.ub(5);
        ls.noClose = br.ub(1);
        ls.endCap = br.ub(2);
        if (ls.join === 2) {
          ls.miterLimit = br.bytes(2) / 256;
        }
        if (hasFill) ls.fill = readFillStyle(br, shapeNum, true);
        else {
          ls.start = rgba(br, 4);
          ls.end = rgba(br, 4);
        }
      } else {
        ls.start = rgba(br, 4);
        ls.end = rgba(br, 4);
      }
    } else if (shapeNum <= 3) {
      ls.width = br.bytes(2);
      ls.color = rgba(br, shapeNum >= 3 ? 4 : 3);
    } else {
      // LINESTYLE2 (DefineShape4)
      ls.width = br.bytes(2);
      ls.startCap = br.ub(2);
      ls.join = br.ub(2);
      const hasFill = br.ub(1);
      ls.noHScale = br.ub(1);
      ls.noVScale = br.ub(1);
      ls.pixelHinting = br.ub(1);
      br.ub(5);
      ls.noClose = br.ub(1);
      ls.endCap = br.ub(2);
      if (ls.join === 2) ls.miterLimit = br.bytes(2) / 256;
      if (hasFill) ls.fill = readFillStyle(br, shapeNum);
      else ls.color = rgba(br, 4);
    }
    arr.push(ls);
  }
  return arr;
}

// ---------------------------------------------------------------------------
// Shape records → style-attributed edge runs
// ---------------------------------------------------------------------------

function parseShapeRecords(br, { withStyles, shapeNum, morph }) {
  let fills = [],
    lines = [],
    numFillBits = 0,
    numLineBits = 0;
  if (withStyles) {
    fills = readFillStyleArray(br, shapeNum, morph);
    lines = readLineStyleArray(br, shapeNum, morph);
  }
  // the record stream ALWAYS begins with the two bit-width fields (morphs included)
  numFillBits = br.ub(4);
  numLineBits = br.ub(4);
  let f0 = 0,
    f1 = 0,
    line = 0;
  let fillOffset = 0,
    lineOffset = 0,
    layer = 0;
  let cx = 0,
    cy = 0;
  let cur = null;
  const runs = [];
  const flush = () => {
    if (cur && cur.ops.length) runs.push(cur);
    cur = null;
  };
  const ensure = () => {
    if (!cur) cur = { f0, f1, line, layer, ops: [], start: [cx, cy] };
    return cur;
  };

  for (;;) {
    if (!(br.p < br.u8.length * 8)) throw new Error('unexpected end of shape records'); // also catches NaN positions
    const type = br.ub(1);
    if (type === 1) {
      // edge
      // A run begins at the pen BEFORE its first edge, not at the endpoint.
      // Capturing it after cx/cy advance cut wedges out of circles and glyphs.
      const run = ensure();
      const straight = br.ub(1);
      if (straight) {
        const n = br.ub(4) + 2;
        const general = br.ub(1);
        let dx = 0,
          dy = 0;
        if (general) {
          dx = br.sb(n);
          dy = br.sb(n);
        } else if (br.ub(1)) {
          dy = br.sb(n);
        } // vertical
        else {
          dx = br.sb(n);
        } // horizontal
        cx += dx;
        cy += dy;
        run.ops.push(['L', cx, cy]);
      } else {
        const n = br.ub(4) + 2;
        const cX = br.sb(n),
          cY = br.sb(n),
          aX = br.sb(n),
          aY = br.sb(n);
        cx += cX;
        cy += cY;
        const qx = cx,
          qy = cy;
        cx += aX;
        cy += aY;
        run.ops.push(['Q', qx, qy, cx, cy]);
      }
    } else {
      // style change or end
      const sNew = br.ub(1); // read in morphs too (bit exists; arrays are invalid there)
      const sLine = br.ub(1),
        sF1 = br.ub(1),
        sF0 = br.ub(1),
        sMove = br.ub(1);
      if (!sNew && !sLine && !sF1 && !sF0 && !sMove) break; // EndShapeRecord
      if (sMove) {
        const mb = br.ub(5);
        cx = br.sb(mb);
        cy = br.sb(mb);
      }
      if (sF0) {
        const index = br.ub(numFillBits);
        f0 = index ? index + fillOffset : 0;
      }
      if (sF1) {
        const index = br.ub(numFillBits);
        f1 = index ? index + fillOffset : 0;
      }
      if (sLine) {
        const index = br.ub(numLineBits);
        line = index ? index + lineOffset : 0;
      }
      if (sNew) {
        if (morph) throw new Error('new styles inside morph records');
        flush();
        br.align();
        // StateNewStyles introduces a new drawing layer and local index base;
        // earlier edges must retain their own style tables.
        fillOffset = fills.length;
        lineOffset = lines.length;
        layer++;
        fills.push(...readFillStyleArray(br, shapeNum, false));
        lines.push(...readLineStyleArray(br, shapeNum, false));
        numFillBits = br.ub(4);
        numLineBits = br.ub(4);
      } else {
        flush();
      }
    }
  }
  flush();
  br.align();
  return { fills, lines, numFillBits, numLineBits, runs, leftoverBits: br.u8.length * 8 - br.p };
}

// ---------------------------------------------------------------------------
// SVG generation
// ---------------------------------------------------------------------------

const px = (t) => Math.round((t / 20) * 100) / 100;
const fmt = (n) => {
  const s = (Math.round(n * 100) / 100).toString();
  return s;
};
const matrixNumber = (n) => String(Math.round(n * 1e8) / 1e8);
const hex = (c) =>
  '#' +
  c
    .slice(0, 3)
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
const alphaOf = (c) => (c.length === 4 ? c[3] : 255);

function opsToPath(run, x0, y0) {
  const ops = run.ops;
  if (!ops.length) return '';
  let d = `M${fmt(px(run.start[0]) - x0)} ${fmt(px(run.start[1]) - y0)}`;
  for (const op of ops) {
    if (op[0] === 'L') d += ` L${fmt(px(op[1]) - x0)} ${fmt(px(op[2]) - y0)}`;
    else if (op[0] === 'Q')
      d += ` Q${fmt(px(op[1]) - x0)} ${fmt(px(op[2]) - y0)} ${fmt(px(op[3]) - x0)} ${fmt(px(op[4]) - y0)}`;
  }
  return d;
}

/** Reverse fill-left runs so adjacent same-style fragments can form closed contours. */
function reverseRun(run) {
  const starts = [
    run.start,
    ...run.ops.map((op) => (op[0] === 'L' ? [op[1], op[2]] : [op[3], op[4]])),
  ];
  return {
    ...run,
    start: starts.at(-1),
    ops: run.ops
      .map((op, i) => (op[0] === 'L' ? ['L', ...starts[i]] : ['Q', op[1], op[2], ...starts[i]]))
      .reverse(),
  };
}
function fillPath(runs, x0, y0) {
  const key = (point) => `${point[0]},${point[1]}`;
  const pending = new Map();
  for (const run of runs) {
    const start = key(run.start);
    if (!pending.has(start)) pending.set(start, []);
    pending.get(start).push(run);
  }
  const take = (start) => {
    const bucket = pending.get(start);
    const run = bucket?.shift();
    if (!bucket?.length) pending.delete(start);
    return run;
  };
  const paths = [];
  while (pending.size) {
    const run = take(pending.keys().next().value);
    const chain = { ...run, ops: [...run.ops] };
    for (;;) {
      const op = chain.ops.at(-1);
      const end = op[0] === 'L' ? [op[1], op[2]] : [op[3], op[4]];
      if (key(end) === key(chain.start)) break;
      const next = take(key(end));
      if (!next) break;
      chain.ops.push(...next.ops);
    }
    paths.push(opsToPath(chain, x0, y0) + ' Z');
  }
  return paths.join(' ');
}

/** A stop's color for the rendered state (morph: start colors). */
const stopColor = (s, morph) => (morph ? (s.start ?? [0, 0, 0, 255]) : (s.color ?? [0, 0, 0, 255]));

function gradientDef(st, id, x0, y0, morph) {
  const stops = st.stops
    .map((s) => {
      const c = stopColor(s, morph);
      const a = alphaOf(c);
      return `<stop offset="${fmt(s.ratio / 255)}" stop-color="${hex(c)}"${a !== 255 ? ` stop-opacity="${fmt(a / 255)}"` : ''}/>`;
    })
    .join('');
  const m = st.matrix;
  // FFDec convention (verified against its SVG export): raw SWF matrix scale,
  // translate/20, gradient space ±819.2px (linear) / r=819.2px (radial).
  const tr = `matrix(${matrixNumber(m.a)} ${matrixNumber(m.b)} ${matrixNumber(m.c)} ${matrixNumber(m.d)} ${fmt(px(m.tx) - x0)} ${fmt(px(m.ty) - y0)})`;
  const spread = { 0: 'pad', 1: 'reflect', 2: 'repeat' }[st.spreadMode ?? 0] ?? 'pad';
  const sp = spread !== 'pad' ? ` spreadMethod="${spread}"` : '';
  if (st.kind === 'linear') {
    return `<linearGradient id="${id}" x1="-819.2" y1="0" x2="819.2" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="${tr}"${sp}>${stops}</linearGradient>`;
  }
  const focal = st.kind === 'focal' && st.focal ? ` fx="${fmt(st.focal * 819.2)}" fy="0"` : '';
  return `<radialGradient id="${id}" r="819.2" cx="0" cy="0" gradientUnits="userSpaceOnUse" gradientTransform="${tr}"${sp}${focal}>${stops}</radialGradient>`;
}

/**
 * Build an SVG string from a parsed shape (fills/lines/runs + bounds).
 * bitmapByCid: Map characterId -> {dataUrl, width, height} for bitmap fills.
 */
export function shapeToSVG(shape, bitmapByCid, { morph = false, usesFillWinding = false } = {}) {
  const { bounds, fills, lines, runs } = shape;
  const x0 = px(bounds.xMin),
    y0 = px(bounds.yMin);
  const w = px(bounds.xMax - bounds.xMin),
    h = px(bounds.yMax - bounds.yMin);
  const defs = [];
  const bodies = [];
  const rule = usesFillWinding ? 'nonzero' : 'evenodd';

  let seq = 0;
  for (const layer of [...new Set(runs.map((run) => run.layer ?? 0))]) {
    const fillBuckets = new Map();
    const strokeBuckets = new Map();
    for (const run of runs.filter((run) => (run.layer ?? 0) === layer)) {
      if (run.f0 !== run.f1) {
        if (run.f0 > 0) {
          if (!fillBuckets.has(run.f0)) fillBuckets.set(run.f0, []);
          fillBuckets.get(run.f0).push(reverseRun(run));
        }
        if (run.f1 > 0) {
          if (!fillBuckets.has(run.f1)) fillBuckets.set(run.f1, []);
          fillBuckets.get(run.f1).push(run);
        }
      }
      if (run.line > 0) {
        if (!strokeBuckets.has(run.line)) strokeBuckets.set(run.line, []);
        strokeBuckets.get(run.line).push(opsToPath(run, x0, y0));
      }
    }
    for (const idx of [...fillBuckets.keys()].sort((a, b) => a - b)) {
      const st = fills[idx - 1];
      if (!st) continue;
      const d = fillPath(fillBuckets.get(idx), x0, y0);
      if (st.kind === 'solid') {
        const c = morph ? st.start : st.color;
        const a = alphaOf(c);
        bodies.push(
          `<path d="${d}" fill="${hex(c)}"${a !== 255 ? ` fill-opacity="${fmt(a / 255)}"` : ''} fill-rule="${rule}" stroke="none"/>`,
        );
      } else if (st.kind === 'bitmap') {
        const bmp = bitmapByCid?.get(st.bitmapId);
        const clipId = `c${shape.id}_${++seq}`;
        const m = st.matrix;
        const tr = `matrix(${matrixNumber(m.a / 20)} ${matrixNumber(m.b / 20)} ${matrixNumber(m.c / 20)} ${matrixNumber(m.d / 20)} ${fmt(px(m.tx) - x0)} ${fmt(px(m.ty) - y0)})`;
        defs.push(`<clipPath id="${clipId}"><path d="${d}" clip-rule="${rule}"/></clipPath>`);
        if (bmp?.dataUrl) {
          bodies.push(
            `<g clip-path="url(#${clipId})"><image width="${bmp.width}" height="${bmp.height}" preserveAspectRatio="none" transform="${tr}" xlink:href="${bmp.dataUrl}"/></g>`,
          );
        } else {
          bodies.push(
            `<path d="${d}" fill="#808080" fill-rule="${rule}" stroke="none"/><!-- bitmap ${st.bitmapId} unavailable -->`,
          );
        }
      } else {
        // linear / radial / focal gradient
        const gid = `g${shape.id}_${idx}`;
        defs.push(gradientDef(st, gid, x0, y0, morph));
        bodies.push(`<path d="${d}" fill="url(#${gid})" fill-rule="${rule}" stroke="none"/>`);
      }
    }

    for (const idx of [...strokeBuckets.keys()].sort((a, b) => a - b)) {
      const ls = lines[idx - 1];
      if (!ls) continue;
      const d = strokeBuckets.get(idx).join(' ');
      const width = fmt(px(ls.width ?? ls.startWidth ?? 0));
      const capCss = { 0: 'round', 1: 'butt', 2: 'square' }[ls.startCap ?? 0] ?? 'round';
      const joinCss = { 0: 'round', 1: 'bevel', 2: 'miter' }[ls.join ?? 0] ?? 'round';
      const common = `stroke-width="${width}" stroke-linecap="${capCss}" stroke-linejoin="${joinCss}"`;
      if (ls.fill) {
        if (ls.fill.kind === 'solid') {
          const c = morph ? ls.fill.start : ls.fill.color;
          const a = alphaOf(c);
          bodies.push(
            `<path d="${d}" fill="none" stroke="${hex(c)}"${a !== 255 ? ` stroke-opacity="${fmt(a / 255)}"` : ''} ${common}/>`,
          );
        } else {
          const gid = `g${shape.id}_s${idx}`;
          defs.push(gradientDef(ls.fill, gid, x0, y0, morph));
          bodies.push(`<path d="${d}" fill="none" stroke="url(#${gid})" ${common}/>`);
        }
      } else {
        const c = ls.color ?? ls.start ?? [0, 0, 0, 255];
        const a = alphaOf(c);
        bodies.push(
          `<path d="${d}" fill="none" stroke="${hex(c)}"${a !== 255 ? ` stroke-opacity="${fmt(a / 255)}"` : ''} ${common}/>`,
        );
      }
    }
  }

  const defsXml = defs.length ? `<defs>${defs.join('')}</defs>` : '';
  // Paths and gradient transforms above are normalized by x0/y0.
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${fmt(w)}px" height="${fmt(h)}px" viewBox="0 0 ${fmt(w)} ${fmt(h)}">${defsXml}${bodies.join('')}</svg>`;
}

// ---------------------------------------------------------------------------
// Tag parsers
// ---------------------------------------------------------------------------

export function parseShapeTag(body, tagCode) {
  const br = new BR(body);
  const id = br.bytes(2);
  const bounds = rect(br);
  let edgeBounds = null,
    usesFillWinding = false;
  if (tagCode === 83) {
    edgeBounds = rect(br);
    br.ub(5); // reserved
    usesFillWinding = !!br.ub(1);
    br.ub(1); // usesNonScalingStrokes
    br.ub(1); // usesScalingStrokes
  }
  const shapeNum = tagCode === 2 ? 1 : tagCode === 22 ? 2 : tagCode === 32 ? 3 : 4;
  const sh = parseShapeRecords(br, { withStyles: true, shapeNum, morph: false });
  return { id, tagCode, bounds, edgeBounds, usesFillWinding, ...sh };
}

export function parseMorphShapeTag(body, tagCode) {
  const br = new BR(body);
  const id = br.bytes(2);
  const startBounds = rect(br),
    endBounds = rect(br);
  let isMorph2 = tagCode === 84;
  if (isMorph2) {
    var startEdgeBounds = rect(br),
      endEdgeBounds = rect(br);
    br.ub(6);
    br.ub(1);
    br.ub(1); // reserved, usesNonScalingStrokes, usesScalingStrokes
  }
  const offset = br.bytes(4);
  const afterOffset = br.p >> 3; // endEdges live at afterOffset + offset (bytes)
  const fills = readFillStyleArray(br, 1, true);
  const lines = readLineStyleArray(br, tagCode === 84 ? 4 : 1, true);
  const start = parseShapeRecords(br, { withStyles: false, shapeNum: 1, morph: true });
  br.p = (afterOffset + offset) * 8; // seek to endEdges per the offset field
  const end = parseShapeRecords(br, { withStyles: false, shapeNum: 1, morph: true });
  return {
    id,
    tagCode,
    startBounds,
    endBounds,
    startEdgeBounds,
    endEdgeBounds,
    ...start,
    fills,
    lines,
    endRuns: end.runs,
  };
}

/** Resolve one SWF morph ratio, preserving start-edge styles even when end runs differ. */
export function morphShapeAtRatio(morph, ratio = 0) {
  const t = Math.max(0, Math.min(65535, ratio)) / 65535;
  const mix = (a, b) => a + (b - a) * t;
  const point = (a, b) => a.map((value, i) => Math.round(mix(value, b[i])));
  const color = (a, b) => point(a, b);
  const transform = (a, b = a) =>
    Object.fromEntries(Object.keys(a).map((key) => [key, mix(a[key], b[key])]));
  const fill = (style) => {
    if (style.kind === 'solid') return { ...style, color: color(style.start, style.end) };
    const result = { ...style, matrix: transform(style.matrix, style.endMatrix) };
    if (style.stops)
      result.stops = style.stops.map((stop) => ({
        ratio: mix(stop.ratio, stop.endRatio ?? stop.ratio),
        color: color(stop.start, stop.end),
      }));
    if (style.kind === 'focal')
      result.focal = mix(style.focal ?? 0, style.endFocal ?? style.focal ?? 0);
    return result;
  };
  const edges = (runs) =>
    runs.flatMap((run) => {
      let start = run.start;
      return run.ops.map((op) => {
        const end = op[0] === 'L' ? op.slice(1) : op.slice(3);
        const control =
          op[0] === 'Q' ? op.slice(1, 3) : [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
        const edge = { start, end, control, curved: op[0] === 'Q' };
        start = end;
        return edge;
      });
    });
  const start = edges(morph.runs),
    end = edges(morph.endRuns);
  if (start.length !== end.length) throw new Error(`Morph ${morph.id} has unmatched edge counts`);
  let index = 0;
  const runs = morph.runs.map((run) => {
    const first = index;
    const ops = run.ops.map(() => {
      const a = start[index],
        b = end[index++];
      const destination = point(a.end, b.end);
      return a.curved || b.curved
        ? ['Q', ...point(a.control, b.control), ...destination]
        : ['L', ...destination];
    });
    return { ...run, start: point(start[first].start, end[first].start), ops };
  });
  return {
    id: morph.id,
    bounds: Object.fromEntries(
      Object.keys(morph.startBounds).map((key) => [
        key,
        Math.round(mix(morph.startBounds[key], morph.endBounds[key])),
      ]),
    ),
    fills: morph.fills.map(fill),
    lines: morph.lines.map((line) => ({
      ...line,
      width: mix(line.startWidth, line.endWidth),
      ...(line.fill ? { fill: fill(line.fill) } : { color: color(line.start, line.end) }),
    })),
    runs,
  };
}

export function parseSpriteTag(body) {
  const br = new BR(body);
  const id = br.bytes(2);
  const frameCount = br.bytes(2);
  const placements = [],
    soundStarts = [],
    childTags = {};
  let frame = 1;
  for (const t of iterTags(body, 4)) {
    childTags[t.code] = (childTags[t.code] || 0) + 1;
    if (t.code === 1) frame++;
    else if (t.code === 26 || t.code === 70) {
      try {
        const p = parsePlace(t.body, t.code === 70);
        if (p) placements.push({ ...p, frame });
      } catch {
        /* skip */
      }
    } else if (t.code === 28) placements.push({ depth: u16(t.body, 0), remove: true, frame });
    else if (t.code === 5) placements.push({ depth: u16(t.body, 2), remove: true, frame });
    else if (t.code === 15) soundStarts.push({ soundId: u16(t.body, 0), frame });
  }
  return { id, tagCode: 39, frameCount, placements, soundStarts, nestedTags: childTags };
}

function parsePlace(body, isPO3) {
  const br = new BR(body);
  const flags = br.ub(8);
  const hasClipActions = !!(flags & 0x80),
    hasClipDepth = !!(flags & 0x40),
    hasName = !!(flags & 0x20),
    hasRatio = !!(flags & 0x10),
    hasColor = !!(flags & 0x08),
    hasMatrix = !!(flags & 0x04),
    hasChar = !!(flags & 0x02),
    move = !!(flags & 0x01);
  // PlaceObject3 has its second flag byte BEFORE depth.
  const f2 = isPO3 ? br.ub(8) : 0;
  const depth = br.bytes(2);
  const p = { depth, isPO3 };
  if (isPO3) {
    const hasOpaqueBg = !!(f2 & 0x40),
      hasVisible = !!(f2 & 0x20),
      hasImage = !!(f2 & 0x10),
      hasClassName = !!(f2 & 0x08),
      hasCache = !!(f2 & 0x04),
      hasBlend = !!(f2 & 0x02),
      hasFilters = !!(f2 & 0x01);
    if (hasClassName || (hasImage && hasChar)) p.className = br.string();
    if (hasChar) p.charId = br.bytes(2);
    if (hasMatrix) p.matrix = matrix(br);
    if (hasColor) p.color = readCxFormWithAlpha(br);
    if (hasRatio) p.ratio = br.bytes(2);
    if (hasName) p.name = br.string();
    if (hasClipDepth) p.clipDepth = br.bytes(2);
    if (hasFilters) p.filters = readFilterList(br);
    if (hasBlend) p.blendMode = br.bytes(1);
    if (hasCache) p.cacheAsBitmap = br.bytes(1);
    if (hasOpaqueBg) br.bytes(4); // SWF11+ — not expected in v10
    if (hasVisible) {
      br.bytes(1);
      br.bytes(1);
    } // SWF11+
    if (hasClipActions) skipClipActions(br);
    return p;
  }
  if (hasChar) p.charId = br.bytes(2);
  if (hasMatrix) p.matrix = matrix(br);
  if (hasColor) p.color = readCxFormWithAlpha(br);
  if (hasRatio) p.ratio = br.bytes(2);
  if (hasName) p.name = br.string();
  if (hasClipDepth) p.clipDepth = br.bytes(2);
  if (hasClipActions) skipClipActions(br);
  return p;
}

function readCxFormWithAlpha(br) {
  const hasAdd = br.ub(1),
    hasMult = br.ub(1);
  const n = br.ub(4);
  const mult = [1, 1, 1, 1],
    add = [0, 0, 0, 0];
  if (hasMult) for (let i = 0; i < 4; i++) mult[i] = br.sb(n) / 256;
  if (hasAdd) for (let i = 0; i < 4; i++) add[i] = br.sb(n);
  br.align();
  return { mult, add };
}

function skipFilterList(br) {
  const n = br.bytes(1);
  for (let i = 0; i < n; i++) skipFilter(br);
}
/** Retain glow metadata; other filter records remain safely consumed. */
function readFilterList(br) {
  const count = br.bytes(1),
    filters = [];
  for (let i = 0; i < count; i++) {
    const id = br.bytes(1);
    if (id !== 2) {
      skipFilter(br, id);
      continue;
    }
    const color = Array.from({ length: 4 }, () => br.bytes(1)),
      blurX = (br.bytes(4) | 0) / 65536,
      blurY = (br.bytes(4) | 0) / 65536,
      strength = br.bytes(2) / 256,
      flags = br.bytes(1);
    filters.push({
      kind: 'glow',
      color,
      blurX,
      blurY,
      strength,
      inner: !!(flags & 0x80),
      knockout: !!(flags & 0x40),
      compositeSource: !!(flags & 0x20),
      passes: flags & 0x1f,
    });
  }
  return filters;
}
function skipFilter(br, id = br.bytes(1)) {
  const B = (n) => {
    br.p += n * 8;
  };
  switch (id) {
    case 0:
      B(4 + 4 + 4 + 4 + 4 + 2 + 1);
      break; // drop shadow
    case 1:
      B(4 + 4 + 1);
      break; // blur
    case 2:
      B(4 + 4 + 4 + 2 + 1);
      break; // glow
    case 3:
      B(4 + 4 + 4 + 4 + 4 + 4 + 2 + 1);
      break; // bevel
    case 4:
    case 7: {
      // gradient glow / bevel
      const n = br.bytes(1);
      B(n * 5);
      B(4 * 4 + 2 + 1);
      break;
    }
    case 5: {
      // convolution
      const w = br.bytes(1),
        h = br.bytes(1);
      B(8 + 4 * w * h + 4 + 1);
      break;
    }
    case 6:
      B(20 * 4);
      break; // color matrix
    default:
      throw new Error(`unknown filter id ${id}`);
  }
}
function skipClipActions(br) {
  br.bytes(2); // reserved
  br.bytes(4); // allEventFlags (SWF6+)
  for (;;) {
    if (!(br.p < br.u8.length * 8)) throw new Error('unterminated clip actions');
    const flags = br.bytes(4);
    if (flags === 0) break;
    if (flags & 0x0800) br.bytes(1); // keyPressed → keyCode
    skipActionRecords(br);
  }
}
function skipActionRecords(br) {
  for (;;) {
    if (!(br.p < br.u8.length * 8)) throw new Error('unterminated action records');
    const op = br.bytes(1);
    if (op === 0) break;
    if (op >= 0x80) {
      const len = br.bytes(2);
      br.p += len * 8;
    }
  }
}

export function parseEditTextTag(body) {
  const br = new BR(body);
  const id = br.bytes(2);
  const bounds = rect(br);
  const [
    hasText,
    wordWrap,
    multiline,
    password,
    readOnly,
    hasTextColor,
    hasMaxLength,
    hasFont,
    hasFontClass,
    autoSize,
    hasLayout,
    noSelect,
    border,
    wasStatic,
    html,
    useOutlines,
  ] = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1].map(() => !!br.ub(1));
  const e = {
    id,
    tagCode: 37,
    bounds,
    flags: {
      hasText,
      wordWrap,
      multiline,
      password,
      readOnly,
      hasTextColor,
      hasMaxLength,
      hasFont,
      hasFontClass,
      autoSize,
      hasLayout,
      noSelect,
      border,
      wasStatic,
      html,
      useOutlines,
    },
  };
  if (hasFont) e.fontId = br.bytes(2);
  if (hasFontClass) e.fontClass = br.string();
  if (hasFont || hasFontClass) e.fontHeight = br.bytes(2);
  if (hasTextColor) e.color = rgba(br, 4);
  if (hasMaxLength) e.maxLength = br.bytes(2);
  if (hasLayout) {
    e.align = br.bytes(1);
    e.margins = [br.bytes(2), br.bytes(2), br.bytes(2)];
    e.leading = br.sb(16);
  }
  e.variableName = br.string();
  if (hasText) e.text = br.string();
  return e;
}

export function parseFontTag(body, tagCode) {
  if (tagCode !== 75) return null; // only DefineFont3 ships in this file
  const br = new BR(body);
  const id = br.bytes(2);
  const hasLayout = br.ub(1),
    shiftJIS = br.ub(1),
    smallText = br.ub(1),
    ansi = br.ub(1),
    wideOffsets = br.ub(1),
    wideCodes = br.ub(1),
    italic = br.ub(1),
    bold = br.ub(1);
  br.ub(8); // language code
  const name = br.netString();
  const numGlyphs = br.bytes(2);
  const offsetsStart = br.p >> 3;
  const glyphs = [];
  if (numGlyphs > 0) {
    const offsets = [];
    for (let i = 0; i < numGlyphs; i++) offsets.push(br.bytes(wideOffsets ? 4 : 2));
    const codeTableOffset = br.bytes(wideOffsets ? 4 : 2);
    for (const offset of offsets) {
      const glyphBr = new BR(body, (offsetsStart + offset) * 8);
      const shape = parseShapeRecords(glyphBr, { withStyles: false, shapeNum: 3, morph: false });
      glyphs.push(shape.runs.map((run) => opsToPath(run, 0, 0) + 'Z').join(' '));
    }
    br.p = (offsetsStart + codeTableOffset) * 8; // code table lives after the glyph shapes
  }
  const codeTable = [];
  for (let i = 0; i < numGlyphs; i++) codeTable.push(wideCodes ? br.bytes(2) : br.bytes(1));
  const f = { id, tagCode, name, numGlyphs, codeTable, glyphs, italic, bold, hasLayout, wideCodes };
  if (hasLayout) {
    f.ascent = br.bytes(2);
    f.descent = br.bytes(2);
    f.leading = (br.bytes(2) << 16) >> 16;
    f.advances = [];
    for (let i = 0; i < numGlyphs; i++) f.advances.push((br.bytes(2) << 16) >> 16);
  }
  return f;
}

export function parseFontNameTag(body) {
  const br = new BR(body);
  const id = br.bytes(2);
  br.ub(1);
  br.ub(1);
  br.ub(6); // italic, bold, reserved
  const name = br.string();
  const copyright = br.string();
  return { id, tagCode: 88, name, copyright };
}

export function parseTextTag(body, tagCode) {
  const br = new BR(body);
  const id = br.bytes(2);
  const bounds = rect(br);
  const m = matrix(br);
  // NOTE: verified against FFDec's parse of this file — there is no tag-level
  // glyphCount field; the header is just the two bit-widths.
  const glyphBits = br.bytes(1),
    advanceBits = br.bytes(1);
  const records = [];
  for (;;) {
    if (!(br.p < br.u8.length * 8)) throw new Error('unterminated text records');
    const first = br.ub(1);
    if (first === 0) {
      br.ub(7);
      break;
    } // terminator record (reserved + flag bits)
    br.ub(3); // reserved style flags
    const hasFont = br.ub(1),
      hasColor = br.ub(1),
      hasYOff = br.ub(1),
      hasXOff = br.ub(1);
    const rec = {};
    if (hasFont) rec.fontId = br.bytes(2); // UI16 for both DefineText and DefineText2 (verified)
    if (hasColor) rec.color = rgba(br, tagCode === 33 ? 4 : 3);
    // SI16 offsets are aligned little-endian integers, unlike packed glyph advances.
    if (hasXOff) rec.x = (br.bytes(2) << 16) >> 16;
    if (hasYOff) rec.y = (br.bytes(2) << 16) >> 16;
    if (hasFont) rec.height = br.bytes(2);
    const n = br.bytes(1);
    const glyphs = [];
    for (let i = 0; i < n; i++)
      glyphs.push({ index: br.ub(glyphBits), advance: br.sb(advanceBits) });
    rec.glyphs = glyphs;
    br.align();
    records.push(rec);
    if (records.length > 8192) throw new Error('text record overflow');
  }
  return { id, tagCode, bounds, matrix: m, records };
}

export function parseButtonTag(body, tagCode) {
  const br = new BR(body);
  const id = br.bytes(2);
  const states = [];
  if (tagCode === 7) {
    for (;;) {
      if (!(br.p < br.u8.length * 8)) throw new Error('unterminated button records');
      const flags = br.ub(8); // flag bits continue unaligned after the previous matrix
      if (flags === 0) break;
      states.push({
        states: { hit: !!(flags & 8), down: !!(flags & 4), over: !!(flags & 2), up: !!(flags & 1) },
        charId: br.bytes(2),
        depth: br.bytes(2),
      });
      matrix(br);
    }
    return { id, tagCode, states };
  }
  br.ub(7);
  br.ub(1); // reserved + trackAsMenu
  const actionOffset = br.bytes(2);
  for (;;) {
    if (!(br.p < br.u8.length * 8)) throw new Error('unterminated button records');
    const flags = br.ub(8); // flag bits continue unaligned after the previous matrix
    if (flags === 0) break;
    states.push({
      states: { hit: !!(flags & 8), down: !!(flags & 4), over: !!(flags & 2), up: !!(flags & 1) },
      charId: br.bytes(2),
      depth: br.bytes(2),
    });
    matrix(br);
    br.align(); // the record's color transform is byte-aligned (verified 37/37)
    readCxFormWithAlpha(br); // DefineButton2 records always carry a color transform
    if (flags & 0x10) skipFilterList(br); // buttonHasFilterList
    if (flags & 0x20) br.bytes(1); // buttonHasBlendMode
  }
  return { id, tagCode, states, hasActions: actionOffset > 0 };
}

// ---------------------------------------------------------------------------
// Top-level symbol extraction
// ---------------------------------------------------------------------------

/**
 * Extract the full symbol inventory (and optionally SVG per vector shape)
 * from an already-decompressed SWF image (see decompressSWF in swf.mjs).
 *
 * @param bytes decompressed SWF (normalized FWS image)
 * @param opts {log, images (from extractAssets, for bitmap fills), svg (bool, default true)}
 */
export async function extractSymbols(bytes, { log = () => {}, images = [], svg = true } = {}) {
  const header = readHeader(bytes);
  const bitmaps = new Map();
  if (typeof FileReader !== 'undefined') {
    for (const img of images) {
      if (!img.blob) continue;
      const dataUrl = await new Promise((res) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.readAsDataURL(img.blob);
      });
      bitmaps.set(img.id, { dataUrl, width: img.width, height: img.height });
    }
  }

  const symbols = {
    shapes: [],
    sprites: [],
    morphs: [],
    texts: [],
    editTexts: [],
    fonts: [],
    fontNames: [],
    buttons: [],
    binaryData: [],
    videos: [],
    symbolNames: {},
  };
  const svgByCid = new Map();
  const errors = [];

  for (const tag of iterTags(bytes, header.tagsOffset)) {
    try {
      switch (tag.code) {
        case 2:
        case 22:
        case 32:
        case 83: {
          const sh = parseShapeTag(tag.body, tag.code);
          symbols.shapes.push(sh);
          if (svg)
            svgByCid.set(sh.id, shapeToSVG(sh, bitmaps, { usesFillWinding: sh.usesFillWinding }));
          break;
        }
        case 46:
        case 84: {
          const mo = parseMorphShapeTag(tag.body, tag.code);
          symbols.morphs.push(mo);
          if (svg) svgByCid.set(mo.id, shapeToSVG(morphShapeAtRatio(mo, 0), bitmaps));
          break;
        }
        case 39:
          symbols.sprites.push(parseSpriteTag(tag.body));
          break;
        case 37:
          symbols.editTexts.push(parseEditTextTag(tag.body));
          break;
        case 11:
        case 33:
          symbols.texts.push(parseTextTag(tag.body, tag.code));
          break;
        case 75: {
          const f = parseFontTag(tag.body, 75);
          if (f) symbols.fonts.push(f);
          break;
        }
        case 88:
          symbols.fontNames.push(parseFontNameTag(tag.body));
          break;
        case 34:
        case 7:
          symbols.buttons.push(parseButtonTag(tag.body, tag.code));
          break;
        case 87:
          symbols.binaryData.push({ id: u32(tag.body, 2), bytes: tag.len - 6 });
          break;
        case 60:
          symbols.videos.push({ id: u16(tag.body, 0), frames: u16(tag.body, 6) });
          break;
        case 76: {
          const br = new BR(tag.body);
          const n = br.bytes(2);
          for (let i = 0; i < n; i++) {
            const cid = br.bytes(2);
            symbols.symbolNames[cid] = br.string();
          }
          break;
        }
      }
    } catch (e) {
      errors.push(`${TAG_NAMES[tag.code] ?? tag.code} id=${u16(tag.body, 0)}: ${e.message}`);
    }
  }

  // usage map: which sprite (0 = main timeline) places which character
  const usedBy = new Map();
  const addUse = (cid, user) => {
    if (cid == null) return;
    if (!usedBy.has(cid)) usedBy.set(cid, []);
    usedBy.get(cid).push(user);
  };
  for (const sp of symbols.sprites) for (const p of sp.placements) addUse(p.charId, sp.id);
  for (const tag of iterTags(bytes, header.tagsOffset)) {
    if (tag.code === 26 || tag.code === 70) {
      try {
        const p = parsePlace(tag.body, tag.code === 70);
        addUse(p.charId, 0);
      } catch {
        /* ignore */
      }
    }
  }
  symbols.usedByMap = usedBy;

  // decode static text strings via font code tables
  const fontById = new Map(symbols.fonts.map((f) => [f.id, f]));
  for (const t of symbols.texts) {
    let str = '';
    for (const rec of t.records) {
      const font = fontById.get(rec.fontId);
      for (const g of rec.glyphs ?? []) {
        const code = font?.codeTable?.[g.index];
        str += code ? String.fromCharCode(code) : '?';
      }
    }
    t.string = str || null;
  }

  log(
    `symbol inventory: ${symbols.sprites.length} sprites, ${symbols.shapes.length} shapes, ${symbols.morphs.length} morphs, ${symbols.texts.length} static texts, ${symbols.editTexts.length} edit texts, ${symbols.fonts.length} fonts, ${symbols.buttons.length} buttons`,
  );
  if (errors.length) log(`WARNING: ${errors.length} symbol parse errors (first: ${errors[0]})`);

  return { symbols, svgByCid, errors };
}

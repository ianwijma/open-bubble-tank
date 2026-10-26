/**
 * swf.mjs — zero-dependency SWF (Flash) container parser + asset extractor.
 *
 * Goal: given raw SWF bytes (e.g. a downloaded "Bubble Tanks 3.swf"), extract
 * the embedded raster images and sounds entirely in the browser, with no
 * third-party libraries and no server round-trip:
 *
 *   - CWS (zlib) decompression   -> native DecompressionStream('deflate')
 *   - per-tag bitmap inflation   -> native DecompressionStream('deflate')
 *   - JPEG table stitching       -> pure JS (DefineBits + JPEGTables)
 *   - JPEG3/JPEG4 alpha composite-> canvas 2D -> PNG blob
 *   - lossless bitmaps (20/36)   -> inflate -> ImageData -> PNG blob
 *   - MP3 sounds (DefineSound)   -> Blob('audio/mpeg'), plays in <audio>
 *   - PCM sounds                 -> wrapped into a WAV blob
 *   - store-only ZIP export      -> pure JS (no JSZip needed)
 *
 * Works in browsers and Node >= 18 (DecompressionStream is a global in both;
 * Node falls back to zlib.inflateSync if it is missing).
 *
 * Tag-code reference: Adobe "SWF File Format Specification" (v19).
 */

// ---------------------------------------------------------------------------
// Small primitives
// ---------------------------------------------------------------------------

export const u16 = (b, o) => b[o] | (b[o + 1] << 8);
export const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
export const i16 = (b, o) => {
  const v = u16(b, o);
  return v & 0x8000 ? v - 0x10000 : v;
};

const now = () =>
  typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();

export class BitReader {
  constructor(u8, byteOffset = 0) {
    this.u8 = u8;
    this.pos = byteOffset * 8;
  }
  readUB(n) {
    let v = 0;
    for (let i = 0; i < n; i++) {
      const bit = (this.u8[this.pos >> 3] >> (7 - (this.pos & 7))) & 1;
      v = (v << 1) | bit;
      this.pos++;
    }
    return v;
  }
  readSB(n) {
    const v = this.readUB(n);
    if (n === 0) return 0;
    const sign = 1 << (n - 1);
    return v & sign ? v - (1 << n) : v;
  }
  align() {
    this.pos = (this.pos + 7) & ~7;
  }
}

function readRect(b, offset) {
  const br = new BitReader(b, offset);
  const n = br.readUB(5);
  const xMin = br.readSB(n),
    xMax = br.readSB(n),
    yMin = br.readSB(n),
    yMax = br.readSB(n);
  br.align();
  return { xMin, xMax, yMin, yMax, byteLength: (br.pos >> 3) - offset };
}

// ---------------------------------------------------------------------------
// Container: signature detection + decompression
// ---------------------------------------------------------------------------

export async function inflate(zlibBytes) {
  if (typeof DecompressionStream !== 'undefined') {
    const stream = new Blob([zlibBytes]).stream().pipeThrough(new DecompressionStream('deflate'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  throw new Error('No DecompressionStream available in this runtime');
}

/**
 * Decompress a whole SWF. FWS is stored plain; CWS is zlib from byte 8;
 * ZWS is LZMA and is deliberately unsupported (see research doc).
 *
 * The returned `bytes` is always a normalized, fully-uncompressed SWF image
 * (CWS bodies are re-wrapped with an FWS header), so all downstream parsers
 * can use full-file offsets uniformly. `sig` keeps the ORIGINAL signature.
 */
export async function decompressSWF(raw) {
  const sig = String.fromCharCode(raw[0], raw[1], raw[2]);
  const version = raw[3];
  const declaredLength = u32(raw, 4);
  if (sig === 'FWS')
    return { bytes: raw, sig, version, declaredLength, compression: 'none', ms: 0 };
  if (sig === 'CWS') {
    const t0 = now();
    // The research repository's FFDec "uncompressed.swf" retains a CWS
    // signature over an already-expanded body. Accept only the exact, validated
    // BT3 stage in this case; never silently treat a corrupt compressed file as FWS.
    if (raw.length === declaredLength) {
      const header = readHeader(raw);
      if (header.stageWidthPx === 550 && header.stageHeightPx === 450 && header.frameRate === 50) {
        const bytes = raw.slice();
        bytes[0] = 0x46;
        return { bytes, sig, version, declaredLength, compression: 'expanded CWS', ms: now() - t0 };
      }
    }
    const body = await inflate(raw.subarray(8));
    const bytes = new Uint8Array(8 + body.length);
    bytes[0] = 0x46;
    bytes[1] = 0x57;
    bytes[2] = 0x53;
    bytes[3] = version;
    new DataView(bytes.buffer).setUint32(4, declaredLength, true);
    bytes.set(body, 8);
    return { bytes, sig, version, declaredLength, compression: 'zlib', ms: now() - t0 };
  }
  if (sig === 'ZWS')
    throw new Error('ZWS (LZMA-compressed) SWF is not supported by this extractor');
  throw new Error(`Not a SWF file (signature "${sig}")`);
}

/** Parse the uncompressed header: stage rect, frame rate, frame count. */
export function readHeader(b) {
  const sig = String.fromCharCode(b[0], b[1], b[2]);
  const rect = readRect(b, 8);
  const p = 8 + rect.byteLength;
  const frameRate = (b[p] | (b[p + 1] << 8)) / 256; // 8.8 fixed point
  const frameCount = u16(b, p + 2);
  return {
    sig,
    version: b[3],
    declaredLength: u32(b, 4),
    rect,
    frameRate,
    frameCount,
    stageWidthPx: (rect.xMax - rect.xMin) / 20,
    stageHeightPx: (rect.yMax - rect.yMin) / 20,
    tagsOffset: p + 4,
  };
}

// ---------------------------------------------------------------------------
// Tag walker
// ---------------------------------------------------------------------------

export const TAG_NAMES = {
  0: 'End',
  1: 'ShowFrame',
  2: 'DefineShape',
  4: 'PlaceObject',
  5: 'RemoveObject',
  6: 'DefineBits',
  7: 'DefineButton',
  8: 'JPEGTables',
  9: 'SetBackgroundColor',
  10: 'DefineFont',
  11: 'DefineText',
  12: 'DoAction',
  13: 'DefineFontInfo',
  14: 'DefineSound',
  15: 'StartSound',
  17: 'DefineButtonSound',
  18: 'SoundStreamHead',
  19: 'SoundStreamBlock',
  20: 'DefineBitsLossless',
  21: 'DefineBitsJPEG2',
  22: 'DefineShape2',
  23: 'DefineButtonCxform',
  24: 'Protect',
  26: 'PlaceObject2',
  28: 'RemoveObject2',
  32: 'DefineShape3',
  33: 'DefineText2',
  34: 'DefineButton2',
  35: 'DefineBitsJPEG3',
  36: 'DefineBitsLossless2',
  37: 'DefineEditText',
  39: 'DefineSprite',
  41: 'ProductInfo',
  43: 'FrameLabel',
  45: 'SoundStreamHead2',
  46: 'DefineMorphShape',
  48: 'DefineFont2',
  56: 'ExportAssets',
  57: 'ImportAssets',
  58: 'EnableDebugger',
  59: 'DoInitAction',
  60: 'DefineVideoStream',
  61: 'VideoFrame',
  62: 'DefineFontInfo2',
  64: 'EnableDebugger2',
  65: 'ScriptLimits',
  66: 'SetTabIndex',
  69: 'FileAttributes',
  70: 'PlaceObject3',
  71: 'ImportAssets2',
  72: 'DoABC',
  73: 'DefineFontAlignZones',
  74: 'CSMTextSettings',
  75: 'DefineFont3',
  76: 'SymbolClass',
  77: 'Metadata',
  78: 'DefineScalingGrid',
  82: 'DoABC2',
  83: 'DefineShape4',
  84: 'DefineMorphShape2',
  86: 'DefineSceneAndFrameLabelData',
  87: 'DefineBinaryData',
  88: 'DefineFontName',
  89: 'StartSound2',
  90: 'DefineBitsJPEG4',
  91: 'DefineFont4',
  93: 'EnableTelemetry',
};

/**
 * Iterate tag records. body is a subarray view (copy nothing).
 * deep=true also yields the tags nested inside DefineSprite bodies
 * (counted with depth>0 — definitions themselves live at top level).
 */
export function* iterTags(bytes, start = 0, { deep = false } = {}) {
  const walk = function* (offset, depth) {
    let p = offset,
      i = 0;
    while (p + 2 <= bytes.length) {
      const codeLen = u16(bytes, p);
      const code = codeLen >> 6;
      let len = codeLen & 0x3f;
      p += 2;
      if (len === 0x3f) {
        if (p + 4 > bytes.length) return;
        len = u32(bytes, p);
        p += 4;
      }
      if (p + len > bytes.length) return; // truncated file
      const body = bytes.subarray(p, p + len);
      yield { index: i++, code, len, body, depth };
      if (deep && code === 39 && len >= 4) yield* walk(p + 4, depth + 1); // DefineSprite: id+frameCount+tags
      p += len;
      if (code === 0) return;
    }
  };
  yield* walk(start, 0);
}

// ---------------------------------------------------------------------------
// Bitmap decoders
// ---------------------------------------------------------------------------

/**
 * Rebuild a complete JPEG from a DefineBits fragment + the shared JPEGTables
 * tag. Most files embed a complete JPEG; old encoders split tables out.
 */
export function buildJPEG(tables, data) {
  if (data[0] === 0xff && data[1] === 0xd8) {
    if (data[data.length - 2] === 0xff && data[data.length - 1] === 0xd9) return data;
    const out = new Uint8Array(data.length + 2);
    out.set(data);
    out.set([0xff, 0xd9], data.length);
    return out;
  }
  // Fragment: SOI + tables(minus SOI/EOI) + data(minus stray EOI) + EOI
  let t = tables ?? new Uint8Array(0);
  if (t[0] === 0xff && t[1] === 0xd8) t = t.subarray(2);
  if (t.length >= 2 && t[t.length - 2] === 0xff && t[t.length - 1] === 0xd9)
    t = t.subarray(0, t.length - 2);
  let d = data;
  if (d[0] === 0xff && d[1] === 0xd9) d = d.subarray(2); // old-Flash quirk: leading EOI
  const out = new Uint8Array(2 + t.length + d.length + 2);
  out.set([0xff, 0xd8], 0);
  out.set(t, 2);
  out.set(d, 2 + t.length);
  out.set([0xff, 0xd9], 2 + t.length + d.length);
  return out;
}

const hasCanvas = () =>
  typeof OffscreenCanvas !== 'undefined' ||
  (typeof document !== 'undefined' && typeof document.createElement === 'function');

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

async function canvasToBlob(cv) {
  if (cv.convertToBlob) return cv.convertToBlob({ type: 'image/png' });
  return new Promise((res, rej) =>
    cv.toBlob((b) => (b ? res(b) : rej(new Error('canvas.toBlob failed'))), 'image/png'),
  );
}

async function jpegDims(blob) {
  if (typeof createImageBitmap !== 'function') return { width: 0, height: 0 };
  const bmp = await createImageBitmap(blob);
  const dims = { width: bmp.width, height: bmp.height };
  bmp.close?.();
  return dims;
}

/** Plain JPEG asset (DefineBits with tables / DefineBitsJPEG2). */
export async function imageFromJPEG(jpeg, id, tagName) {
  const blob = new Blob([jpeg], { type: 'image/jpeg' });
  const dims = await jpegDims(blob);
  return {
    id,
    tag: tagName,
    mimeType: 'image/jpeg',
    ext: 'jpg',
    blob,
    ...dims,
    bytes: jpeg.length,
  };
}

/** DefineBitsJPEG3/4: JPEG plus a zlib-compressed alpha map (1 byte per pixel). */
export async function decodeJPEG3(body, tables, hasDebias) {
  const id = u16(body, 0);
  const alphaOffset = u32(body, 2);
  const debias = hasDebias ? 2 : 0;
  const jpeg = buildJPEG(tables, body.subarray(6, 6 + alphaOffset));
  const alphaRaw = body.subarray(6 + alphaOffset + debias);
  if (alphaRaw.length === 0)
    return {
      ...(await imageFromJPEG(jpeg, id, hasDebias ? 'DefineBitsJPEG4' : 'DefineBitsJPEG3')),
      ext: 'jpg',
      mimeType: 'image/jpeg',
    };
  if (!hasCanvas()) throw new Error('canvas unavailable for alpha compositing');
  const alpha = await inflate(alphaRaw);
  const bmp = await createImageBitmap(new Blob([jpeg], { type: 'image/jpeg' }));
  const w = bmp.width,
    h = bmp.height;
  const cv = makeCanvas(w, h);
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0);
  bmp.close?.();
  const img = ctx.getImageData(0, 0, w, h);
  if (alpha.length >= w * h) {
    for (let i = 0; i < w * h; i++) img.data[i * 4 + 3] = alpha[i]; // 8-bit alpha map, 1 byte/px
  }
  ctx.putImageData(img, 0, 0);
  const blob = await canvasToBlob(cv);
  return {
    id,
    tag: hasDebias ? 'DefineBitsJPEG4' : 'DefineBitsJPEG3',
    mimeType: 'image/png',
    ext: 'png',
    blob,
    width: w,
    height: h,
    bytes: blob.size,
  };
}

/** DefineBitsLossless (20) / DefineBitsLossless2 (36). */
export async function decodeLossless(body, hasAlpha) {
  const id = u16(body, 0);
  const fmt = body[2];
  const w = u16(body, 3),
    h = u16(body, 5);
  // colormap format carries an extra colorTableSize byte before the zlib stream
  const data = await inflate(body.subarray(fmt === 3 ? 8 : 7));
  const px = new Uint8ClampedArray(w * h * 4);
  const put = (i, r, g, b, a) => {
    const o = i * 4;
    px[o] = r;
    px[o + 1] = g;
    px[o + 2] = b;
    px[o + 3] = a;
  };

  if (fmt === 3) {
    // colormap — colorTableSize lives in the TAG body (byte 7), palette starts at data[0]
    const nColors = body[7] + 1;
    const entry = hasAlpha ? 4 : 3;
    const idx = nColors * entry;
    const rowBytes = (w + 3) & ~3; // 8bpp rows padded to 32-bit boundary
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = data[idx + y * rowBytes + x] * entry;
        const i = y * w + x;
        if (hasAlpha)
          put(i, data[p], data[p + 1], data[p + 2], data[p + 3]); // RGBA palette
        else put(i, data[p], data[p + 1], data[p + 2], 255);
      }
    }
  } else if (fmt === 4 && !hasAlpha) {
    // 15-bit RGB555 (tag 20 only)
    const rowBytes = (w * 2 + 3) & ~3;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const o = y * rowBytes + x * 2;
        const v = (data[o] << 8) | data[o + 1];
        const r = (v >> 10) & 31,
          g = (v >> 5) & 31,
          b = v & 31;
        put(y * w + x, (r << 3) | (r >> 2), (g << 3) | (g >> 2), (b << 3) | (b >> 2), 255);
      }
    }
  } else if (fmt === 5) {
    // 32-bit
    for (let i = 0; i < w * h; i++) {
      const s = i * 4;
      if (hasAlpha)
        put(i, data[s + 1], data[s + 2], data[s + 3], data[s]); // ARGB
      else put(i, data[s + 1], data[s + 2], data[s + 3], 255); // XRGB (byte0 ignored)
    }
  } else {
    throw new Error(`Unsupported lossless format ${fmt}${hasAlpha ? '' : ' (tag 20)'}`);
  }

  if (!hasCanvas()) throw new Error('canvas unavailable for lossless decode');
  const cv = makeCanvas(w, h);
  const ctx = cv.getContext('2d');
  ctx.putImageData(new ImageData(px, w, h), 0, 0);
  const blob = await canvasToBlob(cv);
  return {
    id,
    tag: hasAlpha ? 'DefineBitsLossless2' : 'DefineBitsLossless',
    mimeType: 'image/png',
    ext: 'png',
    blob,
    width: w,
    height: h,
    bytes: blob.size,
  };
}

// ---------------------------------------------------------------------------
// Sound decoders
// ---------------------------------------------------------------------------

export const SOUND_FORMATS = {
  0: 'uncompressed(LE)',
  1: 'ADPCM',
  2: 'MP3',
  3: 'uncompressed(LE)',
  4: 'Nellymoser16',
  5: 'Nellymoser8',
  6: 'Nellymoser',
  11: 'Speex',
};
const SOUND_RATES = [5512, 11025, 22050, 44100];

function pcmToWav(pcm, sampleRate, bits, channels) {
  const blockAlign = channels * (bits / 8);
  const buf = new ArrayBuffer(44 + pcm.length);
  const dv = new DataView(buf);
  const wstr = (o, s) => {
    for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i));
  };
  wstr(0, 'RIFF');
  dv.setUint32(4, 36 + pcm.length, true);
  wstr(8, 'WAVE');
  wstr(12, 'fmt ');
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, channels, true);
  dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, sampleRate * blockAlign, true);
  dv.setUint16(32, blockAlign, true);
  dv.setUint16(34, bits, true);
  wstr(36, 'data');
  dv.setUint32(40, pcm.length, true);
  new Uint8Array(buf, 44).set(pcm);
  return new Uint8Array(buf);
}

export function parseSound(body) {
  const id = u16(body, 0);
  const flags = body[2];
  const format = (flags >> 4) & 0xf;
  const sampleRate = SOUND_RATES[(flags >> 2) & 3];
  const bits = (flags >> 1) & 1 ? 16 : 8;
  const channels = (flags & 1) + 1;
  const sampleCount = u32(body, 3);
  const s = {
    id,
    format,
    formatName: SOUND_FORMATS[format] ?? `format ${format}`,
    sampleRate,
    bits,
    channels,
    sampleCount,
    tagBytes: body.length,
  };
  let data = body.subarray(7);
  if (format === 2) {
    // MP3: SI16 seek then raw MPEG frames
    s.seek = data.length >= 2 ? i16(data, 0) : 0;
    data = data.subarray(2);
    s.blob = new Blob([data], { type: 'audio/mpeg' });
    s.mimeType = 'audio/mpeg';
    s.ext = 'mp3';
  } else if (format === 0 || format === 3) {
    // uncompressed little-endian PCM
    s.blob = new Blob([pcmToWav(data, sampleRate, bits, channels)], { type: 'audio/wav' });
    s.mimeType = 'audio/wav';
    s.ext = 'wav';
  } else {
    s.unsupported = true; // ADPCM / Nellymoser / Speex: not natively decodable in browsers
  }
  s.bytes = data.length;
  return s;
}

// ---------------------------------------------------------------------------
// SymbolClass (cid -> AS3 class name)
// ---------------------------------------------------------------------------

export function parseSymbolClass(body, map) {
  const n = u16(body, 0);
  let p = 2;
  for (let i = 0; i < n && p < body.length; i++) {
    const cid = u16(body, p);
    p += 2;
    let e = p;
    while (e < body.length && body[e] !== 0) e++;
    map.set(cid, new TextDecoder('ascii').decode(body.subarray(p, e)));
    p = e + 1;
  }
}

// ---------------------------------------------------------------------------
// Store-only ZIP writer (lets the page export everything as one file)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data) {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** files: [{name, data:Uint8Array}] -> Blob (store method, no compression). */
export function makeZipStore(files) {
  const chunks = [],
    central = [];
  let offset = 0;
  const d = new Date();
  const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const f of files) {
    const nameB = new TextEncoder().encode(f.name);
    const crc = crc32(f.data);
    const local = new Uint8Array(30 + nameB.length);
    const dv = new DataView(local.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(10, 0, true);
    dv.setUint16(12, dosTime, true);
    dv.setUint16(14, dosDate, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, f.data.length, true);
    dv.setUint32(22, f.data.length, true);
    dv.setUint16(26, nameB.length, true);
    local.set(nameB, 30);
    chunks.push(local, f.data);
    const cen = new Uint8Array(46 + nameB.length);
    const cdv = new DataView(cen.buffer);
    cdv.setUint32(0, 0x02014b50, true);
    cdv.setUint16(4, 20, true);
    cdv.setUint16(6, 20, true);
    cdv.setUint16(12, dosTime, true);
    cdv.setUint16(14, dosDate, true);
    cdv.setUint32(16, crc, true);
    cdv.setUint32(20, f.data.length, true);
    cdv.setUint32(24, f.data.length, true);
    cdv.setUint16(28, nameB.length, true);
    cdv.setUint32(42, offset, true);
    cen.set(nameB, 46);
    central.push(cen);
    offset += local.length + f.data.length;
  }
  const cdStart = offset;
  let cdSize = 0;
  for (const c of central) cdSize += c.length;
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, cdStart, true);
  return new Blob([...chunks, ...central, eocd], { type: 'application/zip' });
}

// ---------------------------------------------------------------------------
// Top-level extraction
// ---------------------------------------------------------------------------

/**
 * Extract images + sounds from raw SWF bytes.
 * Returns { header, census, counts, images, sounds, streams, video, symbolNames, timing, errors }.
 */
export async function extractAssets(raw, log = () => {}) {
  const timing = {};
  const t0 = now();
  const errors = [];

  const dec = await decompressSWF(raw);
  timing.decompress = now() - t0;
  log(
    `decompressed ${dec.sig} v${dec.version}: ${raw.length} -> ${dec.bytes.length} bytes in ${timing.decompress.toFixed(0)} ms`,
  );

  const header = {
    ...readHeader(dec.bytes),
    compression: dec.compression,
    sourceBytes: raw.length,
  };
  if (header.declaredLength && header.declaredLength !== dec.bytes.length) {
    log(`note: declared length ${header.declaredLength} != actual ${dec.bytes.length}`);
  }

  // Pass 1 — deep census (sync, cheap). Definitions live at top level;
  // nested counts come from inside DefineSprite timelines.
  const census = new Map(); // code -> {top, nested}
  const tC0 = now();
  for (const tag of iterTags(dec.bytes, header.tagsOffset, { deep: true })) {
    const e = census.get(tag.code) ?? { top: 0, nested: 0 };
    if (tag.depth === 0) e.top++;
    else e.nested++;
    census.set(tag.code, e);
  }
  timing.census = now() - tC0;

  // Pass 2 — top-level extraction (async decodes).
  const images = [],
    sounds = [],
    abc = [],
    binaryData = [];
  const symbolNames = new Map();
  const streams = { heads: 0, blocks: 0 };
  const video = { streams: 0, frames: 0 };
  let jpegTables = null;
  const pendingBits = [];

  const tP0 = now();
  for (const tag of iterTags(dec.bytes, header.tagsOffset)) {
    switch (tag.code) {
      case 8:
        jpegTables = tag.body;
        break;
      case 6:
        pendingBits.push({ id: u16(tag.body, 0), data: tag.body.subarray(2), tag: 'DefineBits' });
        break;
      case 21:
        pendingBits.push({
          id: u16(tag.body, 0),
          data: tag.body.subarray(2),
          tag: 'DefineBitsJPEG2',
        });
        break;
      case 35:
        pendingBits.push({ id: u16(tag.body, 0), body: tag.body, tag: 'DefineBitsJPEG3' });
        break;
      case 90:
        pendingBits.push({ id: u16(tag.body, 0), body: tag.body, tag: 'DefineBitsJPEG4' });
        break;
      case 20:
        pendingBits.push({ id: u16(tag.body, 0), body: tag.body, tag: 'DefineBitsLossless' });
        break;
      case 36:
        pendingBits.push({ id: u16(tag.body, 0), body: tag.body, tag: 'DefineBitsLossless2' });
        break;
      case 14:
        sounds.push(parseSound(tag.body));
        break;
      case 45:
        streams.heads++;
        break;
      case 195:
        streams.blocks++;
        break;
      case 60:
        video.streams++;
        break;
      case 61:
        video.frames++;
        break;
      case 76:
        parseSymbolClass(tag.body, symbolNames);
        break;
      case 82:
      case 72:
        abc.push(tag.len);
        break;
      case 87:
        binaryData.push(tag.len);
        break;
    }
  }
  timing.parse = now() - tP0;

  const tI0 = now();
  for (const rec of pendingBits) {
    try {
      if (rec.tag === 'DefineBits' || rec.tag === 'DefineBitsJPEG2') {
        images.push(await imageFromJPEG(buildJPEG(jpegTables, rec.data), rec.id, rec.tag));
      } else if (rec.tag === 'DefineBitsJPEG3') {
        images.push(await decodeJPEG3(rec.body, jpegTables, false));
      } else if (rec.tag === 'DefineBitsJPEG4') {
        images.push(await decodeJPEG3(rec.body, jpegTables, true));
      } else if (rec.tag === 'DefineBitsLossless') {
        images.push(await decodeLossless(rec.body, false));
      } else if (rec.tag === 'DefineBitsLossless2') {
        images.push(await decodeLossless(rec.body, true));
      }
    } catch (e) {
      errors.push(`${rec.tag} id=${rec.id}: ${e.message}`);
      log(`ERROR ${rec.tag} id=${rec.id}: ${e.message}`);
    }
  }
  timing.images = now() - tI0;

  timing.sounds = 0; // blobs only — decode happens lazily via <audio>/AudioContext

  images.sort((a, b) => a.id - b.id);
  sounds.sort((a, b) => a.id - b.id);

  const censusArr = [...census.entries()]
    .map(([code, c]) => ({ code, name: TAG_NAMES[code] ?? `Unknown(${code})`, ...c }))
    .sort((a, b) => b.top - a.top || b.nested - a.nested || a.code - b.code);

  const n = (code) => census.get(code)?.top ?? 0;
  const counts = {
    tagsTopLevel: [...census.values()].reduce((a, c) => a + c.top, 0),
    tagsNested: [...census.values()].reduce((a, c) => a + c.nested, 0),
    sprites: n(39),
    shapes: n(2) + n(22) + n(32) + n(83),
    morphs: n(46) + n(84),
    texts: n(11) + n(33) + n(37),
    fonts: n(10) + n(48) + n(75) + n(91),
    buttons: n(7) + n(34),
    abc: abc.length,
    abcBytes: abc.reduce((a, b) => a + b, 0),
    binaryData: binaryData.length,
  };

  timing.total = now() - t0;
  log(
    `extracted ${images.length} images, ${sounds.length} sounds in ${timing.total.toFixed(0)} ms total`,
  );

  return {
    header,
    census: censusArr,
    counts,
    images,
    sounds,
    streams,
    video,
    symbolNames,
    timing,
    errors,
    bytes: dec.bytes,
  };
}

import data from '../data/creator-palette.json';
import type { CreatorSliderLayout } from './creator-controls';
import type { CreatorPrimitive } from './creator-controls';
import type { SwfMatrix } from '../assets/asset-pack';
import type { TankDesign } from './types';
import { partById } from '../data/catalog';
export interface CreatorField {
  advances?: Record<string, number>;
  deviceFont?: boolean;
  name: string;
  initialText?: string;
  symbol: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontId: number;
  font: string;
  size: number;
  ascent: number;
  lineHeight: number;
  color: number[];
  align: number;
  spacing: number;
  bold: boolean;
  italic: boolean;
  wordWrap: boolean;
}
interface Piece {
  name: string;
  symbol: number;
  matrix: SwfMatrix;
  bounds: { x: number; y: number; width: number; height: number };
  art: CreatorPrimitive[][];
  frameBounds?: { x: number; y: number; width: number; height: number }[];
}
export const CREATOR_PALETTE = data as {
  origin: SwfMatrix;
  advanced: {
    symbol: number;
    origin: SwfMatrix;
    tab: Piece;
    basicTab: Piece;
    static: CreatorPrimitive[];
    fields: CreatorField[];
    suggested: Piece;
    sliders: CreatorSliderLayout[];
    confirm: {
      symbol: number;
      matrix: SwfMatrix;
      fields: CreatorField[];
      buttons: Piece[];
      frames: { frame: number; fields: CreatorField[]; art: CreatorPrimitive[] }[];
    };
  };
  fonts: Record<number, Record<string, number>>;
  stats: {
    symbol: number;
    fields: CreatorField[];
    background: CreatorPrimitive[];
    header: CreatorPrimitive[];
  };
  library: {
    symbol: number;
    matrix: SwfMatrix;
    bounds: { x: number; y: number; width: number; height: number };
    mask: { x: number; y: number; width: number; height: number };
    inside: { x: number; y: number };
    preview: {
      x: number;
      y: number;
      bounds: { x: number; y: number; width: number; height: number };
    };
    caption: CreatorField;
  };
  tabs: (Piece & { category: number; label: string })[];
  row: {
    symbol: number;
    height: number;
    visible: number;
    bounds: { x: number; y: number; width: number; height: number };
    fields: CreatorField[];
    states: { color: number[] }[];
    codes: Record<number, number>;
  };
  scroll: { matrix: SwfMatrix; pieces: Piece[] };
};

/** _-Wp ignores the return values of both substr calls: preserve its trailing comma and short plurals. */
export function creatorWeaponSummary(design: TankDesign, category: number) {
  const counts = new Map<number, number>();
  for (const p of design.parts)
    if (Math.floor(p.type / 1000) === category) counts.set(p.type, (counts.get(p.type) ?? 0) + 1);
  const entries = [...counts];
  if (category !== 5) entries.sort((a, b) => a[0] - b[0]);
  return entries.length
    ? entries
        .map(([id, count]) => {
          const p = partById(id);
          const name = entries.length > 2 ? p?.shortName : count === 1 ? p?.name : p?.pluralName;
          return `${count} ${name ?? id}, `;
        })
        .join('')
    : 'N/A';
}

/** Source divides by121 but clamps the handle to18..138; arrow steps use120px. */
export class CreatorPaletteScroll {
  barY = 18;
  offset = 0;
  constructor(readonly count: number) {}
  get enabled() {
    return this.count > 9;
  }
  get extent() {
    return this.enabled ? this.count * 20 + 1.5 - 180 : 0;
  }
  drag(y: number) {
    this.barY = Math.max(18, Math.min(138, y));
    this.offset = (this.extent * (this.barY - 18)) / 121;
  }
  scrollTo(offset: number) {
    this.offset = Math.max(0, Math.min(this.extent, offset));
    this.barY = Math.min(138, 18 + (this.extent ? (this.offset / this.extent) * 121 : 0));
  }
  step(direction: number) {
    if (!this.enabled) return;
    const current = -Math.round(-((((this.barY - 18) / 121) * this.extent) / 20)),
      next = Math.max(0, Math.min(this.count - 9, current + direction)),
      fraction = next / (this.count - 9);
    this.offset = fraction * this.extent;
    this.barY = 18 + fraction * 120;
  }
}

export function creatorTextLines(
  text: string,
  width: number,
  measure: (value: string) => number,
  wrap = true,
) {
  return text.split('\n').flatMap((paragraph) => {
    if (!wrap || measure(paragraph) <= width) return [paragraph];
    const lines: string[] = [];
    let line = '';
    for (const word of paragraph.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && measure(next) > width) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
    return lines;
  });
}

/** Numeric source advances keep mock wrapping and glyph placement aligned with native text. */
export function creatorGlyphLayout(text: string, field: CreatorField) {
  let width = 0;
  const glyphs = Array.from(text, (char) => {
    const x = width,
      advance = CREATOR_PALETTE.fonts[field.fontId]?.[char];
    width +=
      (advance === undefined ? field.size * 0.4 : (advance * field.size) / 1024) + field.spacing;
    return { char, x };
  });
  return { glyphs, width };
}

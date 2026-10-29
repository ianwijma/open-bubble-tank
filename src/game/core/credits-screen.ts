import data from '../data/credits-art.json';
import { SwfClip, type ClipSource } from '../assets/swf-clip';

export const CREDITS = data;
export const CREDIT_CONTROLS = {
  back_btn: 'Back',
  hero_link: 'Hero Interactive website',
  composer_link: 'Polyphone Music website',
  fb_mc: 'Hero Interactive on Facebook',
} as const;
export type CreditControl = keyof typeof CREDIT_CONTROLS;

/** Reading order from the same source glyph facts used by mock painting. */
export function creditCopy(id: number) {
  const lines = new Map<number, string>();
  for (const glyph of CREDITS.texts.find((t) => t.id === id)?.glyphs ?? [])
    lines.set(glyph.y, (lines.get(glyph.y) ?? '') + glyph.text);
  return [...lines.values()].join('\n');
}

/** Credits.frame34 stops only its own timeline; Back retains its independent two-frame state. */
export class CreditsMotion {
  readonly pose: SwfClip;
  private age = 1;
  constructor(source: ClipSource) {
    this.pose = new SwfClip(CREDITS.symbol, source);
    this.pose.advance(1);
  }
  advance() {
    this.pose.advance(++this.age);
  }
  hover(name: CreditControl, over: boolean) {
    // Studio/composer are invisible one-frame hit clips. Facebook has no rollover listener.
    if (name !== 'back_btn') return;
    const child = [...this.pose.children.values()].find((c) => c.placement.name === name);
    if (over) child?.clip.gotoAndPlay(2);
    else child?.clip.gotoAndStop(1);
  }
}

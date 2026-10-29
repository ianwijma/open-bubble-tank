import data from '../data/menu-series.json';
import { SwfClip, type ClipSource } from '../assets/swf-clip';
import { buildDisplayList } from '../assets/display-list';
import type { SpriteInfo } from '../assets/asset-pack';

export const MENU_SERIES = data;
export const SERIES_CONTROLS = {
  bt_mc: { destination: 'bubble-tanks', label: 'Bubble Tanks' },
  bt2_mc: { destination: 'bubble-tanks-2', label: 'Bubble Tanks 2' },
  bta_mc: { destination: 'bubble-tanks-arenas', label: 'Bubble Tanks Arenas' },
  bttd_mc: { destination: 'bubble-tanks-td', label: 'Bubble Tanks Tower Defense 1.5' },
} as const;
export type SeriesControl = keyof typeof SERIES_CONTROLS;
const sprites = new Map(data.sprites.map((s) => [s.id, s as SpriteInfo]));
const source: ClipSource = {
  spriteInfo: (id) => sprites.get(id),
  displayList: (id, age) => {
    const sprite = sprites.get(id);
    return sprite ? buildDisplayList(sprite, age) : [];
  },
};

/** _-Sm.mmBtnOver/_-ck: reverse the in-flight authored19-frame reveal. */
export class MenuSeriesMotion {
  readonly pose = new SwfClip(data.symbol, source);
  constructor() {
    this.pose.advance(1);
  }
  advance(age: number) {
    this.pose.advance(age);
  }
  hover(over: boolean) {
    const { off, toOn, on, toOff } = data.labels,
      frame = this.pose.frame,
      total = sprites.get(data.symbol)!.frameCount;
    if (over) {
      if (frame === off) this.pose.gotoAndPlay(toOn);
      else if (frame >= toOff) {
        const remaining = total - frame;
        // The intermediate goto recreates children just as the source does.
        this.pose.gotoAndStop(toOn);
        this.pose.gotoAndPlay(toOn + remaining);
      }
    } else if (frame === on) this.pose.gotoAndPlay(toOff);
    else if (frame >= toOn && frame < on) this.pose.gotoAndPlay(total - (frame - toOn));
  }
  get activeControls() {
    return this.pose.placements
      .map((placement) => placement.name)
      .filter((name): name is SeriesControl => !!name && name in SERIES_CONTROLS);
  }
  get width() {
    const background = this.pose.placements.find((p) => p.depth === 1)!;
    const morph = data.morphs.find((m) => m.id === background.charId);
    if (!morph) return data.shapes.find((s) => s.id === background.charId)!.bounds.width;
    const ratio = (background.ratio ?? 0) / 65535;
    return (morph.start.xMax + (morph.end.xMax - morph.start.xMax) * ratio) / 20;
  }
}

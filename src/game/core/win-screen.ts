import geometry from '../data/win-geometry.json';

export const WIN_SCREEN = geometry;

export function winScreenPresentation(age: number) {
  const contentFrame = age < 40 ? 1 : Math.min(25, age - 38);
  return {
    contentFrame,
    alpha: age < 40 ? 0 : WIN_SCREEN.fade[contentFrame - 1],
    blurPasses: Math.floor(Math.min(age, 39) / 2),
  };
}

/** _-EG's 40-frame bitmap preparation followed by ws_container_583's authored fade. */
export class WinScreenState {
  age = 0;
  get blurPasses() {
    return winScreenPresentation(this.age).blurPasses;
  }
  get contentFrame() {
    return winScreenPresentation(this.age).contentFrame;
  }
  get alpha() {
    return winScreenPresentation(this.age).alpha;
  }
  get complete() {
    return this.contentFrame === 25;
  }
  advance() {
    if (!this.complete) ++this.age;
  }
}

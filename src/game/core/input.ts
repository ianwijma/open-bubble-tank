import { STAGE } from './constants';
import type { InputFrame, Settings } from './types';
export class GameInput {
  private keys = new Set<string>();
  private fire = false;
  private aim: { x: number; y: number } = { x: STAGE.cx + 100, y: STAGE.cy };
  private abort = new AbortController();
  constructor(
    host: HTMLElement,
    private settings: () => Settings,
    onPause: () => void,
    onLock: () => void,
    private onStopFire: () => void = () => {},
  ) {
    const signal = this.abort.signal;
    host.addEventListener(
      'pointermove',
      (e) => {
        const r = host.getBoundingClientRect();
        this.aim = {
          x: ((e.clientX - r.left) * 550) / r.width,
          y: ((e.clientY - r.top) * 450) / r.height,
        };
      },
      { signal },
    );
    host.addEventListener(
      'pointerdown',
      (e) => {
        if (
          e.button !== 0 ||
          (e.target as HTMLElement).closest('button,input,select,textarea,[role="dialog"]')
        )
          return;
        this.fire = true;
        host.focus({ preventScroll: true });
        host.setPointerCapture(e.pointerId);
      },
      { signal },
    );
    host.addEventListener(
      'pointerup',
      () => {
        this.fire = false;
        this.onStopFire();
      },
      { signal },
    );
    host.addEventListener('pointercancel', () => this.clear(), { signal });
    window.addEventListener(
      'keydown',
      (e) => {
        if ((e.target as HTMLElement).closest('input,select,textarea')) return;
        const stage = host.closest('.site-shell') ?? host.closest('.stage-space') ?? host;
        if (stage.querySelector('[role="dialog"],.creator.over-game')) return;
        if (!stage.contains(document.activeElement) && document.activeElement !== document.body)
          return;
        if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
        this.keys.add(e.code);
        if (!e.repeat && (e.code === settings().h5 || e.code === 'Escape')) {
          e.preventDefault();
          onPause();
        }
        if (!e.repeat && e.code === settings().h6) onLock();
      },
      { signal },
    );
    window.addEventListener('keyup', (e) => this.keys.delete(e.code), { signal });
    window.addEventListener(
      'blur',
      () => {
        this.clear();
        onPause();
      },
      { signal },
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) {
          this.clear();
          onPause();
        }
      },
      { signal },
    );
  }
  frame(): InputFrame {
    const s = this.settings();
    return {
      up: this.keys.has(s.h1),
      down: this.keys.has(s.h2),
      left: this.keys.has(s.h3),
      right: this.keys.has(s.h4),
      fire: this.fire,
      secondary: this.keys.has('Space'),
      aim: {
        x: STAGE.cx + (this.aim.x - STAGE.cx) / s.zoom,
        y: STAGE.cy + (this.aim.y - STAGE.cy) / s.zoom,
      },
    };
  }
  clear(stopFire = true) {
    this.keys.clear();
    this.fire = false;
    if (stopFire) this.onStopFire();
  }
  dispose() {
    this.clear();
    this.abort.abort();
  }
}

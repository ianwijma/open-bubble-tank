import { STAGE } from './constants';
import { canonicalHotkey, hotkeyDirections } from './hotkeys';
import type { InputFrame, Settings } from './types';
export class GameInput {
  private keys = new Set<string>();
  private fire = false;
  private secondary = false;
  private aim: { x: number; y: number } = { x: STAGE.cx + 100, y: STAGE.cy };
  private pointer: { x: number; y: number } | null = null;
  private abort = new AbortController();
  constructor(
    private host: HTMLElement,
    private settings: () => Settings,
    onPause: () => void,
    onLock: () => void,
    private onStopFire: () => void = () => {},
  ) {
    const signal = this.abort.signal;
    host.addEventListener(
      'pointermove',
      (e) => {
        this.pointer = { x: e.clientX, y: e.clientY };
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
        const code = canonicalHotkey(e.code);
        const bindings = settings();
        if (
          code === 'Space' ||
          code.startsWith('Arrow') ||
          [bindings.h1, bindings.h2, bindings.h3, bindings.h4, bindings.h5, bindings.h6].includes(
            code,
          )
        )
          e.preventDefault();
        this.keys.add(code);
        if (!e.repeat && (code === settings().h5 || code === 'Escape')) {
          e.preventDefault();
          onPause();
        }
        if (!e.repeat && code === settings().h6) onLock();
      },
      { signal },
    );
    window.addEventListener('keyup', (e) => this.keys.delete(canonicalHotkey(e.code)), { signal });
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
    if (!this.keys.has('Space')) this.secondary = false;
    else if (s.h3 !== 'Space' && s.h4 !== 'Space') this.secondary = true;
    // Main can move under a stationary pointer during shake; Flash mouseX/Y
    // resolve against its current transform on every stage frame.
    if (this.pointer) {
      const r = this.host.getBoundingClientRect();
      this.aim = {
        x: ((this.pointer.x - r.left) * 550) / r.width,
        y: ((this.pointer.y - r.top) * 450) / r.height,
      };
    }
    return {
      ...hotkeyDirections(this.keys, s),
      fire: this.fire,
      secondary: this.secondary,
      aim: {
        x: STAGE.cx + (this.aim.x - STAGE.cx) / s.zoom,
        y: STAGE.cy + (this.aim.y - STAGE.cy) / s.zoom,
      },
    };
  }
  clear(stopFire = true) {
    this.keys.clear();
    this.fire = false;
    this.secondary = false;
    if (stopFire) this.onStopFire();
  }
  dispose() {
    this.clear();
    this.abort.abort();
  }
}

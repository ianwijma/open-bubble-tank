import { sameMenuTarget, type MenuTarget } from '../core/menu-hit';
import type { Vec } from '../core/types';

interface MenuPointerOptions {
  enabled: () => boolean;
  pick: (point: Vec) => MenuTarget | undefined;
  hover: (target: MenuTarget | undefined, previous: MenuTarget | undefined) => void;
  release: (target: MenuTarget) => void;
  paint: () => void;
}

/** Flash MOUSE_UP dispatch and stage-wide geometry picking, independent of DOM button rectangles. */
export class MenuPointer {
  target?: MenuTarget;
  private client?: Vec;
  private keyboard?: MenuTarget;
  constructor(
    private root: HTMLElement,
    private options: MenuPointerOptions,
  ) {
    root.addEventListener('pointermove', this.move);
    root.addEventListener('pointerleave', this.leave);
    root.addEventListener('mouseup', this.up, true);
  }
  private move = (event: PointerEvent) => {
    this.client = { x: event.clientX, y: event.clientY };
    this.keyboard = undefined;
    this.refresh();
    this.options.paint();
  };
  private leave = () => {
    this.client = this.keyboard = undefined;
    this.refresh();
    this.options.paint();
  };
  private up = (event: MouseEvent) => {
    if (event.button !== 0) return;
    this.client = { x: event.clientX, y: event.clientY };
    this.keyboard = undefined;
    this.refresh();
    if (this.target) this.options.release(this.target);
    this.options.paint();
  };
  focus(target?: MenuTarget) {
    this.client = undefined;
    this.keyboard = target;
    this.refresh();
    this.options.paint();
  }
  blur() {
    this.keyboard = undefined;
    this.refresh();
    this.options.paint();
  }
  refresh() {
    let target = this.options.enabled() ? this.keyboard : undefined;
    if (this.options.enabled() && this.client) {
      const r = this.root.getBoundingClientRect(),
        point = {
          x: ((this.client.x - r.left) * 550) / r.width,
          y: ((this.client.y - r.top) * 450) / r.height,
        };
      if (point.x >= 0 && point.x <= 550 && point.y >= 0 && point.y <= 450)
        target = this.options.pick(point);
    }
    const changed = !sameMenuTarget(target, this.target),
      previous = this.target;
    this.target = target;
    this.root.style.cursor = target && target.kind !== 'blocked' ? 'pointer' : 'default';
    if (changed) this.options.hover(target, previous);
    return changed;
  }
  dispose() {
    this.root.removeEventListener('pointermove', this.move);
    this.root.removeEventListener('pointerleave', this.leave);
    this.root.removeEventListener('mouseup', this.up, true);
    this.root.style.cursor = '';
  }
}

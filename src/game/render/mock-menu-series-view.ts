import { MENU_SERIES, type MenuSeriesMotion } from '../core/menu-series';
import type { SwfClip } from '../assets/swf-clip';

/** Procedural capsules and system glyphs at the imported layout; no original contours. */
export class MockMenuSeriesView {
  readonly canvas = document.createElement('canvas');
  private context: CanvasRenderingContext2D;
  private frame = -1;
  constructor() {
    this.canvas.width = 804;
    this.canvas.height = 44;
    this.canvas.style.width = '402px';
    this.canvas.style.height = '22px';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.context = this.canvas.getContext('2d')!;
  }
  draw(motion: MenuSeriesMotion) {
    if (motion.pose.frame === this.frame) return;
    this.frame = motion.pose.frame;
    const ctx = this.context;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, 402, 22);
    this.paint(motion.pose);
  }
  private paint(clip: SwfClip, ratio = 0) {
    const ctx = this.context;
    if (clip.children.size) {
      for (const placement of clip.placements) {
        const child = clip.children.get(placement.depth)!;
        ctx.save();
        const m = child.placement.matrix;
        ctx.transform(m.a, m.b, m.c, m.d, m.tx / 20, m.ty / 20);
        this.paint(child.clip, child.placement.ratio);
        ctx.restore();
      }
      return;
    }
    const text = MENU_SERIES.texts.find((t) => t.id === clip.id);
    if (text) {
      const m = text.matrix;
      ctx.transform(m.a, m.b, m.c, m.d, m.tx / 20, m.ty / 20);
      for (const glyph of text.glyphs) {
        ctx.font = `${glyph.italic ? 'italic' : 'normal'} ${glyph.bold ? 'bold' : 'normal'} ${glyph.size}px Arial, sans-serif`;
        ctx.fillStyle = `rgba(${glyph.color.slice(0, 3).join(',')},${(glyph.color[3] ?? 255) / 255})`;
        ctx.fillText(glyph.text, glyph.x, glyph.y);
      }
      return;
    }
    const shape = MENU_SERIES.shapes.find((s) => s.id === clip.id),
      morph = MENU_SERIES.morphs.find((s) => s.id === clip.id);
    if (!shape && !morph) return;
    const color = (shape ?? morph)!.color;
    ctx.fillStyle =
      ctx.strokeStyle = `rgba(${color.slice(0, 3).join(',')},${(color[3] ?? 255) / 255})`;
    if (shape?.columns.length) {
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      for (const x of shape.columns) {
        ctx.beginPath();
        ctx.moveTo(x, shape.bounds.y + 0.5);
        ctx.lineTo(x, shape.bounds.y + shape.bounds.height - 0.5);
        ctx.stroke();
      }
    } else if (color[3] !== 0) {
      const b = shape?.bounds ?? {
        x: morph!.start.xMin / 20,
        y: morph!.start.yMin / 20,
        width: (morph!.start.xMax + ((morph!.end.xMax - morph!.start.xMax) * ratio) / 65535) / 20,
        height: (morph!.start.yMax - morph!.start.yMin) / 20,
      };
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.width, b.height, b.height / 2);
      ctx.fill();
    }
  }
}

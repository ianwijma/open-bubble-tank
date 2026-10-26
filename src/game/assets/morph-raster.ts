import type { Bounds, Raster } from './asset-pack';

/** Synchronous browser rasterization of shapeToSVG's leaf paths and SWF gradients.
 * Avoids image-decode latency when an authored placement changes ratio this frame.
 */
export function rasterMorphSVG(svg: string, geometry: Bounds): Raster {
  const pad = 2,
    resolution = 2;
  const bounds = {
    x: geometry.x - pad,
    y: geometry.y - pad,
    width: geometry.width + pad * 2,
    height: geometry.height + pad * 2,
  };
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(bounds.width * resolution));
  canvas.height = Math.max(1, Math.ceil(bounds.height * resolution));
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const sx = canvas.width / bounds.width,
    sy = canvas.height / bounds.height;
  ctx.setTransform(sx, 0, 0, sy, pad * sx, pad * sy);
  const root = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
  const gradients = new Map<string, { paint: CanvasGradient; matrix: DOMMatrix }>();
  for (const definition of root.querySelectorAll('linearGradient,radialGradient')) {
    const number = (name: string, fallback = 0) =>
      Number(definition.getAttribute(name) ?? fallback);
    const m = (definition.getAttribute('gradientTransform') ?? 'matrix(1 0 0 1 0 0)')
      .slice(7, -1)
      .trim()
      .split(/[ ,]+/)
      .map(Number);
    const gradient =
      definition.tagName === 'linearGradient'
        ? ctx.createLinearGradient(number('x1'), number('y1'), number('x2'), number('y2'))
        : ctx.createRadialGradient(
            number('fx', number('cx')),
            number('fy', number('cy')),
            0,
            number('cx'),
            number('cy'),
            number('r'),
          );
    for (const stop of definition.querySelectorAll('stop')) {
      const color = stop.getAttribute('stop-color')!,
        alpha = Number(stop.getAttribute('stop-opacity') ?? 1);
      gradient.addColorStop(
        Math.max(0, Math.min(1, Number(stop.getAttribute('offset')))),
        `rgba(${parseInt(color.slice(1, 3), 16)},${parseInt(color.slice(3, 5), 16)},${parseInt(color.slice(5, 7), 16)},${alpha})`,
      );
    }
    gradients.set(definition.id, { paint: gradient, matrix: new DOMMatrix(m) });
  }
  const paint = (value: string, path: Path2D) => {
    if (!value.startsWith('url(')) return { paint: value, path };
    const gradient = gradients.get(value.slice(5, -1))!;
    const mapped = new Path2D();
    // Canvas gradients use the paint-time transform. Move the outline into
    // gradient space so nonuniform scale, shear, and focal points match SVG.
    mapped.addPath(path, gradient.matrix.inverse());
    const { a, b, c, d, e, f } = gradient.matrix;
    ctx.transform(a, b, c, d, e, f);
    return { paint: gradient.paint, path: mapped };
  };
  for (const node of root.children) {
    if (node.tagName !== 'path') continue;
    const path = new Path2D(node.getAttribute('d') ?? '');
    const fill = node.getAttribute('fill'),
      stroke = node.getAttribute('stroke');
    if (fill && fill !== 'none') {
      ctx.save();
      ctx.globalAlpha = Number(node.getAttribute('fill-opacity') ?? 1);
      const mapped = paint(fill, path);
      ctx.fillStyle = mapped.paint;
      ctx.fill(mapped.path, node.getAttribute('fill-rule') === 'nonzero' ? 'nonzero' : 'evenodd');
      ctx.restore();
    }
    if (stroke && stroke !== 'none') {
      const lineWidth = Number(node.getAttribute('stroke-width') ?? 1);
      if (lineWidth <= 0) continue;
      ctx.globalAlpha = Number(node.getAttribute('stroke-opacity') ?? 1);
      // All authored BT3 morph strokes are solid colors.
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = (node.getAttribute('stroke-linecap') ?? 'round') as CanvasLineCap;
      ctx.lineJoin = (node.getAttribute('stroke-linejoin') ?? 'round') as CanvasLineJoin;
      ctx.miterLimit = Number(node.getAttribute('stroke-miterlimit') ?? 10);
      if (ctx.lineWidth > 0) ctx.stroke(path);
    }
  }
  return {
    ...bounds,
    canvas,
    resolution,
    pixels: ctx.getImageData(0, 0, canvas.width, canvas.height).data,
    url: '',
    morph: true,
  };
}

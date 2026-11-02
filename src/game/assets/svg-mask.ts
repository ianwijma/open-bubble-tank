import type { Rect } from '../core/types';

/** Flash display-list masks use filled geometry, ignoring paint alpha and strokes. */
export function svgMaskDefinition(id: string, body: string, bounds: Rect): string {
  const document = new DOMParser().parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${body}</svg>`,
    'image/svg+xml',
  );
  if (document.querySelector('parsererror')) throw new Error('Invalid compiled mask geometry');
  const geometry = new Set(['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline']);
  const normalize = (element: Element, inheritedFill = 'black') => {
    const fill = element.getAttribute('fill') ?? inheritedFill;
    for (const name of ['opacity', 'fill-opacity', 'stroke-opacity', 'filter'])
      element.removeAttribute(name);
    if (geometry.has(element.localName)) {
      element.setAttribute('fill', fill === 'none' ? 'none' : 'white');
      element.setAttribute('stroke', 'none');
    }
    for (const child of Array.from(element.children)) normalize(child, fill);
  };
  normalize(document.documentElement);
  const serializer = new XMLSerializer();
  const content = Array.from(document.documentElement.children)
    .map((element) => serializer.serializeToString(element))
    .join('');
  // SVG clipPath rejects nested groups in Chromium. An opaque geometric alpha mask
  // supports the original transform tree, fill-rule holes and nested clip masks.
  return `<mask id="${id}" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" mask-type="alpha" x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}">${content}</mask>`;
}

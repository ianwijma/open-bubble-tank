import type { Vec } from '@/game/core/types';
import {
  DISPLAY_IDENTITY,
  displayMatrixProduct,
  displayMousePoint,
  type DisplayMatrix,
} from '@/game/core/display-transform';
import { displayTwips } from '@/game/core/display-values';

/**
 * Browser geometry supplies the view; source matrices supply the event/reference spaces.
 * Preserve the authored CSS scale before computed-style/painted-bounds serialization.
 */
export function stageDisplayPoint(
  event: { clientX: number; clientY: number },
  root: Element,
  reference: Readonly<DisplayMatrix>,
  target: Readonly<DisplayMatrix> = reference,
): Vec {
  const rect = root.getBoundingClientRect(),
    spaceElement = root.closest('.stage-space'),
    space = spaceElement?.getBoundingClientRect() ?? rect,
    frame = root.closest('.stage-frame')?.getBoundingClientRect() ?? space,
    transform =
      spaceElement instanceof HTMLElement
        ? spaceElement.style.transform || getComputedStyle(spaceElement).transform
        : 'none',
    scale = spaceElement
      ? transform === 'none'
        ? 1
        : new DOMMatrixReadOnly(transform).a
      : rect.width / 550,
    dpr = window.devicePixelRatio,
    parent = {
      ...DISPLAY_IDENTITY,
      tx: displayTwips((rect.left - space.left) / scale),
      ty: displayTwips((rect.top - space.top) / scale),
    };
  return displayMousePoint(
    { x: (event.clientX - frame.left) * dpr, y: (event.clientY - frame.top) * dpr },
    {
      ...DISPLAY_IDENTITY,
      a: scale * dpr,
      d: scale * dpr,
      tx: displayTwips((space.left - frame.left) * dpr),
      ty: displayTwips((space.top - frame.top) * dpr),
    },
    displayMatrixProduct(parent, target),
    displayMatrixProduct(parent, reference),
  );
}

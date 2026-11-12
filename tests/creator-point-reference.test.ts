import { describe, expect, test } from 'bun:test';
import reference from './fixtures/creator-point-reference.json';
import { CREATOR_CONTROLS } from '../src/game/core/creator-controls';
import { DISPLAY_IDENTITY, displayMousePoint } from '../src/game/core/display-transform';
import type { TankPart, Vec } from '../src/game/core/types';
import { beginSelectionDrag, advanceSelectionDrag } from '../src/game/simulation/editor-drag';
import { placementParts } from '../src/game/simulation/editor-placement';

describe('original public creator coordinate exports', () => {
  const local = CREATOR_CONTROLS.workspace;
  const cursor = (point: Vec, scale: number, dpr: number) =>
    displayMousePoint(
      { x: point.x * dpr, y: point.y * dpr },
      { ...DISPLAY_IDENTITY, a: scale * dpr, d: scale * dpr },
      local,
      local,
    );
  for (const example of reference.drag)
    test(example.name, () => {
      const parts: TankPart[] = example.before.map((p) => ({
        ...p,
        type: 1001,
        radius: 7,
        scale: 1,
        rotation: 0,
      }));
      const first = cursor(example.moves[0], example.scale, example.dpr);
      let session = beginSelectionDrag(
        parts,
        { keys: parts.map((p) => p.key), ghosts: [parts[1].key] },
        cursor(example.down, example.scale, example.dpr),
        true,
        false,
        first,
      );
      for (const move of example.moves) {
        const point = cursor(move, example.scale, example.dpr);
        session = advanceSelectionDrag(session, point);
      }
      expect(session.parts.map(({ key, twin, x, y }) => ({ key, twin, x, y }))).toEqual(
        example.expected,
      );
    });
  for (const example of reference.placement)
    test(example.name, () => {
      const point = cursor(example.mouse, example.scale, example.dpr);
      const placed = placementParts(1001, 7, point, true, 'reference');
      expect(placed.map(({ x, y }) => ({ x, y }))).toEqual(
        example.expected.map(({ x, y }) => ({ x, y })),
      );
    });
});

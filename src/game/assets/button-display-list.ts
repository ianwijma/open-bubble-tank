import type { DisplayPlacement, Placement } from './asset-pack';

export type ButtonState = 'up' | 'over' | 'down' | 'hit';
export interface ButtonInfo {
  id: number;
  trackAsMenu?: boolean;
  hasActions?: boolean;
  states: (Omit<Placement, 'frame' | 'remove'> & {
    charId: number;
    matrix: DisplayPlacement['matrix'];
    states: Record<ButtonState, boolean>;
  })[];
}

/** SimpleButton states are separate display lists; hit-only records never paint ordinary states. */
export function buttonDisplayList(button: ButtonInfo, state: ButtonState): DisplayPlacement[] {
  return button.states
    .filter((record) => record.states[state])
    .map(({ states: _, ...record }) => ({ ...record, frame: 1, bornFrame: 1 }))
    .sort((a, b) => a.depth - b.depth);
}

export interface ViewerNavigation {
  offset: number;
  page: number;
  detail: boolean;
  first: boolean;
  previous: boolean;
  next: boolean;
}
export type ViewerNavigationAction =
  | { type: 'local' | 'sort' | 'code' | 'cards' }
  | { type: 'detail'; index: number }
  | { type: 'page'; direction: -1 | 0 | 1 };

/** TankViewerScreen._-0l updates buttons as well as the small-view caption. */
function smallCaption(state: ViewerNavigation, length: number) {
  const pages = Math.ceil(length / 4);
  if (pages === 1) state.first = state.previous = state.next = false;
  if (state.page === 1 && pages > 1) state.first = true;
}
function allButtons(state: ViewerNavigation, enabled: boolean) {
  state.first = state.previous = state.next = enabled;
}
export function initialViewerNavigation(length: number): ViewerNavigation {
  return navigateViewer(
    { offset: 0, page: 1, detail: false, first: false, previous: false, next: true },
    length,
    { type: 'local' },
  );
}
/** Source handlers write persistent button state; it cannot be derived from queue bounds alone. */
export function navigateViewer(
  previous: ViewerNavigation,
  length: number,
  action: ViewerNavigationAction,
): ViewerNavigation {
  const state = { ...previous };
  if (action.type === 'detail') {
    state.offset = action.index;
    state.detail = true;
    // DetailTheTank / _-dr: even the last (or only) tank initially has Next enabled.
    allButtons(state, true);
    state.first = state.previous = state.offset !== 0;
  } else if (action.type === 'cards') {
    // _-8F calls _-0l before its final first-page/_-dr writes.
    state.detail = false;
    state.offset = Math.floor(state.offset / 4) * 4;
    state.page = 1 + state.offset / 4;
    smallCaption(state, length);
    if (state.page === 1) state.first = state.previous = false;
    else allButtons(state, true);
  } else if (action.type !== 'page') {
    state.offset = 0;
    state.page = 1;
    state.detail = false;
    allButtons(state, true);
    if (length === 0) allButtons(state, false); // _-QN / _-Pf
    smallCaption(state, length);
    if (action.type !== 'sort') state.first = state.previous = false;
    // ReturnToViewTanksFromSearch writes Next again after _-0l.
    if (action.type === 'code' && length > 1) state.next = true;
  } else if (state.detail) {
    const direction = action.direction;
    if (direction === 0) state.offset = 0;
    else if (direction === -1) state.offset = Math.max(0, state.offset - 1);
    else if (state.offset < length - 1) state.offset++;
    allButtons(state, true); // Each handler calls DetailTheTank again, even without moving.
    state.first = state.previous = state.offset !== 0;
    if (direction === 0) state.next = length > 1;
    else if (direction === 1 && state.offset === length - 1) state.next = false;
  } else {
    const pages = Math.ceil(length / 4);
    if (action.direction === 0) {
      state.offset = 0;
      state.page = 1;
      state.first = state.previous = false;
      state.next = length > 4;
    } else if (action.direction === -1) {
      if (state.offset >= 4) {
        state.offset -= 4;
        state.page--;
      } else {
        state.offset = 0;
        state.page = 1;
      }
      state.next = length > 4;
      if (state.offset <= 0) state.first = state.previous = false;
    } else {
      // _-QK keeps the authored partial-page branch rather than clamping to a last index.
      if (state.offset + 4 <= length - 4) {
        state.offset += 4;
        state.page++;
      } else if (state.page !== pages) {
        state.offset += 4;
        state.page = pages;
      }
      if (state.offset + 3 >= length - 1) state.next = false;
      state.first = state.previous = true;
    }
    if (state.offset >= length) allButtons(state, false); // _-QN's empty page notification.
    smallCaption(state, length);
  }
  return state;
}

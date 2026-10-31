import { GameInput } from '../../src/game/core/input';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import { validateSettings } from '../../src/game/services/profile';

/** Real DOM keyboard events and production validation/controller, sampled without a wall clock. */
export function showHotkeyInput(host: HTMLElement) {
  const surface = document.createElement('div');
  surface.tabIndex = 0;
  surface.setAttribute('role', 'application');
  surface.setAttribute('aria-label', 'Hotkey input surface');
  const mode = document.createElement('select');
  mode.setAttribute('aria-label', 'Input bindings');
  for (const name of ['duplicates', 'horizontal-space', 'vertical-space']) {
    const option = document.createElement('option');
    option.value = option.textContent = name;
    mode.appendChild(option);
  }
  const sample = document.createElement('button');
  sample.textContent = 'Sample input frame';
  const clear = document.createElement('button');
  clear.textContent = 'Clear input';
  surface.append(mode, sample, clear);
  host.appendChild(surface);
  let settings = validateSettings({
      ...DEFAULT_SETTINGS,
      h1: 'ShiftRight',
      h2: 'ShiftLeft',
      h3: 'ShiftRight',
      h4: 'ShiftLeft',
      h5: 'Semicolon',
      h6: 'ControlRight',
    }),
    pauses = 0,
    locks = 0;
  const input = new GameInput(
    surface,
    () => settings,
    () => pauses++,
    () => locks++,
  );
  const report = () => {
    const frame = input.frame();
    host.dataset.inputProof = JSON.stringify({ ...frame, pauses, locks });
  };
  mode.onchange = () => {
    const horizontal = mode.value === 'horizontal-space';
    settings = validateSettings({
      ...settings,
      h1: mode.value === 'vertical-space' ? 'Space' : 'ShiftRight',
      h2: 'ShiftLeft',
      h3: horizontal ? 'Space' : 'ShiftRight',
      h4: horizontal ? 'Space' : 'ShiftLeft',
    });
    surface.focus();
  };
  sample.onclick = report;
  clear.onclick = () => {
    input.clear();
    report();
  };
  report();
  surface.focus();
  return () => {
    input.dispose();
    surface.remove();
  };
}

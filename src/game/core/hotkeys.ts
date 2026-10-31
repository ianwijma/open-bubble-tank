/** _-Ay stores Flash keyCode values; canonical codes merge browser left/right modifiers. */
import type { Settings } from './types';
const codes: Record<string, number> = {
  Backspace: 8,
  Tab: 9,
  Enter: 13,
  ShiftLeft: 16,
  ControlLeft: 17,
  AltLeft: 18,
  Pause: 19,
  CapsLock: 20,
  Escape: 27,
  Space: 32,
  PageUp: 33,
  PageDown: 34,
  End: 35,
  Home: 36,
  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowRight: 39,
  ArrowDown: 40,
  Insert: 45,
  Delete: 46,
  MetaLeft: 91,
  MetaRight: 92,
  ContextMenu: 93,
  NumLock: 144,
  ScrollLock: 145,
  Semicolon: 186,
  Equal: 187,
  Comma: 188,
  Minus: 189,
  Period: 190,
  Slash: 191,
  Backquote: 192,
  BracketLeft: 219,
  Backslash: 220,
  BracketRight: 221,
  Quote: 222,
  NumpadMultiply: 106,
  NumpadAdd: 107,
  NumpadSubtract: 109,
  NumpadDecimal: 110,
  NumpadDivide: 111,
};
for (let i = 0; i < 26; i++) codes[`Key${String.fromCharCode(65 + i)}`] = 65 + i;
for (let i = 0; i < 10; i++) {
  codes[`Digit${i}`] = 48 + i;
  codes[`Numpad${i}`] = 96 + i;
}
for (let i = 1; i <= 24; i++) codes[`F${i}`] = 111 + i;
export function canonicalHotkey(code: string) {
  return (
    (
      {
        ShiftRight: 'ShiftLeft',
        ControlRight: 'ControlLeft',
        AltRight: 'AltLeft',
        NumpadEnter: 'Enter',
      } as Record<string, string>
    )[code] ?? code
  );
}
export function validHotkey(code: unknown): code is string {
  return typeof code === 'string' && Object.hasOwn(codes, canonicalHotkey(code));
}
const labels: Record<number, string> = {
  8: 'BACKSPACE',
  20: 'CAPSLOCK',
  17: 'CONTROL',
  46: 'DELETE',
  40: 'DOWN',
  35: 'END',
  13: 'ENTER',
  27: 'ESCAPE',
  36: 'HOME',
  45: 'INSERT',
  37: 'LEFT',
  34: 'PGDN',
  33: 'PGUP',
  39: 'RIGHT',
  16: 'SHIFT',
  32: 'SPACE',
  9: 'TAB',
  38: 'UP',
  186: ';',
  187: '=',
  189: '-',
  191: '/',
  192: '`',
  219: '[',
  220: '\\',
  221: ']',
  222: "'",
  188: ',',
  190: '.',
  106: 'MULTIPLY',
  107: 'ADD',
  109: 'SUBTRACT',
  110: 'DECIMAL',
  111: 'DIVIDE',
};
for (let i = 0; i < 10; i++) labels[96 + i] = `NUMPAD ${i}`;
/** Preserve the source's String.fromCharCode fallback, including function-key labels. */
export function hotkeyLabel(code: string) {
  const value = codes[canonicalHotkey(code)];
  return value === undefined ? '' : (labels[value] ?? String.fromCharCode(value));
}
/** AvatarInterface:675–708 gives Up/Left priority over same-axis duplicate bindings. */
export function hotkeyDirections(keys: ReadonlySet<string>, settings: Settings) {
  return {
    up: keys.has(settings.h1),
    down: settings.h1 !== settings.h2 && keys.has(settings.h2),
    left: keys.has(settings.h3),
    right: settings.h3 !== settings.h4 && keys.has(settings.h4),
  };
}

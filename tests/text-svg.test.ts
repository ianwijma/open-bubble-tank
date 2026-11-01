import { expect, test } from 'bun:test';
import { AssetPack } from '../src/game/assets/asset-pack';

function fontPack() {
  const pack = new AssetPack('swf');
  Object.assign(pack, {
    fonts: new Map([
      [
        131,
        {
          id: 131,
          name: 'Arial\0',
          codeTable: [65],
          glyphs: ['M0 0h512v-1024h-512Z'],
          advances: [10240],
        },
      ],
      [
        142,
        {
          id: 142,
          name: 'Arial\0',
          codeTable: [65],
          glyphs: ['M0 0h1024v-1024h-1024Z'],
          advances: [20480],
        },
      ],
    ]),
  });
  return pack;
}

test('explicit embedded font identity takes precedence over shared name prefixes', () => {
  const pack = fontPack();
  const bold = pack.textSvg('AA', 10, '#fff', 'Arial', 0, 142)!;
  expect(bold).toContain('width="20"');
  expect(bold).toContain('translate(10 10)');
  expect(bold).toContain('M0 0h1024v-1024h-1024Z');
  expect(bold).not.toContain('M0 0h512v-1024h-512Z');
  expect(pack.textSvg('AA', 10, '#fff', 'unmatched-prefix', 0, 142)).toBe(bold);
});

test('prefix selection remains the fallback for old callers and missing font IDs', () => {
  const pack = fontPack();
  const legacy = pack.textSvg('AA', 10, '#fff', 'Arial')!;
  expect(legacy).toContain('width="10"');
  expect(legacy).toContain('translate(5 10)');
  expect(pack.textSvg('AA', 10, '#fff', 'Arial', 0, 999)).toBe(legacy);
  expect(pack.textSvg('AA', 10, '#fff', 'missing', 0, 999)).toBeNull();
});

test('letter spacing includes known and missing glyph advances consistently', () => {
  const pack = fontPack();
  const svg = pack.textSvg('A?A', 10, '#fff', 'Arial', 2, 131)!;
  expect(svg).toContain('width="20"'); // (5+2) + (4+2) + (5+2).
  expect(svg).toContain('translate(13 10)');
});

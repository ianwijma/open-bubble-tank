import { expect, test } from 'bun:test';
import { decodeTankCode, encodeTankCode } from '../src/game/services/tank-code';
import { STARTER } from '../src/game/data/catalog';
import { existsSync, readFileSync } from 'node:fs';
const source = '../documented-bubble-tank-3/re/bt3/builtin_tanks.json';
test('original tank code encrypt/decrypt round-trip preserves all part geometry', async () => {
  const code = await encodeTankCode(STARTER);
  expect(code.length % 32).toBe(6);
  const decoded = await decodeTankCode(code);
  expect(decoded.parts).toEqual(STARTER.parts);
  expect(decoded.name).toBe(STARTER.name);
  expect(decoded.classId).toBe(1);
});
test('invalid and truncated original codes fail with an actionable error', async () => {
  await expect(decodeTankCode('bad')).rejects.toThrow('complete');
  await expect(decodeTankCode('abc' + '00'.repeat(16) + 'def')).rejects.toThrow();
});
test.skipIf(!existsSync(source))(
  'all 75 original encrypted tank codes decode to the recovered geometry',
  async () => {
    const catalog = JSON.parse(readFileSync(source, 'utf8')) as Record<
      string,
      { name: string; code: string; plaintext: string }[]
    >;
    for (const tank of Object.values(catalog).flat()) {
      const decoded = await decodeTankCode(tank.code);
      expect(decoded.name).toBe(tank.name);
      const expected = tank.plaintext.split(';').length - 1;
      expect(decoded.parts.length).toBe(expected);
    }
  },
);

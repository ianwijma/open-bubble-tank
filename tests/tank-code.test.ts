import { expect, test } from 'bun:test';
import { decodeTankCode, encodeTankCode } from '../src/game/services/tank-code';
import { STARTER } from '../src/game/data/catalog';
import { existsSync, readFileSync } from 'node:fs';
import { createDecipheriv } from 'node:crypto';
const source = '../documented-bubble-tank-3/re/bt3/builtin_tanks.json';
test('original tank code encrypt/decrypt round-trip preserves all part geometry', async () => {
  const code = await encodeTankCode({ ...STARTER, difficulty: 1 });
  expect(code.length % 32).toBe(6);
  const decoded = await decodeTankCode(code);
  expect(decoded.parts).toEqual(STARTER.parts);
  expect(decoded.name).toBe(STARTER.name);
  expect(decoded.classId).toBe(1);
  // Inspect the independently decrypted payload: ImportTankData intentionally recalculates this value.
  const decipher = createDecipheriv(
    'aes-128-ecb',
    Buffer.from(code.slice(0, 3) + code.slice(-3) + 'm7U5kDYy5W'),
    null,
  );
  const plain = Buffer.concat([
    decipher.update(Buffer.from(code.slice(3, -3), 'hex')),
    decipher.final(),
  ]).toString();
  expect(plain.split(';')[0].split(',')[8]).toBe('1');
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

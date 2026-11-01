import { CLASS_SPEED } from '../core/constants';
import type { TankDesign } from '../core/types';
import { difficulty } from '../data/catalog';
import { validateDesign } from './profile';
const SALT = 'm7U5kDYy5W';
const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
function bytesFromHex(text: string) {
  const out = new Uint8Array(text.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(text.slice(i * 2, i * 2 + 2), 16);
  return out;
}
function codeKey(first: string, last: string) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(first + last + SALT),
    'AES-CBC',
    false,
    ['encrypt', 'decrypt'],
  );
}
/**
 * Original AES-128-ECB / PKCS7 format, without bundling a crypto dependency.
 * Web Crypto exposes CBC. Its first block with a zero IV is exactly ECB.
 * To decrypt an arbitrary block, append E(padding XOR C) so Web Crypto can
 * validate/remove a full PKCS7 padding block without removing any source bytes.
 */
export async function decodeTankCode(code: string): Promise<TankDesign> {
  code = code.trim();
  if (
    code.length > 200000 ||
    code.length < 38 ||
    !/^([a-f0-9]{3})(?:[a-f0-9]{32})+([a-f0-9]{3})$/i.test(code)
  )
    throw new Error('Paste a complete Bubble Tanks 3 tank code.');
  const first = code.slice(0, 3),
    last = code.slice(-3),
    key = await codeKey(first, last),
    cipher = bytesFromHex(code.slice(3, -3));
  const blocks = await Promise.all(
    Array.from({ length: cipher.length / 16 }, async (_, i) => {
      const block = cipher.slice(i * 16, i * 16 + 16);
      const padding = new Uint8Array(
        await crypto.subtle.encrypt({ name: 'AES-CBC', iv: block }, key, new Uint8Array(0)),
      );
      const pair = new Uint8Array(32);
      pair.set(block);
      pair.set(padding, 16);
      return new Uint8Array(
        await crypto.subtle.decrypt({ name: 'AES-CBC', iv: new Uint8Array(16) }, key, pair),
      );
    }),
  );
  const plain = new Uint8Array(cipher.length);
  blocks.forEach((b, i) => plain.set(b, i * 16));
  const pad = plain[plain.length - 1];
  if (pad < 1 || pad > 16 || !plain.slice(-pad).every((n) => n === pad))
    throw new Error('This tank code has invalid padding.');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(plain.slice(0, -pad));
  const [header, ...parts] = text.split(';'),
    h = header.split(',');
  if (h.length !== 11) throw new Error('This tank code has an invalid header.');
  const tank: TankDesign = {
    sourceCode: code,
    id: h[9],
    name: h[1],
    author: h[0],
    avatar: h[3] === '1',
    classId: Number(h[4]),
    life: Number(h[5]),
    reward: Number(h[6]),
    speed: Number(h[7]),
    difficulty: Number(h[8]),
    parts: parts.filter(Boolean).map((row) => {
      const p = row.split(',');
      if (p.length !== 8) throw new Error('This tank code has an invalid part.');
      return {
        key: p[0],
        type: Number(p[1]),
        twin: p[2],
        x: Number(p[3]),
        y: Number(p[4]),
        rotation: Number(p[5]),
        scale: Number(p[6]),
        radius: Number(p[7]),
      };
    }),
  };
  if (!validateDesign(tank))
    throw new Error('This tank code contains unsupported parts or invalid values.');
  tank.difficulty = difficulty(tank);
  if (tank.avatar) tank.speed = CLASS_SPEED[tank.classId - 1];
  return tank;
}
export async function encodeTankCode(tank: TankDesign): Promise<string> {
  if (!validateDesign(tank)) throw new Error('Cannot encode an invalid tank.');
  if ([tank.name, tank.author, tank.id].some((s) => /[,;|~]/.test(s)))
    throw new Error(
      'Original tank codes cannot contain commas, semicolons, pipes, or tildes in names.',
    );
  const random = crypto.getRandomValues(new Uint8Array(6)),
    first = hex(random.slice(0, 3)).slice(0, 3),
    last = hex(random.slice(3)).slice(0, 3),
    key = await codeKey(first, last);
  const header = [
    tank.author,
    tank.name,
    1,
    tank.avatar ? 1 : 0,
    tank.classId,
    tank.life,
    tank.reward,
    tank.speed,
    tank.difficulty,
    tank.id,
    0,
  ].join(',');
  const text = [
    header,
    ...tank.parts.map((p) =>
      [p.key, p.type, p.twin, p.x, p.y, p.rotation, p.scale, p.radius].join(','),
    ),
  ].join(';');
  const raw = new TextEncoder().encode(text),
    pad = 16 - (raw.length % 16),
    plain = new Uint8Array(raw.length + pad);
  plain.set(raw);
  plain.fill(pad, raw.length);
  const blocks = await Promise.all(
    Array.from({ length: plain.length / 16 }, async (_, i) =>
      new Uint8Array(
        await crypto.subtle.encrypt(
          { name: 'AES-CBC', iv: new Uint8Array(16) },
          key,
          plain.slice(i * 16, i * 16 + 16),
        ),
      ).slice(0, 16),
    ),
  );
  return first + blocks.map(hex).join('') + last;
}

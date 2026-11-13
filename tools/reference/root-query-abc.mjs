/** Independent, bounded decoder for the added project ABC, not original game ABCs.
 * Check actual builtin call sites and restrict writes/calls to the declared glue.
 * This is not a general AVM2 interpreter or a source/compiled Ruffle authenticator.
 */
import assert from 'node:assert/strict';
export function inspectRootQueryAbc(payload, rows, fieldCount) {
  let at = payload.indexOf(0, 4) + 1;
  assert(at > 4, 'Missing added ABC tag name');
  const take = (n) => {
    assert(Number.isInteger(n) && n >= 0 && at + n <= payload.length, 'Truncated added ABC');
    const out = payload.slice(at, at + n);
    at += n;
    return out;
  };
  const byte = () => take(1)[0];
  const uint = () => {
    let n = 0;
    for (let shift = 0; shift <= 28; shift += 7) {
      const b = byte();
      n += (b & 127) * 2 ** shift;
      if (!(b & 128)) return n;
    }
    assert.fail('Oversized added ABC uint');
  };
  assert.deepEqual([...take(4)], [16, 0, 46, 0], 'Unexpected ABC version');
  for (let i = 0; i < 3; i++) assert.equal(uint(), 1, 'Unexpected numeric constant pool');
  const strings = [''];
  for (let count = uint(), i = 1; i < count; i++)
    strings.push(new TextDecoder().decode(take(uint())));
  const namespaces = [''];
  for (let count = uint(), i = 1; i < count; i++) {
    assert.equal(byte(), 0x16, 'Unexpected namespace kind');
    namespaces.push(strings[uint()]);
  }
  for (let count = uint(), i = 1; i < count; i++) {
    const n = uint();
    for (let j = 0; j < n; j++) uint();
  }
  const names = [''];
  for (let count = uint(), i = 1; i < count; i++) {
    const kind = byte();
    if (kind === 7) {
      const ns = namespaces[uint()],
        name = strings[uint()];
      names.push(ns ? `${ns}::${name}` : name);
    } else {
      assert.equal(kind, 0x1b, 'Unexpected multiname kind');
      uint();
      names.push('[Dictionary key]');
    }
  }
  const methodCount = uint();
  for (let i = 0; i < methodCount; i++) {
    const params = uint();
    uint();
    for (let j = 0; j < params; j++) uint();
    uint();
    assert.equal(byte(), 0, 'Unexpected method options');
  }
  assert.equal(uint(), 0, 'Unexpected project metadata');
  function traits() {
    const result = [];
    for (let count = uint(), i = 0; i < count; i++) {
      const name = names[uint()],
        kind = byte();
      assert([1, 4].includes(kind), 'Unexpected ABC trait/write surface');
      result.push({ name, kind, slot: uint(), target: uint() });
    }
    return result;
  }
  const classCount = uint(),
    classes = [];
  assert.equal(classCount, 2, 'Unexpected added class count');
  for (let i = 0; i < classCount; i++) {
    const name = names[uint()],
      parent = names[uint()];
    assert.equal(byte(), 0, 'Unexpected class flags');
    assert.equal(uint(), 0, 'Unexpected interfaces');
    const ctor = uint(),
      members = traits();
    assert.equal(parent, i === 0 ? 'Main' : 'flash.display::MovieClip');
    assert.deepEqual(members, i === 0 ? [{ name: 'onProbeKey', kind: 1, slot: 0, target: 3 }] : []);
    classes.push({ name, parent, ctor });
  }
  for (let i = 0; i < classCount; i++) {
    uint();
    assert.deepEqual(traits(), []);
  }
  assert.equal(uint(), 1, 'Unexpected script count');
  uint();
  const scriptTraits = traits();
  assert.equal(scriptTraits.length, classCount);
  const calls = {},
    reads = {},
    writes = {},
    bodies = [];
  const increment = (map, name) => {
    assert(name, 'Invalid QName');
    map[name] = (map[name] ?? 0) + 1;
  };
  const noOperand = new Set([
    0x1d, 0x20, 0x26, 0x27, 0x30, 0x47, 0x75, 0xa3, 0xac, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6,
    0xd7,
  ]);
  for (let count = uint(), i = 0; i < count; i++) {
    const method = uint();
    uint();
    uint();
    uint();
    uint();
    const length = uint(),
      end = at + length;
    let previous = -1,
      instructions = 0;
    while (at < end) {
      const opcode = byte();
      instructions++;
      if (noOperand.has(opcode)) {
        /* operand-free stack/local operations */
      } else if (opcode === 0x24 || opcode === 0x65) byte();
      else if ([0x25, 0x2c, 0x42, 0x49, 0x58, 0x62, 0x63].includes(opcode)) uint();
      else if (opcode === 0x14) {
        const b = take(3),
          jump = b[0] | (b[1] << 8) | (b[2] << 16);
        assert.equal(method, 3, 'Unexpected branch outside F8 handler');
        assert(jump > 0 && at + jump < end, 'Invalid F8 branch');
      } else if ([0x5d, 0x60, 0x61, 0x66, 0x68].includes(opcode)) {
        const name = names[uint()];
        if (opcode === 0x66) increment(reads, name);
        if (opcode === 0x61) increment(writes, name);
      } else if (opcode === 0x46 || opcode === 0x4f) {
        const name = names[uint()],
          argc = uint();
        increment(calls, name);
        if (name === 'hitTestPoint') {
          assert.equal(argc, 3, 'Wrong builtin hitTestPoint argument count');
          assert.equal(previous, 0x26, 'Shape flag must be actual pushtrue');
        }
      } else assert.fail(`Undeclared project ABC opcode ${opcode.toString(16)}`);
      previous = opcode;
    }
    assert.equal(at, end, 'ABC instruction overrun');
    assert.equal(uint(), 0, 'Unexpected exception handler');
    assert.deepEqual(traits(), []);
    bodies.push({ method, instructions });
  }
  assert.equal(at, payload.length, 'Trailing added ABC bytes');
  assert.equal(bodies.length, methodCount);
  const allowedCalls = new Set([
    'addEventListener',
    'removeEventListener',
    'addChild',
    'removeChild',
    'getChildByName',
    'getChildIndex',
    'hitTestPoint',
    'localToGlobal',
    'globalToLocal',
    'getBounds',
    'writeDouble',
    'readUnsignedInt',
    'trace',
    'flash.utils::getQualifiedClassName',
  ]);
  for (const name of Object.keys(calls)) assert(allowedCalls.has(name), 'Undeclared call ' + name);
  for (const name of Object.keys(writes))
    assert(
      ['x', 'y', 'scaleX', 'scaleY', 'rotation', 'position', '[Dictionary key]'].includes(name),
      'Undeclared write ' + name,
    );
  assert.equal(calls.hitTestPoint, rows * 4, 'Missing raw/stage/root/repeated builtin call sites');
  assert.equal(calls.writeDouble, rows * fieldCount, 'Missing binary getter writes');
  assert.equal(calls.readUnsignedInt, rows * fieldCount * 2, 'Missing binary word reads');
  assert.equal(reads.width, rows, 'Missing Script width read sites');
  assert.equal(reads.height, rows, 'Missing Script height read sites');
  return {
    classes,
    calls,
    reads,
    writes,
    bodies,
    scope:
      'Bounded independent decoding of added glue only; no interpretation of original ABCs or runtime execution coverage.',
  };
}

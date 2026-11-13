#!/usr/bin/env python3
"""Observe original seeker Setup, canonical Spawn and retained target methods.

python3 tools/reference/projectile-target-probe.py ORIGINAL.swf OUTPUT.swf
Load OUTPUT in the existing reference viewer; press F8 after original loading.
Only appended project-authored glue/document binding changes. No original method,
RNG or clock is patched. Controlled calls are not ordinary gameplay evidence.
"""
import hashlib
import json
import struct
import sys
import zlib
from pathlib import Path


def u(value):
    output = bytearray()
    while value > 127:
        output.append((value & 127) | 128)
        value >>= 7
    return bytes(output) + bytes([value])


def tag(code, data=b''):
    return (struct.pack('<H', (code << 6) | min(len(data), 63))
            + (struct.pack('<I', len(data)) if len(data) >= 63 else b'') + data)


ROOT = 'BT3ProjectileTargetProbe'
names = [ROOT, 'Main', 'trace', 'stage', 'addEventListener', 'removeEventListener',
         'onProbeKey', 'keyCode', 'TankData', '_-HJ', 'getInstance', '_-7G',
         'ImportTankData', '_-Tr', 'addChild', 'removeChild', 'arrTankDetails',
         'x', 'y', 'rotation', 'scaleX', '_-0D', '_-XV', 'MovieClip', 'BTAGameWorld',
         'myAvatar', 'mRef', 'gWorldRef', 'currentBFTarget', 'BF_BG_mc',
         'enemyLayer_mc', '_-54', 'intShootTimer', 'intHitTimer', 'SpawnNewBullet',
         'Setup', 'Run', 'RotateTowardTarget', 'SetMovement', 'movTarget',
         'moveX', 'moveY', '_-PJ', 'arrBulletRemoveQueue', 'arrBullets', 'strID',
         'arrEnemies', 'length', 'toPrecision', 'GetHitLocation']
labels = ['spawn-empty', 'spawn-empty-run1', 'spawn-empty-run2', 'setup-empty',
          'setup-empty-run', 'target-born', 'contained-array-missing',
          'detached-stale-array', 'target-loss-run1', 'target-loss-run2',
          'fractional-hit', 'BT3_TARGET', 'BT3_TARGET_POINT', 'BT3_TARGET_DONE', 'BT3_TARGET_BLUEPRINT']
strings = [''] + names + ['_-14', 'flash.display', 'keyDown'] + labels
si = {s: i for i, s in enumerate(strings)}
q = {n: i + 1 for i, n in enumerate(names)}
cp = u(1) + u(1) + u(3) + struct.pack('<dd', 0.079, 0.149)
cp += u(len(strings)) + b''.join(u(len(s.encode())) + s.encode() for s in strings[1:])
cp += u(4) + b''.join(b'\x16' + u(si[s]) for s in ['', '_-14', 'flash.display'])
cp += u(2) + u(1) + u(1)  # public namespace set for runtime array indexing
cp += u(len(names) + 2)
for name in names:
    ns = 2 if name == '_-XV' else 3 if name == 'MovieClip' else 1
    cp += b'\x07' + u(ns) + u(si[name])
array_index = len(names) + 1
cp += b'\x1b' + u(1)


def op(code, *args): return bytes([code]) + b''.join(u(a) for a in args)
def get(n): return bytes([0xd0 + n]) if n < 4 else op(0x62, n)
def put(n): return bytes([0xd4 + n]) if n < 4 else op(0x63, n)
def prop(name): return op(0x66, q[name])
def text(value): return op(0x2c, si[value])
def integer(n): return bytes([0x24, n & 255]) if -128 <= n < 128 else op(0x25, n)
def call(name, count): return op(0x4f, q[name], count)
def value_call(name, count): return op(0x46, q[name], count)
def construct(name): return op(0x60, q[name]) + op(0x42, 0)
def assign(local, name, value): return get(local) + value + op(0x61, q[name])
def precise(value): return value + integer(17) + value_call('toPrecision', 1)


def avatar(local, fractional=False):
    code = construct('TankData') + put(2)
    code += get(2) + op(0x60, q['_-HJ']) + value_call('getInstance', 0) + prop('_-7G')
    code += integer(0) + op(0x66, array_index) + call('ImportTankData', 1)
    code += op(0x5d, q['trace']) + text('BT3_TARGET_BLUEPRINT') + get(2) + prop('strID') + call('trace', 2)
    if fractional:
        detail = get(2) + prop('arrTankDetails') + integer(0) + op(0x66, array_index)
        code += detail + op(0x2f, 1) + op(0x61, q['x'])
        code += detail + op(0x2f, 2) + op(0x61, q['y'])
    return code + get(2) + integer(1) + b'\x20' + value_call('_-Tr', 2) + put(local)


def spawn(local, x, y, target=b'\x20'):
    code = construct('_-XV') + put(local)
    code += get(4) + get(local) + integer(x) + integer(y) + integer(1) + integer(0)
    code += integer(3) + integer(1) + b'\x27\x20' + target + b'\x20'
    return code + call('SpawnNewBullet', 11)


def sample(label, local, target=b'\x20'):
    code = op(0x5d, q['trace']) + text('BT3_TARGET') + text(label)
    for name in ['x', 'y', 'rotation', 'moveX', 'moveY']:
        code += precise(get(local) + prop(name))
    code += get(local) + prop('_-PJ')
    code += get(4) + prop('arrBulletRemoveQueue') + prop('length')
    code += get(4) + prop('arrBullets') + prop('length')
    code += get(local) + prop('movTarget') + target + b'\xac'
    code += get(7) + prop('intHitTimer')
    return code + call('trace', 12)


ctor = get(0) + b'\x30' + get(0) + op(0x49, 0)
ctor += get(0) + prop('stage') + text('keyDown') + get(0) + prop('onProbeKey')
ctor += call('addEventListener', 2) + b'\x47'
probe = get(0) + prop('stage') + text('keyDown') + get(0) + prop('onProbeKey')
probe += call('removeEventListener', 2)
probe += avatar(3) + assign(3, 'x', integer(275)) + assign(3, 'y', integer(225))
probe += get(0) + get(3) + call('addChild', 1)
probe += construct('_-0D') + put(4) + construct('MovieClip') + put(5)
probe += construct('MovieClip') + put(6) + construct('BTAGameWorld') + put(7)
probe += assign(7, 'myAvatar', get(3)) + assign(7, 'mRef', get(0))
probe += assign(7, 'currentBFTarget', get(4)) + assign(7, 'intHitTimer', integer(0))
probe += assign(4, 'gWorldRef', get(7)) + assign(4, 'intShootTimer', integer(0))
probe += assign(4, 'BF_BG_mc', construct('MovieClip'))
probe += assign(4, 'enemyLayer_mc', get(6))
probe += get(4) + get(5) + call('_-54', 1)
probe += get(4) + get(5) + call('addChild', 1) + get(4) + get(6) + call('addChild', 1)
probe += assign(4, 'x', integer(275)) + assign(4, 'y', integer(225))
probe += get(0) + get(4) + call('addChild', 1)
# Canonical Spawn enables _-PJ AFTER failed virtual Setup.
probe += spawn(8, 4, 5) + sample('spawn-empty', 8)
probe += get(8) + call('Run', 0) + sample('spawn-empty-run1', 8)
probe += get(8) + call('Run', 0) + sample('spawn-empty-run2', 8)
# Direct Setup alone has no later birth setter; keep this separate control.
probe += construct('_-XV') + put(9) + get(5) + get(9) + call('addChild', 1)
probe += assign(9, 'x', integer(4)) + assign(9, 'y', integer(5))
probe += get(9) + integer(3) + b'\x20\x20\x27' + integer(1) + get(4) + b'\x20'
probe += call('Setup', 7) + sample('setup-empty', 9)
probe += get(9) + call('Run', 0) + sample('setup-empty-run', 9)
# Original cached hit points and display containment, independent of raw arrays.
probe += avatar(10) + avatar(11)
probe += assign(10, 'y', integer(100)) + assign(11, 'x', integer(100))
probe += get(6) + get(10) + call('addChild', 1) + get(6) + get(11) + call('addChild', 1)
probe += assign(4, 'arrEnemies', get(11) + get(10) + op(0x56, 2))
probe += spawn(12, 0, 0, get(10)) + sample('target-born', 12, get(10))
probe += assign(4, 'arrEnemies', get(11) + op(0x56, 1))
probe += get(12) + call('RotateTowardTarget', 0) + sample('contained-array-missing', 12, get(10))
probe += get(6) + get(10) + call('removeChild', 1)
probe += assign(4, 'arrEnemies', get(11) + get(10) + op(0x56, 2))
probe += get(12) + value_call('RotateTowardTarget', 0) + put(16)
probe += get(12) + get(16) + call('SetMovement', 1) + sample('detached-stale-array', 12, get(11))
probe += get(6) + get(11) + call('removeChild', 1) + assign(4, 'arrEnemies', op(0x56, 0))
probe += get(12) + call('Run', 0) + sample('target-loss-run1', 12, get(11))
probe += get(12) + call('Run', 0) + sample('target-loss-run2', 12, get(11))
probe += avatar(13, True) + assign(13, 'x', integer(100)) + assign(13, 'y', integer(100))
probe += assign(13, 'rotation', integer(90)) + get(6) + get(13) + call('addChild', 1)
probe += assign(4, 'arrEnemies', get(13) + op(0x56, 1)) + spawn(14, 0, 0, get(13))
probe += sample('fractional-hit', 14, get(13))
probe += get(13) + value_call('GetHitLocation', 0) + put(15)
probe += op(0x5d, q['trace']) + text('BT3_TARGET_POINT')
probe += precise(get(15) + prop('x')) + precise(get(15) + prop('y'))
probe += precise(get(14) + value_call('RotateTowardTarget', 0)) + call('trace', 4)
probe += op(0x5d, q['trace']) + text('BT3_TARGET_DONE') + call('trace', 1)
key = get(0) + b'\x30' + get(1) + prop('keyCode') + integer(119)
key += b'\x14' + len(probe).to_bytes(3, 'little', signed=True) + probe + b'\x47'
script = (get(0) + b'\x30' + op(0x65, 0) + op(0x60, q['Main']) + b'\x30'
          + op(0x60, q['Main']) + op(0x58, 0) + b'\x1d' + op(0x68, q[ROOT]) + b'\x47')
methods = u(4) + b''.join(u(0) + u(0) + u(0) + b'\0' for _ in range(3))
methods += u(1) + u(0) + u(0) + u(0) + b'\0'
instance = u(q[ROOT]) + u(q['Main']) + b'\0' + u(0) + u(0)
instance += u(1) + u(q['onProbeKey']) + b'\1' + u(0) + u(3)
classes = u(1) + instance + u(1) + u(0)
scripts = u(1) + u(2) + u(1) + u(q[ROOT]) + b'\4' + u(1) + u(0)


def body(index, code, stack, count, depth, maximum):
    return (u(index) + u(stack) + u(count) + u(depth) + u(maximum)
            + u(len(code)) + code + u(0) + u(0))


bodies = u(4) + body(0, ctor, 4, 1, 1, 2)
bodies += body(1, get(0) + b'\x30\x47', 1, 1, 1, 2)
bodies += body(2, script, 2, 1, 0, 2) + body(3, key, 24, 17, 1, 2)
abc = struct.pack('<HH', 16, 46) + cp + methods + u(0) + classes + scripts + bodies
probe_tag = tag(82, struct.pack('<I', 0) + b'projectile-target-probe\0' + abc)

original_bytes = Path(sys.argv[1]).read_bytes()
original = original_bytes
if original[:3] == b'CWS':
    # The research file has a CWS signature but already-expanded body. Match the
    # existing project parser's length-based handling of that known carrier.
    expanded = original[8:] if len(original) == struct.unpack_from('<I', original, 4)[0] else zlib.decompress(original[8:])
    original = b'FWS' + original[3:8] + expanded
if original[:3] != b'FWS':
    raise SystemExit('Supply the local research SWF.')
start = 8 + (5 + 4 * (original[8] >> 3) + 7) // 8 + 4
output = original[8:start]
position, modified = start, False
original_abc = []
while position < len(original):
    record_start = position
    header, = struct.unpack_from('<H', original, position)
    code, length = header >> 6, header & 63
    position += 2
    if length == 63:
        length, = struct.unpack_from('<I', original, position)
        position += 4
    data = original[position:position + length]
    position += length
    if code in (72, 82):
        original_abc.append(hashlib.sha256(data).hexdigest())
    if code == 76:
        count, = struct.unpack_from('<H', data)
        cursor, renamed, found = 2, data[:2], False
        for _ in range(count):
            cid, = struct.unpack_from('<H', data, cursor)
            cursor += 2
            end = data.index(0, cursor)
            name, cursor = data[cursor:end], end + 1
            if cid == 0:
                if name != b'Main' or modified:
                    raise SystemExit('Expected one Main document binding.')
                name, found, modified = ROOT.encode(), True, True
            renamed += struct.pack('<H', cid) + name + b'\0'
        if found:
            output += probe_tag + tag(76, renamed)
            continue
    output += original[record_start:position]
if not modified:
    raise SystemExit('No document binding found.')
result = b'FWS' + original[3:4] + struct.pack('<I', len(output) + 8) + output
Path(sys.argv[2]).write_bytes(result)
print(json.dumps({'original_sha256': hashlib.sha256(original_bytes).hexdigest(),
    'probe_sha256': hashlib.sha256(result).hexdigest(),
    'emitter_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    'preserved_original_abc_tag_payloads': original_abc,
    'added_probe_abc_sha256': hashlib.sha256(abc).hexdigest()}, indent=2))

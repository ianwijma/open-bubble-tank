#!/usr/bin/env python3
"""Distinct preserved-original display probe; no original code/RNG replacement.

F8 calls original field.Setup, DeathAnimPart2 and 119 ShrinkBubblefield calls
synchronously on original avatar/field/layer clips with real Main.sEffects.
DeathAnimPart3's six transform writes, next-layer construction and detach are
explicit GLUE controls; no World.Run, destruction, arrival or event timing claim.
"""
import hashlib
import json
import struct
import sys
import zlib
from fractions import Fraction
from pathlib import Path


def u(value):
    result = bytearray()
    while value > 127:
        result.append((value & 127) | 128)
        value >>= 7
    return bytes(result) + bytes([value])


def tag(code, data=b''):
    return (struct.pack('<H', (code << 6) | min(len(data), 63))
            + (struct.pack('<I', len(data)) if len(data) >= 63 else b'') + data)


if len(sys.argv) != 3 or Path(sys.argv[1]).resolve() == Path(sys.argv[2]).resolve():
    raise SystemExit('Supply distinct ORIGINAL OUTPUT paths.')
ROOT = 'BT3WorldLayerProbe'
roles = [('root', 2, 1), ('bottom', 7, 9), ('top', 5, 1), ('bullet', 4, 1),
         ('highlight', 6, 1), ('avatar', 3, 1), ('background', 10, 2),
         ('under', 9, 2), ('screen', 8, 1), ('world', 1, 0), ('main', 0, 'stage')]
next_roles = [('nextRoot', 16, 1), ('nextBullet', 17, 1),
              ('nextTop', 18, 1), ('nextHighlight', 19, 1)]
fields = ['scaleX', 'scaleY', 'x', 'y', 'alpha']
fields += ['own.' + p for p in ['a', 'b', 'c', 'd', 'tx', 'ty']]
fields += ['concatenated.' + p for p in ['a', 'b', 'c', 'd', 'tx', 'ty']]
fields += ['point0.x', 'point0.y', 'point100x40.x', 'point100x40.y']
names = [ROOT, 'Main', 'trace', 'stage', 'stageWidth', 'stageHeight',
         'addEventListener', 'removeEventListener', 'onProbeKey', 'keyCode',
         'addChild', 'removeChild', 'TankData', '_-HJ', 'getInstance', '_-7G',
         'ImportTankData', '_-Tr', 'strID', 'BTAGameWorld', 'Bubblefield',
         '_-dl', '_-My', '_-Zs', '_-Rt', 'MovieClip', 'ByteArray', 'Point',
         'getQualifiedClassName', 'parent', 'scaleX', 'scaleY', 'x', 'y', 'alpha',
         'transform', 'matrix', 'concatenatedMatrix', 'a', 'b', 'c', 'd', 'tx', 'ty',
         'localToGlobal', 'writeDouble', 'position', 'readUnsignedInt', 'Setup',
         'gWorldRef', 'mRef', 'myAvatar', 'currentBFTarget', '_-00', 'currEffectLayer',
         'currEffectLayer2', '_-JZ', 'effectLayer_under_mc', 'BF_BG_mc',
         'effect_mask_under', '_-SQ', 'BF_over_detail_mc', 'DeathAnimPart2', 'ShrinkBubblefield']
labels = ['BT3_WORLD_BEGIN', 'BT3_WORLD_AVATAR', 'BT3_WORLD_BITS', 'BT3_WORLD_DONE',
          'keyDown', 'enterFrame', 'collapse', 'main-fraction', 'finish-glue',
          'detach-glue', 'next-glue'] + [r[0] for r in roles + next_roles]
strings = [''] + list(dict.fromkeys(names + labels + ['flash.display', 'flash.geom', 'flash.utils']))
si = {s: i for i, s in enumerate(strings)}
q = {n: i + 1 for i, n in enumerate(names)}
cp = u(1) + u(1) + u(1)
cp += u(len(strings)) + b''.join(u(len(s.encode())) + s.encode() for s in strings[1:])
cp += u(5) + b''.join(b'\x16' + u(si[s]) for s in ['', 'flash.display', 'flash.geom', 'flash.utils'])
cp += u(2) + u(1) + u(1) + u(len(names) + 2)
for name in names:
    ns = 2 if name == 'MovieClip' else 3 if name == 'Point' else 4 if name in ('ByteArray', 'getQualifiedClassName') else 1
    cp += b'\x07' + u(ns) + u(si[name])
array_index = len(names) + 1
cp += b'\x1b' + u(1)


def op(code, *args): return bytes([code]) + b''.join(u(a) for a in args)
def get(n): return bytes([0xd0 + n]) if n < 4 else op(0x62, n)
def put(n): return bytes([0xd4 + n]) if n < 4 else op(0x63, n)
def prop(n): return op(0x66, q[n])
def text(s): return op(0x2c, si[s])
def integer(n):
    return bytes([0x24, n & 255]) if -128 <= n < 128 else op(0x25, n & 65535)
def number(n):
    f = Fraction(str(n))
    return integer(f.numerator) + integer(f.denominator) + b'\xa3'
def call(n, count): return op(0x4f, q[n], count)
def value_call(n, count): return op(0x46, q[n], count)
def construct(n): return op(0x60, q[n]) + op(0x42, 0)
def assign(local, n, value): return get(local) + value + op(0x61, q[n])
def emit(label, values):
    return op(0x5d, q['trace']) + text(label) + b''.join(values) + call('trace', 1 + len(values))
def qualified(value): return op(0x5d, q['getQualifiedClassName']) + value + value_call('getQualifiedClassName', 1)
def attach(parent, child): return get(parent) + get(child) + call('addChild', 1)
def sample(phase, age, role, local, parent):
    code = get(local) + prop('transform') + prop('matrix') + put(11)
    code += get(local) + prop('transform') + prop('concatenatedMatrix') + put(12)
    values = [get(local) + prop(p) for p in ['scaleX', 'scaleY', 'x', 'y', 'alpha']]
    values += [get(m) + prop(p) for m in [11, 12] for p in ['a', 'b', 'c', 'd', 'tx', 'ty']]
    # Keep independently computed Point results, not a host matrix multiplication.
    code += get(local) + op(0x60, q['Point']) + integer(0) + integer(0) + op(0x42, 2) + value_call('localToGlobal', 1) + put(13)
    code += get(local) + op(0x60, q['Point']) + integer(100) + integer(40) + op(0x42, 2) + value_call('localToGlobal', 1) + put(20)
    values += [get(m) + prop(p) for m in [13, 20] for p in ['x', 'y']]
    expected_parent = b'\x20' if parent is None else get(0) + prop('stage') if parent == 'stage' else get(parent)
    code += op(0x5d, q['trace']) + text('BT3_WORLD_BITS') + text(phase) + integer(age) + text(role)
    code += qualified(get(local)) + qualified(get(local) + prop('parent'))
    code += get(local) + prop('parent') + expected_parent + b'\xac'
    for value in values:
        code += assign(14, 'position', integer(0)) + get(14) + value + call('writeDouble', 1)
        code += assign(14, 'position', integer(0))
        code += get(14) + value_call('readUnsignedInt', 0) + get(14) + value_call('readUnsignedInt', 0)
    return code + call('trace', 7 + 2 * len(values))


ctor = get(0) + b'\x30' + get(0) + op(0x49, 0)
ctor += get(0) + prop('stage') + text('keyDown') + get(0) + prop('onProbeKey') + call('addEventListener', 2) + b'\x47'
probe = get(0) + prop('stage') + text('keyDown') + get(0) + prop('onProbeKey') + call('removeEventListener', 2)
probe += assign(0, 'x', integer(0)) + assign(0, 'y', integer(0))
probe += emit('BT3_WORLD_BEGIN', [get(0) + prop('stage') + prop('stageWidth'), get(0) + prop('stage') + prop('stageHeight')])
probe += construct('ByteArray') + put(14)
probe += construct('BTAGameWorld') + put(1) + attach(0, 1)
probe += assign(1, 'x', integer(275)) + assign(1, 'y', integer(225)) + assign(1, 'mRef', get(0))
for local, cls in [(2, 'Bubblefield'), (4, '_-dl'), (5, '_-My'), (6, '_-Zs'), (7, '_-Rt'), (8, 'MovieClip')]:
    probe += construct(cls) + put(local)
probe += get(2) + prop('effectLayer_under_mc') + put(9)
probe += get(2) + prop('BF_BG_mc') + put(10)
probe += attach(1, 2) + attach(9, 7)
for local in [4, 5, 6, 8]: probe += attach(1, local)
for local in [2, 4, 5, 6]:
    probe += assign(local, 'x', integer(-140)) + assign(local, 'y', integer(70))
# Four source wave child assignments Y then X; root stays scale1.
for n in ['effect_mask_under', '_-SQ', 'BF_over_detail_mc', 'BF_BG_mc']:
    for axis in ['scaleY', 'scaleX']:
        probe += get(2) + prop(n) + number(1.4) + op(0x61, q[axis])
probe += assign(6, 'scaleY', number(1.4)) + assign(6, 'scaleX', number(1.4))
probe += construct('TankData') + put(15)
probe += get(15) + op(0x60, q['_-HJ']) + value_call('getInstance', 0) + prop('_-7G') + integer(0) + op(0x66, array_index) + call('ImportTankData', 1)
probe += emit('BT3_WORLD_AVATAR', [get(15) + prop('strID')])
probe += get(15) + integer(1) + get(1) + value_call('_-Tr', 2) + put(3) + attach(1, 3)
for n, local in [('myAvatar', 3), ('currentBFTarget', 2), ('_-00', 4), ('currEffectLayer', 5), ('currEffectLayer2', 7), ('_-JZ', 6)]:
    probe += assign(1, n, get(local))
probe += assign(2, 'gWorldRef', get(1)) + get(2) + get(0) + call('Setup', 1)
# Real method captures private scaleChange. Remove only its newly added listener;
# invoke it synchronously to isolate setter mechanics from ENTER_FRAME ordering.
probe += get(2) + call('DeathAnimPart2', 0)
probe += get(2) + text('enterFrame') + get(2) + prop('ShrinkBubblefield') + call('removeEventListener', 2)
for role in roles: probe += sample('collapse', 0, *role)
for age in range(1, 120):
    probe += get(2) + b'\x20' + call('ShrinkBubblefield', 1)
    if age in [1, 2, 51, 119]:
        for role in roles: probe += sample('collapse', age, *role)
# Separate ancestor setters; do not fold this into World translation.
probe += assign(0, 'x', number(0.07)) + assign(0, 'y', number(-0.07))
for role in roles: probe += sample('main-fraction', 119, *role)
probe += assign(0, 'x', integer(0)) + assign(0, 'y', integer(0))
# GLUE: exact numeric prefix only. Original DeathAnimPart3 then calls Destroy,
# requiring active interface/map/field transitions absent from this finite probe.
probe += assign(3, 'scaleY', integer(1)) + assign(3, 'scaleX', integer(1))
probe += assign(3, 'x', integer(0)) + assign(3, 'y', integer(0))
probe += assign(2, 'alpha', integer(0)) + assign(6, 'alpha', integer(0))
for role in roles: probe += sample('finish-glue', 120, *role)
# GLUE next construction: next root differs from current; bullet/top copy CURRENT.
for local, cls in [(16, 'Bubblefield'), (17, '_-dl'), (18, '_-My'), (19, '_-Zs')]:
    probe += construct(cls) + put(local)
probe += assign(16, 'x', integer(700)) + assign(16, 'y', integer(-90)) + attach(1, 16)
for local, origin in [(19, 16), (17, 2), (18, 2)]:
    for axis in ['x', 'y']: probe += assign(local, axis, get(origin) + prop(axis))
    if local == 19:
        probe += assign(local, 'scaleY', number(1.4)) + assign(local, 'scaleX', number(1.4))
    probe += attach(1, local)
for role in next_roles: probe += sample('next-glue', 120, *role)
# Retain children under detached root; detach bottom independently first.
# Keep a nonzero Main control live so detached Points must lose BOTH ancestors.
probe += assign(0, 'x', number(0.07)) + assign(0, 'y', number(-0.07))
probe += get(9) + get(7) + call('removeChild', 1)
for local in [4, 5, 2, 6]: probe += get(1) + get(local) + call('removeChild', 1)
for role, local, parent in roles[:5] + roles[6:8]:
    probe += sample('detach-glue', 120, role, local, None if local in [2, 4, 5, 6, 7] else parent)
for role in roles[-2:]: probe += sample('detach-glue', 120, *role)
probe += emit('BT3_WORLD_DONE', [])
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
bodies += body(2, script, 2, 1, 0, 2) + body(3, key, 56, 21, 1, 2)
abc = struct.pack('<HH', 16, 46) + cp + methods + u(0) + classes + scripts + bodies
probe_tag = tag(82, struct.pack('<I', 0) + b'world-layer-probe\0' + abc)
original_bytes = Path(sys.argv[1]).read_bytes()
original = original_bytes
if original[:3] == b'CWS':
    expanded = original[8:] if len(original) == struct.unpack_from('<I', original, 4)[0] else zlib.decompress(original[8:])
    original = b'FWS' + original[3:8] + expanded
if original[:3] != b'FWS': raise SystemExit('Supply original SWF.')
start = 8 + (5 + 4 * (original[8] >> 3) + 7) // 8 + 4
output = original[8:start]
position, modified, abcs = start, False, []
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
    if code in (72, 82): abcs.append(hashlib.sha256(data).hexdigest())
    if code == 76:
        count, = struct.unpack_from('<H', data)
        cursor, renamed, found = 2, data[:2], False
        for _ in range(count):
            cid, = struct.unpack_from('<H', data, cursor)
            cursor += 2
            end = data.index(0, cursor)
            name, cursor = data[cursor:end], end + 1
            if cid == 0:
                if name != b'Main' or modified: raise SystemExit('Expected one original Main binding.')
                name, found, modified = ROOT.encode(), True, True
            renamed += struct.pack('<H', cid) + name + b'\0'
        if found:
            output += probe_tag + tag(76, renamed)
            continue
    output += original[record_start:position]
if not modified: raise SystemExit('Missing original document binding.')
result = b'FWS' + original[3:4] + struct.pack('<I', len(output) + 8) + output
Path(sys.argv[2]).write_bytes(result)
print(json.dumps({'original_sha256': hashlib.sha256(original_bytes).hexdigest(),
    'probe_sha256': hashlib.sha256(result).hexdigest(),
    'emitter_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    'preserved_original_abc_tag_payloads': abcs,
    'added_probe_abc_sha256': hashlib.sha256(abc).hexdigest(),
    'fields': fields, 'roles': roles, 'next_roles': next_roles,
    'source_sha256': {str(p.relative_to(Path(sys.argv[1]).parent)): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in [Path(sys.argv[1]).parent / 'export_pcode' / 'scripts' / (n + '.pcode')
            for n in ['Main', 'BTAGameWorld', '_-0D', 'TankData', '_-Zx', '_-1w', 'Bubblefield', '_-dl', '_-My', '_-Zs', '_-Rt']]},
    'scope': __doc__}, indent=2))

#!/usr/bin/env python3
"""Add a controlled original-method probe to a local research SWF.

Usage: python3 tools/reference/turret-target-probe.py INPUT_SWF OUTPUT_SWF [--named-inner] [--rejected-birth]
Load the result in the reference viewer and press F8 after loading. The one-shot
key handler constructs the original first builtin avatar and _-ct._-DO, then
calls the original EnemyAim with that avatar as movTarget. No method is patched.
This is controlled Ruffle execution, not an ordinary encounter or Adobe evidence.
Only this project-authored emitter belongs in git; never commit its SWF output.
"""
import hashlib
import json
import struct
import sys
import zlib
from pathlib import Path


def u(value):
    output = []
    while value > 127:
        output.append((value & 127) | 128)
        value >>= 7
    return bytes(output + [value])


def tag(code, data=b''):
    return (struct.pack('<H', (code << 6) | min(len(data), 63))
            + (struct.pack('<I', len(data)) if len(data) >= 63 else b'') + data)


names = ['BT3TurretTargetProbe', 'Main', 'trace', 'stage', 'addEventListener',
         'removeEventListener', 'probeTurretTarget', 'TankData', '_-HJ',
         'getInstance', '_-UH', 'ImportTankData', '_-Tr', 'addChild',
         'numChildren', 'movTarget', 'Setup', 'EnemyAim', '_-DO', 'MovieClip', 'rotation',
         'arrTankDetails', 'name', '_-0D', 'EnemyTurret', 'SpawnNewBullet',
         'parent', 'x', 'y', '_-Yn', 'intDamage', 'blnEnemy', 'objHomeTank']
strings = [''] + names + ['_-ct', 'flash.display', '_-14', 'keyDown',
                          'BT3_TURRET_PROBE_BEFORE', 'BT3_TURRET_PROBE_AFTER',
                          'BT3_TURRET_BIRTH', 'inner_mc']
si = {name: index for index, name in enumerate(strings)}
q = {name: index + 1 for index, name in enumerate(names)}
cp = u(1) + u(1) + u(1) + u(len(strings))
cp += b''.join(u(len(s.encode())) + s.encode() for s in strings[1:])
cp += u(5) + b''.join(bytes([0x16]) + u(si[s]) for s in ['', '_-ct', 'flash.display', '_-14'])
cp += u(2) + u(1) + u(1)  # Namespace set1 contains only public namespace1.
cp += u(len(names) + 2)
for name in names:
    namespace = 2 if name == '_-DO' else 3 if name == 'MovieClip' else 4 if name == 'EnemyTurret' else 1
    cp += bytes([7]) + u(namespace) + u(si[name])
runtime_index = len(names) + 1
cp += bytes([0x1b]) + u(1)  # MultinameL for the builtin avatar table's index0.


def op(code, *args): return bytes([code]) + b''.join(u(arg) for arg in args)
def get(local): return bytes([0xd0 + local]) if local < 4 else op(0x62, local)
def put(local): return bytes([0xd4 + local]) if local < 4 else op(0x63, local)
def prop(name): return op(0x66, q[name])
def text(value): return op(0x2c, si[value])
def call(name, count): return op(0x4f, q[name], count)
def value_call(name, count): return op(0x46, q[name], count)


ctor = get(0) + bytes([0x30]) + get(0) + op(0x49, 0)
ctor += get(0) + prop('stage') + text('keyDown') + get(0) + prop('probeTurretTarget')
ctor += call('addEventListener', 2) + bytes([0x47])

probe = get(0) + bytes([0x30])
probe += get(0) + prop('stage') + text('keyDown') + get(0) + prop('probeTurretTarget')
probe += call('removeEventListener', 2)
# TankData.ImportTankData(_-HJ.getInstance()._-UH[0]); no original code string is embedded.
probe += op(0x5d, q['TankData']) + op(0x4a, q['TankData'], 0) + put(2)
probe += get(2) + op(0x60, q['_-HJ']) + value_call('getInstance', 0) + prop('_-UH')
probe += op(0x24, 0) + op(0x66, runtime_index) + call('ImportTankData', 1)
if '--named-inner' in sys.argv:
    # A separate control: does naming a source part inner_mc create a readable slot?
    probe += get(2) + prop('arrTankDetails') + op(0x24, 0) + op(0x66, runtime_index)
    probe += text('inner_mc') + op(0x61, q['name'])
# Construct the actual source avatar and give it a nonnull parent.
probe += get(2) + op(0x24, 1) + bytes([0x20]) + value_call('_-Tr', 2) + put(3)
probe += get(0) + get(3) + call('addChild', 1)
if '--rejected-birth' in sys.argv:
    # An uninitialized source wrapper has no bullet layer, closing the birth gate.
    probe += op(0x60, q['_-0D']) + op(0x42, 0) + put(5)
    probe += op(0x60, q['EnemyTurret']) + op(0x42, 0) + put(6)
    probe += get(5) + get(6) + op(0x24, 12) + op(0x24, 23) + op(0x24, 1)
    probe += op(0x24, 45) + op(0x24, 10) + op(0x24, 0)
    probe += bytes([0x26, 0x20, 0x20]) + get(3) + value_call('SpawnNewBullet', 11) + put(7)
    probe += op(0x5d, q['trace']) + text('BT3_TURRET_BIRTH') + get(6) + get(7) + bytes([0xac])
    for name in ['parent', 'x', 'y', 'rotation', '_-Yn', 'intDamage', 'blnEnemy', 'objHomeTank']:
        probe += get(7) + prop(name)
    probe += call('trace', 10)
probe += op(0x60, q['_-DO']) + op(0x42, 0) + put(4)
probe += get(4) + get(3) + call('Setup', 1)
probe += get(4) + get(3) + op(0x61, q['movTarget'])
probe += op(0x5d, q['trace']) + text('BT3_TURRET_PROBE_BEFORE') + get(3)
probe += get(3) + prop('numChildren') + call('trace', 3)
# Leave the original read uncaught so the runtime reports its own error/stack.
probe += get(4) + call('EnemyAim', 0)
probe += op(0x5d, q['trace']) + text('BT3_TURRET_PROBE_AFTER')
probe += get(4) + prop('rotation') + call('trace', 2) + bytes([0x47])

scriptcode = (get(0) + bytes([0x30]) + op(0x65, 0) + op(0x60, q['Main']) + bytes([0x30])
              + op(0x60, q['Main']) + op(0x58, 0) + bytes([0x1d])
              + op(0x68, q['BT3TurretTargetProbe']) + bytes([0x47]))
methods = u(4) + b''.join(u(0) + u(0) + u(0) + bytes([0]) for _ in range(3))
methods += u(1) + u(0) + u(0) + u(0) + bytes([0])
instance = u(q['BT3TurretTargetProbe']) + u(q['Main']) + bytes([0]) + u(0) + u(0)
instance += u(1) + u(q['probeTurretTarget']) + bytes([1]) + u(0) + u(3)
classes = u(1) + instance + u(1) + u(0)
scripts = u(1) + u(2) + u(1) + u(q['BT3TurretTargetProbe']) + bytes([4]) + u(1) + u(0)


def body(index, code, stack, locals, depth, maximum):
    return u(index) + u(stack) + u(locals) + u(depth) + u(maximum) + u(len(code)) + code + u(0) + u(0)


bodies = u(4) + body(0, ctor, 4, 1, 1, 2)
bodies += body(1, get(0) + bytes([0x30, 0x47]), 1, 1, 1, 2)
bodies += body(2, scriptcode, 2, 1, 0, 2) + body(3, probe, 20, 8, 1, 2)
abc = struct.pack('<HH', 16, 46) + cp + methods + u(0) + classes + scripts + bodies
probe_tag = tag(82, struct.pack('<I', 0) + b'turret-target-probe\0' + abc)
original_bytes = Path(sys.argv[1]).read_bytes()
original = original_bytes
if original[:3] == b'CWS':
    expanded = original[8:] if len(original) == struct.unpack_from('<I', original, 4)[0] else zlib.decompress(original[8:])
    original = b'FWS' + original[3:8] + expanded
if original[:3] != b'FWS':
    raise SystemExit('Supply the local research SWF.')
nbits = original[8] >> 3
start = 8 + (5 + 4 * nbits + 7) // 8 + 4
output = original[8:start]
position = start
modified = False
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
        cursor = 2
        renamed = data[:2]
        found = False
        for _ in range(count):
            cid, = struct.unpack_from('<H', data, cursor)
            cursor += 2
            end = data.index(0, cursor)
            name = data[cursor:end]
            cursor = end + 1
            if cid == 0:
                if name != b'Main' or modified:
                    raise SystemExit('Expected one Main document binding.')
                name = b'BT3TurretTargetProbe'
                found = modified = True
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
                  'preserved_original_abc_tag_payloads': original_abc,
                  'added_probe_abc_sha256': hashlib.sha256(abc).hexdigest()}, indent=2))

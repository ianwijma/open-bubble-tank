#!/usr/bin/env python3
"""Append project-authored observation glue; never patch original ABC/methods.

python3 tools/reference/projectile-frame-probe.py ORIGINAL.swf OUTPUT.swf
Load OUTPUT in the reference viewer, focus the movie, and press F8 once after
loading. Observe original roots before/after attachment and 40 ENTER/EXIT_FRAME
pairs. No Setup/Run, callback invocation, RNG override, or physics is performed.
SWF outputs and captures must remain local and ignored.
"""
import hashlib
import json
import struct
import sys
import zlib
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


CLASSES = [('_-U7', ''), ('_-QM', '_-14'), ('_-XV', '_-14'),
           ('AvatarRocket', ''), ('_-Kk', '_-14'), ('_-BL', '')]
ROOT = 'BT3ProjectileFrameProbe'
names = [ROOT, 'Main', 'trace', 'stage', 'addEventListener',
         'removeEventListener', 'onProbeKey', 'onProbeEnter', 'onProbeExit',
         'addChild', 'keyCode', 'r', 'currentFrame', 'totalFrames',
         'parent', 'numChildren', 'getQualifiedClassName', 'probeTick']
names += [n for n, _ in CLASSES] + [f'probeP{i}' for i in range(len(CLASSES))]
strings = [''] + names + ['_-14', 'flash.utils', 'keyDown', 'enterFrame',
    'exitFrame', 'BT3_PROJECTILE_SAMPLE', 'BT3_PROJECTILE_DONE', 'BT3_PROJECTILE_BEGIN',
    'detached', 'attached', 'enter', 'exit', 'unavailable']
si = {s: i for i, s in enumerate(strings)}
q = {n: i + 1 for i, n in enumerate(names)}
cp = u(1) + u(1) + u(1) + u(len(strings))
cp += b''.join(u(len(s.encode())) + s.encode() for s in strings[1:])
cp += u(4) + b''.join(b'\x16' + u(si[s]) for s in ['', '_-14', 'flash.utils'])
cp += u(1) + u(len(names) + 1)
for n in names:
    ns = 2 if n in ['_-QM', '_-XV', '_-Kk'] else 3 if n == 'getQualifiedClassName' else 1
    cp += b'\x07' + u(ns) + u(si[n])


def op(code, *args): return bytes([code]) + b''.join(u(a) for a in args)
def get(n): return bytes([0xd0 + n])
def prop(n): return op(0x66, q[n])
def text(s): return op(0x2c, si[s])
def call(n, count): return op(0x4f, q[n], count)
def branch(code, offset): return bytes([code]) + int(offset).to_bytes(3, 'little', signed=True)
def set_this(n, value): return get(0) + value + op(0x61, q[n])


def listener(action, event, method):
    return (get(0) + prop('stage') + text(event) + get(0) + prop(method)
            + call(action, 2))


def sample(phase, i):
    p = get(0) + prop(f'probeP{i}')
    code = op(0x5d, q['trace']) + text('BT3_PROJECTILE_SAMPLE') + text(phase)
    code += text(CLASSES[i][0]) + get(0) + prop('probeTick')
    code += op(0x5d, q['getQualifiedClassName']) + p + op(0x46, q['getQualifiedClassName'], 1)
    for field in ['r', 'currentFrame', 'totalFrames']:
        code += p + prop(field)
    code += text('unavailable')  # MovieClip.isPlaying is unavailable in this runtime.
    code += p + prop('parent') + b'\x20\xac'  # parent === null
    code += p + prop('numChildren')
    return code + call('trace', 11)


ctor = get(0) + b'\x30' + get(0) + op(0x49, 0)
ctor += listener('addEventListener', 'keyDown', 'onProbeKey') + b'\x47'
key_body = listener('removeEventListener', 'keyDown', 'onProbeKey')
key_body += op(0x5d, q['trace']) + text('BT3_PROJECTILE_BEGIN') + call('trace', 1)
key_body += set_this('probeTick', op(0x24, 0))
for i, (name, _) in enumerate(CLASSES):
    key_body += set_this(f'probeP{i}', op(0x60, q[name]) + op(0x42, 0))
    key_body += sample('detached', i)
for i in range(len(CLASSES)):
    key_body += get(0) + get(0) + prop(f'probeP{i}') + call('addChild', 1)
    key_body += sample('attached', i)
key_body += listener('addEventListener', 'enterFrame', 'onProbeEnter')
key_body += listener('addEventListener', 'exitFrame', 'onProbeExit')
key = get(0) + b'\x30' + get(1) + prop('keyCode') + op(0x24, 119)
key += branch(0x14, len(key_body)) + key_body + b'\x47'
enter = get(0) + b'\x30' + set_this('probeTick', get(0) + prop('probeTick') + b'\x91')
enter += b''.join(sample('enter', i) for i in range(len(CLASSES))) + b'\x47'
finish = listener('removeEventListener', 'enterFrame', 'onProbeEnter')
finish += listener('removeEventListener', 'exitFrame', 'onProbeExit')
finish += op(0x5d, q['trace']) + text('BT3_PROJECTILE_DONE') + get(0) + prop('probeTick') + call('trace', 2)
exit_code = get(0) + b'\x30' + b''.join(sample('exit', i) for i in range(len(CLASSES)))
exit_code += get(0) + prop('probeTick') + op(0x24, 40) + branch(0x15, len(finish)) + finish + b'\x47'
script = (get(0) + b'\x30' + op(0x65, 0) + op(0x60, q['Main']) + b'\x30'
          + op(0x60, q['Main']) + op(0x58, 0) + b'\x1d' + op(0x68, q[ROOT]) + b'\x47')
methods = u(6) + b''.join(u(0) + u(0) + u(0) + b'\x00' for _ in range(3))
methods += b''.join(u(1) + u(0) + u(0) + u(0) + b'\x00' for _ in range(3))
traits = b''.join(u(q[n]) + b'\x01' + u(0) + u(index)
                  for n, index in [('onProbeKey', 3), ('onProbeEnter', 4), ('onProbeExit', 5)])
for n in ['probeTick'] + [f'probeP{i}' for i in range(len(CLASSES))]:
    traits += u(q[n]) + b'\x00' + u(0) + u(0) + u(0)
instance = u(q[ROOT]) + u(q['Main']) + b'\x00' + u(0) + u(0) + u(10) + traits
classes = u(1) + instance + u(1) + u(0)
scripts = u(1) + u(2) + u(1) + u(q[ROOT]) + b'\x04' + u(1) + u(0)


def body(index, code, stack, locals_count, depth, maximum):
    return (u(index) + u(stack) + u(locals_count) + u(depth) + u(maximum)
            + u(len(code)) + code + u(0) + u(0))


bodies = u(6) + body(0, ctor, 4, 1, 1, 2)
bodies += body(1, get(0) + b'\x30\x47', 1, 1, 1, 2) + body(2, script, 2, 1, 0, 2)
for index, code in [(3, key), (4, enter), (5, exit_code)]:
    bodies += body(index, code, 20, 2, 1, 2)
abc = struct.pack('<HH', 16, 46) + cp + methods + u(0) + classes + scripts + bodies
probe_tag = tag(82, struct.pack('<I', 0) + b'projectile-frame-probe\0' + abc)
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

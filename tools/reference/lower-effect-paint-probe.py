#!/usr/bin/env python3
"""Finite original1551 LOWER-EFFECT MASK paint controls, not hit testing or World.Run.

Original Main/Bubblefield constructors and BitmapData.draw/getPixel32 execute.
A genuine original1544 disc is reparented into original1540 as a GLUE paint target.
ALL visibility, position and mask-rotation writes are explicitly GLUE,
not calls to private World/AvatarInterface methods. Original ABCs are untouched.
The u/tag/ABC assembly pattern follows the read world-layer and blur emitters.
"""
import hashlib
import json
import struct
import subprocess
import sys
from pathlib import Path


def u(n):
    out = bytearray()
    while n > 127:
        out.append((n & 127) | 128)
        n >>= 7
    return bytes(out) + bytes([n])


def tag(code, data=b''):
    return struct.pack('<H', (code << 6) | min(len(data), 63)) + (struct.pack('<I', len(data)) if len(data) >= 63 else b'') + data


if len(sys.argv) != 3 or Path(sys.argv[1]).resolve() == Path(sys.argv[2]).resolve():
    raise SystemExit('Supply distinct ORIGINAL OUTPUT paths.')
ROOT = 'BT3LowerEffectPaintProbe'
# Independent original lower-mask observations, not candidate circle expectations.
points = [(x, y) for y in [-30, -4, -3, -1, 0, 1, 3, 4, 30] for x in [-45, -20, 0, 20, 45]]
cases = [{'x': x, 'y': y, 'rotation': r, 'mode': mode}
         for mode in ['masked', 'hidden', 'bare']
         for x, y in [(0, 0), (400, 0), (425, 0), (475, 0), (-425, 0), (425, 30)]
         for r in [0, 180]]
names = [ROOT, 'Main', 'Bubblefield', 'BitmapData', 'Bitmap', 'Matrix', 'getQualifiedClassName',
         'trace', 'stage', 'addEventListener', 'removeEventListener', 'onProbeKey', 'keyCode',
         'addChild', 'getChildByName', 'getChildAt', 'numChildren', 'visible', 'avatarUnderBubble_mc', 'effectLayer_under_mc',
         'effect_mask_under', 'x', 'y', 'width', 'height', 'rotation', 'draw', 'getPixel32', 'dispose',
         'parent', 'getChildIndex', 'transform', 'matrix', 'a', 'b', 'c', 'd', 'tx', 'ty']
labels = ['keyDown', 'BT3_LOWER_PAINT_BEGIN', 'BT3_LOWER_PAINT_CASE', 'BT3_LOWER_PAINT_DONE'] + [str(i) for i in range(len(cases))]
strings = [''] + list(dict.fromkeys(names + labels + ['flash.display', 'flash.geom', 'flash.utils']))
si = {s: i for i, s in enumerate(strings)}
q = {n: i + 1 for i, n in enumerate(names)}
cp = u(1) * 3 + u(len(strings)) + b''.join(u(len(s.encode())) + s.encode() for s in strings[1:])
cp += u(5) + b''.join(b'\x16' + u(si[s]) for s in ['', 'flash.display', 'flash.geom', 'flash.utils'])
cp += u(1) + u(len(names) + 1)
for n in names:
    ns = 2 if n in ['BitmapData', 'Bitmap'] else 3 if n == 'Matrix' else 4 if n == 'getQualifiedClassName' else 1
    cp += b'\x07' + u(ns) + u(si[n])


def op(c, *a): return bytes([c]) + b''.join(u(n) for n in a)
def get(n): return bytes([0xd0 + n]) if n < 4 else op(0x62, n)
def put(n): return bytes([0xd4 + n]) if n < 4 else op(0x63, n)
def prop(n): return op(0x66, q[n])
def txt(n): return op(0x2c, si[n])
def num(n): return bytes([0x24, n & 255]) if -128 <= n < 128 else op(0x25, n & 65535)
def call(n, count): return op(0x4f, q[n], count)
def val(n, count): return op(0x46, q[n], count)
def new(n, args=b'', count=0): return op(0x60, q[n]) + args + op(0x42, count)
def setp(local, n, value): return get(local) + value + op(0x61, q[n])
def emit(label, values): return op(0x5d, q['trace']) + txt(label) + b''.join(values) + call('trace', 1 + len(values))
def qualified(value): return op(0x5d, q['getQualifiedClassName']) + value + val('getQualifiedClassName', 1)


ctor = get(0) + b'\x30' + get(0) + op(0x49, 0) + get(0) + prop('stage') + txt('keyDown') + get(0) + prop('onProbeKey') + call('addEventListener', 2) + b'\x47'
probe = get(0) + prop('stage') + txt('keyDown') + get(0) + prop('onProbeKey') + call('removeEventListener', 2)
probe += new('Bubblefield') + put(1) + get(0) + get(1) + call('addChild', 1)
probe += get(1) + prop('effectLayer_under_mc') + put(2) + get(1) + prop('effect_mask_under') + put(3)
probe += emit('BT3_LOWER_PAINT_BEGIN', [qualified(get(1)), qualified(get(2)), qualified(get(3)),
    get(2) + prop('parent') + get(1) + b'\xac', get(3) + prop('parent') + get(1) + b'\xac',
    get(1) + get(2) + val('getChildIndex', 1), get(1) + get(3) + val('getChildIndex', 1),
    get(1) + prop('numChildren')])
# Hide other painted children while preserving actual authored display-list/mask range.
for i in range(8):
    probe += get(1) + num(i) + val('getChildAt', 1) + put(4) + setp(4, 'visible', b'\x27')
probe += setp(3, 'visible', b'\x26') + setp(2, 'visible', b'\x26')
# Reparent an original disc solely as a controlled paint target inside the source mask slot.
probe += get(1) + prop('avatarUnderBubble_mc') + put(4)
probe += get(2) + get(4) + call('addChild', 1)
probe += setp(4, 'visible', b'\x26')
for i, c in enumerate(cases):
    probe += setp(4, 'x', num(c['x'])) + setp(4, 'y', num(c['y']))
    probe += setp(3, 'rotation', num(c['rotation'])) + setp(4, 'visible', b'\x27' if c['mode'] == 'hidden' else b'\x26')
    probe += new('BitmapData', num(120) + num(120) + b'\x26' + num(0), 4) + put(5)
    # A viewport translation only; field root's original matrix remains unchanged.
    probe += new('Matrix', num(1) + num(0) + num(0) + num(1) + num(60 - c['x']) + num(60 - c['y']), 6) + put(6)
    if c['mode'] == 'bare':
        # draw(target) ignores the target's own local transform and its parent's mask.
        probe += new('Matrix', num(1) + num(0) + num(0) + num(1) + num(60) + num(60), 6) + put(6)
    probe += get(5) + get(4 if c['mode'] == 'bare' else 1) + get(6) + call('draw', 2)
    values = [txt(str(i)), get(4) + prop('x'), get(4) + prop('y'), get(3) + prop('rotation')]
    values += [get(5) + num(60 + x) + num(60 + y) + val('getPixel32', 2) for x, y in points]
    probe += emit('BT3_LOWER_PAINT_CASE', values) + get(5) + call('dispose', 0)
probe += emit('BT3_LOWER_PAINT_DONE', [])
key = get(0) + b'\x30' + get(1) + prop('keyCode') + num(119) + b'\x14' + len(probe).to_bytes(3, 'little', signed=True) + probe + b'\x47'
script = get(0) + b'\x30' + op(0x65, 0) + op(0x60, q['Main']) + b'\x30' + op(0x60, q['Main']) + op(0x58, 0) + b'\x1d' + op(0x68, q[ROOT]) + b'\x47'
methods = u(4) + b''.join(u(0) + u(0) + u(0) + b'\0' for _ in range(3)) + u(1) + u(0) + u(0) + u(0) + b'\0'
instance = u(q[ROOT]) + u(q['Main']) + b'\0' + u(0) + u(0) + u(1) + u(q['onProbeKey']) + b'\1' + u(0) + u(3)
classes = u(1) + instance + u(1) + u(0)
scripts = u(1) + u(2) + u(1) + u(q[ROOT]) + b'\4' + u(1) + u(0)


def body(i, code, stack, locals, depth, maximum):
    return u(i) + u(stack) + u(locals) + u(depth) + u(maximum) + u(len(code)) + code + u(0) + u(0)


bodies = u(4) + body(0, ctor, 4, 1, 1, 2) + body(1, get(0) + b'\x30\x47', 1, 1, 1, 2) + body(2, script, 2, 1, 0, 2) + body(3, key, 64, 7, 1, 2)
abc = struct.pack('<HH', 16, 46) + cp + methods + u(0) + classes + scripts + bodies
# Use the qualified parser normalization, including its narrow expanded-CWS check.
raw = Path(sys.argv[1]).read_bytes()
normalized = subprocess.run(['node', '--input-type=module', '-e',
    "import{readFileSync}from'node:fs';import{decompressSWF}from'./src/game/assets/swf.mjs';process.stdout.write((await decompressSWF(new Uint8Array(readFileSync(process.argv[1])))).bytes)", sys.argv[1]], check=True, capture_output=True).stdout
start = 8 + (5 + 4 * (normalized[8] >> 3) + 7) // 8 + 4
output = normalized[8:start]
at, renamed, abcs = start, 0, []
while at < len(normalized):
    begin = at
    h, = struct.unpack_from('<H', normalized, at)
    code, size = h >> 6, h & 63
    at += 2
    if size == 63:
        size, = struct.unpack_from('<I', normalized, at)
        at += 4
    data = normalized[at:at + size]
    at += size
    if code in (72, 82): abcs.append(hashlib.sha256(data).hexdigest())
    if code == 76:
        count, = struct.unpack_from('<H', data)
        cursor, changed, found = 2, data[:2], False
        for _ in range(count):
            cid, = struct.unpack_from('<H', data, cursor)
            cursor += 2
            end = data.index(0, cursor)
            name, cursor = data[cursor:end], end + 1
            if cid == 0:
                if name != b'Main' or renamed: raise SystemExit('Expected one original Main document binding.')
                name, found, renamed = ROOT.encode(), True, 1
            changed += struct.pack('<H', cid) + name + b'\0'
        if found:
            output += tag(82, struct.pack('<I', 0) + b'lower-effect-paint-probe\0' + abc) + tag(76, changed)
            continue
    output += normalized[begin:at]
if renamed != 1: raise SystemExit('Missing original document binding.')
result = b'FWS' + normalized[3:4] + struct.pack('<I', len(output) + 8) + output
Path(sys.argv[2]).write_bytes(result)
print(json.dumps({'original_sha256': hashlib.sha256(raw).hexdigest(), 'probe_sha256': hashlib.sha256(result).hexdigest(),
    'emitter_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), 'preserved_original_abc_tag_payloads': abcs,
    'added_probe_abc_sha256': hashlib.sha256(abc).hexdigest(), 'points': points, 'cases': cases,
    'source_sha256': {str(p.relative_to(Path(sys.argv[1]).parent)): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in [Path(sys.argv[1]).parent / 'export_pcode/scripts' / (n + '.pcode') for n in ['Main', 'Bubblefield', 'BTAGameWorld', '_-0D']]}, 'scope': __doc__}, indent=2))

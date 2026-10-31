#!/usr/bin/env python3
"""Add a project-authored mouse-event observer to a local research SWF.
The original Main remains the superclass; no original code/artwork is committed.
Usage: python3 tools/reference/menu-pointer-probe.py INPUT_FWS /tmp/bt3-pointer.swf
Run locally in the reference viewer. Ruffle observations are not Adobe execution.
"""
import struct
import sys
import zlib
from pathlib import Path


def u(n):
    result = []
    while n > 127:
        result.append((n & 127) | 128)
        n >>= 7
    return bytes(result + [n])


def tag(code, data=b''):
    return (struct.pack('<H', (code << 6) | min(len(data), 63))
            + (struct.pack('<I', len(data)) if len(data) >= 63 else b'') + data)


names = ['MenuPointerProbe', 'Main', 'trace', 'name', 'parent', 'target',
         'type', 'addEventListener', 'probeMouse']
strings = [''] + names + ['mouseOver', 'mouseOut', 'mouseUp', 'POINTER_PROBE']
si = {name: i for i, name in enumerate(strings)}
q = {name: i + 1 for i, name in enumerate(names)}
cp = u(1) + u(1) + u(1) + u(len(strings))
cp += b''.join(u(len(s.encode())) + s.encode() for s in strings[1:])
cp += u(2) + bytes([0x16]) + u(0) + u(1)
cp += u(len(names) + 1) + b''.join(bytes([7]) + u(1) + u(si[n]) for n in names)


def op(code, *args): return bytes([code]) + b''.join(u(a) for a in args)
def get(local): return bytes([0xd0 + local])
def prop(name): return op(0x66, q[name])
def string(value): return op(0x2c, si[value])
def call(name, argc): return op(0x4f, q[name], argc)


ctor = get(0) + bytes([0x30]) + get(0) + op(0x49, 0)
for event in ['mouseOver', 'mouseOut', 'mouseUp']:
    ctor += get(0) + string(event) + get(0) + prop('probeMouse') + call('addEventListener', 2)
ctor += bytes([0x47])
observe = get(0) + bytes([0x30]) + op(0x5d, q['trace']) + string('POINTER_PROBE')
observe += get(1) + prop('type') + get(1) + prop('target') + prop('name')
observe += get(1) + prop('target') + prop('parent') + prop('name') + call('trace', 4) + bytes([0x47])
scriptcode = (get(0) + bytes([0x30]) + op(0x65, 0) + op(0x60, q['Main']) + bytes([0x30])
              + op(0x60, q['Main']) + op(0x58, 0) + bytes([0x1d])
              + op(0x68, q['MenuPointerProbe']) + bytes([0x47]))
methods = u(4) + b''.join(u(0) + u(0) + u(0) + bytes([0]) for _ in range(3))
methods += u(1) + u(0) + u(0) + u(0) + bytes([0])
instance = u(q['MenuPointerProbe']) + u(q['Main']) + bytes([0]) + u(0) + u(0)
instance += u(1) + u(q['probeMouse']) + bytes([1]) + u(0) + u(3)
classes = u(1) + instance + u(1) + u(0)
scripts = u(1) + u(2) + u(1) + u(q['MenuPointerProbe']) + bytes([4]) + u(1) + u(0)


def body(i, code, stack, locals, depth, maximum):
    return u(i) + u(stack) + u(locals) + u(depth) + u(maximum) + u(len(code)) + code + u(0) + u(0)


bodies = u(4) + body(0, ctor, 4, 1, 1, 2)
bodies += body(1, get(0) + bytes([0x30, 0x47]), 1, 1, 1, 2)
bodies += body(2, scriptcode, 2, 1, 0, 2) + body(3, observe, 5, 2, 1, 2)
abc = struct.pack('<HH', 16, 46) + cp + methods + u(0) + classes + scripts + bodies
probe_tag = tag(82, struct.pack('<I', 0) + b'pointer-probe\0' + abc)
original = Path(sys.argv[1]).read_bytes()
if original[:3] == b'CWS':
    # FFDec's research export retains CWS over an already-expanded body.
    body_bytes = original[8:] if len(original) == struct.unpack_from('<I', original, 4)[0] else zlib.decompress(original[8:])
    original = b'FWS' + original[3:8] + body_bytes
if original[:3] != b'FWS':
    raise SystemExit('Supply the uncompressed research SWF.')
nbits = original[8] >> 3
start = 8 + (5 + 4 * nbits + 7) // 8 + 4
output = original[8:start]
p = start
modified = False
while p < len(original):
    record_start = p
    header, = struct.unpack_from('<H', original, p)
    code, length = header >> 6, header & 63
    p += 2
    if length == 63:
        length, = struct.unpack_from('<I', original, p)
        p += 4
    data = original[p:p + length]
    p += length
    if code == 76:
        count, = struct.unpack_from('<H', data)
        pos = 2
        renamed = data[:2]
        found = False
        for _ in range(count):
            cid, = struct.unpack_from('<H', data, pos)
            pos += 2
            end = data.index(0, pos)
            name = data[pos:end]
            pos = end + 1
            if cid == 0:
                if name != b'Main':
                    raise SystemExit('Expected document class Main.')
                name = b'MenuPointerProbe'
                found = modified = True
            renamed += struct.pack('<H', cid) + name + b'\0'
        if found:
            output += probe_tag + tag(76, renamed)
            continue
    output += original[record_start:p]
if not modified:
    raise SystemExit('No document-class binding was found.')
result = b'FWS' + original[3:4] + struct.pack('<I', len(output) + 8) + output
Path(sys.argv[2]).write_bytes(result)
print('Wrote local observed copy:', sys.argv[2], len(result))

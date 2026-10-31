#!/usr/bin/env python3
"""Emit a project-authored AVM2 alpha/position-assignment probe (no game code or artwork).
Usage: python3 tools/reference/alpha-probe.py /tmp/bt3-alpha-probe.swf
Load the output in `bun run reference`. Ruffle evidence is not Adobe execution.
"""
import struct, hashlib, sys
from pathlib import Path


def u(n):
    b = []
    while n > 127:
        b.append((n & 127) | 128)
        n >>= 7
    return bytes(b + [n])


strings = ['', 'Probe', 'flash.display', 'Sprite', 'trace', 'graphics', 'beginFill',
           'drawRect', 'endFill', 'addChild', 'hitTestPoint', 'visible', 'alpha',
           'mask', 'removeChild', 'clear', 'lineStyle', 'x', 'y']
labels = ['alpha-down-'+str(i) for i in range(1,13)] + ['alpha-up-'+str(i) for i in range(1,13)] + ['negative','high','x-small','x-negative'] + ['x-ease-'+str(i) for i in range(1,6)] + ['probe complete']
strings += labels
si = {s: i for i, s in enumerate(strings)}
names = ['Probe', 'Sprite', 'trace', 'graphics', 'beginFill', 'drawRect', 'endFill',
         'addChild', 'hitTestPoint', 'visible', 'alpha', 'mask', 'removeChild', 'clear', 'lineStyle', 'x', 'y']
q = {n: i + 1 for i, n in enumerate(names)}
cp = u(1) + u(1) + u(6) + b''.join(struct.pack('<d', n) for n in [.1, .05, .03, 643.9, 397.0]) + u(len(strings)) + b''.join(u(len(s.encode())) + s.encode() for s in strings[1:])
cp += u(3) + bytes([0x16]) + u(0) + bytes([0x16]) + u(si['flash.display']) + u(1)
cp += u(len(names) + 1) + b''.join(bytes([7]) + u(2 if n == 'Sprite' else 1) + u(si[n]) for n in names)


def op(n, *args): return bytes([n]) + b''.join(u(a) for a in args)
def num(n): return op(0x24, n)
def get(n): return bytes([0xd0 + n])
def prop(n): return op(0x66, q[n])
def call(n, c): return op(0x4f, q[n], c)
def setp(n): return op(0x61, q[n])
def sprite(local): return op(0x60, q['Sprite']) + op(0x42, 0) + bytes([0xd4 + local])


code = get(0) + bytes([0x30]) + get(0) + op(0x49, 0) + sprite(1)
def trace(label): return op(0x5d, q['trace']) + op(0x2c, si[label]) + get(1) + prop('alpha') + call('trace', 2)
code += get(1) + num(1) + setp('alpha')
for i in range(1,13):
    code += get(1) + get(1) + prop('alpha') + op(0x2f, 1) + bytes([0xa1]) + setp('alpha') + trace('alpha-down-'+str(i))
code += get(1) + num(0) + setp('alpha')
for i in range(1,13):
    code += get(1) + get(1) + prop('alpha') + op(0x2f, 1) + bytes([0xa0]) + setp('alpha') + trace('alpha-up-'+str(i))
code += get(1) + num(0) + num(1) + bytes([0xa1]) + setp('alpha') + trace('negative')
code += get(1) + num(2) + setp('alpha') + trace('high')
code += get(1) + op(0x2f, 3) + setp('x')
def trace_x(label): return op(0x5d, q['trace']) + op(0x2c, si[label]) + get(1) + prop('x') + call('trace', 2)
code += trace_x('x-small')
code += get(1) + num(0) + op(0x2f, 3) + bytes([0xa1]) + setp('x') + trace_x('x-negative')
code += get(1) + op(0x2f, 4) + setp('x')
for i in range(1,6):
    code += get(1) + get(1) + prop('x') + num(1) + op(0x2f, 1) + bytes([0xa1, 0xa2]) + op(0x2f, 5) + op(0x2f, 1) + bytes([0xa2, 0xa0]) + setp('x') + trace_x('x-ease-'+str(i))
code += op(0x5d, q['trace']) + op(0x2c, si['probe complete']) + call('trace', 1) + bytes([0x47])

# One Sprite document class; constructor, class initializer, script initializer.
methods = u(3) + b''.join(u(0) + u(0) + u(0) + bytes([0]) for _ in range(3))
instance = u(q['Probe']) + u(q['Sprite']) + bytes([0]) + u(0) + u(0) + u(0)
classes = u(1) + instance + u(1) + u(0)
scriptcode = get(0) + bytes([0x30]) + op(0x65, 0) + op(0x60, q['Sprite']) + bytes([0x30]) + op(0x60, q['Sprite']) + op(0x58, 0) + bytes([0x1d]) + op(0x68, q['Probe']) + bytes([0x47])
scripts = u(1) + u(2) + u(1) + u(q['Probe']) + bytes([4]) + u(1) + u(0)


def body(i, c, stack, locals, depth, maxdepth):
    return u(i) + u(stack) + u(locals) + u(depth) + u(maxdepth) + u(len(c)) + c + u(0) + u(0)


bodies = u(3) + body(0, code, 12, 3, 1, 2) + body(1, get(0) + bytes([0x30, 0x47]), 1, 1, 1, 2) + body(2, scriptcode, 2, 1, 0, 2)
abc = struct.pack('<HH', 16, 46) + cp + methods + u(0) + classes + scripts + bodies
bits = '01111' + ''.join(format(n, '015b') for n in [0, 11000, 0, 9000])
bits += '0' * (-len(bits) % 8)
rect = int(bits, 2).to_bytes(len(bits) // 8, 'big')


def tag(t, p=b''):
    return struct.pack('<H', (t << 6) | min(len(p), 63)) + (struct.pack('<I', len(p)) if len(p) >= 63 else b'') + p


payload = rect + bytes([0, 50]) + struct.pack('<H', 1) + tag(69, struct.pack('<I', 8)) + tag(82, struct.pack('<I', 0) + b'probe\0' + abc) + tag(76, struct.pack('<HH', 1, 0) + b'Probe\0') + tag(1) + tag(0)
swf = b'FWS' + bytes([10]) + struct.pack('<I', 8 + len(payload)) + payload
path = sys.argv[1] if len(sys.argv) > 1 else '/tmp/bt3-alpha-probe.swf'
Path(path).write_bytes(swf)
print(path, len(swf), hashlib.sha256(swf).hexdigest())

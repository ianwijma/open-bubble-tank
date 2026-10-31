#!/usr/bin/env python3
"""Emit a project-authored AVM2 shape-hit probe (no game code or artwork).
Usage: python3 tools/reference/hit-test-probe.py /tmp/bt3-hit-test-probe.swf
Add --thin-strokes to include scale-dependent stroke-width cases.
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


thin_strokes = '--thin-strokes' in sys.argv

strings = ['', 'Probe', 'flash.display', 'Sprite', 'trace', 'graphics', 'beginFill',
           'drawRect', 'endFill', 'addChild', 'hitTestPoint', 'visible', 'alpha',
           'mask', 'removeChild', 'clear', 'lineStyle', 'x', 'y']
labels = ['opaque root', 'opaque child', 'hidden root', 'hidden child', 'alpha0 root',
          'alpha0 child', 'fillAlpha0 root', 'strokeAlpha0 outside', 'masked inside',
          'masked outside', 'mask excluded', 'removed child', 'removed root', 'probe complete']
if thin_strokes:
    strings += ['scaleX', 'scaleY']
    labels[-1:-1] = ['thin full hit', 'thin full miss', 'thin half hit', 'thin half bounds', 'thin half miss']
strings += labels
si = {s: i for i, s in enumerate(strings)}
names = ['Probe', 'Sprite', 'trace', 'graphics', 'beginFill', 'drawRect', 'endFill',
         'addChild', 'hitTestPoint', 'visible', 'alpha', 'mask', 'removeChild', 'clear', 'lineStyle', 'x', 'y']
if thin_strokes:
    names += ['scaleX', 'scaleY']
q = {n: i + 1 for i, n in enumerate(names)}
cp = u(1) + u(1) + u(1) + u(len(strings)) + b''.join(u(len(s.encode())) + s.encode() for s in strings[1:])
cp += u(3) + bytes([0x16]) + u(0) + bytes([0x16]) + u(si['flash.display']) + u(1)
cp += u(len(names) + 1) + b''.join(bytes([7]) + u(2 if n == 'Sprite' else 1) + u(si[n]) for n in names)


def op(n, *args): return bytes([n]) + b''.join(u(a) for a in args)
def num(n):
    if isinstance(n, float):
        from fractions import Fraction
        fraction = Fraction(str(n))
        return num(fraction.numerator) + num(fraction.denominator) + bytes([0xa3])
    if not 0 <= n <= 127:
        raise ValueError(n)
    return op(0x24, n)
def get(n): return bytes([0xd0 + n])
def prop(n): return op(0x66, q[n])
def call(n, c): return op(0x4f, q[n], c)
def setp(n): return op(0x61, q[n])
def sprite(local): return op(0x60, q['Sprite']) + op(0x42, 0) + bytes([0xd4 + local])


def draw(local, x, y, w, h, alpha=1):
    return (get(local) + prop('graphics') + num(0) + num(alpha) + call('beginFill', 2)
            + get(local) + prop('graphics') + b''.join(num(n) for n in [x, y, w, h])
            + call('drawRect', 4) + get(local) + prop('graphics') + call('endFill', 0))


def test(label, local, x=40, y=40):
    return (op(0x5d, q['trace']) + op(0x2c, si[label]) + get(local) + num(x) + num(y)
            + bytes([0x26]) + op(0x46, q['hitTestPoint'], 3) + call('trace', 2))


code = get(0) + bytes([0x30]) + get(0) + op(0x49, 0) + sprite(1) + draw(1, 20, 20, 40, 40) + get(0) + get(1) + call('addChild', 1)
code += test('opaque root', 0) + test('opaque child', 1)
code += get(1) + bytes([0x27]) + setp('visible') + test('hidden root', 0) + test('hidden child', 1)
code += get(1) + bytes([0x26]) + setp('visible') + get(1) + num(0) + setp('alpha') + test('alpha0 root', 0) + test('alpha0 child', 1)
code += get(1) + num(1) + setp('alpha') + get(1) + prop('graphics') + call('clear', 0) + draw(1, 20, 20, 40, 40, 0) + test('fillAlpha0 root', 0)
code += get(1) + prop('graphics') + call('clear', 0) + get(1) + prop('graphics') + num(10) + num(0) + num(0) + call('lineStyle', 3) + get(1) + prop('graphics') + b''.join(num(n) for n in [20, 20, 40, 40]) + call('drawRect', 4) + test('strokeAlpha0 outside', 0, 16, 40)
code += get(1) + prop('graphics') + call('clear', 0) + draw(1, 20, 20, 40, 40) + sprite(2) + draw(2, 20, 20, 10, 40) + get(0) + get(2) + call('addChild', 1) + get(1) + get(2) + setp('mask')
code += test('masked inside', 0, 25, 40) + test('masked outside', 0, 45, 40)
code += get(0) + get(1) + call('removeChild', 1) + test('mask excluded', 0, 25, 40) + test('removed child', 1) + test('removed root', 0)
if thin_strokes:
    code += get(0) + get(2) + call('removeChild', 1) + sprite(1)
    code += get(1) + prop('graphics') + num(0.25) + num(0) + num(0) + call('lineStyle', 3)
    code += get(1) + prop('graphics') + b''.join(num(n) for n in [20, 20, 40, 40]) + call('drawRect', 4)
    code += get(0) + get(1) + call('addChild', 1)
    code += test('thin full hit', 1, 20.25, 40) + test('thin full miss', 1, 20.75, 40)
    code += get(1) + num(0.5) + setp('scaleX') + get(1) + num(0.5) + setp('scaleY')
    code += test('thin half hit', 1, 10.375, 20) + test('thin half bounds', 1, 9.875, 20) + test('thin half miss', 1, 10.625, 20)
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
paths = [arg for arg in sys.argv[1:] if arg != '--thin-strokes']
path = paths[0] if paths else '/tmp/bt3-hit-test-probe.swf'
Path(path).write_bytes(swf)
print(path, len(swf), hashlib.sha256(swf).hexdigest())

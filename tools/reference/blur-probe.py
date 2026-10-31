#!/usr/bin/env python3
"""Emit a project-authored AVM2 BitmapData blur probe (no game code or artwork).
Usage: python3 tools/reference/blur-probe.py /tmp/bt3-blur-probe.swf
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


namespaces = ['', 'flash.display', 'flash.filters', 'flash.geom']
classes_for = {'Sprite': 2, 'BitmapData': 2, 'Bitmap': 2, 'BlurFilter': 3, 'Point': 4}
names = ['Probe', 'Sprite', 'BitmapData', 'BlurFilter', 'Point', 'trace', 'setPixel32', 'getPixel32', 'applyFilter', 'rect', 'Bitmap', 'clone', 'draw']
labels = [name+'-'+str(y) for name in ['white1','white2','history','solid','semi','edge'] for y in range(9)] + ['probe complete']
strings = [''] + namespaces[1:] + names + labels
si = {s: i for i, s in enumerate(strings)}
q = {n: i + 1 for i, n in enumerate(names)}
colors = [0xffffffff, 0x80ff4000, 0x400080ff, 0xff123456]
cp = u(1) + u(len(colors)+1) + b''.join(u(n) for n in colors) + u(1)
cp += u(len(strings)) + b''.join(u(len(s.encode())) + s.encode() for s in strings[1:])
cp += u(len(namespaces)+1) + b''.join(bytes([0x16]) + u(si[n]) for n in namespaces) + u(1)
cp += u(len(names)+1) + b''.join(bytes([7]) + u(classes_for.get(n, 1)) + u(si[n]) for n in names)

def op(n, *args): return bytes([n]) + b''.join(u(a) for a in args)
def num(n): return op(0x24, n)
def get(n): return op(0x62, n)
def put(n): return op(0x63, n)
def prop(n): return op(0x66, q[n])
def call(n, c): return op(0x4f, q[n], c)
def new(n, args): return op(0x60, q[n]) + args

def bitmap(color=0):
    return new('BitmapData', num(9)+num(9)+bytes([0x26])+(op(0x2e,color) if color else num(0))+op(0x42,4))+put(1)
def pixel(x,y,color): return get(1)+num(x)+num(y)+op(0x2e,color)+call('setPixel32',3)
def blur(): return get(1)+get(1)+get(1)+prop('rect')+get(3)+get(2)+call('applyFilter',4)
def rows(label):
    code=b''
    for y in range(9):
        code+=op(0x5d,q['trace'])+op(0x2c,si[label+'-'+str(y)])
        for x in range(9): code+=get(1)+num(x)+num(y)+op(0x46,q['getPixel32'],2)
        code+=call('trace',10)
    return code

code = get(0)+bytes([0x30])+get(0)+op(0x49,0)
code += new('BlurFilter',num(2)+num(2)+num(2)+op(0x42,3))+put(2)
code += new('Point',num(0)+num(0)+op(0x42,2))+put(3)
code += bitmap()+pixel(4,4,1)+blur()+rows('white1')+get(1)+op(0x46,q['clone'],0)+put(4)+blur()+rows('white2')+get(1)+new('Bitmap',get(4)+op(0x42,1))+call('draw',1)+rows('history')
code += bitmap(4)+blur()+rows('solid')
code += bitmap()+pixel(4,4,2)+pixel(5,4,3)+blur()+rows('semi')
code += bitmap()+pixel(0,0,1)+blur()+rows('edge')
code += op(0x5d,q['trace'])+op(0x2c,si['probe complete'])+call('trace',1)+bytes([0x47])

# One Sprite document class; constructor, class initializer, script initializer.
methods = u(3) + b''.join(u(0) + u(0) + u(0) + bytes([0]) for _ in range(3))
instance = u(q['Probe']) + u(q['Sprite']) + bytes([0]) + u(0) + u(0) + u(0)
classes = u(1) + instance + u(1) + u(0)
scriptcode = get(0) + bytes([0x30]) + op(0x65, 0) + op(0x60, q['Sprite']) + bytes([0x30]) + op(0x60, q['Sprite']) + op(0x58, 0) + bytes([0x1d]) + op(0x68, q['Probe']) + bytes([0x47])
scripts = u(1) + u(2) + u(1) + u(q['Probe']) + bytes([4]) + u(1) + u(0)


def body(i, c, stack, locals, depth, maxdepth):
    return u(i) + u(stack) + u(locals) + u(depth) + u(maxdepth) + u(len(c)) + c + u(0) + u(0)


bodies = u(3) + body(0, code, 32, 5, 1, 2) + body(1, get(0) + bytes([0x30, 0x47]), 1, 1, 1, 2) + body(2, scriptcode, 2, 1, 0, 2)
abc = struct.pack('<HH', 16, 46) + cp + methods + u(0) + classes + scripts + bodies
bits = '01111' + ''.join(format(n, '015b') for n in [0, 11000, 0, 9000])
bits += '0' * (-len(bits) % 8)
rect = int(bits, 2).to_bytes(len(bits) // 8, 'big')


def tag(t, p=b''):
    return struct.pack('<H', (t << 6) | min(len(p), 63)) + (struct.pack('<I', len(p)) if len(p) >= 63 else b'') + p


payload = rect + bytes([0, 50]) + struct.pack('<H', 1) + tag(69, struct.pack('<I', 8)) + tag(82, struct.pack('<I', 0) + b'probe\0' + abc) + tag(76, struct.pack('<HH', 1, 0) + b'Probe\0') + tag(1) + tag(0)
swf = b'FWS' + bytes([10]) + struct.pack('<I', 8 + len(payload)) + payload
path = sys.argv[1] if len(sys.argv) > 1 else '/tmp/bt3-blur-probe.swf'
Path(path).write_bytes(swf)
print(path, len(swf), hashlib.sha256(swf).hexdigest())

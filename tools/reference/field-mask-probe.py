#!/usr/bin/env python3
"""Project-only timeline/control glue around unchanged original geometric sprites.
No original method, ABC, frame script, RNG, clock or engine patch. F8 performs
synchronous builtin hitTestPoint(shape=true), width/height, bounds and Point reads.
Authored arbitrary overlaps are project controls, not ordinary encounters.
"""
import hashlib
import json
import struct
import sys
import zlib
from pathlib import Path


def u(n):
    out = bytearray()
    while n > 127:
        out.append((n & 127) | 128)
        n >>= 7
    return bytes(out) + bytes([n])


def tag(code, data=b''):
    return struct.pack('<H', (code << 6) | min(len(data), 63)) + (struct.pack('<I', len(data)) if len(data) >= 63 else b'') + data


def matrix(x=0):
    # Identity scale/rotate, twip translation only.
    tx = x * 20
    n = max(1, tx.bit_length() + 1)
    bits = '00' + format(n, '05b') + format(tx & ((1 << n) - 1), f'0{n}b') + '0' * n
    bits += '0' * (-len(bits) % 8)
    return int(bits, 2).to_bytes(len(bits) // 8, 'big')


def place(symbol, depth, name, x=0, end=None):
    flags = 2 | 4 | 32 | (64 if end is not None else 0)
    return tag(26, bytes([flags]) + struct.pack('<HH', depth, symbol) + matrix(x) + name.encode() + b'\0' + (struct.pack('<H', end) if end is not None else b''))


if len(sys.argv) != 3 or Path(sys.argv[1]).resolve() == Path(sys.argv[2]).resolve():
    raise SystemExit('Supply distinct ORIGINAL OUTPUT paths.')
ROOT = 'BT3FieldMaskProbe'
# Every child is a genuine original sprite, except the declared nested wrapper.
# The original circle mask1539 contains original geometric leaf1538;
# target1544 contains original geometric leaf1543. No project drawing calls.
wrappers = []


def wrapper(label, children):
    cid = 60000 + len(wrappers)
    wrappers.append({'label': label, 'id': cid, 'class': 'FieldMask' + str(cid), 'children': children})
    return cid


def child(symbol, depth, name, x=0, end=None):
    return {'symbol': symbol, 'depth': depth, 'name': name, 'x': x, 'clipDepth': end}


for label, a, b in [('overlap-miss-hit', 1000, 0), ('overlap-hit-miss', 0, 1000), ('overlap-hit-hit', 0, 0), ('overlap-miss-miss', 1000, 1000)]:
    wrapper(label, [child(1539, 1, 'm1', a, 10), child(1539, 3, 'm2', b, 12), child(1544, 5, 'target')])
for depth in [9, 10, 11]:
    wrapper('end-' + str(depth), [child(1539, 1, 'm1', 1000, 10), child(1544, depth, 'target')])
for label, a, b in [('nonoverlap-miss-hit', 1000, 0), ('nonoverlap-hit-miss', 0, 1000), ('nonoverlap-hit-hit', 0, 0)]:
    wrapper(label, [child(1539, 1, 'm1', a, 4), child(1539, 6, 'm2', b, 10), child(1544, 8, 'target')])
for label, x in [('ancestor-hit', 0), ('ancestor-miss', 1000)]:
    wrapper(label, [child(1539, 1, 'm1', x, 4), child(60000, 2, 'target')])
wrapper('runtime', [child(1539, 1, 'm1'), child(1544, 2, 'target')])
wrapper('visibility', [child(1539, 1, 'm1', 0, 10), child(1544, 5, 'target')])
fields = ['objectId', 'parentId', 'maskId', 'childIndex', 'hit', 'hitAgain', 'ownCenterHit', 'ownCenter.x', 'ownCenter.y', 'width', 'height', 'widthAgain', 'heightAgain', 'x', 'y', 'visible', 'alpha', 'point.x', 'point.y', 'pointIsInput', 'roundTrip.x', 'roundTrip.y', 'bounds.x', 'bounds.y', 'bounds.width', 'bounds.height']
names = [ROOT, 'Main', 'MovieClip', 'Point', 'ByteArray', 'Dictionary', 'getQualifiedClassName', 'trace', 'stage', 'addEventListener', 'removeEventListener', 'onProbeKey', 'keyCode', 'addChild', 'removeChild', 'getChildByName', 'getChildIndex', 'parent', 'mask', 'hitTestPoint', 'width', 'height', 'x', 'y', 'visible', 'alpha', 'localToGlobal', 'globalToLocal', 'getBounds', 'writeDouble', 'position', 'readUnsignedInt', 'Bubblefield'] + [w['class'] for w in wrappers]
labels = ['BT3_MASK_BEGIN', 'BT3_MASK_BITS', 'BT3_MASK_DONE', 'keyDown', 'm1', 'm2', 'target', 'wrapper', 'holder', 'baseline', 'assigned', 'mask-miss', 'mask-hidden', 'mask-alpha0', 'different-parent', 'mask-removed', 'target-removed', 'mask-removed-miss', 'detached-unmasked', 'cleared', 'target-hidden', 'target-alpha0', 'field1551', 'exterior-point', 'avatarUnderBubble_mc', 'effect_mask_under', '_-SQ'] + [w['label'] for w in wrappers]
strings = [''] + list(dict.fromkeys(names + labels + ['flash.display', 'flash.geom', 'flash.utils']))
si = {s: i for i, s in enumerate(strings)}
q = {n: i + 1 for i, n in enumerate(names)}
cp = u(1) + u(1) + u(1) + u(len(strings)) + b''.join(u(len(s.encode())) + s.encode() for s in strings[1:])
cp += u(5) + b''.join(b'\x16' + u(si[s]) for s in ['', 'flash.display', 'flash.geom', 'flash.utils'])
cp += u(2) + u(1) + u(1) + u(len(names) + 2)
for n in names:
    ns = 2 if n == 'MovieClip' else 3 if n == 'Point' else 4 if n in ['ByteArray', 'Dictionary', 'getQualifiedClassName'] else 1
    cp += b'\x07' + u(ns) + u(si[n])
index_name = len(names) + 1
cp += b'\x1b' + u(1)


def op(code, *args): return bytes([code]) + b''.join(u(a) for a in args)
def get(n): return bytes([0xd0 + n]) if n < 4 else op(0x62, n)
def put(n): return bytes([0xd4 + n]) if n < 4 else op(0x63, n)
def prop(n): return op(0x66, q[n])
def txt(n): return op(0x2c, si[n])
def num(n): return bytes([0x24, n & 255]) if -128 <= n < 128 else op(0x25, n & 65535)
def call(n, count): return op(0x4f, q[n], count)
def val(n, count): return op(0x46, q[n], count)
def new(n): return op(0x60, q[n]) + op(0x42, 0)
def setp(local, n, value): return get(local) + value + op(0x61, q[n])
def attach(p, c): return get(p) + get(c) + call('addChild', 1)
def detach(p, c): return get(p) + get(c) + call('removeChild', 1)
def named(p, name, dest): return get(p) + txt(name) + val('getChildByName', 1) + put(dest)
def ident(local, n): return get(15) + get(local) + num(n) + op(0x61, index_name)
def idval(value): return get(15) + value + op(0x66, index_name)
def qualified(value): return op(0x5d, q['getQualifiedClassName']) + value + val('getQualifiedClassName', 1)
def emit(label, values): return op(0x5d, q['trace']) + txt(label) + b''.join(values) + call('trace', 1 + len(values))


cohort = []


def sample(case, phase, role, local, parent=None, point=0):
    cohort.append({'case': case, 'phase': phase, 'role': role})
    # Independent Point objects are observed, never computed from a host matrix.
    code = op(0x60, q['Point']) + num(point) + num(0) + op(0x42, 2) + put(8)
    code += get(1) + get(8) + val('localToGlobal', 1) + put(9)
    code += get(local) + get(9) + val('globalToLocal', 1) + put(10)
    code += get(local) + get(1) + val('getBounds', 1) + put(11)
    code += get(local) + op(0x60, q['Point']) + num(0) + num(0) + op(0x42, 2) + val('localToGlobal', 1) + put(12)
    hit = get(local) + get(9) + prop('x') + get(9) + prop('y') + b'\x26' + val('hitTestPoint', 3)
    values = [idval(get(local)), idval(get(local) + prop('parent')), idval(get(local) + prop('mask')),
              get(parent) + get(local) + val('getChildIndex', 1) if parent is not None else num(-1),
              hit, hit, get(local) + get(12) + prop('x') + get(12) + prop('y') + b'\x26' + val('hitTestPoint', 3), get(12) + prop('x'), get(12) + prop('y'), *[get(local) + prop(n) for n in ['width', 'height', 'width', 'height', 'x', 'y', 'visible', 'alpha']],
              get(9) + prop('x'), get(9) + prop('y'), get(9) + get(8) + b'\xac',
              get(10) + prop('x'), get(10) + prop('y'),
              *[get(11) + prop(n) for n in ['x', 'y', 'width', 'height']]]
    code += op(0x5d, q['trace']) + txt('BT3_MASK_BITS') + txt(case) + txt(phase) + txt(role) + qualified(get(local)) + qualified(get(local) + prop('parent')) + qualified(get(9))
    for value in values:
        code += setp(14, 'position', num(0)) + get(14) + value + b'\x75' + call('writeDouble', 1)
        code += setp(14, 'position', num(0)) + get(14) + val('readUnsignedInt', 0) + get(14) + val('readUnsignedInt', 0)
    return code + call('trace', 7 + 2 * len(values))


def group(case, phase, two=False, target_parent=1, mask_parent=1):
    code = sample(case, phase, 'wrapper', 1, 0) + sample(case, phase, 'target', 2, target_parent) + sample(case, phase, 'm1', 3, mask_parent)
    if two: code += sample(case, phase, 'm2', 4, 1)
    return code


ctor = get(0) + b'\x30' + get(0) + op(0x49, 0) + get(0) + prop('stage') + txt('keyDown') + get(0) + prop('onProbeKey') + call('addEventListener', 2) + b'\x47'
probe = get(0) + prop('stage') + txt('keyDown') + get(0) + prop('onProbeKey') + call('removeEventListener', 2)
probe += setp(0, 'x', num(0)) + setp(0, 'y', num(0))
probe += new('ByteArray') + put(14) + new('Dictionary') + put(15)
probe += get(15) + b'\x20' + num(0) + op(0x61, index_name) + ident(0, 1)
probe += emit('BT3_MASK_BEGIN', [num(550), num(450)])
for w in wrappers:
    case = w['label']
    probe += new(w['class']) + put(1) + attach(0, 1) + ident(1, 2)
    probe += named(1, 'target', 2) + named(1, 'm1', 3) + ident(2, 3) + ident(3, 4)
    two = any(c['name'] == 'm2' for c in w['children'])
    if two: probe += named(1, 'm2', 4) + ident(4, 5)
    probe += group(case, 'baseline', two)
    if case == 'runtime':
        probe += setp(2, 'mask', get(3)) + group(case, 'assigned')
        probe += setp(3, 'x', num(1000)) + group(case, 'mask-miss')
        probe += setp(3, 'x', num(0)) + setp(3, 'visible', b'\x27') + group(case, 'mask-hidden')
        probe += setp(3, 'visible', b'\x26') + setp(3, 'alpha', num(0)) + group(case, 'mask-alpha0')
        probe += setp(3, 'alpha', num(1)) + new('MovieClip') + put(5) + ident(5, 6) + attach(0, 5) + attach(5, 3)
        probe += group(case, 'different-parent', mask_parent=5) + sample(case, 'different-parent', 'holder', 5, 0)
        probe += detach(5, 3) + group(case, 'mask-removed', mask_parent=None)
        probe += setp(3, 'x', num(1000)) + group(case, 'mask-removed-miss', mask_parent=None)
        probe += detach(1, 2) + group(case, 'target-removed', target_parent=None, mask_parent=None)
        probe += setp(2, 'mask', b'\x20') + group(case, 'detached-unmasked', target_parent=None, mask_parent=None)
        probe += attach(1, 2) + setp(2, 'mask', b'\x20') + group(case, 'cleared', mask_parent=None) + detach(0, 5)
    if case == 'visibility':
        probe += setp(3, 'visible', b'\x27') + group(case, 'mask-hidden')
        probe += setp(3, 'visible', b'\x26') + setp(3, 'alpha', num(0)) + group(case, 'mask-alpha0')
        probe += setp(3, 'alpha', num(1)) + setp(2, 'visible', b'\x27') + group(case, 'target-hidden')
        probe += setp(2, 'visible', b'\x26') + setp(2, 'alpha', num(0)) + group(case, 'target-alpha0')
    probe += detach(0, 1)
# The actual source-like field receiver is corroboration only, not a discriminator.
probe += new('Bubblefield') + put(1) + attach(0, 1) + ident(1, 2)
for role, name, local, oid in [('target', 'avatarUnderBubble_mc', 2, 3), ('m1', 'effect_mask_under', 3, 4), ('m2', '_-SQ', 4, 5)]:
    # Names not in our QName pool are ordinary string arguments.
    if name not in si:
        raise AssertionError('Missing string ' + name)
    probe += named(1, name, local) + ident(local, oid)
probe += group('field1551', 'baseline', True) + sample('field1551', 'exterior-point', 'm2', 4, 1, 500) + detach(0, 1) + emit('BT3_MASK_DONE', [])
key = get(0) + b'\x30' + get(1) + prop('keyCode') + num(119) + b'\x14' + len(probe).to_bytes(3, 'little', signed=True) + probe + b'\x47'
# Main-derived document plus added MovieClip wrapper classes. Original ABCs stay byte-identical.
methods_code = [(ctor, 4, 1, 1, 2), (get(0) + b'\x30\x47', 1, 1, 1, 2), (b'', 2, 1, 0, 2), (key, 64, 16, 1, 2)]
instances, class_infos = [], []
instances.append(u(q[ROOT]) + u(q['Main']) + b'\0' + u(0) + u(0) + u(1) + u(q['onProbeKey']) + b'\1' + u(0) + u(3))
class_infos.append(u(1) + u(0))
script = get(0) + b'\x30'
traits = []
for ci, (cls, sup) in enumerate([(ROOT, 'Main')] + [(w['class'], 'MovieClip') for w in wrappers]):
    if ci:
        mi = len(methods_code)
        methods_code += [(get(0) + b'\x30' + get(0) + op(0x49, 0) + b'\x47', 1, 1, 1, 2), (get(0) + b'\x30\x47', 1, 1, 1, 2)]
        instances.append(u(q[cls]) + u(q[sup]) + b'\0' + u(0) + u(mi) + u(0))
        class_infos.append(u(mi + 1) + u(0))
    script += op(0x65, 0) + op(0x60, q[sup]) + b'\x30' + op(0x60, q[sup]) + op(0x58, ci) + b'\x1d' + op(0x68, q[cls])
    traits.append(u(q[cls]) + b'\4' + u(ci + 1) + u(ci))
methods_code[2] = (script + b'\x47', 2, 1, 0, 2)
methods = u(len(methods_code)) + b''.join((u(1) if i == 3 else u(0)) + u(0) + (u(0) if i == 3 else b'') + u(0) + b'\0' for i in range(len(methods_code)))
classes = u(len(instances)) + b''.join(instances) + b''.join(class_infos)
scripts = u(1) + u(2) + u(len(traits)) + b''.join(traits)
bodies = u(len(methods_code))
for i, (code, stack, count, depth, maximum) in enumerate(methods_code):
    bodies += u(i) + u(stack) + u(count) + u(depth) + u(maximum) + u(len(code)) + code + u(0) + u(0)
abc = struct.pack('<HH', 16, 46) + cp + methods + u(0) + classes + scripts + bodies
added = [tag(39, struct.pack('<HH', w['id'], 1) + b''.join(place(c['symbol'], c['depth'], c['name'], c['x'], c['clipDepth']) for c in w['children']) + tag(1) + tag(0)) for w in wrappers]
added.append(tag(82, struct.pack('<I', 0) + b'field-mask-probe\0' + abc))
added.append(tag(76, struct.pack('<H', len(wrappers)) + b''.join(struct.pack('<H', w['id']) + w['class'].encode() + b'\0' for w in wrappers)))
raw = Path(sys.argv[1]).read_bytes()
original = raw
if raw[:3] == b'CWS':
    expanded = raw[8:] if len(raw) == struct.unpack_from('<I', raw, 4)[0] else zlib.decompress(raw[8:])
    original = b'FWS' + raw[3:8] + expanded
if original[:3] != b'FWS': raise SystemExit('Supply original SWF.')
start = 8 + (5 + 4 * (original[8] >> 3) + 7) // 8 + 4
output = original[8:start]
at, renamed, abcs = start, 0, []
while at < len(original):
    begin = at
    h, = struct.unpack_from('<H', original, at)
    code, size = h >> 6, h & 63
    at += 2
    if size == 63:
        size, = struct.unpack_from('<I', original, at)
        at += 4
    data = original[at:at + size]
    at += size
    if code in (72, 82): abcs.append(hashlib.sha256(data).hexdigest())
    if code == 76:
        count, = struct.unpack_from('<H', data)
        cursor, changed = 2, data[:2]
        found = False
        for _ in range(count):
            cid, = struct.unpack_from('<H', data, cursor)
            cursor += 2
            end = data.index(0, cursor)
            name, cursor = data[cursor:end], end + 1
            if cid == 0:
                if name != b'Main' or renamed: raise SystemExit('Expected one Main document binding.')
                name, found = ROOT.encode(), True
                renamed += 1
            if cid >= 60000: raise SystemExit('Project symbol collision.')
            changed += struct.pack('<H', cid) + name + b'\0'
        if found:
            output += b''.join(added) + tag(76, changed)
            continue
    output += original[begin:at]
if renamed != 1: raise SystemExit('Missing original Main binding.')
result = b'FWS' + original[3:4] + struct.pack('<I', len(output) + 8) + output
Path(sys.argv[2]).write_bytes(result)
print(json.dumps({'original_sha256': hashlib.sha256(raw).hexdigest(), 'probe_sha256': hashlib.sha256(result).hexdigest(), 'emitter_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), 'preserved_original_abc_tag_payloads': abcs, 'added_tags': [{'code': struct.unpack_from('<H', t)[0] >> 6, 'sha256': hashlib.sha256(t).hexdigest()} for t in added], 'wrappers': wrappers, 'fields': fields, 'cohort': cohort, 'scope': __doc__}, indent=2))

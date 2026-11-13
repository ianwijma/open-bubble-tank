#!/usr/bin/env python3
"""Append controlled beam geometry observations; never modify original methods.

python3 tools/reference/beam-wrapper-probe.py ORIGINAL.swf OUTPUT.swf
Append --geometry-audit for isolated child/root scale and depth-mask controls.
Append --script-bounds-audit for that matrix plus preserved-leaf arithmetic controls.
Load OUTPUT in the reference viewer and press F8 once after loading. Uses the
original avatar-default Aggressor table entry11 and original PartCallTrigger /
SpawnNewBullet / TestForCollision. Sibling versus deliberately nested bullet
layers are separate controls. Output SWFs and captures must stay ignored.
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


ROOT = 'BT3BeamWrapperProbe'
if len(sys.argv) not in (3, 4) or (len(sys.argv) == 4 and sys.argv[3] not in ('--geometry-audit', '--script-bounds-audit')):
    raise SystemExit('Supply ORIGINAL OUTPUT [--geometry-audit|--script-bounds-audit].')
bounds_audit = len(sys.argv) > 3 and sys.argv[3] == '--script-bounds-audit'
audit = len(sys.argv) > 3
names = [ROOT, 'Main', 'trace', 'stage', 'addEventListener', 'removeEventListener',
         'onProbeKey', 'keyCode', 'TankData', '_-HJ', 'getInstance', '_-7G',
         'ImportTankData', '_-Tr', 'addChild', 'removeChild', 'getChildByName',
         'x', 'y', 'rotation', 'scaleX', 'scaleY', 'width', 'height', 'parent',
         'Bubblefield', '_-dl', 'BTAGameWorld', 'MovieClip', 'Point',
         'myAvatar', 'mRef', 'gWorldRef', 'currentBFTarget', 'BF_BG_mc',
         '_-SQ', 'BF_over_detail_mc', 'effect_mask_under', 'enemyLayer_mc',
         '_-54', 'intShootTimer', 'intHitTimer', 'PartCallTrigger', 'arrBullets',
         'strID', 'intObjID', 'toPrecision', 'line_mc', 'mask_mc', 'endCap_mc',
         'hitTestPoint', 'localToGlobal', 'contains', 'TestForCollision', '_-W',
         'getQualifiedClassName', 'StopFiring', 'arrEnemies']
if bounds_audit:
    names += ['transform', 'matrix', 'Matrix', 'a', 'b', 'c', 'd', 'tx', 'ty', 'getBounds', 'visible', 'alpha']
labels = ['BT3_BEAM_ID', 'BT3_BEAM_TOPOLOGY', 'BT3_BEAM_SAMPLE', 'BT3_BEAM_SWEEP',
          'BT3_BEAM_DONE', 'BT3_BEAM_EDGE', 'far', '29_mc', 'sibling', 'nested', 'bare', 'actor', 'restored']
if audit:
    labels += ['BT3_BEAM_AUDIT', 'children', 'root', 'masked', 'unmasked',
               'avatarUnderBubble_mc', 'effectLayer_under_mc', 'under', 'restored-audit']
if bounds_audit:
    labels += ['BT3_BEAM_BOUNDS']
strings = [''] + names + ['flash.display', 'flash.geom', 'flash.utils', 'keyDown'] + labels
si = {s: i for i, s in enumerate(strings)}
q = {n: i + 1 for i, n in enumerate(names)}
cp = u(1) + u(1) + u(1)
cp += u(len(strings)) + b''.join(u(len(s.encode())) + s.encode() for s in strings[1:])
cp += u(5) + b''.join(b'\x16' + u(si[s]) for s in ['', 'flash.display', 'flash.geom', 'flash.utils'])
cp += u(2) + u(1) + u(1)
cp += u(len(names) + 2)
for name in names:
    ns = 2 if name == 'MovieClip' else 3 if name in ('Point', 'Matrix') else 4 if name == 'getQualifiedClassName' else 1
    cp += b'\x07' + u(ns) + u(si[name])
array_index = len(names) + 1
cp += b'\x1b' + u(1)


def op(code, *args): return bytes([code]) + b''.join(u(a) for a in args)
def get(n): return bytes([0xd0 + n]) if n < 4 else op(0x62, n)
def put(n): return bytes([0xd4 + n]) if n < 4 else op(0x63, n)
def prop(name): return op(0x66, q[name])
def text(value): return op(0x2c, si[value])
def integer(n):
    # pushshort sign-extends16 bits; larger literals need arithmetic, not a
    # wider U30 operand (which would silently become negative in AVM2).
    if -128 <= n < 128:
        return bytes([0x24, n & 255])
    if -32768 <= n <= 32767:
        return op(0x25, n & 0xffff)
    half = n // 2
    return integer(half) + integer(n - half) + b'\xa0'
def call(name, count): return op(0x4f, q[name], count)
def value_call(name, count): return op(0x46, q[name], count)
def construct(name): return op(0x60, q[name]) + op(0x42, 0)
def assign(local, name, value): return get(local) + value + op(0x61, q[name])
def precise(value): return value + integer(17) + value_call('toPrecision', 1)
def emit(label, values):
    return op(0x5d, q['trace']) + text(label) + b''.join(values) + call('trace', 1 + len(values))
def child(local, name, field, value):
    return get(local) + prop(name) + value + op(0x61, q[field])
def avatar(local, index):
    code = construct('TankData') + put(2)
    code += get(2) + op(0x60, q['_-HJ']) + value_call('getInstance', 0) + prop('_-7G')
    code += integer(index) + op(0x66, array_index) + call('ImportTankData', 1)
    code += emit('BT3_BEAM_ID', [integer(index), get(2) + prop('strID')])
    return code + get(2) + integer(1) + get(7) + value_call('_-Tr', 2) + put(local)
def resize(length):
    return (child(8, 'line_mc', 'width', integer(length))
            + child(8, 'mask_mc', 'width', integer(length + 4))
            + child(8, 'endCap_mc', 'x', integer(length)))
def shape(local, point_local):
    return get(local) + get(point_local) + prop('x') + get(point_local) + prop('y') + b'\x26' + value_call('hitTestPoint', 3)
def endpoint(length):
    # This control samples the horizontal beam pose. All global conversions run in AVM2.
    return (get(8) + prop('parent') + op(0x60, q['Point']) + get(8) + prop('x') + integer(length) + b'\xa0'
            + get(8) + prop('y') + op(0x42, 2) + value_call('localToGlobal', 1) + put(9))
def sample(label, length):
    code = resize(length) + endpoint(length)
    values = [text(label), integer(length), precise(get(4) + prop('width')),
              precise(get(5) + prop('width')), precise(get(8) + prop('width')),
              shape(4, 9), get(4) + prop('BF_BG_mc') + get(9) + prop('x') + get(9) + prop('y') + b'\x26' + value_call('hitTestPoint', 3),
              shape(8, 9)]
    return code + emit('BT3_BEAM_SAMPLE', values)
def number(n):
    return integer(n) if isinstance(n, int) else integer(round(n * 100)) + integer(100) + b'\xa3'


def sweep(label, x, y, angle):
    code = assign(8, 'x', number(x)) + assign(8, 'y', integer(y)) + assign(8, 'rotation', integer(angle))
    code += get(8) + call('TestForCollision', 0)
    values = [text(label), precise(get(8) + prop('x')), precise(get(8) + prop('y')), integer(angle)]
    for name, field in [('line_mc', 'width'), ('mask_mc', 'width'), ('endCap_mc', 'x')]:
        values.append(precise(get(8) + prop(name) + prop(field)))
    values.append(precise(get(4) + prop('width')))
    return code + emit('BT3_BEAM_SWEEP', values)


ctor = get(0) + b'\x30' + get(0) + op(0x49, 0)
ctor += get(0) + prop('stage') + text('keyDown') + get(0) + prop('onProbeKey')
ctor += call('addEventListener', 2) + b'\x47'
probe = get(0) + prop('stage') + text('keyDown') + get(0) + prop('onProbeKey') + call('removeEventListener', 2)
# Recreate the source display ownership, not the old probes' synthetic nesting.
# Original world Setup is intentionally not called: no live simulation or input loop.
probe += construct('BTAGameWorld') + put(7) + get(0) + get(7) + call('addChild', 1)
probe += assign(7, 'x', integer(275)) + assign(7, 'y', integer(225))
probe += construct('Bubblefield') + put(4) + construct('_-dl') + put(5)
probe += get(7) + get(4) + call('addChild', 1) + get(7) + get(5) + call('addChild', 1)
probe += child(4, '_-SQ', 'rotation', integer(180))
probe += assign(7, 'mRef', get(0)) + assign(7, 'currentBFTarget', get(4)) + assign(7, 'intHitTimer', integer(0))
probe += assign(4, 'gWorldRef', get(7)) + assign(4, 'intShootTimer', integer(0))
probe += get(4) + get(5) + call('_-54', 1)
probe += avatar(3, 11) + get(7) + get(3) + call('addChild', 1) + assign(7, 'myAvatar', get(3))
probe += get(3) + text('29_mc') + value_call('getChildByName', 1) + put(6)
probe += emit('BT3_BEAM_ID', [get(6) + prop('intObjID')])
probe += get(6) + call('PartCallTrigger', 0)
probe += get(4) + prop('arrBullets') + integer(0) + op(0x66, array_index) + put(8)
probe += emit('BT3_BEAM_ID', [op(0x5d, q['getQualifiedClassName']) + get(8) + value_call('getQualifiedClassName', 1)])
probe += emit('BT3_BEAM_TOPOLOGY', [get(8) + prop('parent') + get(5) + b'\xac',
    get(5) + prop('parent') + get(4) + prop('parent') + b'\xac',
    get(4) + get(8) + value_call('contains', 1), get(8) + prop('_-W') + get(4) + b'\xac',
    precise(get(8) + prop('x')), precise(get(8) + prop('y'))])
# Controlled pose, distinct from the logged original muzzle origin.
probe += assign(8, 'x', integer(0)) + assign(8, 'y', integer(0)) + assign(8, 'rotation', integer(0))
for length in [0, 120, 420, 426, 600, 900, 1500]:
    probe += sample('sibling', length)
for length in [120, 900]:
    probe += resize(length)
    for hundredths in [42490, 42500, 42505, 42520, 42525, 42530, 42550]:
        coordinate = integer(hundredths) + integer(100) + b'\xa3'
        probe += get(4) + op(0x60, q['Point']) + coordinate + integer(0) + op(0x42, 2) + value_call('localToGlobal', 1) + put(9)
        probe += emit('BT3_BEAM_EDGE', [integer(length), precise(coordinate), shape(4, 9), get(4) + prop('BF_BG_mc') + get(9) + prop('x') + get(9) + prop('y') + b'\x26' + value_call('hitTestPoint', 3)])
for x, y, angle in [(0,0,0),(0,0,90),(0,0,180),(0,0,270),(0,0,45),(400,0,0),(-400,0,0),(0,400,90),(5.2,0,0)]:
    probe += sweep('bare', x, y, angle)
# Display-only original body control outside the background, excluded from raw
# damage candidates. Isolates wrapper union geometry, not a natural encounter.
probe += avatar(10, 0) + assign(10, 'x', integer(430))
probe += get(4) + prop('enemyLayer_mc') + get(10) + call('addChild', 1)
probe += sweep('actor', 0, 0, 0)
probe += assign(10, 'x', integer(1000))
# Synthetic distant raw candidate separates dynamic width from the fixed850 cap.
probe += assign(4, 'arrEnemies', get(10) + op(0x56, 1))
probe += sweep('far', 0, 0, 0)
probe += assign(4, 'arrEnemies', op(0x56, 0))

probe += get(4) + prop('enemyLayer_mc') + get(10) + call('removeChild', 1)
probe += sweep('restored', 0, 0, 0)
# Deliberately wrong parenting is a negative control; never confuse with source.
probe += get(4) + get(5) + call('addChild', 1)
probe += assign(8, 'x', integer(0)) + assign(8, 'y', integer(0)) + assign(8, 'rotation', integer(0))
for length in [420, 600, 900, 1500]:
    probe += sample('nested', length)
# Restore ownership and remove probe roots while leaving original Main untouched.
probe += get(7) + get(5) + call('addChild', 1)
if audit:
    def audit_point(label, x, y):
        code = (get(4) + op(0x60, q['Point']) + number(x) + number(y)
                + op(0x42, 2) + value_call('localToGlobal', 1) + put(9))
        values = [text(label), number(x), number(y),
                  precise(get(4) + prop('width')), precise(get(4) + prop('scaleX')),
                  precise(get(4) + prop('BF_BG_mc') + prop('scaleX')),
                  precise(get(4) + prop('_-SQ') + prop('scaleX')),
                  precise(get(4) + prop('_-SQ') + prop('width')),
                  shape(4, 9), shape(10, 9)]
        return code + emit('BT3_BEAM_AUDIT', values)

    # Existing Basic root, display-only: no added avatar constructors/RNG draws.
    # The source new-field path assigns four CHILD scales, overwriting the
    # authored exterior-mask scale. These are setter controls, not full Setup.
    for scale in [0.5, 1, 1.25, 2]:
        for name in ['effect_mask_under', '_-SQ', 'BF_over_detail_mc', 'BF_BG_mc']:
            for axis in ['scaleX', 'scaleY']:
                probe += child(4, name, axis, number(scale))
        probe += sweep('children', 5.2, 0, 0)
        probe += audit_point('children', 425 * scale, 0)
    # Restore the authored first-field scales before the separate root control.
    for name in ['effect_mask_under', '_-SQ', 'BF_over_detail_mc', 'BF_BG_mc']:
        for axis in ['scaleX', 'scaleY']:
            value = integer(65043) + integer(65536) + b'\xa3' if name == '_-SQ' else integer(1)
            probe += child(4, name, axis, value)
    for scale in [0.5, 1.25, 2]:
        probe += assign(4, 'scaleX', number(scale)) + assign(4, 'scaleY', number(scale))
        # Sibling bullet coordinates stay independent in this synthetic control.
        probe += sweep('root', 5.2, 0, 0)
        probe += audit_point('root', 425.2, 0)
    probe += assign(4, 'scaleX', integer(1)) + assign(4, 'scaleY', integer(1))
    # Authored depth10 mask covers only depth12, not depth18 enemyLayer.
    probe += get(4) + text('avatarUnderBubble_mc') + value_call('getChildByName', 1) + put(11)
    for x in [0, 430, 600, 900]:
        probe += assign(10, 'x', integer(x))
        probe += get(4) + prop('enemyLayer_mc') + get(10) + call('addChild', 1)
        probe += audit_point('unmasked', x, 0)
        probe += get(11) + get(10) + call('addChild', 1)
        probe += audit_point('masked', x, 0)
    probe += get(11) + get(10) + call('removeChild', 1)
    # Depth4's interior mask covers the depth6 under-effect layer.
    probe += get(4) + text('effectLayer_under_mc') + value_call('getChildByName', 1) + put(11)
    for x in [0, 430, 600, 900]:
        probe += assign(10, 'x', integer(x))
        probe += get(11) + get(10) + call('addChild', 1)
        probe += audit_point('under', x, 0)
    probe += get(11) + get(10) + call('removeChild', 1)
    probe += sweep('restored-audit', 5.2, 0, 0)
if bounds_audit:
    # Reuse the original mask clip/shape. No original code, RNG, frame or clock
    # replacement; the added empty containers have no original frame actions.
    probe += get(4) + prop('_-SQ') + put(13)
    probe += get(4) + get(13) + call('removeChild', 1)
    probe += construct('MovieClip') + put(11) + construct('MovieClip') + put(12)
    probe += get(7) + get(11) + call('addChild', 1)
    probe += get(11) + get(12) + call('addChild', 1)
    probe += get(12) + get(13) + call('addChild', 1)

    def rational(value):
        from fractions import Fraction
        value = Fraction(str(value))
        return integer(value.numerator) + integer(value.denominator) + b'\xa3'

    def matrix(local, values):
        # Matrix API translation is pixels; inputs in this manifest are twips.
        values = list(values)
        from fractions import Fraction
        values[4:] = [Fraction(str(v)) / 20 for v in values[4:]]
        return (get(local) + prop('transform') + op(0x60, q['Matrix'])
                + b''.join(rational(v) for v in values) + op(0x42, 6)
                + op(0x61, q['matrix']))

    identity = [1, 0, 0, 1, 0, 0]
    # Cases are inputs only. Expected rectangles are collected from AVM2,
    # never generated by the candidate/native implementation.
    cases = [
        (identity, identity),
        ([0.5, 0, 0, 0.5, 1, -1], identity),
        ([0.5, 0, 0, 0.5, -1, 1], identity),
        ([-0.5, 0, 0, -0.5, 1, -1], identity),
        ([1.25, 0, 0, -1.25, -3, 3], identity),
        ([0.6, 0.8, -0.8, 0.6, 1, -1], identity),
        ([0.5, 0, 0, 0.5, 1, -1], [1, 0, 0, 1, 1, -1]),
        ([0.5, 0, 0, 0.5, -1, 1], [1, 0, 0, 1, -3, 3]),
        ([0.6, 0.8, -0.8, 0.6, -3, 7], [0.8, -0.6, 0.6, 0.8, 3, -1]),
        ([0.9924774169921875, 0, 0, 0.9924774169921875, -1, -1],
         [1.25, 0.125, -0.375, 0.5, -7, 11]),
        ([-1.25, 0.125, 0.375, -0.5, 17, -19],
         [0.6, 0.8, -0.8, 0.6, 3, -5]),
        ([0, 0, 0, 0, -1, 1], identity),
        # Float32 operations cross a half-twip where Number arithmetic does not.
        ([0.038, 0, 0, 0.038, 1, -1], [1.141, 0, 0, 1.141, -3, 3]),
        ([-0.038, 0, 0, -0.038, -1, 1], [1.141, 0, 0, 1.141, 3, -3]),
    ]
    probe += matrix(13, identity)
    for index, (outer, inner) in enumerate(cases):
        probe += matrix(11, outer) + matrix(12, inner)
        probe += get(11) + get(7) + value_call('getBounds', 1) + put(14)
        probe += emit('BT3_BEAM_BOUNDS', [integer(index)] + [precise(get(11) + prop(p)) for p in ['width', 'height']]
                      + [precise(get(14) + prop(p)) for p in ['x', 'y', 'width', 'height']])
    # Width includes invisible/alpha-zero original artwork as well as depth masks.
    probe += matrix(11, identity) + matrix(12, identity)
    for index, (visible, alpha) in enumerate([(False, 1), (True, 0), (False, 0)], len(cases)):
        probe += assign(13, 'visible', b'\x26' if visible else b'\x27')
        probe += assign(13, 'alpha', integer(alpha))
        probe += get(11) + get(7) + value_call('getBounds', 1) + put(14)
        probe += emit('BT3_BEAM_BOUNDS', [integer(index)] + [precise(get(11) + prop(p)) for p in ['width', 'height']]
                      + [precise(get(14) + prop(p)) for p in ['x', 'y', 'width', 'height']])
    probe += get(7) + get(11) + call('removeChild', 1)
probe += get(6) + call('StopFiring', 0)
probe += get(0) + get(7) + call('removeChild', 1)
probe += emit('BT3_BEAM_DONE', [])
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
bodies += body(2, script, 2, 1, 0, 2) + body(3, key, 24, 15 if bounds_audit else 12 if audit else 11, 1, 2)
abc = struct.pack('<HH', 16, 46) + cp + methods + u(0) + classes + scripts + bodies
probe_tag = tag(82, struct.pack('<I', 0) + b'beam-wrapper-probe\0' + abc)

if Path(sys.argv[1]).resolve() == Path(sys.argv[2]).resolve():
    raise SystemExit('Output must differ from the original input.')
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
    'added_probe_abc_sha256': hashlib.sha256(abc).hexdigest(),
    **({'script_bounds_cases': [
        {'outer': outer, 'inner': inner, 'visible': True, 'alpha': 1}
        for outer, inner in cases] + [
        {'outer': identity, 'inner': identity, 'visible': visible, 'alpha': alpha}
        for visible, alpha in [(False, 1), (True, 0), (False, 0)]]}
        if bounds_audit else {})}, indent=2))

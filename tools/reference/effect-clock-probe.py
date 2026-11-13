#!/usr/bin/env python3
"""Actual generic effect constructors/queue/CreateEffect/Run; bounded binary poses.

Source audit JSON selects authored boundary windows, never expected runtime values.
Both birth cohorts are in one run. No original ABC/method/script/RNG/clock patch.
Queue enqueue is original; later handoff directly to engine is explicitly GLUE.
"""
import hashlib
import json
import struct
import sys
import zlib
from pathlib import Path


def u(v):
    b = bytearray()
    while v > 127:
        b.append((v & 127) | 128)
        v >>= 7
    return bytes(b) + bytes([v])


def tag(c, d=b''):
    return struct.pack('<H', (c << 6) | min(len(d), 63)) + (struct.pack('<I', len(d)) if len(d) >= 63 else b'') + d


if len(sys.argv) != 4 or Path(sys.argv[1]).resolve() == Path(sys.argv[2]).resolve():
    raise SystemExit('Supply distinct ORIGINAL OUTPUT SOURCE_AUDIT_JSON.')
audit = json.loads(Path(sys.argv[3]).read_text())
roots = audit['roots']
assert len(roots) == 15
ROOT = 'BT3EffectClockProbe'
labels = [cohort + ':' + r['key'] for cohort in ['before', 'inside'] for r in roots]
fields = ['x', 'y', 'scaleX', 'scaleY', 'rotation', 'alpha'] + ['own.' + p for p in ['a', 'b', 'c', 'd', 'tx', 'ty']]
names = [ROOT, 'Main', 'trace', 'stage', 'addEventListener', 'removeEventListener',
         'onProbeKey', 'onProbeEnter', 'onProbeExit', 'walk', 'node', 'keyCode',
         'currentFrame', 'totalFrames', 'isPlaying', 'parent', 'numChildren', 'name',
         'getChildAt', 'addChild', 'getQualifiedClassName', 'MovieClip',
         'DisplayObjectContainer', 'Dictionary', 'ByteArray', 'Array', 'push', 'length',
         'writeDouble', 'readUnsignedInt', 'position', 'transform', 'matrix',
         'x', 'y', 'scaleX', 'scaleY', 'rotation', 'alpha', 'a', 'b', 'c', 'd', 'tx', 'ty',
         'tick', 'ready', 'engine', 'field', 'world', 'top', 'ids', 'serial', 'registries', 'refs',
         'gWorldRef', 'blnGameOver', 'objEffectsEngine', 'Setup', '_-8o', 'CreateEffect',
         'Run', 'AddEffectToQueue', 'BTAGameWorld', 'Bubblefield', '_-2c']
names = list(dict.fromkeys(names + [r['className'] for r in roots] + [f'p{i}' for i in range(30)] + [f'done{i}' for i in range(30)]))
extra = ['flash.display', 'flash.utils', 'keyDown', 'enterFrame', 'exitFrame',
         'TopEffectsLayer', 'BT3_EFFECT_NULL', 'BT3_EFFECT_BEGIN', 'BT3_EFFECT_DONE', 'BT3_EFFECT_BITS',
         'BT3_EFFECT_ACTION', 'BT3_EFFECT_POLL', 'constructor', 'queued', 'enter', 'exit',
         'pre-register', 'post-register', 'callback', 'tree', 'retained', 'before', 'after', '0', '/'] + labels
strings = [''] + list(dict.fromkeys(names + extra))
si = {s: i for i, s in enumerate(strings)}
q = {n: i + 1 for i, n in enumerate(names)}
cp = u(1) + u(1) + u(1) + u(len(strings))
cp += b''.join(u(len(s.encode())) + s.encode() for s in strings[1:])
cp += u(5) + b'\x16' + u(0) + b'\x16' + u(si['flash.display']) + b'\x16' + u(si['flash.utils']) + b'\x17' + u(0)
cp += u(2) + u(1) + u(1) + u(len(names) + 2)
for n in names:
    ns = 2 if n in ['MovieClip', 'DisplayObjectContainer'] else 3 if n in ['Dictionary', 'ByteArray', 'getQualifiedClassName'] else 4 if n == '_-2c' else 1
    cp += b'\x07' + u(ns) + u(si[n])
array_index = len(names) + 1
cp += b'\x1b' + u(1)


def op(c, *a): return bytes([c]) + b''.join(u(v) for v in a)
def get(n): return bytes([0xd0 + n]) if n < 4 else op(0x62, n)
def put(n): return bytes([0xd4 + n]) if n < 4 else op(0x63, n)
def prop(n): return op(0x66, q[n])
def text(s): return op(0x2c, si[s])
def integer(n): return bytes([0x24, n & 255]) if -128 <= n < 128 else op(0x25, n)
def call(n, c): return op(0x4f, q[n], c)
def value(n, c): return op(0x46, q[n], c)
def own(n): return get(0) + prop(n)
def assign(n, v): return get(0) + v + op(0x61, q[n])
def construct(n, args=b'', count=0): return op(0x60, q[n]) + args + op(0x42, count)
def emit(s, vs): return op(0x5d, q['trace']) + text(s) + b''.join(vs) + call('trace', len(vs) + 1)
def listener(a, e, m): return own('stage') + text(e) + own(m) + call(a, 2)
def branch(cond, yes, no=b''):
    return cond + b'\x12' + (len(yes) + 4).to_bytes(3, 'little', signed=True) + yes + b'\x10' + len(no).to_bytes(3, 'little', signed=True) + no
def eq(a, b): return a + b + b'\xac'
def index(a, b): return a + b + op(0x66, array_index)
def setindex(a, b, v): return a + b + v + op(0x61, array_index)
def qualified(v): return op(0x5d, q['getQualifiedClassName']) + v + value('getQualifiedClassName', 1)


# node(node, phase, label, path, kind): emitted metadata + builtin ByteArray Numbers.
# Dictionary keys retain every sampled original object, even when its timeline removes it.
node = get(0) + b'\x30' + branch(eq(get(1), b'\x20'), emit('BT3_EFFECT_NULL', [own('tick'),get(2),get(3),get(4),get(5)]) + b'\x47')
new_id = assign('serial', own('serial') + b'\x91')
new_id += setindex(own('ids'), get(1), own('serial')) + get(6) + get(1) + call('push', 1)
node += branch(index(own('ids'), get(1)) + b'\x96', new_id)
node += get(1) + prop('transform') + prop('matrix') + put(7)
node += construct('ByteArray') + put(8)
node += integer(0) + put(9) + integer(0) + put(10) + b'\x27' + put(11) + integer(0) + put(12)
node += branch(get(1) + op(0xb2, q['MovieClip']),
               get(1) + prop('currentFrame') + put(9) + get(1) + prop('totalFrames') + put(10) + get(1) + prop('isPlaying') + put(11))
node += branch(get(1) + op(0xb2, q['DisplayObjectContainer']), get(1) + prop('numChildren') + put(12))
node += op(0x5d, q['trace']) + text('BT3_EFFECT_BITS')
node += own('tick') + get(2) + get(3) + get(4) + get(5)
node += index(own('ids'), get(1)) + qualified(get(1))
node += index(own('ids'), get(1) + prop('parent')) + b'\x73'
node += eq(get(1) + prop('parent'), b'\x20') + eq(get(1) + prop('parent'), own('top'))
node += get(1) + prop('name') + get(9) + get(10) + get(11) + get(12)
for v in [get(1) + prop(p) for p in fields[:6]] + [get(7) + prop(p) for p in ['a', 'b', 'c', 'd', 'tx', 'ty']]:
    node += get(8) + integer(0) + op(0x61, q['position']) + get(8) + v + call('writeDouble', 1)
    node += get(8) + integer(0) + op(0x61, q['position']) + get(8) + value('readUnsignedInt', 0) + get(8) + value('readUnsignedInt', 0)
node += call('trace', 16 + len(fields) * 2) + b'\x47'

# walk(node, phase, label, path), original getChildAt order, no candidate graph.
walk = get(0) + b'\x30' + get(0) + get(1) + get(2) + get(3) + get(4) + text('tree') + get(5) + call('node', 6)
loop = get(0) + get(1) + get(6) + value('getChildAt', 1) + get(2) + get(3) + get(4) + text('/') + b'\xa0' + get(6) + b'\xa0' + get(5) + call('walk', 5)
loop += get(6) + b'\x91' + put(6)
test = get(6) + get(1) + prop('numChildren') + b'\xad'
loopcode = integer(0) + put(6) + b'\x09' + test + b'\x12' + (len(loop) + 4).to_bytes(3, 'little', signed=True) + loop
loopcode += b'\x10' + (-(1 + len(test) + 4 + len(loop) + 4)).to_bytes(3, 'little', signed=True)
walk += branch(get(1) + op(0xb2, q['DisplayObjectContainer']), loopcode) + b'\x47'


def sample(phase, i):
    code = emit('BT3_EFFECT_ACTION', [text(phase),text(labels[i]),own('tick')]+[own(f'p{i}')+prop(n) for n in ['currentFrame','totalFrames','isPlaying','numChildren']]) + index(own('registries'), integer(i)) + put(3)
    code += get(0) + own(f'p{i}') + text(phase) + text(labels[i]) + text('0') + get(3) + call('walk', 5)
    # Independently retained historical descendants: includes nodes absent from current tree.
    loop = get(0) + index(get(3), get(2)) + text(phase) + text(labels[i]) + text('retained') + text('retained') + get(3) + call('node', 6)
    loop += get(2) + b'\x91' + put(2)
    test = get(2) + get(3) + prop('length') + b'\xad'
    code += integer(0) + put(2) + b'\x09' + test + b'\x12' + (len(loop) + 4).to_bytes(3, 'little', signed=True) + loop
    return code + b'\x10' + (-(1 + len(test) + 4 + len(loop) + 4)).to_bytes(3, 'little', signed=True)


def construction(cohort):
    code = b''
    for offset, r in enumerate(roots):
        i = cohort * 15 + offset
        code += setindex(own('registries'), integer(i), construct('Array'))
        code += assign(f'p{i}', construct(r['className'])) + sample('constructor', i)
        code += own('field') + own(f'p{i}') + integer(13 + i) + integer(23 + i) + text('TopEffectsLayer') + b'\x27' + own(f'done{i}') + call('AddEffectToQueue', 6)
        code += emit('BT3_EFFECT_ACTION', [text('queued'), text(labels[i]), own('tick')]) + sample('queued', i)
    return code


ctor = get(0) + b'\x30' + get(0) + op(0x49, 0) + listener('addEventListener', 'keyDown', 'onProbeKey') + b'\x47'
keybody = listener('removeEventListener', 'keyDown', 'onProbeKey') + emit('BT3_EFFECT_BEGIN', [])
keybody += assign('tick', integer(0)) + assign('ready', b'\x27') + assign('serial', integer(0))
keybody += assign('ids', construct('Dictionary')) + assign('registries', construct('Array'))
keybody += assign('engine', construct('_-2c', get(0), 1)) + assign('top', construct('MovieClip'))
keybody += get(0) + own('top') + call('addChild', 1)
keybody += setindex(own('ids'), own('top'), integer(-1))
keybody += own('engine') + text('TopEffectsLayer') + own('top') + call('_-8o', 2)
keybody += assign('world', construct('BTAGameWorld')) + own('world') + b'\x26' + op(0x61, q['blnGameOver'])
keybody += own('world') + own('engine') + op(0x61, q['objEffectsEngine'])
keybody += assign('field', construct('Bubblefield')) + own('field') + own('world') + op(0x61, q['gWorldRef'])
keybody += own('field') + get(0) + call('Setup', 1)
keybody += construction(0)
keybody += listener('addEventListener', 'enterFrame', 'onProbeEnter') + listener('addEventListener', 'exitFrame', 'onProbeExit')
key = get(0) + b'\x30' + branch(eq(get(1) + prop('keyCode'), integer(119)), keybody) + b'\x47'
enter = get(0) + b'\x30' + assign('tick', own('tick') + b'\x91')
enter += branch(eq(own('tick'), integer(1)), construction(1) + assign('ready', b'\x26'))
windows = []
for i in range(30):
    r = roots[i % 15]
    ticks = {1, 2, 3, 7, 8, 9, 243}
    for n in [r['frames']] + [d['frames'] for d in r['descendants'] if d['frames'] > 1]:
        for cycle in [1, 2]:
            for dt in [-1, 0, 1, 2]:
                tick = cycle * n + dt + (1 if i >= 15 else 0)
                if 1 <= tick <= 243: ticks.add(tick)
    windows.append(sorted(ticks))
    cond = b''
    for tick in sorted(ticks):
        cond += eq(own('tick'), integer(tick)) + (b'\xa9' if cond else b'')
    enter += branch(cond, sample('enter', i))
registration = b''
for i in range(30):
    registration += sample('pre-register', i)
    registration += own('engine') + own(f'p{i}') + integer(13 + i) + integer(23 + i) + text('TopEffectsLayer') + b'\x27' + own(f'done{i}') + call('CreateEffect', 6)
    registration += emit('BT3_EFFECT_ACTION', [text('post-register'), text(labels[i]), own('tick')]) + sample('post-register', i)
enter += branch(eq(own('tick'), integer(7)), registration)
poll = emit('BT3_EFFECT_POLL', [text('before'), own('tick'), own('top') + prop('numChildren')])
poll += own('engine') + call('Run', 0)
poll += emit('BT3_EFFECT_POLL', [text('after'), own('tick'), own('top') + prop('numChildren')])
enter += branch(own('tick') + integer(7) + b'\xb0', poll) + b'\x47'
exitwork = b''
for i, ticks in enumerate(windows):
    cond = b''
    for tick in ticks: cond += eq(own('tick'), integer(tick)) + (b'\xa9' if cond else b'')
    exitwork += branch(cond, sample('exit', i))
finish = listener('removeEventListener', 'enterFrame', 'onProbeEnter') + listener('removeEventListener', 'exitFrame', 'onProbeExit') + emit('BT3_EFFECT_DONE', [own('tick')])
exitwork += branch(own('tick') + integer(243) + b'\xb0', finish)
exitcode = get(0) + b'\x30' + branch(own('ready'), exitwork) + b'\x47'
callbacks = [get(0) + b'\x30' + emit('BT3_EFFECT_ACTION', [text('callback'), text(labels[i]), own('tick')]) + sample('callback', i) + b'\x47' for i in range(30)]
script = get(0) + b'\x30' + op(0x65, 0) + op(0x60, q['Main']) + b'\x30' + op(0x60, q['Main']) + op(0x58, 0) + b'\x1d' + op(0x68, q[ROOT]) + b'\x47'
method_names = ['onProbeKey', 'onProbeEnter', 'onProbeExit', 'walk', 'node'] + [f'done{i}' for i in range(30)]
codes = [ctor, get(0) + b'\x30\x47', script, key, enter, exitcode, walk, node] + callbacks
params = [0, 0, 0, 1, 1, 1, 5, 6] + [0] * 30
methods = u(len(codes)) + b''.join(u(p) + u(0) + u(0) * p + u(0) + b'\x00' for p in params)
traits = b''.join(u(q[n]) + b'\x01' + u(0) + u(3 + i) for i, n in enumerate(method_names))
slots = ['tick', 'ready', 'engine', 'field', 'world', 'top', 'ids', 'serial', 'registries', 'refs'] + [f'p{i}' for i in range(30)]
for n in slots: traits += u(q[n]) + b'\x00' + u(0) + u(0) + u(0)
instance = u(q[ROOT]) + u(q['Main']) + b'\x00' + u(0) + u(0) + u(len(slots) + len(method_names)) + traits
classes = u(1) + instance + u(1) + u(0)
scripts = u(1) + u(2) + u(1) + u(q[ROOT]) + b'\x04' + u(1) + u(0)


def body(i, code):
    count = 13 if i == 7 else 7 if i == 6 else 4 if i >= 3 else 1
    return u(i) + u(100) + u(count) + u(0 if i == 2 else 1) + u(2) + u(len(code)) + code + u(0) + u(0)


bodies = u(len(codes)) + b''.join(body(i, code) for i, code in enumerate(codes))
abc = struct.pack('<HH', 16, 46) + cp + methods + u(0) + classes + scripts + bodies
probe_tag = tag(82, struct.pack('<I', 0) + b'effect-clock-probe\0' + abc)
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
    'preserved_original_abc_tag_payloads': original_abc, 'audit': audit, 'labels': labels, 'windows': windows, 'fields': fields,
    'added_probe_abc_sha256': hashlib.sha256(abc).hexdigest()}, indent=2))

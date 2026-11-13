#!/usr/bin/env python3
"""Distinct original public hitTestPoint root argument-space qualification.
One declared wrapper retains original1544/1543. Original methods/getters/ABCs,
RNG, clock and geometry remain unchanged. F8 synchronously applies declared
Main/wrapper setters and executes actual Point/hit/identity getters.
"""
import hashlib
import json
import struct
import sys
import zlib
from fractions import Fraction
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
ROOT = 'BT3RootQueryProbe'
# The only project wrapper places genuine original sprite1544, containing
# unchanged geometric leaf1543. No project drawing calls.
wrappers = []


def wrapper(label, children):
    cid = 60000 + len(wrappers)
    wrappers.append({'label': label, 'id': cid, 'class': 'RootQuery' + str(cid), 'children': children})
    return cid


def child(symbol, depth, name, x=0, end=None):
    return {'symbol': symbol, 'depth': depth, 'name': name, 'x': x, 'clipDepth': end}


wrapper('geometric', [child(1544, 1, 'target')])
fields = ['receiverId', 'parentId', 'rootId', 'stageId', 'mainRootId', 'mainParentId',
          'loaderInfoId', 'mainLoaderInfoId', 'rootLoaderInfoId', 'loaderId', 'rootLoaderId',
          'rootIsMain', 'parentIsExpected', 'stageIsMainStage', 'rootIsStage', 'loaderInfoIsMain',
          'loaderInfoContentIsMain', 'rootLoaderInfoContentIsMain',
          'x', 'y', 'scaleX', 'scaleY', 'rotation', 'main.x', 'main.y', 'main.scaleX', 'main.scaleY', 'main.rotation']
fields += [pre + '.' + p for pre in ['own', 'concatenated', 'mainOwn', 'wrapperOwn'] for p in ['a', 'b', 'c', 'd', 'tx', 'ty']]
fields += [pre + '.' + p for pre in ['input', 'stagePoint', 'rootPoint', 'rootMappedStage', 'rawMappedStage', 'stageMappedStage', 'stageMappedLocal'] for p in ['x', 'y']]
fields += ['rawHit', 'stageHit', 'rootHit', 'stageHitAgain', 'width', 'height']
names = [ROOT, 'Main', 'MovieClip', 'Point', 'ByteArray', 'Dictionary', 'getQualifiedClassName', 'trace', 'stage', 'root', 'loaderInfo', 'loader', 'content', 'addEventListener', 'removeEventListener', 'onProbeKey', 'keyCode', 'addChild', 'removeChild', 'getChildByName', 'parent', 'hitTestPoint', 'width', 'height', 'x', 'y', 'scaleX', 'scaleY', 'rotation', 'transform', 'matrix', 'concatenatedMatrix', 'a', 'b', 'c', 'd', 'tx', 'ty', 'localToGlobal', 'globalToLocal', 'writeDouble', 'position', 'readUnsignedInt'] + [w['class'] for w in wrappers]
phases = ['identity', 'main1000', 'main-offset', 'main-fraction', 'main-affine', 'nested-affine']
labels = ['BT3_ROOT_QUERY_BEGIN', 'BT3_ROOT_QUERY_BITS', 'BT3_ROOT_QUERY_DONE', 'keyDown', 'target', 'wrapper', 'centre', 'interior', 'far'] + phases
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


def number(n):
    f = Fraction(str(n))
    assert -32768 <= f.numerator <= 32767 and f.denominator <= 32767
    return num(f.numerator) + num(f.denominator) + b'\xa3'


cohort = []


def sample(phase, role, local, pointName, xy, attached):
    cohort.append({'case': phase, 'phase': pointName, 'role': role})
    code = op(0x60, q['Point']) + number(xy[0]) + number(xy[1]) + op(0x42, 2) + put(8)
    # Actual builtin Points only; no host transform/hit result is injected.
    for receiver, point, dest, method in [(local,8,9,'localToGlobal'), (0,9,10,'globalToLocal'), (0,10,11,'localToGlobal'), (0,8,12,'localToGlobal'), (0,9,13,'localToGlobal'), (local,13,16,'globalToLocal')]:
        code += get(receiver) + get(point) + val(method, 1) + put(dest)
    for obj, getter, dest in [(local,'matrix',17),(local,'concatenatedMatrix',18),(0,'matrix',19),(1,'matrix',20)]:
        code += get(obj) + prop('transform') + prop(getter) + put(dest)
    def eq(a,b): return a + b + b'\xac'
    root = get(local) + prop('root')
    li = get(local) + prop('loaderInfo')
    rli = root + prop('loaderInfo')
    # Null/known object keys are resolved by the real Dictionary. Content identities
    # are strict comparisons; no name-based guess of player-root identity.
    values = [idval(get(local)), idval(get(local)+prop('parent')), idval(root), idval(get(local)+prop('stage')),
              idval(get(0)+prop('root')), idval(get(0)+prop('parent')), idval(li), idval(get(0)+prop('loaderInfo')), idval(rli),
              idval(li+prop('loader')), idval(rli+prop('loader')),
              eq(root,get(0)), eq(get(local)+prop('parent'),get(1) if local==2 else get(0) if attached else b'\x20'),
              eq(get(local)+prop('stage'),get(0)+prop('stage')), eq(root,get(0)+prop('stage')),
              eq(li,get(0)+prop('loaderInfo')), eq(li+prop('content'),get(0)), eq(rli+prop('content'),get(0))]
    values += [get(local)+prop(p) for p in ['x','y','scaleX','scaleY','rotation']]
    values += [get(0)+prop(p) for p in ['x','y','scaleX','scaleY','rotation']]
    values += [get(m)+prop(p) for m in [17,18,19,20] for p in ['a','b','c','d','tx','ty']]
    values += [get(m)+prop(p) for m in [8,9,10,11,12,13,16] for p in ['x','y']]
    for m in [8,9,10,9]:
        values += [get(local)+get(m)+prop('x')+get(m)+prop('y')+b'\x26'+val('hitTestPoint',3)]
    values += [get(local)+prop('width'), get(local)+prop('height')]
    assert len(values)==len(fields)
    code += op(0x5d,q['trace'])+txt('BT3_ROOT_QUERY_BITS')+txt(phase)+txt(pointName)+txt(role)+qualified(get(local))+qualified(get(local)+prop('parent'))+qualified(get(9))
    for v in values:
        code += setp(14,'position',num(0))+get(14)+v+b'\x75'+call('writeDouble',1)
        code += setp(14,'position',num(0))+get(14)+val('readUnsignedInt',0)+get(14)+val('readUnsignedInt',0)
    return code+call('trace',7+2*len(values))


ctor = get(0) + b'\x30' + get(0) + op(0x49, 0) + get(0) + prop('stage') + txt('keyDown') + get(0) + prop('onProbeKey') + call('addEventListener', 2) + b'\x47'
probe = get(0) + prop('stage') + txt('keyDown') + get(0) + prop('onProbeKey') + call('removeEventListener', 2)
probe += new('ByteArray')+put(14)+new('Dictionary')+put(15)
probe += get(15)+b'\x20'+num(0)+op(0x61,index_name)+ident(0,1)
probe += new(wrappers[0]['class'])+put(1)+attach(0,1)+ident(1,2)+named(1,'target',2)+ident(2,3)
probe += get(15)+get(0)+prop('stage')+num(4)+op(0x61,index_name)
probe += get(15)+get(0)+prop('loaderInfo')+num(5)+op(0x61,index_name)
probe += emit('BT3_ROOT_QUERY_BEGIN',[num(550),num(450)])
for phase in phases:
    attached = True
    pose = {'identity':(0,0,1,1,0), 'main1000':(1000,0,1,1,0), 'main-offset':(137,-83,1,1,0), 'main-fraction':(.07,-.07,1,1,0)}.get(phase,(1000,-200,1.25,.75,30))
    for p,v in zip(['x','y','scaleX','scaleY','rotation'],pose): probe += setp(0,p,number(v))
    wpose = (0,0,1,1,0) if phase not in ['nested-affine'] else (37,-21,.8,1.2,-30)
    for p,v in zip(['x','y','scaleX','scaleY','rotation'],wpose): probe += setp(1,p,number(v))
    for role,local in [('wrapper',1),('target',2)]:
        for pn,xy in [('centre',(0,0)),('interior',(10,5)),('far',(1000,0))]:
            probe += sample(phase,role,local,pn,xy,attached)
probe += emit('BT3_ROOT_QUERY_DONE',[])
key = get(0) + b'\x30' + get(1) + prop('keyCode') + num(119) + b'\x14' + len(probe).to_bytes(3, 'little', signed=True) + probe + b'\x47'
# Main-derived document plus added MovieClip wrapper classes. Original ABCs stay byte-identical.
methods_code = [(ctor, 4, 1, 1, 2), (get(0) + b'\x30\x47', 1, 1, 1, 2), (b'', 2, 1, 0, 2), (key, 160, 21, 1, 2)]
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
added.append(tag(82, struct.pack('<I', 0) + b'root-query-probe\0' + abc))
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

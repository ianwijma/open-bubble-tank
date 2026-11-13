#!/usr/bin/env python3
"""Preserved original StaticText builtin contact under declared project wrappers.
No original method, ABC, frame script, RNG, clock or engine patch. F8 performs
synchronous builtin hitTestPoint(shape=true), width/height, bounds and Point reads.
Derived normal/advanced copies are project controls, never original text.
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
ROOT = 'BT3TextContactProbe'
raw = Path(sys.argv[1]).read_bytes()
original = raw
if raw[:3] == b'CWS':
    expanded = raw[8:] if len(raw) == struct.unpack_from('<I', raw, 4)[0] else zlib.decompress(raw[8:])
    original = b'FWS' + raw[3:8] + expanded
assert hashlib.sha256(raw).hexdigest() == 'f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153'
start = 8 + (5 + 4 * (original[8] >> 3) + 7) // 8 + 4
source_tags = []
at = start
while at < len(original):
    h, = struct.unpack_from('<H', original, at)
    code, size = h >> 6, h & 63
    at += 2
    if size == 63:
        size, = struct.unpack_from('<I', original, at)
        at += 4
    source_tags.append((code, original[at:at+size]))
    at += size
text = next(data for code,data in source_tags if code == 33 and struct.unpack_from('<H',data)[0] == 1659)
derived = []
derived_tags = []
for cid, renderer in [(61000, 0), (61001, 1)]:
    body = struct.pack('<H', cid) + text[2:]
    settings = struct.pack('<HBffB', cid, (renderer << 6) | (2 << 3), 0, 0, 0)
    derived_tags += [tag(33, body), tag(74, settings)]
    derived.append({'id':cid,'source':1659,'classification':'PROJECT-owned derived DefineText2; only CID differs','renderer':renderer,'gridFit':2,'thickness':0,'sharpness':0})
wrappers = [{'label':'original-'+str(cid), 'id':60000+i, 'class':'TextContact'+str(60000+i), 'children':[{'symbol':cid,'depth':1,'name':'target','x':0,'clipDepth':None}]} for i,cid in enumerate(list(range(1659,1667))+[61000,61001])]
for i,w in enumerate(wrappers[8:]): w['label'] = ['derived-normal','derived-advanced'][i]
fields = ['objectId','parentId','maskId','childIndex','hit','hitAgain','width','height','widthAgain','heightAgain','x','y','scaleX','scaleY','rotation','visible','alpha','input.x','input.y','point.x','point.y','pointIsInput','roundTrip.x','roundTrip.y','roundTripIsInput','bounds.x','bounds.y','bounds.width','bounds.height','localBounds.x','localBounds.y','localBounds.width','localBounds.height','worldBounds.x','worldBounds.y','worldBounds.width','worldBounds.height','main.x','main.y','main.scaleX','main.scaleY','main.rotation']
names = [ROOT,'Main','MovieClip','Point','ByteArray','Dictionary','getQualifiedClassName','trace','stage','addEventListener','removeEventListener','onProbeKey','keyCode','addChild','removeChild','getChildByName','getChildIndex','parent','mask','hitTestPoint','width','height','x','y','scaleX','scaleY','rotation','visible','alpha','localToGlobal','globalToLocal','getBounds','writeDouble','position','readUnsignedInt','Bubblefield']+[w['class'] for w in wrappers]
point_labels = ['center','min-min','max-max','left','right','top','bottom','outside-left','outside-right','outside-top','outside-bottom','empty-margin','glyph-positive','world-near-min','world-near-max','world-center','world-outside-left','world-outside-right']
phases = ['baseline','scaled-parent','rotated-parent','rotated-leaf','nested-transform','target-hidden','target-alpha0','wrapper-hidden','wrapper-alpha0','target-detached','reattached','wrapper-detached','wrapper-reattached','runtime-mask-unassigned','runtime-mask-shifted-unassigned','runtime-mask-hit','runtime-mask-miss','runtime-mask-hidden','runtime-mask-alpha0','runtime-mask-cleared','zero-scale','world-extrema']
labels = ['BT3_TEXT_BEGIN','BT3_TEXT_BITS','BT3_TEXT_DONE','local','world','keyDown','target','wrapper','mask','effect_mask_under']+point_labels+phases+[w['label'] for w in wrappers]
strings = ['']+list(dict.fromkeys(names+labels+['flash.display','flash.geom','flash.utils']))
si = {s:i for i,s in enumerate(strings)}
q = {n:i+1 for i,n in enumerate(names)}
index_name = len(names)+1
def op(code, *args): return bytes([code]) + b''.join(u(a) for a in args)
def get(n): return bytes([0xd0 + n]) if n < 4 else op(0x62, n)
def put(n): return bytes([0xd4 + n]) if n < 4 else op(0x63, n)
def prop(n): return op(0x66, q[n])
def txt(n): return op(0x2c, si[n])
def num(n):
    if not isinstance(n, int): return num(round(n * 100)) + num(100) + b'\xa3'
    return bytes([0x24, n & 255]) if -128 <= n < 128 else op(0x25, n & 65535)
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

def point(name, space):
    # Actual bounds getters; arithmetic only selects query arguments, never a hit.
    if space == 'world': source = 13
    else: source = 6
    x,y = get(source)+prop('x'),get(source)+prop('y')
    w,h = get(source)+prop('width'),get(source)+prop('height')
    half = lambda v: v+num(2)+b'\xa3'
    add = lambda a,b: a+b+b'\xa0'
    sub = lambda a,b: a+b+b'\xa1'
    if name in ['center','world-center']: return add(x,half(w)),add(y,half(h))
    if name == 'min-min': return x,y
    if name == 'max-max': return add(x,w),add(y,h)
    if name == 'left': return x,add(y,half(h))
    if name == 'right': return add(x,w),add(y,half(h))
    if name == 'top': return add(x,half(w)),y
    if name == 'bottom': return add(x,half(w)),add(y,h)
    if name in ['outside-left','world-outside-left']: return sub(x,num(0.05)),add(y,half(h))
    if name in ['outside-right','world-outside-right']: return add(add(x,w),num(0.05)),add(y,half(h))
    if name == 'outside-top': return add(x,half(w)),sub(y,num(0.05))
    if name == 'outside-bottom': return add(x,half(w)),add(add(y,h),num(0.05))
    if name == 'empty-margin': return num(-16),num(80)
    if name == 'glyph-positive': return num(131.1),num(44.85)
    if name == 'world-near-min': return add(x,num(1)),add(y,num(1))
    if name == 'world-near-max': return sub(add(x,w),num(1)),sub(add(y,h),num(1))
    raise AssertionError(name)

def sample(case, phase, pname, local, parent=1, space='local'):
    role = {1:'wrapper',2:'target',3:'mask'}[local]
    cohort.append({'case':case,'phase':phase,'role':role,'point':pname,'space':space})
    code = get(2)+get(2)+val('getBounds',1)+put(6)
    code += get(2)+get(0)+prop('stage')+val('getBounds',1)+put(13)
    px,py = point(pname,space)
    code += op(0x60,q['Point'])+px+py+op(0x42,2)+put(8)
    code += (get(8) if space == 'world' else get(2)+get(8)+val('localToGlobal',1))+put(9)
    code += get(2)+get(9)+val('globalToLocal',1)+put(10)
    code += get(local)+get(1)+val('getBounds',1)+put(11)
    hit = get(local)+get(9)+prop('x')+get(9)+prop('y')+b'\x26'+val('hitTestPoint',3)
    values=[idval(get(local)),idval(get(local)+prop('parent')),idval(get(local)+prop('mask')),get(parent)+get(local)+val('getChildIndex',1) if parent is not None else num(-1),hit,hit,*[get(local)+prop(n) for n in ['width','height','width','height','x','y','scaleX','scaleY','rotation','visible','alpha']],get(8)+prop('x'),get(8)+prop('y'),get(9)+prop('x'),get(9)+prop('y'),get(9)+get(8)+b'\xac',get(10)+prop('x'),get(10)+prop('y'),get(10)+get(8)+b'\xac',*[get(i)+prop(n) for i in [11,6,13] for n in ['x','y','width','height']],*[get(0)+prop(n) for n in ['x','y','scaleX','scaleY','rotation']]]
    assert len(values)==len(fields)
    code += op(0x5d,q['trace'])+txt('BT3_TEXT_BITS')+txt(case)+txt(phase)+txt(role)+txt(pname)+txt(space)+qualified(get(local))+qualified(get(local)+prop('parent'))+qualified(get(9))
    for value in values:
        code += setp(14,'position',num(0))+get(14)+value+b'\x75'+call('writeDouble',1)
        code += setp(14,'position',num(0))+get(14)+val('readUnsignedInt',0)+get(14)+val('readUnsignedInt',0)
    return code+call('trace',9+2*len(values))

def pair(case,phase,pnames,space='local',target_parent=1,wrapper_parent=0):
    return b''.join(sample(case,phase,p,local,parent,space) for p in pnames for local,parent in [(1,wrapper_parent),(2,target_parent)]+([(3,1)] if phase in ['runtime-mask-hit','runtime-mask-miss','runtime-mask-hidden','runtime-mask-alpha0'] else []))

ctor = get(0)+b'\x30'+get(0)+op(0x49,0)+get(0)+prop('stage')+txt('keyDown')+get(0)+prop('onProbeKey')+call('addEventListener',2)+b'\x47'
probe = get(0)+prop('stage')+txt('keyDown')+get(0)+prop('onProbeKey')+call('removeEventListener',2)
probe += setp(0,'x',num(0))+setp(0,'y',num(0))
probe += new('ByteArray')+put(14)+new('Dictionary')+put(15)
probe += get(15)+b'\x20'+num(0)+op(0x61,index_name)+ident(0,1)
probe += emit('BT3_TEXT_BEGIN',[num(550),num(450)])
for w in wrappers:
    case = w['label']
    probe += new(w['class'])+put(1)+attach(0,1)+ident(1,2)+named(1,'target',2)+ident(2,3)
    detailed = w['children'][0]['symbol'] in [1659,61000,61001]
    points = point_labels[:13] if detailed else ['center','min-min','outside-right']
    probe += pair(case,'baseline',points)
    if detailed: probe += pair(case,'world-extrema',point_labels[:11],'world')
    if detailed:
        probe += setp(1,'x',num(123.25))+setp(1,'y',num(-47.5))+setp(1,'scaleX',num(1.5))+setp(1,'scaleY',num(0.5))
        probe += pair(case,'scaled-parent',['center','min-min','outside-right'])
        probe += setp(1,'rotation',num(37))
        probe += pair(case,'rotated-parent',point_labels[13:],'world')
        probe += setp(1,'rotation',num(0))+setp(1,'x',num(0))+setp(1,'y',num(0))+setp(1,'scaleX',num(1))+setp(1,'scaleY',num(1))+setp(2,'rotation',num(37))
        probe += pair(case,'rotated-leaf',point_labels[13:],'world')
        probe += setp(1,'rotation',num(-23))+setp(1,'scaleX',num(-0.75))+setp(1,'scaleY',num(1.5))+setp(2,'scaleX',num(0.5))+setp(2,'scaleY',num(1.5))
        probe += pair(case,'nested-transform',['world-near-min','world-center','world-outside-right'],'world')
        # Restore, then observe contact independently of paint and stage membership.
        probe += setp(1,'rotation',num(0))+setp(1,'scaleX',num(1))+setp(1,'scaleY',num(1))+setp(2,'rotation',num(0))+setp(2,'scaleX',num(1))+setp(2,'scaleY',num(1))
        if w['children'][0]['symbol']==1659:
            for owner,propname,phase in [(2,'visible','target-hidden'),(2,'alpha','target-alpha0'),(1,'visible','wrapper-hidden'),(1,'alpha','wrapper-alpha0')]:
                probe += setp(owner,propname,b'\x27' if propname=='visible' else num(0))+pair(case,phase,['empty-margin'])+setp(owner,propname,b'\x26' if propname=='visible' else num(1))
            probe += detach(1,2)+pair(case,'target-detached',['empty-margin'],target_parent=None)+attach(1,2)+pair(case,'reattached',['empty-margin'])
            probe += detach(0,1)+pair(case,'wrapper-detached',['empty-margin'],wrapper_parent=None)+attach(0,1)+pair(case,'wrapper-reattached',['empty-margin'])
            # Original circle1539, obtained from actual original Bubblefield construction.
            probe += new('Bubblefield')+put(5)+named(5,'effect_mask_under',3)+ident(3,4)+attach(1,3)
            probe += pair(case,'runtime-mask-unassigned',['empty-margin'])+sample(case,'runtime-mask-unassigned','empty-margin',3)
            probe += setp(3,'x',num(1000))+sample(case,'runtime-mask-shifted-unassigned','empty-margin',3)+setp(3,'x',num(0))+setp(2,'mask',get(3))
            probe += pair(case,'runtime-mask-hit',['empty-margin'])+setp(3,'x',num(1000))+pair(case,'runtime-mask-miss',['empty-margin'])
            probe += setp(3,'x',num(0))+setp(3,'visible',b'\x27')+pair(case,'runtime-mask-hidden',['empty-margin'])
            probe += setp(3,'visible',b'\x26')+setp(3,'alpha',num(0))+pair(case,'runtime-mask-alpha0',['empty-margin'])
            probe += setp(2,'mask',b'\x20')+detach(1,3)+pair(case,'runtime-mask-cleared',['empty-margin'])
        # Bounded singular advanced control; no inverse-dependent helper is inferred.
        probe += setp(1,'scaleX',num(0))+pair(case,'zero-scale',['world-center'],'world')
    probe += detach(0,1)
probe += emit('BT3_TEXT_DONE',[])
cp = u(1) + u(1) + u(1) + u(len(strings)) + b''.join(u(len(s.encode())) + s.encode() for s in strings[1:])
cp += u(5) + b''.join(b'\x16' + u(si[s]) for s in ['', 'flash.display', 'flash.geom', 'flash.utils'])
cp += u(2) + u(1) + u(1) + u(len(names) + 2)
for n in names:
    ns = 2 if n == 'MovieClip' else 3 if n == 'Point' else 4 if n in ['ByteArray', 'Dictionary', 'getQualifiedClassName'] else 1
    cp += b'\x07' + u(ns) + u(si[n])
cp += b'\x1b' + u(1)
key = get(0) + b'\x30' + get(1) + prop('keyCode') + num(119) + b'\x14' + len(probe).to_bytes(3, 'little', signed=True) + probe + b'\x47'
# Main-derived document plus added MovieClip wrapper classes. Original ABCs stay byte-identical.
methods_code = [(ctor, 4, 1, 1, 2), (get(0) + b'\x30\x47', 1, 1, 1, 2), (b'', 2, 1, 0, 2), (key, 100, 16, 1, 2)]
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
added = derived_tags + [tag(39, struct.pack('<HH', w['id'], 1) + b''.join(place(c['symbol'], c['depth'], c['name'], c['x'], c['clipDepth']) for c in w['children']) + tag(1) + tag(0)) for w in wrappers]
added.append(tag(82, struct.pack('<I', 0) + b'text-contact-probe\0' + abc))
added.append(tag(76, struct.pack('<H', len(wrappers)) + b''.join(struct.pack('<H', w['id']) + w['class'].encode() + b'\0' for w in wrappers)))
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
print(json.dumps({'original_sha256': hashlib.sha256(raw).hexdigest(), 'probe_sha256': hashlib.sha256(result).hexdigest(), 'emitter_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), 'preserved_original_abc_tag_payloads': abcs, 'added_tags': [{'code': struct.unpack_from('<H', t)[0] >> 6, 'sha256': hashlib.sha256(t).hexdigest()} for t in added], 'derived': derived, 'wrappers': wrappers, 'fields': fields, 'cohort': cohort, 'scope': __doc__}, indent=2))

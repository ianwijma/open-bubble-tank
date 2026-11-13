#!/usr/bin/env python3
"""Preserved-original AdjustBubblefieldObjects camera controls.

Actual Setup, TankData._-Tr, original _-Rm and genuine public _-KM.
Construction/parenting and source-ordered Number movement are GLUE.
No original method, RNG, clock, registered script or ABC payload is replaced.
No World.Run, input-event, ordinary encounter, Adobe or full-game claim.
"""
import hashlib
import json
import struct
import sys
import zlib
from fractions import Fraction
from pathlib import Path


def u(value):
    result = bytearray()
    while value > 127:
        result.append((value & 127) | 128)
        value >>= 7
    return bytes(result) + bytes([value])


def tag(code, data=b''):
    return (struct.pack('<H', (code << 6) | min(len(data), 63))
            + (struct.pack('<I', len(data)) if len(data) >= 63 else b'') + data)


if len(sys.argv) != 3 or Path(sys.argv[1]).resolve() == Path(sys.argv[2]).resolve():
    raise SystemExit('Supply distinct ORIGINAL OUTPUT paths.')
ROOT = 'BT3WorldMotionProbe'
roles = [('root',2,1),('avatarUnder',23,2),('avatar',3,1),('top',5,1),
         ('bullet',4,1),('highlight',6,1),('under',9,2),('bottom',7,9),
         ('screen',8,1),('world',1,0),('main',0,'stage'),('nextRoot',16,1),
         ('nextTop',18,1),('nextBullet',17,1),('currentMask',24,2),('nextMask',25,16)]
controls=[]
fields = ['scaleX','scaleY','x','y','alpha','rotation']
fields += [prefix+'.'+p for prefix in ['own','concatenated'] for p in ['a','b','c','d','tx','ty']]
fields += [prefix+'.'+p for prefix in ['point0','point100x40','position','stage','local','delta'] for p in ['x','y']]
fields += ['classSpeed']
names = [ROOT, 'Main', 'trace', 'stage', 'stageWidth', 'stageHeight',
         'addEventListener', 'removeEventListener', 'onProbeKey', 'keyCode',
         'addChild', 'removeChild', 'TankData', '_-HJ', 'getInstance', '_-7G',
         'ImportTankData', '_-Tr', 'strID', 'BTAGameWorld', 'Bubblefield',
         '_-dl', '_-My', '_-Zs', '_-Rt', 'MovieClip', 'ByteArray', 'Point',
         'getQualifiedClassName', 'parent', 'scaleX', 'scaleY', 'x', 'y', 'alpha',
         'transform', 'matrix', 'concatenatedMatrix', 'a', 'b', 'c', 'd', 'tx', 'ty',
         'localToGlobal', 'writeDouble', 'position', 'readUnsignedInt', 'Setup',
         'gWorldRef', 'mRef', 'myAvatar', 'currentBFTarget', '_-00', 'currEffectLayer',
         'currEffectLayer2', '_-JZ', 'effectLayer_under_mc', 'BF_BG_mc',
         'effect_mask_under', '_-SQ', 'BF_over_detail_mc', 'DeathAnimPart2', 'ShrinkBubblefield']
names += ['globalToLocal','rotation','avatarUnderBubble_mc','nextBFTarget','_-Hm','_-68',
          'AdjustBubblefieldObjects','_-KM','_-Rm','_-B-','objBackgroundParticles2','numSpeed','Math','abs']
labels = ['BT3_MOTION_DEPENDENCIES','BT3_MOTION_BEGIN','BT3_MOTION_AVATAR','BT3_MOTION_BITS','BT3_MOTION_DONE',
          'keyDown','right','down','both','negative','right-fraction','down-fraction',
          'both-fraction','negative-fraction','teleport']+[r[0] for r in roles]
strings = [''] + list(dict.fromkeys(names + labels + ['flash.display', 'flash.geom', 'flash.utils']))
si = {s: i for i, s in enumerate(strings)}
q = {n: i + 1 for i, n in enumerate(names)}
cp = u(1) + u(1) + u(1)
cp += u(len(strings)) + b''.join(u(len(s.encode())) + s.encode() for s in strings[1:])
cp += u(5) + b''.join(b'\x16' + u(si[s]) for s in ['', 'flash.display', 'flash.geom', 'flash.utils'])
cp += u(2) + u(1) + u(1) + u(len(names) + 2)
for name in names:
    ns = 2 if name == 'MovieClip' else 3 if name == 'Point' else 4 if name in ('ByteArray', 'getQualifiedClassName') else 1
    cp += b'\x07' + u(ns) + u(si[name])
array_index = len(names) + 1
cp += b'\x1b' + u(1)


def op(code, *args): return bytes([code]) + b''.join(u(a) for a in args)
def get(n): return bytes([0xd0 + n]) if n < 4 else op(0x62, n)
def put(n): return bytes([0xd4 + n]) if n < 4 else op(0x63, n)
def prop(n): return op(0x66, q[n])
def text(s): return op(0x2c, si[s])
def integer(n):
    if n < -32768: return integer(-n) + b'\x90'
    if n > 32767: return integer(n // 1000) + integer(1000) + b'\xa2' + integer(n % 1000) + b'\xa0'
    return bytes([0x24, n & 255]) if -128 <= n < 128 else op(0x25, n & 65535)
def number(n):
    f = Fraction(str(n))
    return integer(f.numerator) + integer(f.denominator) + b'\xa3'
def call(n, count): return op(0x4f, q[n], count)
def value_call(n, count): return op(0x46, q[n], count)
def construct(n): return op(0x60, q[n]) + op(0x42, 0)
def assign(local, n, value): return get(local) + value + op(0x61, q[n])
def emit(label, values):
    return op(0x5d, q['trace']) + text(label) + b''.join(values) + call('trace', 1 + len(values))
def qualified(value): return op(0x5d, q['getQualifiedClassName']) + value + value_call('getQualifiedClassName', 1)
def attach(parent, child): return get(parent) + get(child) + call('addChild', 1)
def sample(phase, age, role, local, parent):
    controls.append(dict(phase=phase,age=age,role=role))
    code=get(local)+prop('transform')+prop('matrix')+put(11)
    code+=get(local)+prop('transform')+prop('concatenatedMatrix')+put(12)
    values=[get(local)+prop(p) for p in ['scaleX','scaleY','x','y','alpha','rotation']]
    values += [get(m)+prop(p) for m in [11,12] for p in ['a','b','c','d','tx','ty']]
    for target,xy in [(13,(0,0)),(20,(100,40))]:
        code+=get(local)+op(0x60,q['Point'])+number(xy[0])+number(xy[1])+op(0x42,2)+value_call('localToGlobal',1)+put(target)
    # Real source-parent Position, separate from avatar.localToGlobal(detail).
    code+=op(0x60,q['Point'])+get(3)+prop('x')+get(3)+prop('y')+op(0x42,2)+put(26)
    code+=get(3)+prop('parent')+get(26)+value_call('localToGlobal',1)+put(27)
    code+=get(local)+get(27)+value_call('globalToLocal',1)+put(28)
    values += [get(m)+prop(p) for m in [13,20,26,27,28,22] for p in ['x','y']]
    values += [get(15)+prop('numSpeed')]
    expected_parent=get(0)+prop('stage') if parent=='stage' else get(parent)
    code+=op(0x5d,q['trace'])+text('BT3_MOTION_BITS')+text(phase)+integer(age)+text(role)
    code+=qualified(get(local))+qualified(get(local)+prop('parent'))
    code+=get(local)+prop('parent')+expected_parent+b'\xac'
    for value in values:
        code+=assign(14,'position',integer(0))+get(14)+value+call('writeDouble',1)
        code+=assign(14,'position',integer(0))+get(14)+value_call('readUnsignedInt',0)+get(14)+value_call('readUnsignedInt',0)
    return code+call('trace',7+2*len(values))

def branch(condition, yes, no=b''):
    # condition leaves a Boolean; iffalse skips yes and its jump over no.
    return condition+b'\x12'+(len(yes)+4).to_bytes(3,'little',signed=True)+yes+b'\x10'+len(no).to_bytes(3,'little',signed=True)+no

def vector_write(axis,value): return assign(22,axis,value)
def velocity(axis): return get(22)+prop(axis)
def movement(held,direction):
    code=b''
    for axis,sign in zip(['y','x'],reversed(direction)):
        if held and sign:
            value=velocity(axis)+number(.6)+get(15)+prop('numSpeed')+b'\xa2'+(b'\xa0' if sign>0 else b'\xa1')
            code+=vector_write(axis,value)
            limit=integer(6*sign)+get(15)+prop('numSpeed')+b'\xa2'
            code+=branch(velocity(axis)+limit+(b'\xaf' if sign>0 else b'\xad'),vector_write(axis,limit))
        else:
            code+=branch(velocity(axis)+integer(0)+b'\xaf',
                         vector_write(axis,velocity(axis)+number(.09)+b'\xa1'),
                         vector_write(axis,velocity(axis)+number(.09)+b'\xa0'))
            code+=branch(op(0x60,q['Math'])+velocity(axis)+value_call('abs',1)+number(.5)+b'\xad',vector_write(axis,integer(0)))
    return code

ctor = get(0) + b'\x30' + get(0) + op(0x49, 0)
ctor += get(0) + prop('stage') + text('keyDown') + get(0) + prop('onProbeKey') + call('addEventListener', 2) + b'\x47'
probe = get(0) + prop('stage') + text('keyDown') + get(0) + prop('onProbeKey') + call('removeEventListener', 2)
probe += emit('BT3_MOTION_BEGIN',[get(0)+prop('stage')+prop('stageWidth'),get(0)+prop('stage')+prop('stageHeight')])
probe += construct('ByteArray')+put(14)
# GLUE supplies real original dependencies. Their constructors/RNG/scripts are unmodified.
for name,flag in [('_-B-',False),('objBackgroundParticles2',True)]:
    probe += get(0)+op(0x60,q['_-Rm'])+get(0)+prop('stage')+get(0)+(b'\x26' if flag else b'\x27')+op(0x42,3)+op(0x61,q[name])
for cohort,direction in [('right',(1,0)),('down',(0,1)),('both',(1,1)),('negative',(-1,-1))]:
    probe += assign(0,'x',integer(0))+assign(0,'y',integer(0))
    probe += construct('BTAGameWorld')+put(1)+attach(0,1)
    probe += assign(1,'x',integer(275))+assign(1,'y',integer(225))+assign(1,'mRef',get(0))
    for local,cls in [(2,'Bubblefield'),(4,'_-dl'),(5,'_-My'),(6,'_-Zs'),(7,'_-Rt'),(8,'MovieClip'),(16,'Bubblefield'),(17,'_-dl'),(18,'_-My')]:
        probe += construct(cls)+put(local)
    probe += get(2)+prop('effectLayer_under_mc')+put(9)
    probe += get(2)+prop('avatarUnderBubble_mc')+put(23)
    probe += get(2)+prop('_-SQ')+put(24)+get(16)+prop('_-SQ')+put(25)
    probe += attach(1,2)+attach(9,7)
    for local in [4,5,6,8,16,17,18]: probe += attach(1,local)
    probe += assign(16,'x',integer(700))+assign(16,'y',integer(-90))
    # Deliberately stale next siblings: only actual Adjust copies may repair them.
    for local in [17,18]: probe += assign(local,'x',integer(11))+assign(local,'y',integer(22))
    probe += construct('TankData')+put(15)
    probe += get(15)+op(0x60,q['_-HJ'])+value_call('getInstance',0)+prop('_-7G')+integer(0)+op(0x66,array_index)+call('ImportTankData',1)
    if cohort=='right': probe += emit('BT3_MOTION_AVATAR',[get(15)+prop('strID')])
    probe += get(15)+integer(1)+get(1)+value_call('_-Tr',2)+put(3)+attach(1,3)
    for name,local in [('myAvatar',3),('currentBFTarget',2),('_-00',4),('currEffectLayer',5),('currEffectLayer2',7),('_-JZ',6),('nextBFTarget',16),('_-Hm',17),('_-68',18)]:
        probe += assign(1,name,get(local))
    probe += assign(2,'gWorldRef',get(1))+get(2)+get(0)+call('Setup',1)
    probe += assign(16,'gWorldRef',get(1))+get(16)+get(0)+call('Setup',1)
    probe += construct('_-KM')+put(22)
    if cohort=='right':
        probe += emit('BT3_MOTION_DEPENDENCIES',[qualified(get(22)),qualified(get(0)+prop('_-B-')),qualified(get(0)+prop('objBackgroundParticles2'))])
    for age in range(1,41):
        probe += movement(age<=10,direction)
        probe += get(1)+get(22)+call('AdjustBubblefieldObjects',1)
        if age in [1,2,10,20,40]:
            for role in roles: probe += sample(cohort,age,*role)
    probe += assign(0,'x',number(.07))+assign(0,'y',number(-.07))
    for role in roles: probe += sample(cohort+'-fraction',40,*role)
    if cohort=='both':
        # GLUE destination-origin (250.079,-100.149) - actual parent Position.
        # Calls the real camera method once; no original teleporter input/weapon event.
        for axis,destination in [('x',250.079),('y',-100.149)]:
            probe += vector_write(axis,number(destination)+get(2)+get(3)+prop('parent')+op(0x60,q['Point'])+get(3)+prop('x')+get(3)+prop('y')+op(0x42,2)+value_call('localToGlobal',1)+value_call('globalToLocal',1)+prop(axis)+b'\xa1')
        probe += get(1)+get(22)+call('AdjustBubblefieldObjects',1)
        for role in roles: probe += sample('teleport',41,*role)
    probe += get(0)+get(1)+call('removeChild',1)
probe += emit('BT3_MOTION_DONE',[])
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
bodies += body(2, script, 2, 1, 0, 2) + body(3, key, 90, 29, 1, 2)
abc = struct.pack('<HH', 16, 46) + cp + methods + u(0) + classes + scripts + bodies
probe_tag = tag(82, struct.pack('<I', 0) + b'world-motion-probe\0' + abc)
original_bytes = Path(sys.argv[1]).read_bytes()
original = original_bytes
if original[:3] == b'CWS':
    expanded = original[8:] if len(original) == struct.unpack_from('<I', original, 4)[0] else zlib.decompress(original[8:])
    original = b'FWS' + original[3:8] + expanded
if original[:3] != b'FWS': raise SystemExit('Supply original SWF.')
start = 8 + (5 + 4 * (original[8] >> 3) + 7) // 8 + 4
output = original[8:start]
position, modified, abcs = start, False, []
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
    if code in (72, 82): abcs.append(hashlib.sha256(data).hexdigest())
    if code == 76:
        count, = struct.unpack_from('<H', data)
        cursor, renamed, found = 2, data[:2], False
        for _ in range(count):
            cid, = struct.unpack_from('<H', data, cursor)
            cursor += 2
            end = data.index(0, cursor)
            name, cursor = data[cursor:end], end + 1
            if cid == 0:
                if name != b'Main' or modified: raise SystemExit('Expected one original Main binding.')
                name, found, modified = ROOT.encode(), True, True
            renamed += struct.pack('<H', cid) + name + b'\0'
        if found:
            output += probe_tag + tag(76, renamed)
            continue
    output += original[record_start:position]
if not modified: raise SystemExit('Missing original document binding.')
result = b'FWS' + original[3:4] + struct.pack('<I', len(output) + 8) + output
Path(sys.argv[2]).write_bytes(result)
print(json.dumps({'original_sha256': hashlib.sha256(original_bytes).hexdigest(),
    'probe_sha256': hashlib.sha256(result).hexdigest(),
    'emitter_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    'preserved_original_abc_tag_payloads': abcs,
    'added_probe_abc_sha256': hashlib.sha256(abc).hexdigest(),
    'fields': fields, 'roles': roles, 'controls': controls,
    'source_sha256': {str(p.relative_to(Path(sys.argv[1]).parent)): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in [Path(sys.argv[1]).parent / 'export_pcode' / 'scripts' / (n + '.pcode')
            for n in ['Main', 'BTAGameWorld', '_-0D', 'TankData', '_-Zx', 'Bubblefield', '_-dl', '_-My', '_-Zs', '_-Rt', 'AvatarInterface', '_-HJ', '_-KM', '_-Rm', '_-2t', '_-ct/_-1W']]},
    'scope': __doc__}, indent=2))

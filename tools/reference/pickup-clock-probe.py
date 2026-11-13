#!/usr/bin/env python3
"""Preserved-original pickup probe. F8 explicitly constructs/attaches/sets up roots.
--inside-enter moves construction into declared ENTER1. No original method/RNG patch.
"""
import hashlib,json,struct,sys,zlib
from pathlib import Path

def u(v):
 b=bytearray()
 while v>127: b.append((v&127)|128);v>>=7
 return bytes(b)+bytes([v])
def tag(c,d=b''):
 return struct.pack('<H',(c<<6)|min(len(d),63))+(struct.pack('<I',len(d)) if len(d)>=63 else b'')+d
inside_enter='--inside-enter' in sys.argv[3:]
ROOT='BT3PickupClockProbe'
CLASSES=['_-Bd','_-Oh','_-5A']*4
LABELS=[f'{kind}{value}' for kind in ['held','parent','removed','spawn'] for value in [1,5,50]]
names=[ROOT,'Main','trace','stage','addEventListener','removeEventListener','onProbeKey','onProbeEnter','onProbeExit','onOutside','addChild','removeChild','getChildAt','keyCode','currentFrame','totalFrames','parent','numChildren','getQualifiedClassName','probeTick','probeReady','field','world','gWorldRef','myAvatar','blnGameOver','BTAGameWorld','Bubblefield','SpawnLifeBubbles','Setup','lifeBubbleLayer_mc','gotoAndPlay','r','name','x','y','rotation','scaleX','scaleY','intLifeAmount','blnCollected']+list(dict.fromkeys(CLASSES))+[f'p{i}' for i in range(12)]
extra=['flash.utils','keyDown','enterFrame','exitFrame','BT3_PICKUP_BEGIN','BT3_PICKUP_DONE','BT3_PICKUP_SAMPLE','BT3_PICKUP_CHILD','BT3_PICKUP_CALLBACK','constructor','setup','attached','spawned','enter','exit','removed','pre-goto','post-goto']+LABELS
strings=['']+list(dict.fromkeys(names+extra));si={s:i for i,s in enumerate(strings)};q={n:i+1 for i,n in enumerate(names)}
cp=u(1)+u(1)+u(1)+u(len(strings))+b''.join(u(len(s.encode()))+s.encode() for s in strings[1:])
cp+=u(3)+b'\x16'+u(0)+b'\x16'+u(si['flash.utils'])+u(1)+u(len(names)+1)
for n in names: cp+=b'\x07'+u(2 if n=='getQualifiedClassName' else 1)+u(si[n])
def op(c,*a):return bytes([c])+b''.join(u(v) for v in a)
def get(n):return bytes([0xd0+n])
def prop(n):return op(0x66,q[n])
def text(s):return op(0x2c,si[s])
def integer(n):return op(0x25,n)
def call(n,c):return op(0x4f,q[n],c)
def value(n,c):return op(0x46,q[n],c)
def branch(c,n):return bytes([c])+int(n).to_bytes(3,'little',signed=True)
def own(n):return get(0)+prop(n)
def assign(n,v):return get(0)+v+op(0x61,q[n])
def construct(n):return op(0x60,q[n])+op(0x42,0)
def emit(s,vs):return op(0x5d,q['trace'])+text(s)+b''.join(vs)+call('trace',len(vs)+1)
def listener(a,e,m):return own('stage')+text(e)+own(m)+call(a,2)
def sample(phase,i):
 p=own(f'p{i}'); child=p+integer(0)+value('getChildAt',1)
 fields=[text(phase),text(LABELS[i]),own('probeTick'),op(0x5d,q['getQualifiedClassName'])+p+value('getQualifiedClassName',1)]
 fields += [p+prop(n) for n in ['currentFrame','totalFrames']]
 fields += [p+prop('parent')+b'\x20\xac',p+prop('parent')+(own('field')+prop('lifeBubbleLayer_mc') if i>=9 else get(0))+b'\xac']
 fields += [p+prop(n) for n in ['numChildren','name','x','y','rotation','intLifeAmount','blnCollected']]
 fields += [p+prop('r') if i%3!=2 else integer(999)]
 root=emit('BT3_PICKUP_SAMPLE',fields)
 childfields=[text(phase),text(LABELS[i]),own('probeTick')]+[child+prop(n) for n in ['name','x','y','scaleX','scaleY']]
 childfields += [child+prop('currentFrame') if i%3==2 else integer(999)]
 childcode=emit('BT3_PICKUP_CHILD',childfields)
 return root+p+prop('numChildren')+integer(0)+branch(0x13,len(childcode))+childcode

ctor=get(0)+b'\x30'+get(0)+op(0x49,0)+listener('addEventListener','keyDown','onProbeKey')+b'\x47'
construction=b''
for i in range(9):
 construction+=assign(f'p{i}',construct(CLASSES[i]))+sample('constructor',i)
 construction+=own(f'p{i}')+integer([1,5,50][i%3])+own('onOutside')+b'\x20'+call('Setup',3)+sample('setup',i)
 if i>=3:
  construction+=get(0)+own(f'p{i}')+call('addChild',1)+sample('attached',i)
for i in range(9,12):
 construction+=own('field')+integer(20+i)+integer(30+i)+integer([1,5,50][i%3])+integer(1)+b'\x27'+call('SpawnLifeBubbles',5)
 construction+=assign(f'p{i}',own('field')+prop('lifeBubbleLayer_mc')+integer(i-9)+value('getChildAt',1))+sample('spawned',i)
construction+=assign('probeReady',b'\x26')
keybody=listener('removeEventListener','keyDown','onProbeKey')+emit('BT3_PICKUP_BEGIN',[])+assign('probeTick',integer(0))+assign('probeReady',b'\x27')
keybody+=assign('world',construct('BTAGameWorld'))+own('world')+b'\x26'+op(0x61,q['blnGameOver'])
keybody+=assign('field',construct('Bubblefield'))+own('field')+own('world')+op(0x61,q['gWorldRef'])
keybody+=get(0)+own('field')+call('addChild',1)
if not inside_enter:keybody+=construction
keybody+=listener('addEventListener','enterFrame','onProbeEnter')+listener('addEventListener','exitFrame','onProbeExit')
key=get(0)+b'\x30'+get(1)+prop('keyCode')+integer(119)+branch(0x14,len(keybody))+keybody+b'\x47'
enter=get(0)+b'\x30'+assign('probeTick',own('probeTick')+b'\x91')
if inside_enter:enter+=own('probeTick')+integer(1)+branch(0x14,len(construction))+construction
enter+=b''.join(sample('enter',i) for i in range(12))
removal=b''.join(get(0)+own(f'p{i}')+call('removeChild',1)+sample('removed',i) for i in range(6,9))
enter+=own('probeTick')+integer(20)+branch(0x14,len(removal))+removal
# Explicit original goto controls; no replacement of frame1 or entropy. Repeated
# invocation is declared and kept separate from natural wrap observations.
gotos=b''.join(sample('pre-goto',i)+own(f'p{i}')+integer(1)+call('gotoAndPlay',1)+sample('post-goto',i) for i in [0,1])
enter+=own('probeTick')+integer(90)+branch(0x14,len(gotos))+gotos+b'\x47'
finish=listener('removeEventListener','enterFrame','onProbeEnter')+listener('removeEventListener','exitFrame','onProbeExit')+emit('BT3_PICKUP_DONE',[own('probeTick')])
exitwork=b''.join(sample('exit',i) for i in range(12))+own('probeTick')+integer(180)+branch(0x15,len(finish))+finish
exitcode=get(0)+b'\x30'+own('probeReady')+branch(0x12,len(exitwork))+exitwork+b'\x47'
callback=get(0)+b'\x30'+emit('BT3_PICKUP_CALLBACK',[own('probeTick')])+b'\x47'
script=get(0)+b'\x30'+op(0x65,0)+op(0x60,q['Main'])+b'\x30'+op(0x60,q['Main'])+op(0x58,0)+b'\x1d'+op(0x68,q[ROOT])+b'\x47'
method_names=['onProbeKey','onProbeEnter','onProbeExit','onOutside']
methods=u(7)+b''.join(u(0)+u(0)+u(0)+b'\x00' for _ in range(3))+b''.join(u(1)+u(0)+u(0)+u(0)+b'\x00' for _ in range(4))
traits=b''.join(u(q[n])+b'\x01'+u(0)+u(3+i) for i,n in enumerate(method_names))
slots=['probeTick','probeReady','world','field']+[f'p{i}' for i in range(12)]
for n in slots:traits+=u(q[n])+b'\x00'+u(0)+u(0)+u(0)
instance=u(q[ROOT])+u(q['Main'])+b'\x00'+u(0)+u(0)+u(len(slots)+len(method_names))+traits
classes=u(1)+instance+u(1)+u(0);scripts=u(1)+u(2)+u(1)+u(q[ROOT])+b'\x04'+u(1)+u(0)
def body(i,c,stack,locals_count,depth,maximum):return u(i)+u(stack)+u(locals_count)+u(depth)+u(maximum)+u(len(c))+c+u(0)+u(0)
bodies=u(7)+body(0,ctor,4,1,1,2)+body(1,get(0)+b'\x30\x47',1,1,1,2)+body(2,script,2,1,0,2)
for i,c in enumerate([key,enter,exitcode,callback],3):bodies+=body(i,c,40,2,1,2)
abc=struct.pack('<HH',16,46)+cp+methods+u(0)+classes+scripts+bodies
probe_tag=tag(82,struct.pack('<I',0)+b'pickup-clock-probe\0'+abc)
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
    'added_probe_abc_sha256': hashlib.sha256(abc).hexdigest()}, indent=2))

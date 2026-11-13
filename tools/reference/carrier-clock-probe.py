#!/usr/bin/env python3
"""Distinct opt-in preserved-original carrier clock/registration probe.

python3 tools/reference/carrier-clock-probe.py ORIGINAL OUTPUT
F8 constructs both original carrier classes, calls original AddEffectToQueue,
and retains unparented/parented controls. At ENTER32 original CreateEffect
registers queued references; original Run is explicitly polled thereafter.
No original ABC, method, frame script, clock or RNG is replaced.
"""
import hashlib
import json
import struct
import sys
import zlib
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



# Optional distinct cohort capture; default emission remains byte-identical.
inside_enter = '--inside-enter' in sys.argv[3:]
ROOT = 'BT3CarrierClockProbe'
CLASSES = ['_-YE', '_-5z'] * 3
LABELS = ['queueYE', 'queue5z', 'heldYE', 'held5z', 'parentYE', 'parent5z']
names = [ROOT, 'Main', 'trace', 'stage', 'addEventListener', 'removeEventListener',
 'onProbeKey', 'onProbeEnter', 'onProbeExit', 'onDoneYE', 'onDone5z', 'onBornDone',
 'addChild', 'keyCode', 'currentFrame', 'totalFrames', 'parent', 'numChildren',
 'getQualifiedClassName', 'probeTick', 'engine', 'field', 'world', 'top', 'bottom',
 'gWorldRef', 'blnGameOver', 'objEffectsEngine', '_-8o', 'CreateEffect', 'Run',
 'AddEffectToQueue', 'MovieClip', 'BTAGameWorld', 'Bubblefield', '_-2c', '_-YE', '_-5z',
 'gotoAndStop', 'born', 'name', 'x', 'y', 'rotation'] + [f'p{i}' for i in range(6)]
extra = ['flash.utils', 'flash.display', 'keyDown', 'enterFrame', 'exitFrame',
 'TopEffectsLayer', 'BottomEffectsLayer', 'BT3_CARRIER_BEGIN', 'BT3_CARRIER_DONE',
 'BT3_CARRIER_SAMPLE', 'BT3_CARRIER_POLL', 'BT3_CARRIER_CALLBACK', 'BT3_CARRIER_BORN',
 'constructor', 'queued', 'control-attached', 'enter', 'exit', 'pre-register',
 'post-register', 'before', 'after', 'first', 'second', 'YE', '5z'] + LABELS
strings = [''] + list(dict.fromkeys(names + extra))
si = {s:i for i,s in enumerate(strings)}
q = {n:i+1 for i,n in enumerate(names)}
cp = u(1)+u(1)+u(1)+u(len(strings))
cp += b''.join(u(len(s.encode()))+s.encode() for s in strings[1:])
# Namespace4 is the actual package-internal engine class QName.
cp += u(5)+b'\x16'+u(0)+b'\x16'+u(si['flash.utils'])+b'\x16'+u(si['flash.display'])+b'\x17'+u(0)
cp += u(1)+u(len(names)+1)
for n in names:
 ns = 2 if n=='getQualifiedClassName' else 3 if n=='MovieClip' else 4 if n=='_-2c' else 1
 cp += b'\x07'+u(ns)+u(si[n])

def op(c,*args): return bytes([c])+b''.join(u(a) for a in args)
def get(n): return bytes([0xd0+n])
def prop(n): return op(0x66,q[n])
def text(s): return op(0x2c,si[s])
def integer(n): return bytes([0x24,n & 255])
def call(n,count): return op(0x4f,q[n],count)
def branch(c,offset): return bytes([c])+int(offset).to_bytes(3,'little',signed=True)
def own(n): return get(0)+prop(n)
def assign(n,value): return get(0)+value+op(0x61,q[n])
def construct(n,args=b'',count=0): return op(0x60,q[n])+args+op(0x42,count)
def emit(label,values): return op(0x5d,q['trace'])+text(label)+b''.join(values)+call('trace',1+len(values))
def listener(action,event,method): return own('stage')+text(event)+own(method)+call(action,2)
def sample(phase,i):
 p=own(f'p{i}')
 layer=own('top' if i%2==0 else 'bottom')
 return emit('BT3_CARRIER_SAMPLE',[text(phase),text(LABELS[i]),own('probeTick'),
  op(0x5d,q['getQualifiedClassName'])+p+op(0x46,q['getQualifiedClassName'],1),
  p+prop('currentFrame'),p+prop('totalFrames'),p+prop('parent')+b'\x20\xac',
  p+prop('parent')+layer+b'\xac',p+prop('numChildren'),p+prop('name'),
  p+prop('x'),p+prop('y'),p+prop('rotation')])
def register(i,callback):
 return own('engine')+own(f'p{i}')+integer(13+i)+integer(23+i)+text('TopEffectsLayer' if i%2==0 else 'BottomEffectsLayer')+b'\x27'+own(callback)+call('CreateEffect',6)
def poll(label):
 code=emit('BT3_CARRIER_POLL',[text(label),text('before'),own('probeTick'),own('top')+prop('numChildren'),own('bottom')+prop('numChildren')])
 code+=own('engine')+call('Run',0)
 return code+emit('BT3_CARRIER_POLL',[text(label),text('after'),own('probeTick'),own('top')+prop('numChildren'),own('bottom')+prop('numChildren')])
ctor=get(0)+b'\x30'+get(0)+op(0x49,0)+listener('addEventListener','keyDown','onProbeKey')+b'\x47'
keybody=listener('removeEventListener','keyDown','onProbeKey')+emit('BT3_CARRIER_BEGIN',[])
keybody+=assign('probeTick',integer(0))+assign('engine',construct('_-2c',get(0),1))
for layer,label in [('top','TopEffectsLayer'),('bottom','BottomEffectsLayer')]:
 keybody+=assign(layer,construct('MovieClip'))+get(0)+own(layer)+call('addChild',1)
 keybody+=own('engine')+text(label)+own(layer)+call('_-8o',2)
keybody+=assign('world',construct('BTAGameWorld'))+own('world')+b'\x26'+op(0x61,q['blnGameOver'])
keybody+=own('world')+own('engine')+op(0x61,q['objEffectsEngine'])
keybody+=assign('field',construct('Bubblefield'))+own('field')+own('world')+op(0x61,q['gWorldRef'])
construction = b''
for i,name in enumerate(CLASSES):
 construction+=assign(f'p{i}',construct(name))+sample('constructor',i)
 if i<2:
  construction+=own('field')+own(f'p{i}')+integer(13+i)+integer(23+i)+text('TopEffectsLayer' if i==0 else 'BottomEffectsLayer')+b'\x27'+own('onDoneYE' if i==0 else 'onDone5z')+call('AddEffectToQueue',6)+sample('queued',i)
 elif i>=4:
  construction+=get(0)+own(f'p{i}')+call('addChild',1)+sample('control-attached',i)
if not inside_enter: keybody += construction
keybody+=listener('addEventListener','enterFrame','onProbeEnter')+listener('addEventListener','exitFrame','onProbeExit')
key=get(0)+b'\x30'+get(1)+prop('keyCode')+integer(119)+branch(0x14,len(keybody))+keybody+b'\x47'
enter=get(0)+b'\x30'+assign('probeTick',own('probeTick')+b'\x91')
if inside_enter:
 enter+=own('probeTick')+integer(1)+branch(0x14,len(construction))+construction
enter+=b''.join(sample('enter',i) for i in range(6))
registration=b''.join(sample('pre-register',i) for i in range(2))
registration+=register(0,'onDoneYE')+register(1,'onDone5z')+b''.join(sample('post-register',i) for i in range(2))
enter+=own('probeTick')+integer(32)+branch(0x14,len(registration))+registration
run=poll('first')
enter+=own('probeTick')+integer(32)+branch(0x15,len(run))+run
# Callback-created stopped-final clip gets another explicit poll in same cohort.
run2=poll('second')
enter+=own('probeTick')+integer(50)+branch(0x14,len(run2))+run2+b'\x47'
finish=listener('removeEventListener','enterFrame','onProbeEnter')+listener('removeEventListener','exitFrame','onProbeExit')+emit('BT3_CARRIER_DONE',[own('probeTick')])
exitcode=get(0)+b'\x30'+b''.join(sample('exit',i) for i in range(6))
exitcode+=own('probeTick')+integer(70)+branch(0x15,len(finish))+finish+b'\x47'
callbacks=[]
for i,label in enumerate(['YE','5z']):
 cb=get(0)+b'\x30'+emit('BT3_CARRIER_CALLBACK',[text(label),own('probeTick'),own(f'p{i}')+prop('currentFrame'),own(f'p{i}')+prop('parent')+own('top' if i==0 else 'bottom')+b'\xac'])
 if i==0:
  cb+=assign('born',construct('_-YE'))+own('born')+own('born')+prop('totalFrames')+call('gotoAndStop',1)
  cb+=own('engine')+own('born')+integer(0)+integer(0)+text('TopEffectsLayer')+b'\x27'+own('onBornDone')+call('CreateEffect',6)
  cb+=emit('BT3_CARRIER_BORN',[own('probeTick'),own('born')+prop('currentFrame'),own('born')+prop('parent')+own('top')+b'\xac'])
 callbacks.append(cb+b'\x47')
callbacks.append(get(0)+b'\x30'+emit('BT3_CARRIER_CALLBACK',[text('born'),own('probeTick'),own('born')+prop('currentFrame'),own('born')+prop('parent')+own('top')+b'\xac'])+b'\x47')
# Add late string used by callback.
# 'born' already occurs in names, hence in the string pool.
script=(get(0)+b'\x30'+op(0x65,0)+op(0x60,q['Main'])+b'\x30'+op(0x60,q['Main'])+op(0x58,0)+b'\x1d'+op(0x68,q[ROOT])+b'\x47')
method_names=['onProbeKey','onProbeEnter','onProbeExit','onDoneYE','onDone5z','onBornDone']
methods=u(9)+b''.join(u(0)+u(0)+u(0)+b'\x00' for _ in range(3))
methods+=b''.join(u(1 if i<3 else 0)+u(0)+(u(0) if i<3 else b'')+u(0)+b'\x00' for i in range(6))
traits=b''.join(u(q[n])+b'\x01'+u(0)+u(3+i) for i,n in enumerate(method_names))
slots=['probeTick','engine','field','world','top','bottom','born']+[f'p{i}' for i in range(6)]
for n in slots: traits+=u(q[n])+b'\x00'+u(0)+u(0)+u(0)
instance=u(q[ROOT])+u(q['Main'])+b'\x00'+u(0)+u(0)+u(len(slots)+len(method_names))+traits
classes=u(1)+instance+u(1)+u(0)
scripts=u(1)+u(2)+u(1)+u(q[ROOT])+b'\x04'+u(1)+u(0)
def body(index,code,stack,locals_count,depth,maximum):
 return u(index)+u(stack)+u(locals_count)+u(depth)+u(maximum)+u(len(code))+code+u(0)+u(0)
bodies=u(9)+body(0,ctor,4,1,1,2)+body(1,get(0)+b'\x30\x47',1,1,1,2)+body(2,script,2,1,0,2)
for index,c in enumerate([key,enter,exitcode]+callbacks,3): bodies+=body(index,c,24,2,1,2)
abc=struct.pack('<HH',16,46)+cp+methods+u(0)+classes+scripts+bodies
probe_tag=tag(82,struct.pack('<I',0)+b'carrier-clock-probe\0'+abc)
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

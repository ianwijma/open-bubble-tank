"""Rebuild data from the sibling research repository; no artwork/SWF is copied."""
import json, re, sys
from pathlib import Path
roots=[arg for arg in sys.argv[1:] if arg!='--parts-only']
root=Path(roots[0]) if roots else Path('../documented-bubble-tank-3')
p=root/'re/bt3'
out=Path('src/game/data')
def write(name,data): (out/name).write_text(json.dumps(data,separators=(',',':'))+'\n')
raw=json.loads((p/'parts_database.json').read_text())
symbols=json.loads((p/'symbol_map.json').read_text())
by_name={v['class'].split('.')[-1]:int(k) for k,v in symbols.items()}
source_text=(p/'export_scripts_deobf/scripts/_-HJ.as').read_text()
source_rows=dict(re.findall(r'"intObjID":(\d+),(.*?)(?="intObjID":|\Z)',source_text,re.S))
def text(row,key):
 # Decode the ActionScript string once; the old intermediate JSON kept escape syntax.
 match=re.search(r'"'+key+r'":("(?:\\.|[^"\\])*")',source_rows[str(row['intObjID'])])
 if not match: raise ValueError(f"Missing source text {row['intObjID']} {key}")
 return json.loads(match.group(1).replace("\\'", "'"))
parts=[]
for bucket,rows in raw['arrays'].items():
 for r in rows:
  if 'intObjID' not in r: continue
  parts.append(dict(id=r['intObjID'],name=text(r,'strName'),pluralName=text(r,'strPluralName'),shortName=text(r,'strShortName'),symbol=by_name.get(r['claType'].split('.')[-1],0),gp=r['intGunCost'],bp=r['intBubbleCost'],classCost=r['intClassCost'],lower=r['blnLower'],damageText=text(r,'strDamageText'),summary=text(r,'strSummaryText'),flavor=text(r,'strFlavorText'),tier=next((i+1 for i,t in enumerate(raw['tiers']) if r['intObjID'] in t),0)))
write('parts.json',parts)
if '--parts-only' in sys.argv:
 print('Imported',len(parts),'part definitions only; no artwork.')
 sys.exit(0)
tanks=json.loads((p/'builtin_tanks.json').read_text())
res={}
for k,rows in tanks.items():
 res[k]=[]
 for r in rows:
  chunks=r['plaintext'].split(';');h=chunks[0].split(','); ps=[]
  for chunk in chunks[1:]:
   v=chunk.split(',')
   if len(v)<9: continue
   ps.append(dict(key=v[0],type=int(v[1]),twin=v[2],x=float(v[3]),y=float(v[4]),rotation=float(v[5]),scale=float(v[6]),radius=float(v[7])))
  # Records contain eight fields per part, including the instance key.
  if not ps:
   for chunk in chunks[1:]:
    v=chunk.split(',')
    if len(v)!=8: continue
    ps.append(dict(key=v[0],type=int(v[1]),twin=v[2],x=float(v[3]),y=float(v[4]),rotation=float(v[5]),scale=float(v[6]),radius=float(v[7])))
  res[k].append(dict(sourceCode=r['code'],id=h[9],name=h[1],author=h[0],avatar=h[3]=='1',classId=int(h[4]),life=int(h[5]),reward=int(h[6]),speed=float(h[7]),difficulty=float(h[8]),parts=ps))
write('tanks.json',res)
src=(p/'export_scripts_deobf/scripts/_-3y.as').read_text()
write('rules.json',dict(re.findall(r'"KEY":"([^"]+)",\s*"RULE":"([^"]+)"',src)))
batches={}
for fn,label in [('_-AP','initial'),('_-Q1','seven'),('_-1f','seventeen'),('_-dd','ten'),('_-4u','repeat')]:
 m=re.search(r'(?:private|public) function '+re.escape(fn)+r'\([^)]*\)[^{]*\{',src)
 start=m.end();end=start;depth=1
 while depth:
  if src[end]=='{':depth+=1
  elif src[end]=='}':depth-=1
  end+=1
 block=src[start:end-1]
 branch=block.find('if(_loc1_ == true)')
 if branch<0:batches[label]=re.findall(r'"KEY":"([^"]+)"',block)
 else:
  before,after=block[branch:].split('else',1)
  batches[label+'Default']=re.findall(r'"KEY":"([^"]+)"',before)
  batches[label+'Local']=re.findall(r'"KEY":"([^"]+)"',after)
write('roster.json',batches)
waves={}
# Every new WaveOption is separate. Keep source conditions explicitly (decompiler's
# push/pop/goto scaffolding is ignored; original field conditions are retained).
for fn in ['_-Pb','_-ad','_-9k','_-Iy']:
 m=re.search(r'(?:private|public) function '+re.escape(fn)+r'\([^)]*\)[^{]*\{',src)
 if not m: continue
 pos=m.end();depth=1;end=pos
 while depth:
  if src[end]=='{':depth+=1
  elif src[end]=='}':depth-=1
  end+=1
 text=src[pos:end-1]; starts=list(re.finditer(r'_loc3_ = new WaveOption\(([^)]*)\)',text)); opts=[]
 for i,match in enumerate(starts):
  block=text[match.end():starts[i+1].start() if i+1<len(starts) else len(text)]
  vals=match[1].split(',');ins=[dict(key=x[0],min=int(x[1]),max=int(x[2])) for x in re.findall(r'AddInstruction\("([^"]+)",(\d+),(\d+)\)',block)]
  # Recover enclosing branch conditions at the constructor position.
  stack=[];pending='';piece=text[:match.start()]
  for tok in re.finditer(r'else\s+if\s*\(([^\n]*)\)|if\s*\(([^\n]*)\)|\belse\b|[{}]',piece):
   t=tok[0]
   if t=='{':stack.append(pending);pending=''
   elif t=='}':
    if stack:stack.pop()
   else:pending=t
  cond=[s for s in stack if 'param1' in s or '_loc4_' in s]
  # The plain else branches for the optional open pools have implicit minima.
  if fn=='_-ad' and i in [2,3,4]: cond.append('if(param1 > 15)')
  if fn=='_-9k' and i in [3,4,5,6]: cond.append('if(param1 > 25)')
  opts.append(dict(chance=float(vals[0]),scale=float(vals[1]) if len(vals)>1 else 1,conditions=cond,instructions=ins))
 waves[fn]=opts
write('waves.json',waves)
write('symbols.json',{v['class']:int(k) for k,v in symbols.items()})
print('Imported',len(parts),'parts,',sum(map(len,res.values())),'tanks,', {k:len(v) for k,v in waves.items()},'wave options')

# Original projectile artwork and SpawnNewBullet scale; geometry remains in the SWF.
projectile_art={}
for rows in raw['arrays'].values():
 for r in rows:
  if 'intObjID' not in r: continue
  paths=list((p/'export_scripts_deobf/scripts').rglob(r['claType']+'.as'))
  if not paths: continue
  calls=re.findall(r'SpawnNewBullet\(new ([\w-]+)\(\),([^;\n]*)',paths[0].read_text())
  if not calls: continue
  name,arguments=calls[0]; fields=arguments.split(',')
  try: scale=float(fields[2])
  except (ValueError,IndexError): continue
  if name in by_name: projectile_art[str(r['intObjID'])]={'symbol':by_name[name],'scale':scale}
# The Sapper constructor is assigned to a variable before SpawnNewBullet.
projectile_art['4012']={'symbol':by_name['_-Jp'],'scale':1}
# Beam constructors are also assigned before their SpawnNewBullet calls.
projectile_art['2017']={'symbol':by_name['_-CO'],'scale':1}
projectile_art['6002']={'symbol':by_name['HealerBeam'],'scale':1}
projectile_art['turretBuilder']={'symbol':by_name['EnemyTurretBuilder'],'scale':1}
write('projectile-art.json',projectile_art)

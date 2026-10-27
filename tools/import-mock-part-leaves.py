#!/usr/bin/env python3
"""Print coarse ellipse/color facts only. Never emits SVG paths or media.
Usage: python3 tools/import-mock-part-leaves.py [research-repo-root]
Quadratic curves are integrated through64-segment sampling; each filled subpath
is approximated by an ellipse with the same centroid and planar area covariance.
For a uniform ellipse covariance eigenvalues are a²/4,b²/4. Compound glints are
assigned to the circle with minimum center-distance normalized by its radius.
"""
import json,math,re,sys,xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path(sys.argv[1] if len(sys.argv)>1 else '../documented-bubble-tank-3')/'re/bt3/export/shapes'
NS='{http://www.w3.org/2000/svg}'
FF='{https://www.free-decompiler.com/flash}'
COMPOUNDS={
 698:[[178,-140,68],[178,124,68],[276,-114,68],[276,106,68],[359,-48,68],[359,54,68],[466,9,100],[46,-14,206]],
 699:[[318,-140,68],[318,124,68],[416,-114,68],[416,106,68],[499,-49,68],[499,55,68],[606,9,100],[186,-14,206]],
 1822:[[163,-135,80],[153,150,80],[-153,-150,80],[-163,135,80],[3,-1,130]],
 1824:[[105,-143,80],[95,142,80],[-55,-9,130]],
}
COLORS={14:{'base':'#d15503','light':'#ffd9b3','spot':'#f78311'},2449:{'base':'#cc8e00','light':'#fee1a3','spot':'#f7ac00'},718:{'base':'#ff6699','light':'#dda2b4','spot':'#9c3857'},719:{'base':'#ff6699','light':'#dda2b4','spot':'#9c3857'}}
STANDARD={'base':'#d2a800','light':'#ffeda6','spot':'#fbc900'}
def subpaths(data):
    a=re.findall(r'[MLQZ]|-?\d+(?:\.\d+)?',data);i=0;cmd=None;pos=(0,0);paths=[];pts=[]
    while i<len(a):
        if a[i] in ['M','L','Q','Z']:
            cmd=a[i];i+=1
            if cmd=='M':
                if pts:paths.append(pts)
                pts=[]
            if cmd=='Z':continue
        n=4 if cmd=='Q' else 2;v=list(map(float,a[i:i+n]));i+=n
        if cmd=='Q':
            start=pos;control=v[:2];end=v[2:]
            for j in range(1,65):
                t=j/64;pts.append(tuple((1-t)**2*start[k]+2*(1-t)*t*control[k]+t*t*end[k] for k in range(2)))
            pos=tuple(end)
        else:pos=tuple(v);pts.append(pos)
        if cmd=='M':cmd='L'
    if pts:paths.append(pts)
    return paths

def fit(pts):
    q=pts[1:]+pts[:1];cr=[a[0]*b[1]-b[0]*a[1] for a,b in zip(pts,q)];A=sum(cr)/2
    if abs(A)<1e-6:return None
    x=sum((a[0]+b[0])*c for a,b,c in zip(pts,q,cr))/(6*A)
    y=sum((a[1]+b[1])*c for a,b,c in zip(pts,q,cr))/(6*A)
    X=sum((a[0]*a[0]+a[0]*b[0]+b[0]*b[0])*c for a,b,c in zip(pts,q,cr))/(12*A)-x*x
    Y=sum((a[1]*a[1]+a[1]*b[1]+b[1]*b[1])*c for a,b,c in zip(pts,q,cr))/(12*A)-y*y
    XY=sum((2*a[0]*a[1]+a[0]*b[1]+b[0]*a[1]+2*b[0]*b[1])*c for a,b,c in zip(pts,q,cr))/(24*A)-x*y
    delta=math.sqrt(((X-Y)/2)**2+XY*XY);l1=(X+Y)/2+delta;l2=(X+Y)/2-delta
    return dict(x=x,y=y,rx=2*math.sqrt(max(0,l1)),ry=2*math.sqrt(max(0,l2)),rotation=.5*math.atan2(2*XY,X-Y),area=abs(A))

def recover(id):
    paths=list(ET.parse(ROOT/f'{id}.svg').iter(NS+'path'));colors=COLORS.get(id,STANDARD)
    if id in COMPOUNDS:
        circles=[dict(x=x/20,y=y/20,rx=r/20,ry=r/20) for x,y,r in COMPOUNDS[id]]
    else:
        # Exported paths retain source coordinates; the outer SVG <g> translation
        # only puts the shape into its standalone export canvas and is excluded.
        outline=[s for p in paths if p.attrib.get('stroke')=='#ffffff' for s in subpaths(p.attrib['d'])]
        outline=max(outline,key=lambda s:abs(fit(s)['area']))
        xs=[p[0] for p in outline];ys=[p[1] for p in outline]
        circles=[dict(x=(min(xs)+max(xs))/2,y=(min(ys)+max(ys))/2,rx=(max(xs)-min(xs))/2,ry=(max(ys)-min(ys))/2)]
    widths=[float(p.attrib.get(FF+'original-stroke-width',p.attrib.get('stroke-width','0')))for p in paths if p.attrib.get('stroke')=='#ffffff']
    for c in circles:c.update(lineWidth=max(widths),glints=[])
    for p in paths:
        color=p.attrib.get('fill')
        if color not in [colors['light'],colors['spot']]:continue
        for s in subpaths(p.attrib['d']):
            f=fit(s)
            if not f:continue
            area=f.pop('area')
            if area<.02:continue
            circle=min(circles,key=lambda c:((f['x']-c['x'])/c['rx'])**2+((f['y']-c['y'])/c['ry'])**2)
            f.update(color=int(color[1:],16),role='light' if color==colors['light']else'spot')
            circle['glints'].append(f)
    return dict(colors={k:int(v[1:],16)for k,v in colors.items()},rim=0xffffff,circles=circles)

def rounded(obj):
    if isinstance(obj,float):return round(obj,5)
    if isinstance(obj,dict):return {k:rounded(v)for k,v in obj.items()}
    if isinstance(obj,list):return [rounded(v)for v in obj]
    return obj
if __name__=='__main__':print(json.dumps(rounded({id:recover(id)for id in [14,21,33,41,694,718,719,2449,698,699,1822,1824]}),indent=2))

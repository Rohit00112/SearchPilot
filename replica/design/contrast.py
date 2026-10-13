#!/usr/bin/env python3
"""Check SearchPilot semantic foreground/background pairs against WCAG 2.2 contrast."""
from pathlib import Path
import json,sys
p=Path(sys.argv[1] if len(sys.argv)>1 else 'replica/design/tokens.json')
data=json.loads(p.read_text()); colors=data['colors']
def lum(hexcode):
    rgb=[int(hexcode.lstrip('#')[i:i+2],16)/255 for i in (0,2,4)]
    channels=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    return sum(x*y for x,y in zip(channels,(.2126,.7152,.0722)))
def ratio(a,b):
    l=sorted([lum(colors[a]),lum(colors[b])],reverse=True)
    return (l[0]+.05)/(l[1]+.05)
lines=['# SearchPilot WCAG contrast report','','| Pair | Contrast | Minimum | Result |','| --- | ---: | ---: | --- |'];failed=0
for item in data['pairs']:
    r=ratio(item['foreground'],item['background']); ok=r>=item['minRatio'];failed+=not ok
    lines.append(f"| {item['name']} | {r:.2f}:1 | {item['minRatio']}:1 | {'PASS' if ok else 'FAIL'} |")
lines.extend(['',f'**{len(data["pairs"])-failed} passed, {failed} failed.**'])
report='\n'.join(lines)+'\n';(p.parent/'contrast-report.md').write_text(report);print(report)
sys.exit(1 if failed else 0)

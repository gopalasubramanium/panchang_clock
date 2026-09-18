"""Capture the actual iOS Simulator build for App Store listing preparation."""
import json, subprocess, time, re
from pathlib import Path

def run(*args):
    return subprocess.check_output(args, text=True)

version=run('xcodebuild','-version')
assert int(re.search(r'Xcode (\d+)',version).group(1))>=26, 'App Store uploads require Xcode 26 or later.'
catalog=json.loads(run('xcrun','simctl','list','devices','available','--json'))['devices']
devices=[]
for runtime,items in catalog.items():
    if '.iOS-' in runtime:
        rank=tuple(map(int,re.findall(r'\d+',runtime)))
        devices.extend((rank,d) for d in items if d.get('isAvailable',True))
devices.sort(key=lambda item:(item[0],item[1]['name']),reverse=True)
app='ios/build/Build/Products/Debug-iphonesimulator/App.app'
out=Path('store-release/ios-screenshots');out.mkdir(parents=True,exist_ok=True)
evidence=[]
for label,match in [('iPhone',lambda n:'iPhone' in n and 'Pro Max' in n),('iPad',lambda n:'iPad Pro' in n and '13-inch' in n)]:
    device=next((d for _,d in devices if match(d['name'])),None)
    assert device, f'No supported large {label} simulator is installed.'
    udid=device['udid']
    try:
        if device['state']!='Booted':run('xcrun','simctl','boot',udid)
        run('xcrun','simctl','bootstatus',udid,'-b')
        # Preserve the simulator's actual clock; capture must not depend on
        # runtime-specific status-bar date parsing.
        run('xcrun','simctl','install',udid,app)
        run('xcrun','simctl','launch',udid,'com.eksaar.panchang')
        time.sleep(15)  # Allow native WebKit and the first offline calculation to render in CI.
        file=out/f'{label}-daily.png'
        run('xcrun','simctl','io',udid,'screenshot',str(file))
        evidence.append({'file':file.name,'device':device['name'],'source':'Actual iOS Simulator build; fresh app storage','xcode':version.strip()})
    finally:
        subprocess.run(['xcrun','simctl','shutdown',udid],check=False)
(out/'capture-evidence.json').write_text(json.dumps(evidence,indent=2)+'\n')

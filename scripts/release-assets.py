"""Assemble CI-built beta artifacts without claiming platform signing or store approval."""
from pathlib import Path
import hashlib, shutil, zipfile, json, os
root=Path('artifacts');out=Path('public-release');out.mkdir(exist_ok=True)
version=json.loads(Path('package.json').read_text())['version']
for folder in root.iterdir():
    if folder.name.startswith('desktop-'):
        for p in folder.rglob('*'):
            if p.is_file() and p.suffix in ['.dmg','.zip','.exe','.AppImage','.deb']:
                shutil.copy2(p,out/('UNSIGNED-'+p.name))
    if folder.name=='android-debug-and-unsigned-bundle':
        for p in folder.rglob('*'):
            if p.suffix=='.apk': shutil.copy2(p,out/f'Eksaar-Panchang-{version}-Android-DEBUG.apk')
            if p.suffix=='.aab': shutil.copy2(p,out/f'Eksaar-Panchang-{version}-Android-UNSIGNED.aab')
    if folder.name=='ios-simulator-app-not-device-installable':
        for p in folder.rglob('*.zip'): shutil.copy2(p,out/f'Eksaar-Panchang-{version}-iOS-SIMULATOR-ONLY.zip')
with zipfile.ZipFile(out/f'Eksaar-Panchang-{version}-web.zip','w',zipfile.ZIP_DEFLATED) as z:
    for p in (root/'web-app').rglob('*'):
        if p.is_file():z.write(p,p.relative_to(root/'web-app'))
manifest={'version':version,'commit':os.environ.get('GITHUB_SHA'),'workflow_run':os.environ.get('GITHUB_RUN_ID'),
          'status':'Beta: unsigned desktop packages, debug Android APK, unsigned AAB, iOS Simulator only. Not store releases.'}
(out/'BUILD-PROVENANCE.json').write_text(json.dumps(manifest,indent=2)+'\n')
checks=[]
for p in sorted(out.iterdir()):
    digest=hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):digest.update(chunk)
    checks.append(f'{digest.hexdigest()}  {p.name}')
(out/'SHA256SUMS.txt').write_text('\n'.join(checks)+'\n')
print(f'Prepared {len(checks)} release files plus checksum manifest.')

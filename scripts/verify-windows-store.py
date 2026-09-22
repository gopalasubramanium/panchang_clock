"""Check the actual upload packages, including every AppX tile and scale variant."""
import hashlib
import json
from pathlib import Path
import struct
import sys
import xml.etree.ElementTree as ET
import zipfile

root = Path(__file__).resolve().parents[1]
package_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'store-release/windows'
assets = root / 'build/appx'
expected = {p.name: p.read_bytes() for p in assets.glob('*.png')}
assert len(expected) == 46, 'Generate the complete branded AppX resource set before verification'
ns = {'f': 'http://schemas.microsoft.com/appx/manifest/foundation/windows10',
      'u': 'http://schemas.microsoft.com/appx/manifest/uap/windows10'}
results = []
for arch in ('x64', 'arm64'):
    matches = list(package_dir.glob(f'*-{arch}.appx'))
    assert len(matches) == 1, f'Expected one {arch} package, found {len(matches)}'
    package = matches[0]
    with zipfile.ZipFile(package) as archive:
        names = {n.replace('\\', '/'): n for n in archive.namelist()}
        manifest = ET.fromstring(archive.read('AppxManifest.xml'))
        identity = manifest.find('f:Identity', ns)
        assert identity.get('ProcessorArchitecture') == arch
        assert identity.get('Version') == '2.0.1.0', 'Must supersede rejected 2.0.0.0'
        assert identity.get('Name') == 'GopalaSubramanium.EksaarPanchang'
        assert identity.get('Publisher') == 'CN=CB824A42-D5E4-447F-BB19-DEE3229EF8E6'
        actual_assets = {n.removeprefix('assets/') for n in names if n.startswith('assets/')}
        assert actual_assets == set(expected), 'Missing resources or unexpected fallback assets'
        checked = []
        for name, data in sorted(expected.items()):
            actual = archive.read(names['assets/' + name])
            assert actual == data, f'{arch}: default or incorrect artwork in {name}'
            assert actual[:8] == b'\x89PNG\r\n\x1a\n'
            width, height = struct.unpack('>II', actual[16:24])
            checked.append({'name': name, 'width': width, 'height': height,
                            'sha256': hashlib.sha256(actual).hexdigest()})
        logos = [manifest.find('f:Properties/f:Logo', ns).text]
        visual = manifest.find('.//u:VisualElements', ns)
        tile = manifest.find('.//u:DefaultTile', ns)
        logos += [visual.get('Square44x44Logo'), visual.get('Square150x150Logo')]
        logos += [tile.get(key) for key in ('Wide310x150Logo', 'Square71x71Logo', 'Square310x310Logo')]
        for logo in logos:
            assert logo and logo.replace('\\', '/') in names, f'Unresolved manifest logo: {logo}'
        assert 'resources.pri' in names, 'Windows resource index missing for scale variants'
        results.append({'package': package.name, 'architecture': arch,
                        'version': identity.get('Version'), 'manifestLogos': logos,
                        'assets': checked, 'sha256': hashlib.sha256(package.read_bytes()).hexdigest()})
report = package_dir / 'Tile-Verification.json'
report.write_text(json.dumps({'status': 'passed', 'packages': results}, indent=2) + '\n')
print(f'Verified both packages: {len(expected)} branded resources each, all manifest logos, identity, version, and resource index. {report}')

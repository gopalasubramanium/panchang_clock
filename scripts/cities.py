"""Build the offline gazetteer from GeoNames cities15000.zip (CC BY 4.0).
Usage: python3 scripts/cities.py /path/to/cities15000.zip
The input is downloaded separately from download.geonames.org/export/dump/.
"""
import sys, zipfile, json, hashlib, datetime
from pathlib import Path
source=Path(sys.argv[1]); rows=[]
with zipfile.ZipFile(source) as archive:
    for line in archive.read('cities15000.txt').decode('utf-8').splitlines():
        f=line.split('\t')
        if not f[17]: continue
        rows.append([f[1],f[2],f[8],float(f[4]),float(f[5]),f[17],int(f[14] or 0)])
rows.sort(key=lambda r:-r[-1])
# Keep original and ASCII names for local accent-insensitive searching.
data={'source':'GeoNames cities15000','license':'CC BY 4.0','retrieved':datetime.date.today().isoformat(),
      'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'fields':['name','ascii','country','lat','lon','zone'],
      'cities':[r[:-1] for r in rows]}
Path('public/cities-world.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(f'{len(rows)} cities; {Path("public/cities-world.json").stat().st_size} bytes')

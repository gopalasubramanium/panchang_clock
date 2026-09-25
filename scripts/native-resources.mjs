import {readFile,writeFile} from 'node:fs/promises';
const out='ios/App/App/NativeResources/';
const presets=JSON.parse(await readFile('src/cities.json','utf8'));
const world=JSON.parse(await readFile('public/cities-world.json','utf8'));
const places=world.cities.map(([name,ascii,country,lat,lon,zone])=>({
  name:`${name===ascii?name:`${name} / ${ascii}`} · ${country}`.slice(0,80),lat,lon,zone
}));
const seen=new Set();
const cities=[...presets,...places].filter(p=>{const id=`${p.lat},${p.lon},${p.zone}`;if(seen.has(id))return false;seen.add(id);return true;});
await writeFile(out+'cities.json',JSON.stringify(cities));
const notices=(await readFile('public/THIRD_PARTY_NOTICES.txt','utf8')).split('@capacitor/core')[0];
await writeFile(out+'Notices.txt',notices+`\nCity directory: ${world.source}, retrieved ${world.retrieved}.\nhttps://www.geonames.org/\nLicensed under Creative Commons Attribution 4.0: https://creativecommons.org/licenses/by/4.0/\nTransformed into offline city names, country codes, coordinates and IANA time zones; combined with curated presets. City-centre coordinates are approximate.\nSource archive SHA-256: ${world.sha256}\n`);
console.log(`Bundled ${cities.length} offline places and attribution notices.`);

export function calculationLink(base, data, time) {
  const url = new URL(base);
  if (!['https:','http:'].includes(url.protocol)) throw new Error('Invalid sharing address.');
  url.search = '';
  // Fragments are processed locally and are excluded from HTTP requests and referrers.
  url.hash = new URLSearchParams({date:data.date,time,lat:data.location.lat,lon:data.location.lon,
    zone:data.location.zone,place:data.location.name,convention:data.settings.convention,sunrise:data.settings.sunriseMode}).toString();
  return url.href;
}

export function linkParameters(url) {
  const parsed = new URL(url);
  if (parsed.search.length + parsed.hash.length > 4096) throw new Error('This shared link is too long.');
  const query = new URLSearchParams(parsed.search);
  const fragment = new URLSearchParams(parsed.hash.slice(1));
  for (const [key,value] of fragment) query.set(key,value);
  for (const key of ['lat','lon','tz']) if (query.has(key) && !query.get(key).trim()) throw new Error(`Missing ${key} in shared link.`);
  return query;
}

import {validateLocation} from './engine.js';

export function personalDates(value) {
  if (!Array.isArray(value) || value.length > 200) throw new Error('A backup can contain up to 200 lunar dates.');
  const result = [], seen = new Set();
  for (const item of value) {
    if (!item || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 80 ||
      !Number.isInteger(item.month) || item.month < 0 || item.month > 11 ||
      !Number.isInteger(item.tithi) || item.tithi < 0 || item.tithi > 29 ||
      (item.includeAdhika !== undefined && typeof item.includeAdhika !== 'boolean')) throw new Error('Invalid lunar date in backup.');
    const entry = {name:item.name.trim(),month:item.month,tithi:item.tithi,includeAdhika:item.includeAdhika === true};
    const key = JSON.stringify(entry);
    if (!seen.has(key)) { seen.add(key); result.push(entry); }
  }
  return result;
}

export function cleanLocation(value) {
  if (!value || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 80) throw new Error('Enter a place name of up to 80 characters.');
  if (typeof value.zone !== 'string' || value.zone.length > 80) throw new Error('Enter a valid time zone.');
  const location = {name:value.name.trim(),lat:value.lat,lon:value.lon,zone:value.zone,elevation:value.elevation ?? 0};
  validateLocation(location);
  return location;
}

export function preferences(value, fallback) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return structuredClone(fallback);
  const result = structuredClone(fallback);
  try { result.location = cleanLocation(value.location); } catch { /* Retain the valid default. */ }
  const choices = {convention:['amanta','purnimanta'],sunriseMode:['geometric','apparent'],
    lang:['en','hi','bn','mr','te','ta','gu','kn','ml','pa','or','ur'],theme:['system','light','dark'],
    disambiguation:['earlier','later'],textSize:['standard','comfortable','large']};
  for (const [key,allowed] of Object.entries(choices)) if (allowed.includes(value[key])) result[key] = value[key];
  if (typeof value.hour12 === 'boolean') result.hour12 = value.hour12;
  try { result.personal = personalDates(value.personal ?? []); } catch { result.personal = []; }
  result.savedLocations = (Array.isArray(value.savedLocations) ? value.savedLocations : []).slice(0,12).flatMap(place=>{
    try { return [cleanLocation(place)]; } catch { return []; }
  });
  if (value.filters && typeof value.filters === 'object') for (const key of ['festival','monthly','ingress','personal']) {
    if (typeof value.filters[key] === 'boolean') result.filters[key] = value.filters[key];
  }
  if ([0,60,720,1440].includes(value.reminderMinutes)) result.reminderMinutes=value.reminderMinutes;
  return result;
}

export function rememberLocation(state, location) {
  const place = cleanLocation(location);
  return [place,...(state.savedLocations ?? []).filter(p=>p.lat!==place.lat || p.lon!==place.lon || p.zone!==place.zone)].slice(0,12);
}

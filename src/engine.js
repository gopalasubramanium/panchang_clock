import * as A from 'astronomy-engine';
import {DAY, dayBounds, addDays, validDate, validateZone, iso} from './time.js';

export const ENGINE_VERSION = '2.0.0-beta.3';
export const norm = a => ((a % 360) + 360) % 360;
export const TITHIS = ['Pratipada','Dwitiya','Tritiya','Chaturthi','Panchami','Shashthi','Saptami','Ashtami','Navami','Dashami','Ekadashi','Dwadashi','Trayodashi','Chaturdashi','Purnima'];
export const NAKSHATRAS = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
export const YOGAS = ['Vishkambha','Priti','Ayushman','Saubhagya','Shobhana','Atiganda','Sukarma','Dhriti','Shula','Ganda','Vriddhi','Dhruva','Vyaghata','Harshana','Vajra','Siddhi','Vyatipata','Variyana','Parigha','Shiva','Siddha','Sadhya','Shubha','Shukla','Brahma','Indra','Vaidhriti'];
export const KARANAS = ['Bava','Balava','Kaulava','Taitila','Garaja','Vanija','Vishti','Shakuni','Chatushpada','Naga','Kimstughna'];
export const MONTHS = ['Chaitra','Vaishakha','Jyeshtha','Ashadha','Shravana','Bhadrapada','Ashwin','Kartika','Margashirsha','Pausha','Magha','Phalguna'];
export const RASHIS = ['Mesha','Vrishabha','Mithuna','Karka','Simha','Kanya','Tula','Vrischika','Dhanu','Makara','Kumbha','Meena'];
export const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const radians = Math.PI / 180;
const dayCache = new Map();

export function validateLocation(location) {
  if (!Number.isFinite(location.lat) || location.lat < -90 || location.lat > 90) throw new Error('Latitude must be between −90 and 90.');
  if (!Number.isFinite(location.lon) || location.lon < -180 || location.lon > 180) throw new Error('Longitude must be between −180 and 180.');
  if (!Number.isFinite(location.elevation ?? 0) || (location.elevation ?? 0) < -500 || (location.elevation ?? 0) > 9000) throw new Error('Elevation must be between −500 and 9,000 metres.');
  validateZone(location.zone);
  return location;
}

// Mean Lahiri approximation. Accuracy is measured separately from root tolerance.
// Constants and validation limits are documented in docs/ACCURACY.md.
export function ayanamsa(instant) {
  const T = A.MakeTime(new Date(instant)).tt / 36525;
  return 23.857092 + 1.3969713 * T + 0.0003086 * T * T;
}

export function angles(instant) {
  const date = new Date(instant);
  const sun = A.SunPosition(date).elon;
  const moon = A.EclipticGeoMoon(date).lon;
  const ayan = ayanamsa(date);
  return {sun, moon, sunSidereal: norm(sun - ayan), moonSidereal: norm(moon - ayan), elongation: norm(moon - sun), ayanamsa: ayan};
}

export function karanaIndex(halfTithi) {
  if (halfTithi === 0) return 10;
  if (halfTithi >= 57) return halfTithi - 50;
  return (halfTithi - 1) % 7;
}

export function indices(instant) {
  const a = angles(instant);
  return {tithi: Math.floor(a.elongation / 12), nakshatra: Math.floor(a.moonSidereal / (360 / 27)),
    yoga: Math.floor(norm(a.sunSidereal + a.moonSidereal) / (360 / 27)), karana: Math.floor(a.elongation / 6),
    pada: Math.floor(a.moonSidereal / (360 / 108)) % 4 + 1, ...a};
}

export function angaName(kind, index) {
  if (kind === 'tithi') return `${index < 15 ? 'Shukla' : 'Krishna'} ${index === 29 ? 'Amavasya' : TITHIS[index % 15]}`;
  if (kind === 'nakshatra') return NAKSHATRAS[index];
  if (kind === 'yoga') return YOGAS[index];
  return KARANAS[karanaIndex(index)];
}

export function transition(instant, kind, direction = 1) {
  const origin = +new Date(instant), index = indices(origin)[kind];
  if (!['tithi','nakshatra','yoga','karana'].includes(kind)) throw new Error('Unknown anga.');
  let same = origin, other;
  for (let i = 1; i <= 120; i++) {
    const probe = origin + direction * i * 3600000;
    if (indices(probe)[kind] !== index) { other = probe; break; }
    same = probe;
  }
  if (other === undefined) throw new Error(`Could not bracket ${kind} transition.`);
  while (Math.abs(other - same) > 500) {
    const mid = (same + other) / 2;
    if (indices(mid)[kind] === index) same = mid; else other = mid;
  }
  return new Date((same + other) / 2);
}

export function anga(instant, kind) {
  const index = indices(instant)[kind];
  return {kind, index, name: angaName(kind, index), start: iso(transition(instant, kind, -1)), end: iso(transition(instant, kind)),
    next: angaName(kind, (index + 1) % ({tithi:30,nakshatra:27,yoga:27,karana:60}[kind]))};
}

export function timeline(start, end, kind) {
  const result = [];
  let cursor = +new Date(start);
  while (cursor < +new Date(end) && result.length < 12) {
    const item = anga(cursor, kind);
    result.push(item);
    cursor = +new Date(item.end) + 1000;
  }
  return result;
}

function lunarMonth(instant) {
  const date = new Date(instant);
  const previous = A.SearchMoonPhase(0, date, -35).date;
  const next = A.SearchMoonPhase(0, new Date(+previous + 60000), 35).date;
  const a = Math.floor(angles(previous).sunSidereal / 30);
  const b = Math.floor(angles(next).sunSidereal / 30);
  const ingresses = (b - a + 12) % 12;
  const index = (a + 1) % 12;
  return {index, name: MONTHS[index], adhika: ingresses === 0, kshaya: ingresses === 2,
    skippedMonth: ingresses === 2 ? MONTHS[(index + 1) % 12] : null,
    start: iso(previous), end: iso(next)};
}

export function calendarAt(instant, convention = 'amanta') {
  const a = indices(instant);
  const amanta = lunarMonth(instant);
  const purnimanta = a.tithi < 15 ? amanta : lunarMonth(+new Date(amanta.end) + 60000);
  const chosen = convention === 'purnimanta' ? purnimanta : amanta;
  const date = new Date(instant);
  const year = date.getUTCFullYear() - (amanta.index >= 9 && date.getUTCMonth() < 4 ? 1 : 0);
  return {amanta, purnimanta, chosen, convention, vikramChaitradi: year + 57, shakaLunisolar: year - 78,
    solarRashi: RASHIS[Math.floor(a.sunSidereal / 30)], moonRashi: RASHIS[Math.floor(a.moonSidereal / 30)],
    tamilSolarMonth: ['Chithirai','Vaikasi','Aani','Aadi','Avani','Purattasi','Aippasi','Karthigai','Margazhi','Thai','Maasi','Panguni'][Math.floor(a.sunSidereal / 30)]};
}

export function sunDay(date, location, sunriseMode = 'geometric') {
  validDate(date, true); validateLocation(location);
  if (!['geometric','apparent'].includes(sunriseMode)) throw new Error('Unknown sunrise convention.');
  const key = JSON.stringify([date, location.lat, location.lon, location.zone, location.elevation || 0, sunriseMode]);
  if (dayCache.has(key)) return dayCache.get(key);
  const {start, end} = dayBounds(date, location.zone);
  const observer = new A.Observer(location.lat, location.lon, location.elevation || 0);
  const limit = (+end - +start) / DAY;
  const event = (body, direction) => {
    const found = body === 'Sun' && sunriseMode === 'geometric'
      ? A.SearchAltitude(body, observer, direction, start, limit, 0)
      : A.SearchRiseSet(body, observer, direction, start, limit);
    return found && +found.date < +end ? iso(found.date) : null;
  };
  const result = {date, start: iso(start), end: iso(end), sunrise: event('Sun', 1), sunset: event('Sun', -1),
    moonrise: event('Moon', 1), moonset: event('Moon', -1),
    noon: iso(A.SearchHourAngle('Sun', observer, 0, start).time.date), sunriseMode};
  if (dayCache.size > 500) dayCache.clear();
  dayCache.set(key, result);
  return result;
}

const interval = (name, start, end, extra = {}) => ({name, start: iso(start), end: iso(end), ...extra});

export function periods(sun, nextSun, weekday) {
  if (!sun.sunrise || !sun.sunset || !nextSun.sunrise) return {available:false, windows:[], horas:[], choghadiya:[]};
  const rise = +new Date(sun.sunrise), set = +new Date(sun.sunset), next = +new Date(nextSun.sunrise);
  if (!(rise < set && set < next)) return {available:false, windows:[], horas:[], choghadiya:[]};
  const day = set - rise, night = next - set;
  const eighth = (name, table) => interval(name, rise + (table[weekday] - 1) * day / 8, rise + table[weekday] * day / 8, {quality:'avoid'});
  const windows = [eighth('Rahu Kalam',[8,2,7,5,6,4,3]), eighth('Yamaganda',[5,4,3,2,1,7,6]), eighth('Gulika',[7,6,5,4,3,2,1]),
    interval('Brahma Muhurta', rise - 96 * 60000, rise - 48 * 60000, {quality:'favourable', rule:'Fixed 96–48 minutes before sunrise'})];
  // Wednesday Abhijit is omitted under this stated convention.
  if (weekday !== 3) windows.push(interval('Abhijit Muhurta', rise + day * 7 / 15, rise + day * 8 / 15, {quality:'favourable'}));
  const order = ['Saturn','Jupiter','Mars','Sun','Venus','Mercury','Moon'];
  const startPlanet = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'][weekday];
  const horas = Array.from({length:24}, (_, i) => {
    const begin = i < 12 ? rise : set, span = i < 12 ? day : night, n = i % 12;
    return interval(order[(order.indexOf(startPlanet) + i) % 7], begin + span * n / 12, begin + span * (n + 1) / 12, {period:i < 12 ? 'day' : 'night'});
  });
  const dayOrder = ['Udvega','Chara','Labha','Amrita','Kala','Shubha','Roga'];
  const nightOrder = ['Shubha','Amrita','Chara','Roga','Kala','Labha','Udvega'];
  const dayStart = [0,3,6,2,5,1,4][weekday], nightStart = [0,2,4,6,1,3,5][weekday];
  const choghadiya = [0,1].flatMap(n => Array.from({length:8}, (_, i) => {
    const name = (n ? nightOrder : dayOrder)[((n ? nightStart : dayStart) + i) % 7];
    const start = (n ? set : rise) + i * (n ? night : day) / 8;
    const end = (n ? set : rise) + (i + 1) * (n ? night : day) / 8;
    const conflicts = windows.filter(w => w.quality === 'avoid' && start < +new Date(w.end) && end > +new Date(w.start)).map(w => w.name);
    return interval(name, start, end, {period:n ? 'night' : 'day', quality:['Udvega','Kala','Roga'].includes(name) ? 'avoid' : 'favourable', conflicts});
  }));
  return {available:true, dayHours:day / 3600000, nightHours:night / 3600000, windows, horas, choghadiya};
}

export function planetsAt(instant, location) {
  const date = new Date(instant), a = angles(date), T = A.MakeTime(date).tt / 36525;
  const planets = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'].map(name => {
    const tropical = name === 'Sun' ? a.sun : name === 'Moon' ? a.moon : A.Ecliptic(A.GeoVector(name, date, true)).elon;
    const longitude = norm(tropical - a.ayanamsa);
    return {name, longitude, rashi:RASHIS[Math.floor(longitude / 30)], degree:longitude % 30};
  });
  const node = norm(125.04452 - 1934.136261 * T + 0.0020708 * T * T + T * T * T / 450000 - a.ayanamsa);
  for (const [name, longitude] of [['Rahu (mean node)',node],['Ketu (mean node)',norm(node + 180)]])
    planets.push({name, longitude, rashi:RASHIS[Math.floor(longitude / 30)], degree:longitude % 30});
  // Ascendant is the eastern ecliptic/horizon intersection, not the Sun's sign.
  const theta = norm(A.SiderealTime(date) * 15 + location.lon) * radians;
  const eps = (23.439291 - 0.0130042 * T) * radians;
  const tropicalAsc = norm(Math.atan2(-Math.cos(theta), Math.sin(theta) * Math.cos(eps) + Math.tan(location.lat * radians) * Math.sin(eps)) / radians + 180);
  const ascendant = Math.abs(location.lat) >= 66 ? null : norm(tropicalAsc - a.ayanamsa);
  return {planets, ascendant, houseSystem:'Whole sign', nodeType:'Mean', polarAscendantUnavailable:ascendant === null};
}

export function daily(date, location, settings = {}, instant) {
  validDate(date);
  const sunriseMode = settings.sunriseMode || 'geometric';
  const convention = settings.convention || 'amanta';
  if (!['amanta','purnimanta'].includes(convention)) throw new Error('Choose Amanta or Purnimanta.');
  const sun = sunDay(date, location, sunriseMode);
  const next = sunDay(addDays(date, 1), location, sunriseMode);
  const at = instant ? new Date(instant) : new Date(sun.sunrise || (+new Date(sun.start) + 12 * 3600000));
  if (!Number.isFinite(+at)) throw new Error('Invalid calculation instant.');
  const reference = sun.sunrise || iso(at);
  const index = indices(at), weekday = new Date(`${date}T12:00Z`).getUTCDay();
  // Keep the civil-date sunrise separate from the sunrise that began the current Vaara.
  const beforeSunrise = sun.sunrise && +at < +new Date(sun.sunrise);
  const vaaraSun = beforeSunrise ? sunDay(addDays(date, -1), location, sunriseMode) : sun;
  const sunriseDay = sun.sunrise && vaaraSun.sunrise
    ? {date:vaaraSun.date, sunrise:vaaraSun.sunrise, angas:indices(vaaraSun.sunrise)} : null;
  const data = {version:ENGINE_VERSION, date, location:{...location}, settings:{sunriseMode,convention}, instant:iso(at),
    sun, nextSunrise:next.sunrise, weekday, weekdayName:WEEKDAYS[weekday],
    currentVaara:sunriseDay ? (beforeSunrise ? (weekday + 6) % 7 : weekday) : null, sunriseDay,
    sunriseAngas:sun.sunrise ? indices(reference) : null, current:index,
    angas:Object.fromEntries(['tithi','nakshatra','yoga','karana'].map(k => [k,anga(at,k)])),
    timeline:Object.fromEntries(['tithi','nakshatra','yoga','karana'].map(k => [k,timeline(reference,next.sunrise || sun.end,k)])),
    calendar:calendarAt(reference,convention), periods:periods(sun,next,weekday),
    illumination:A.Illumination('Moon',at).phase_fraction,
    warnings:[], metadata:{ephemeris:'Astronomy Engine 2.1.19',ayanamsa:'Mean Lahiri approximation',rootToleranceSeconds:0.5,dateRange:'1900–2100',festivalStatus:'Preview rules; regional authority review pending'}};
  if (!sun.sunrise || !sun.sunset || !next.sunrise) data.warnings.push('A sunrise or sunset does not occur in this local day. Sunrise-based periods are unavailable; no artificial times are substituted.');
  if (data.calendar.chosen.kshaya) data.warnings.push('A rare skipped lunar month occurs here. Regional observance review is required.');
  return data;
}

export function nextSkyEvents(instant, location) {
  const date = new Date(instant);
  const newMoon = A.SearchMoonPhase(0,date,35).date;
  const fullMoon = A.SearchMoonPhase(180,date,35).date;
  const lunar = A.SearchLunarEclipse(date);
  const observer = new A.Observer(location.lat,location.lon,location.elevation || 0);
  const eq = A.Equator('Moon',lunar.peak,observer,true,true);
  const altitude = A.Horizon(lunar.peak,observer,eq.ra,eq.dec,'normal').altitude;
  const solar = A.SearchLocalSolarEclipse(date,observer);
  return {newMoon:iso(newMoon),fullMoon:iso(fullMoon),
    lunarEclipse:{kind:lunar.kind,peak:iso(lunar.peak.date),moonAboveHorizonAtPeak:altitude > 0},
    solarEclipse:{kind:solar.kind,peak:iso(solar.peak.time.date),obscuration:solar.obscuration}};
}

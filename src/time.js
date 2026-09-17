export const DAY = 86400000;
const formatters = new Map();
export function fixedOffset(zone) {
  const m = /^UTC([+-])(\d{2}):(\d{2})$/.exec(zone);
  if (!m) return null;
  const minutes = Number(m[2]) * 60 + Number(m[3]);
  if (Number(m[3]) > 59 || minutes > 14 * 60) throw new Error('Fixed UTC offset must be within 14 hours.');
  return minutes * (m[1] === '-' ? -1 : 1);
}

export function zoneFromOffset(hours) {
  if (!Number.isFinite(hours) || hours < -14 || hours > 14) throw new Error('Invalid UTC offset in link.');
  const minutes = Math.round(Math.abs(hours) * 60);
  return `UTC${hours < 0 ? '-' : '+'}${String(Math.floor(minutes / 60)).padStart(2,'0')}:${String(minutes % 60).padStart(2,'0')}`;
}

export function validateZone(zone) {
  if (fixedOffset(zone) !== null) return zone;
  try { new Intl.DateTimeFormat('en', {timeZone: zone}).format(0); }
  catch { throw new Error('Choose a valid IANA time zone, such as Asia/Kolkata or America/New_York.'); }
  return zone;
}

export function parts(instant, zone) {
  const offset = fixedOffset(zone);
  if (offset !== null) {
    const d = new Date(+new Date(instant) + offset * 60000);
    return {year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate(),hour:d.getUTCHours(),minute:d.getUTCMinutes(),second:d.getUTCSeconds()};
  }
  if (!formatters.has(zone)) {
    validateZone(zone);
    formatters.set(zone, new Intl.DateTimeFormat('en-CA', {
      timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }));
  }
  return Object.fromEntries(formatters.get(zone).formatToParts(new Date(instant))
    .filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
}

export function dateKey(instant, zone) {
  const p = parts(instant, zone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function validDate(value, allowBoundary = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Enter a date as YYYY-MM-DD.');
  const d = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(+d) || d.toISOString().slice(0, 10) !== value || d.getUTCFullYear() < (allowBoundary ? 1899 : 1900) || d.getUTCFullYear() > (allowBoundary ? 2101 : 2100))
    throw new Error('Choose a valid date between 1900 and 2100.');
  return value;
}

export function addDays(value, count) {
  const d = new Date(`${value}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + count);
  return d.toISOString().slice(0, 10);
}

export function offsetMinutes(instant, zone) {
  const p = parts(instant, zone);
  return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(+new Date(instant) / 1000) * 1000) / 60000;
}

// Resolve civil time by testing actual zone offsets on both sides of a transition.
// The device's own zone never participates in the conversion.
export function fromLocal(date, time, zone, disambiguation = 'earlier', allowBoundary = false) {
  validDate(date, allowBoundary); validateZone(zone);
  if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(time)) throw new Error('Enter a valid 24-hour time.');
  const wall = Date.parse(`${date}T${time.length === 5 ? time + ':00' : time}Z`);
  const offsets = new Set([-36, -12, 0, 12, 36].map(h => offsetMinutes(wall + h * 3600000, zone)));
  const candidates = [...offsets].map(o => wall - o * 60000).filter(t => {
    const p = parts(t, zone);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) === wall;
  }).sort((a, b) => a - b);
  if (!candidates.length) throw new Error('This local time does not exist because the clocks change. Choose another time.');
  if (candidates.length > 1 && disambiguation === 'reject') throw new Error('This local time occurs twice. Choose the earlier or later occurrence.');
  return new Date(disambiguation === 'later' ? candidates.at(-1) : candidates[0]);
}

export function dayBounds(date, zone) {
  return {start: fromLocal(date, '00:00', zone, 'earlier', true), end: fromLocal(addDays(date, 1), '00:00', zone, 'earlier', true)};
}

export function formatTime(instant, zone, baseDate, hour12 = false, locale = 'en') {
  if (instant == null) return 'Not occurring';
  const offset = fixedOffset(zone);
  const text = new Intl.DateTimeFormat(locale, {timeZone: offset === null ? zone : 'UTC', hour: '2-digit', minute: '2-digit', hour12}).format(new Date(+new Date(instant) + (offset || 0) * 60000));
  const day = dateKey(instant, zone);
  return text + (baseDate && day !== baseDate ? ` · ${day}` : '');
}

export function iso(instant) { return instant == null ? null : new Date(instant).toISOString(); }

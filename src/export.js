import {formatTime} from './time.js';
const escapeICS = value => String(value).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const stamp = value => new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
function fold(line) {
  const encoder = new TextEncoder();
  let result = '', chunk = '', bytes = 0;
  for (const c of line) {
    const size = encoder.encode(c).length;
    if (bytes + size > 75) { result += chunk + '\r\n'; chunk = ' '; bytes = 1; }
    chunk += c; bytes += size;
  }
  return result + chunk;
}
export function calendarFile(events, location, alarmMinutes = 15) {
  const rows=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Eksaar//Panchang 2//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
  for (const event of events) {
    if (!event.start || !event.end || +new Date(event.end) <= +new Date(event.start)) continue;
    const uid = `${stamp(event.start)}-${encodeURIComponent(event.name)}-${location.lat}-${location.lon}@panchang.eksaar.com`;
    rows.push('BEGIN:VEVENT',`UID:${uid}`,`DTSTAMP:${stamp(new Date())}`,`DTSTART:${stamp(event.start)}`,`DTEND:${stamp(event.end)}`,
      `SUMMARY:${escapeICS(event.name)}`,`LOCATION:${escapeICS(location.name || `${location.lat}, ${location.lon}`)}`,
      `DESCRIPTION:${escapeICS(`Panchang calculation for ${location.zone}. Traditional timing; not a personalized muhurta. ${event.reason || ''}`)}`);
    if (alarmMinutes > 0) rows.push('BEGIN:VALARM',`TRIGGER:-PT${alarmMinutes}M`,'ACTION:DISPLAY',`DESCRIPTION:${escapeICS(event.name)}`,'END:VALARM');
    rows.push('END:VEVENT');
  }
  return [...rows,'END:VCALENDAR'].map(fold).join('\r\n')+'\r\n';
}
export function summary(data) {
  const t = instant => formatTime(instant,data.location.zone,data.date);
  const lines = [`Eksaar Panchang · ${data.date}`,`${data.location.name || 'Custom location'} · ${data.location.zone}`,
    `${data.calendar.chosen.adhika ? 'Adhika ' : ''}${data.calendar.chosen.name} · ${data.settings.convention}`];
  for(const key of ['tithi','nakshatra','yoga','karana']) lines.push(`${data.angas[key].name} until ${t(data.angas[key].end)}`);
  const rahu = data.periods.windows.find(w=>w.name==='Rahu Kalam');
  if(rahu) lines.push(`Rahu Kalam: ${t(rahu.start)}–${t(rahu.end)}`);
  lines.push(`Sunrise convention: ${data.settings.sunriseMode}. Times are local.`);
  return lines.join('\n');
}

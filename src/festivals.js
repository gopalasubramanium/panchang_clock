import {angles, indices, calendarAt, sunDay, transition, angaName, RASHIS} from './engine.js';
import {DAY, addDays, iso} from './time.js';

// Declarative preview rules use AMANTA month indices regardless of display preference.
// They expose the deciding window. Regional precedence, viddha, and sectarian rules
// require a separately reviewed rule pack; these are never called authoritative dates.
export const RULES = [
  ['ugadi','Ugadi / Gudi Padwa',0,0,'sunrise'],
  ['rama-navami','Rama Navami',0,8,'midday'],
  ['hanuman','Hanuman Jayanti (Chaitra tradition)',0,14,'sunrise'],
  ['akshaya','Akshaya Tritiya',1,2,'sunrise'],
  ['ratha','Ratha Yatra',3,1,'sunrise'],
  ['guru-purnima','Guru Purnima',3,14,'sunrise'],
  ['raksha','Raksha Bandhan',4,14,'afternoon'],
  ['janmashtami','Krishna Janmashtami',4,22,'midnight'],
  ['ganesh','Ganesh Chaturthi',5,3,'midday'],
  ['navratri','Sharad Navratri begins',6,0,'sunrise'],
  ['durga','Durga Ashtami',6,7,'sunrise'],
  ['dussehra','Vijayadashami',6,9,'afternoon'],
  ['dhanteras','Dhanteras',6,27,'pradosha'],
  ['naraka','Naraka Chaturdashi',6,28,'predawn'],
  ['diwali','Diwali / Lakshmi Puja',6,29,'pradosha'],
  ['govardhan','Govardhan Puja',7,0,'sunrise'],
  ['bhai-dooj','Bhai Dooj',7,1,'afternoon'],
  ['dev-deepawali','Dev Deepawali',7,14,'pradosha'],
  ['gita','Gita Jayanti',8,10,'sunrise'],
  ['vasant','Vasant Panchami',10,4,'sunrise'],
  ['shivaratri','Maha Shivaratri',10,28,'midnight'],
  ['holika','Holika Dahan',11,14,'pradosha']
].map(([id,name,month,tithi,window]) => ({id,name,month,tithi,window}));

function decidingWindow(sun, next, kind) {
  if (!sun.sunrise || !sun.sunset || !next.sunrise) return null;
  const rise = +new Date(sun.sunrise), set = +new Date(sun.sunset), tomorrow = +new Date(next.sunrise);
  const day = set - rise, night = tomorrow - set;
  if (kind === 'sunrise') return [rise, rise + 1000];
  if (kind === 'midday') return [rise + 2 * day / 5, rise + 3 * day / 5];
  if (kind === 'afternoon') return [rise + 3 * day / 5, rise + 4 * day / 5];
  if (kind === 'pradosha') return [set, set + night / 5];
  if (kind === 'predawn') return [rise - 96 * 60000, rise];
  return [set + night * 7 / 15, set + night * 8 / 15];
}

function scoreRule(date, location, mode, rule) {
  const sun = sunDay(date, location, mode), next = sunDay(addDays(date,1),location,mode);
  const window = decidingWindow(sun,next,rule.window);
  if (!window) return null;
  let cursor = window[0], overlap = 0, matching = null;
  for (let i = 0; i < 4 && cursor < window[1]; i++) {
    const index = indices(cursor).tithi;
    const end = +transition(cursor,'tithi');
    if (index === rule.tithi) {
      const month = calendarAt(cursor).amanta;
      if (rule.month == null || (month.index === rule.month && !month.adhika && !month.kshaya)) {
        overlap += Math.max(0,Math.min(end,window[1]) - cursor);
        matching = {start:iso(transition(cursor,'tithi',-1)),end:iso(end)};
      }
    }
    cursor = end + 1000;
  }
  return overlap > 0 ? {overlap,window:window.map(iso),tithi:matching} : null;
}

export function observances(date, location, settings = {}) {
  const mode = settings.sunriseMode || 'geometric';
  const sun = sunDay(date,location,mode), next = sunDay(addDays(date,1),location,mode);
  if (!sun.sunrise || !sun.sunset || !next.sunrise) return [];
  const sunriseIndex = indices(sun.sunrise).tithi;
  const monthly = [
    ...[10,25].map(tithi => ({id:`ekadashi-${tithi}`,name:'Ekadashi tithi at sunrise',tithi,window:'sunrise'})),
    ...[12,27].map(tithi => ({id:`pradosha-${tithi}`,name:'Pradosha tithi window',tithi,window:'pradosha'})),
    {id:'sankashti',name:'Sankashti Chaturthi tithi',tithi:18,window:'moonrise'},
    {id:'purnima',name:'Purnima tithi at sunrise',tithi:14,window:'sunrise'},
    {id:'amavasya',name:'Amavasya tithi at sunrise',tithi:29,window:'sunrise'}
  ];
  const result = [];
  // Avoid scoring unrelated festival rules; at most three tithis cross a local day.
  const possible = new Set([sunriseIndex,(sunriseIndex+1)%30,(sunriseIndex+2)%30,(sunriseIndex+29)%30]);
  for (const rule of [...RULES,...monthly]) {
    if (!possible.has(rule.tithi)) continue;
    if (rule.window === 'moonrise') {
      if (sun.moonrise && indices(sun.moonrise).tithi === rule.tithi)
        result.push({...rule,status:'preview',reason:'Krishna Chaturthi present at local moonrise',window:[sun.moonrise,sun.moonrise]});
      continue;
    }
    const score = scoreRule(date,location,mode,rule);
    if (!score) continue;
    const previous = scoreRule(addDays(date,-1),location,mode,rule);
    const following = scoreRule(addDays(date,1),location,mode,rule);
    // One day per rule: maximum overlap; equal overlap selects the later civil day.
    if ((previous && previous.overlap > score.overlap) || (following && following.overlap >= score.overlap)) continue;
    result.push({...rule,...score,status:'preview',reason:`${angaName('tithi',rule.tithi)} overlaps ${rule.window}; maximum-overlap rule, later day on a tie.`});
  }
  // Sidereal ingress times are solved from solar longitude, never Gregorian dates.
  const start = +new Date(sun.start), end = +new Date(sun.end);
  const sign = Math.floor(angles(start).sunSidereal/30);
  if (Math.floor(angles(end-1).sunSidereal/30) !== sign) {
    let lo = start, hi = end;
    while (hi-lo > 1000) { const mid=(lo+hi)/2; if(Math.floor(angles(mid).sunSidereal/30)===sign)lo=mid;else hi=mid; }
    const to=(sign+1)%12;
    result.push({id:`sankranti-${to}`,name:`${RASHIS[to]} Sankranti`,status:'astronomical',window:[iso(hi),iso(hi)],reason:'Sidereal Sun enters the next rashi. Regional festival day may differ from the ingress date.'});
  }
  return result;
}

export function matchPersonalEvent(event, instant) {
  const current = indices(instant), month = calendarAt(instant).amanta;
  return current.tithi === event.tithi && month.index === event.month && (!month.adhika || event.includeAdhika);
}

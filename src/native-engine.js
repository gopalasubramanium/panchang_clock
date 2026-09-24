// Local calculation interface for SwiftUI. No DOM, web view, remote code or network APIs.
import {daily,sunDay,indices,calendarAt,angaName,karanaIndex,planetsAt,WEEKDAYS} from './engine.js';
import {observances} from './festivals.js';
import {addDays,validDate} from './time.js';
import {cleanLocation,personalDates} from './preferences.js';
import locales from './locales.json' with {type:'json'};

function settings(value={}) {
  if(!['amanta','purnimanta'].includes(value.convention)||!['geometric','apparent'].includes(value.sunriseMode))throw new Error('Choose valid calculation conventions.');
  return value;
}
function name(kind,index,lang) {
  const l=locales[lang]||locales.en;
  if(lang==='en')return angaName(kind,index);
  if(kind==='tithi')return `${index<15?'Shukla':'Krishna'} ${l.tithis[index===29?15:index%15]}`;
  if(kind==='nakshatra')return l.nakshatras[index]||angaName(kind,index);
  if(kind==='yoga')return l.yogas?.[index]||angaName(kind,index);
  return l.karanas?.[karanaIndex(index)]||angaName(kind,index);
}
function events(date,location,prefs) {
  return observances(date,location,prefs).map(e=>({id:`${date}-${e.id}`,name:e.name,reason:e.reason,status:e.status,
    start:e.window?.[0]||null,end:e.window?.[1]||null}));
}
function monthDay(date,location,prefs) {
  const sun=sunDay(date,location,prefs.sunriseMode);
  const at=sun.sunrise||new Date(+new Date(sun.start)+43200000).toISOString();
  const index=indices(at),cal=calendarAt(at,prefs.convention);
  return {date,day:Number(date.slice(-2)),tithiIndex:index.tithi,tithi:name('tithi',index.tithi,prefs.lang),
    month:cal.chosen.name,monthIndex:cal.amanta.index,adhika:cal.amanta.adhika,sunrise:sun.sunrise,events:events(date,location,prefs)};
}
export function request(input) {
  try {
    const p=JSON.parse(input),location=cleanLocation(p.location),prefs=settings(p.settings);
    validDate(p.date);
    let value;
    if(p.kind==='day') {
      const d=daily(p.date,location,prefs,p.instant),atCal=calendarAt(d.instant,prefs.convention);
      value={date:d.date,instant:d.instant,weekday:d.currentVaara===null?'Sunrise weekday unavailable':WEEKDAYS[d.currentVaara],
        month:d.calendar.chosen.name,adhika:d.calendar.chosen.adhika,solarMonth:d.calendar.tamilSolarMonth,
        tithiIndex:d.current.tithi,monthIndex:atCal.amanta.index,illumination:d.illumination,sun:d.sun,
        angas:Object.entries(d.angas).map(([kind,a])=>({...a,name:name(kind,a.index,prefs.lang)})),
        timings:d.periods.windows,horas:d.periods.horas,choghadiya:d.periods.choghadiya,
        planets:planetsAt(d.instant,location).planets,events:events(p.date,location,prefs),warnings:d.warnings,
        convention:d.settings.convention,sunriseMode:d.settings.sunriseMode};
    } else if(p.kind==='month') {
      const start=p.date.slice(0,7)+'-01',days=[];
      for(let date=start;date.startsWith(start.slice(0,7));date=addDays(date,1))days.push(monthDay(date,location,prefs));
      value=days;
    } else if(p.kind==='upcoming') {
      personalDates(p.personal); // Validate names and lunar rules without discarding native IDs.
      const pending=new Map(p.personal.map(e=>[e.id,e])),found=[];
      for(let i=0;i<400&&pending.size;i++) {
        const date=addDays(p.date,i);if(Number(date.slice(0,4))>2100)break;
        const sun=sunDay(date,location,prefs.sunriseMode);if(!sun.sunrise)continue;
        const tithi=indices(sun.sunrise).tithi;
        if(![...pending.values()].some(e=>e.tithi===tithi))continue;
        const month=calendarAt(sun.sunrise).amanta;
        for(const [id,e] of pending)if(e.tithi===tithi&&e.month===month.index&&(!month.adhika||e.includeAdhika)){
          found.push({id,name:e.name,date,start:sun.sunrise,end:new Date(+new Date(sun.sunrise)+60000).toISOString(),
            reason:'Lunar date present at local sunrise. Repeated or skipped tithis require your family convention.',status:'personal'});
          pending.delete(id);
        }
      }
      value=found.sort((a,b)=>a.start.localeCompare(b.start));
    } else throw new Error('Unknown calculation request.');
    return JSON.stringify({value});
  }catch(error){return JSON.stringify({error:error.message});}
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as A from 'astronomy-engine';
import {daily,angles,ayanamsa,planetsAt,indices,transition,calendarAt,karanaIndex,sunDay,periods,norm,nextSkyEvents} from '../src/engine.js';
import {observances} from '../src/festivals.js';
const delhi={lat:28.6139,lon:77.209,zone:'Asia/Kolkata'};
const fixtures=JSON.parse(readFileSync(new URL('./ephemeris-reference.json',import.meta.url))).samples;
for(const row of fixtures)test(`Independent ephemeris comparison ${row.date}`,()=>{
 const planets=planetsAt(row.date,delhi);
 for(const [name,expected]of Object.entries(row.longitude)){
  const actual=norm(planets.planets.find(p=>p.name===name).longitude+ayanamsa(row.date));
  const diff=Math.abs(norm(actual-expected+180)-180)*60;
  assert.ok(diff<(name==='Moon'?1.2:.3),`${name}: ${diff} arcminutes`);
 }
 assert.ok(Math.abs(ayanamsa(row.date)-row.ayanamsa)*60<.006);
});
const newMoons=['01-18T19:52','02-17T12:01','03-19T01:23','04-17T11:52','05-16T20:01','06-15T02:54','07-14T09:43','08-12T17:37','09-11T03:27','10-10T15:50','11-09T07:02','12-09T00:52'];
for(const value of newMoons)test(`USNO 2026 new moon ${value}`,()=>{const expected=new Date('2026-'+value+':00Z');const found=A.SearchMoonPhase(0,new Date(+expected-86400000),2).date;assert.ok(Math.abs(found-expected)<90000,`${found.toISOString()}`);});
test('lunar month follows lunation and detects Adhika Jyeshtha 2026',()=>{const a=calendarAt('2026-05-25T12:00Z');assert.equal(a.amanta.name,'Jyeshtha');assert.equal(a.amanta.adhika,true);assert.equal(calendarAt('2026-06-20T12:00Z').amanta.adhika,false);});
test('Purnimanta and Amanta differ on waning fortnight',()=>{const c=calendarAt('2026-09-04T12:00Z','purnimanta');assert.equal(c.amanta.name,'Shravana');assert.equal(c.purnimanta.name,'Bhadrapada');});
test('lunar year changes at Chaitra, not January',()=>{assert.equal(calendarAt('2026-01-15T12:00Z').vikramChaitradi,2082);assert.equal(calendarAt('2026-03-20T12:00Z').vikramChaitradi,2083);});
test('all karanas including fixed endpoints',()=>{assert.equal(karanaIndex(0),10);assert.equal(karanaIndex(1),0);assert.equal(karanaIndex(56),6);assert.deepEqual([57,58,59].map(karanaIndex),[7,8,9]);});
test('transition searches bracket actual index changes including wrap',()=>{
 for(const date of ['2026-03-18T12:00Z','2026-09-17T12:00Z','2026-06-01T12:00Z'])for(const kind of ['tithi','nakshatra','yoga','karana']){
  const before=indices(date)[kind],boundary=transition(date,kind);
  assert.equal(indices(+boundary-1000)[kind],before);assert.notEqual(indices(+boundary+1000)[kind],before);
  assert.ok(+boundary>+new Date(date));assert.ok(+boundary-+new Date(date)<3*86400000);
 }
});
test('polar day does not invent sunrise or auspicious periods',()=>{const d=daily('2026-06-21',{lat:69.6492,lon:18.9553,zone:'Europe/Oslo'});assert.equal(d.sun.sunrise,null);assert.equal(d.sun.sunset,null);assert.equal(d.periods.available,false);assert.equal(d.periods.windows.length,0);});
test('geometric sunrise is later than observed upper-limb sunrise',()=>{const g=sunDay('2026-09-17',delhi,'geometric'),a=sunDay('2026-09-17',delhi,'apparent');assert.ok(new Date(g.sunrise)>new Date(a.sunrise));assert.ok(new Date(g.sunset)<new Date(a.sunset));});
test('houras exactly cover actual sunrise to next sunrise on DST night',()=>{const loc={lat:40.7128,lon:-74.006,zone:'America/New_York'};const d=daily('2026-10-31',loc);const h=d.periods.horas;assert.equal(h.length,24);assert.equal(h[0].start,d.sun.sunrise);assert.equal(h.at(-1).end,d.nextSunrise);for(let i=1;i<h.length;i++)assert.equal(h[i].start,h[i-1].end);});
test('Choghadiya Thursday day/night begin Shubha/Amrita and mark Rahu overlap',()=>{const d=daily('2026-09-17',delhi);assert.equal(d.periods.choghadiya[0].name,'Shubha');assert.equal(d.periods.choghadiya[8].name,'Amrita');assert.ok(d.periods.choghadiya.some(w=>w.conflicts.includes('Rahu Kalam')));});
test('Wednesday does not claim universally auspicious Abhijit',()=>{assert.ok(!daily('2026-09-16',delhi).periods.windows.some(w=>w.name==='Abhijit Muhurta'));});
test('Diwali preview uses Ashwin Amavasya at Pradosha, not Kartika or fixed dates',()=>{const e=observances('2026-11-08',delhi);assert.ok(e.some(e=>e.id==='diwali'));assert.ok(!observances('2026-11-09',delhi).some(e=>e.id==='diwali'));});
test('Rama Navami 2026 uses midday tithi',()=>{assert.ok(observances('2026-03-26',delhi).some(e=>e.id==='rama-navami'));});
test('solar ingress is solved astronomically',()=>{assert.ok(observances('2026-01-14',delhi).some(e=>e.id==='sankranti-9'));assert.ok(!observances('2026-01-15',delhi).some(e=>e.id==='sankranti-9'));});
test('zero coordinates stay zero; invalid coordinates rejected',()=>{const d=daily('2026-09-17',{lat:0,lon:0,zone:'UTC'});assert.equal(d.location.lon,0);assert.throws(()=>daily('2026-09-17',{lat:91,lon:0,zone:'UTC'}));});
test('JSON has no NaN/Infinity and events have absolute dates',()=>{const d=daily('2026-09-17',delhi);assert.ok(!/NaN|Infinity/.test(JSON.stringify(d)));for(const a of Object.values(d.angas))assert.match(a.end,/^2026-.*Z$/);});
test('sky events distinguish local solar and global lunar visibility',()=>{const d=nextSkyEvents('2026-09-17T12:00Z',delhi);assert.match(d.solarEclipse.peak,/Z$/);assert.equal(typeof d.lunarEclipse.moonAboveHorizonAtPeak,'boolean');});
test('supported date-range endpoints include adjacent solar days',()=>{for(const date of ['1900-01-01','2100-12-31'])assert.ok(daily(date,delhi).sun.sunrise);});
test('Vaara before sunrise belongs to previous sunrise day',()=>{assert.equal(daily('2026-09-17',delhi,{},'2026-09-16T21:00Z').currentVaara,3);});
const eventRef=JSON.parse(readFileSync(new URL('./events-reference.json',import.meta.url)));
for(const r of eventRef.transitions)test(`Independent transition ${r.date} ${r.kind}`,()=>{const actual=transition(r.date,r.kind);assert.equal(indices(r.date)[r.kind],r.index);assert.ok(Math.abs(actual-new Date(r.end))<150000,`${actual.toISOString()} vs ${r.end}`);});
for(const r of eventRef.solar)test(`Independent geometric solar events ${r.location.name} ${r.date}`,()=>{const a=sunDay(r.date,r.location,'geometric');for(const k of ['sunrise','sunset'])assert.ok(Math.abs(new Date(a[k])-new Date(r[k]))<60000,`${k}: ${a[k]} vs ${r[k]}`);});
for(const r of JSON.parse(readFileSync(new URL('./ascendant-reference.json',import.meta.url))))test(`Independent ascendant ${r.date} ${r.lat}`,()=>{const p=planetsAt(r.date,r);assert.ok(Math.abs(norm(p.ascendant-r.ascendant+180)-180)<.03);});

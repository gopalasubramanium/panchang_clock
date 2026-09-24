import {test} from 'node:test';
import assert from 'node:assert/strict';
import {request} from '../src/native-engine.js';
import {daily,indices,calendarAt} from '../src/engine.js';
const location={name:'Delhi',lat:28.6139,lon:77.209,zone:'Asia/Kolkata'};
const settings={convention:'amanta',sunriseMode:'geometric',lang:'en'};
function call(kind,overrides={}) {return JSON.parse(request(JSON.stringify({kind,date:'2026-09-24',location,settings,...overrides})));}
test('native daily values and transitions preserve the tested scientific engine',()=>{
 const n=call('day').value,d=daily('2026-09-24',location,settings);
 assert.equal(n.tithiIndex,d.current.tithi);assert.equal(n.sun.sunrise,d.sun.sunrise);
 assert.deepEqual(n.angas.map(a=>[a.kind,a.start,a.end]),Object.values(d.angas).map(a=>[a.kind,a.start,a.end]));
 assert.equal(n.horas.length,24);assert.ok(n.planets.every(p=>Number.isFinite(p.longitude)));
});
test('native month follows leap-day and date-range boundaries',()=>{
 const leap=call('month',{date:'2024-02-20'}).value;assert.equal(leap.length,29);assert.equal(leap.at(-1).date,'2024-02-29');
 const last=call('month',{date:'2100-12-31'}).value;assert.equal(last.length,31);assert.equal(last.at(-1).date,'2100-12-31');
});
test('native personal matches occur at sunrise and preserve stable rule IDs',()=>{
 const day=call('day').value;
 const personal=[{id:'f94b410f-74e6-4529-ac07-b82b024c9cd2',name:'Family date',month:day.monthIndex,tithi:day.tithiIndex,includeAdhika:true}];
 const result=call('upcoming',{personal}).value;assert.equal(result.length,1);assert.equal(result[0].id,personal[0].id);
 assert.equal(result[0].date,'2026-09-24');assert.equal(indices(result[0].start).tithi,personal[0].tithi);
 assert.equal(calendarAt(result[0].start).amanta.index,personal[0].month);
});
test('native polar day exposes missing sunrise without invented periods',()=>{
 const n=call('day',{date:'2026-06-21',location:{name:'Longyearbyen',lat:78.2232,lon:15.6469,zone:'Arctic/Longyearbyen'}}).value;
 assert.equal(n.sun.sunrise,null);assert.equal(n.timings.length,0);assert.ok(n.warnings.length);
});
test('native bridge rejects invalid inputs and unsupported dates',()=>{
 assert.ok(call('day',{date:'2200-01-01'}).error);
 assert.ok(call('day',{location:{...location,zone:'Invalid/Place'}}).error);
 assert.ok(call('upcoming',{personal:[{name:'Bad',month:12,tithi:0}]}).error);
 assert.ok(call('unknown').error);assert.ok(JSON.parse(request('bad json')).error);
});

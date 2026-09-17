import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {daily} from '../src/engine.js';
const cities=JSON.parse(readFileSync(new URL('../src/cities.json',import.meta.url)));
test('Every preset location through twelve months produces coherent days and intervals',()=>{
 for(const location of cities)for(let month=1;month<=12;month++){
  const date=`2026-${String(month).padStart(2,'0')}-15`;
  const d=daily(date,location);
  assert.ok(d.current.tithi>=0&&d.current.tithi<30);
  if(d.periods.available){
   assert.ok(d.periods.dayHours>0&&d.periods.nightHours>0);
   for(const w of d.periods.horas)assert.ok(new Date(w.end)>new Date(w.start));
  }else assert.ok(d.warnings.length>0);
 }
});
test('geographic poles are explicit missing-event cases',()=>{for(const lat of [-90,90])for(const date of ['2026-06-21','2026-12-21']){const d=daily(date,{lat,lon:0,zone:'UTC'});assert.equal(d.periods.available,false);}});

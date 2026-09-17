import {readFileSync,writeFileSync} from 'node:fs';
import {transition,sunDay} from '../src/engine.js';
const reference=JSON.parse(readFileSync('tests/events-reference.json'));
const errors={};
for(const r of reference.transitions){const seconds=Math.abs(transition(r.date,r.kind)-new Date(r.end))/1000;if(!errors[r.kind]||seconds>errors[r.kind].seconds)errors[r.kind]={seconds,date:r.date};}
for(const r of reference.solar){const a=sunDay(r.date,r.location);for(const k of ['sunrise','sunset']){const seconds=Math.abs(new Date(a[k])-new Date(r[k]))/1000;if(!errors[k]||seconds>errors[k].seconds)errors[k]={seconds,date:r.date,location:r.location.name};}}
writeFileSync('docs/event-validation.json',JSON.stringify(errors,null,2)+'\n');console.log(JSON.stringify(errors,null,2));

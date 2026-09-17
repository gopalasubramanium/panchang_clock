import {readFileSync,writeFileSync} from 'node:fs';
import {angles,ayanamsa,planetsAt,norm} from '../src/engine.js';
const ref=JSON.parse(readFileSync('tests/ephemeris-reference.json'));
const errors={};
for(const row of ref.samples){
 const p=planetsAt(row.date,{lat:28.6139,lon:77.209});
 for(const [name,expected] of Object.entries(row.longitude)){
  const actual=norm(p.planets.find(p=>p.name===name).longitude+ayanamsa(row.date));
  const error=Math.abs(norm(actual-expected+180)-180)*60;
  if(!errors[name]||error>errors[name].arcminutes)errors[name]={arcminutes:error,date:row.date};
 }
 const error=Math.abs(ayanamsa(row.date)-row.ayanamsa)*60;
 if(!errors.ayanamsa||error>errors.ayanamsa.arcminutes)errors.ayanamsa={arcminutes:error,date:row.date};
}
console.log(JSON.stringify(errors,null,2));
writeFileSync('docs/ephemeris-validation.json',JSON.stringify({samples:ref.samples.length,errors},null,2)+'\n');

import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {preferences,personalDates} from '../src/preferences.js';
import {calculationLink,linkParameters} from '../src/sharing.js';
import {searchCities} from '../src/city-search.js';
import {visibleEvents,monthCalendarEvents} from '../src/calendar-events.js';
import {calendarFile} from '../src/export.js';
const {assetPath,isExternalURL,isAppURL}=createRequire(import.meta.url)('../desktop/security.cjs');
const place={name:'London',lat:51.5,lon:0,zone:'Europe/London',elevation:0};
test('untrusted preference and backup input stays bounded and has no extra properties',()=>{
 const fallback={location:place,personal:[],filters:{festival:true,monthly:true,ingress:true,personal:true}};
 const result=preferences({location:{...place,secret:'discard'},theme:'javascript:',filters:{festival:false},personal:[{name:' <b>name</b> ',month:0,tithi:0,includeAdhika:false,unexpected:1}],__proto__:{unsafe:1}},fallback);
 assert.equal(result.location.secret,undefined);assert.equal(result.theme,undefined);assert.equal(result.filters.festival,false);assert.equal(result.personal[0].name,'<b>name</b>');assert.equal(result.personal[0].unexpected,undefined);
 assert.throws(()=>personalDates([{name:'x',month:0,tithi:1,includeAdhika:'true'}]));assert.throws(()=>personalDates(Array(201).fill({name:'x',month:0,tithi:1})));
 assert.equal(personalDates([{name:'x',month:0,tithi:0},{name:'x',month:0,tithi:0}]).length,1);
});
test('new calculation links keep coordinates out of HTTP query and retain zero coordinates',()=>{
 const data={date:'2026-09-17',location:{...place,lat:0,lon:0},settings:{convention:'amanta',sunriseMode:'geometric'}};
 const url=new URL(calculationLink('https://panchang.eksaar.com/?old=secret',data,'12:00'));
 assert.equal(url.search,'');const params=linkParameters(url.href);assert.equal(params.get('lat'),'0');assert.equal(params.get('lon'),'0');assert.equal(params.get('time'),'12:00');
 assert.equal(linkParameters('https://example.com/?lat=1#lat=2').get('lat'),'2');assert.throws(()=>linkParameters('https://example.com/#lat='));
});
test('desktop URL boundary denies scripts, deceptive hosts and path escapes',()=>{
 for(const url of ['https://app/','panchang://evil/index.html','panchang://user@app/index.html'])assert.equal(isAppURL(url),false);
 for(const url of ['javascript:alert(1)','file:///etc/passwd','https://github.com/attacker/project','https://github.com.evil.test/','https://user@me.sgopala.com/'])assert.equal(isExternalURL(url),false);
 assert.equal(isExternalURL('https://github.com/gopalasubramanium/panchang_clock/issues'),true);
 for(const url of ['panchang://app/%2e%2e%2fsecret.json','panchang://app/a%5c..%5csecret.json','panchang://app/%00.json','panchang://app/.env','panchang://other/index.html'])assert.equal(assetPath('/safe/dist',url),null);
 assert.equal(assetPath('/safe/dist','panchang://app/'),'/safe/dist/index.html');
});
test('city search is accent-insensitive and bounded',()=>{
 const rows=[['São Paulo','Sao Paulo','BR',-23.5,-46.6,'America/Sao_Paulo'],['London','London','GB',51.5,0,'Europe/London']];
 assert.equal(searchCities(rows,'sao br')[0].name,'São Paulo');assert.equal(searchCities(rows,'London')[0].zone,'Europe/London');assert.deepEqual(searchCities(rows,'x'),[]);
});
test('monthly export honors filters and requested alarm, marks previews, omits raw coordinates',()=>{
 const entries=[{name:'Festival',month:0,status:'preview',window:['2026-09-17T01:00Z','2026-09-17T01:00Z']},{name:'Ingress',status:'astronomical',window:['2026-09-17T02:00Z','2026-09-17T02:00Z']}];
 const settings={personal:[],filters:{festival:true,monthly:false,ingress:false,personal:false}};
 assert.equal(visibleEvents(entries,settings.filters).length,1);
 const events=monthCalendarEvents([{date:'2026-09-17',sunrise:null,observances:entries}],settings);
 const ics=calendarFile(events,place,1440);assert.match(ics,/SUMMARY:Festival \(preview\)/);assert.match(ics,/TRIGGER:-PT1440M/);assert.doesNotMatch(ics,/SUMMARY:Ingress/);assert.doesNotMatch(ics,/51\.5/);assert.doesNotMatch(calendarFile(events,place,0),/VALARM/);
});

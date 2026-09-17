import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarFile} from '../src/export.js';
test('ICS UTC timestamps survive midnight and DST; alarms and escaped text are valid',()=>{
 const s=calendarFile([{name:'पूजा, family; reminder\nline',start:'2026-11-01T05:50:00Z',end:'2026-11-01T06:20:00Z'}],{name:'New York',zone:'America/New_York',lat:40.7,lon:-74});
 assert.match(s,/DTSTART:20261101T055000Z/);assert.match(s,/DTEND:20261101T062000Z/);assert.match(s,/TRIGGER:-PT15M/);assert.match(s,/\\,/);assert.match(s,/\\;/);assert.match(s,/\\nline/);
 for(const row of s.split('\r\n'))assert.ok(Buffer.byteLength(row)<=75);
 assert.ok(s.endsWith('END:VCALENDAR\r\n'));
});
test('ICS omits invalid or empty intervals',()=>assert.ok(!calendarFile([{name:'None',start:null,end:null}],{zone:'UTC'}).includes('BEGIN:VEVENT')));

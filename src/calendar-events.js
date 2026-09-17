import {matchPersonalEvent} from './festivals.js';
export function eventCategory(event) {
  return event.category || (event.status==='astronomical'?'ingress':event.month===undefined?'monthly':'festival');
}
export function visibleEvents(events,filters) { return events.filter(event=>filters[eventCategory(event)]!==false); }
export function eventsForDay(day,settings) {
  const personal=day.sunrise?(settings.personal||[]).filter(event=>matchPersonalEvent(event,day.sunrise)).map(event=>({name:event.name,category:'personal',status:'personal',reason:'Your saved lunar date matches at sunrise. Repeated or skipped tithis require your family convention.',window:[day.sunrise,day.sunrise]})):[];
  return visibleEvents([...day.observances,...personal],settings.filters||{});
}
export function monthCalendarEvents(days,settings) {
  return days.flatMap(day=>eventsForDay(day,settings).map(event=>{
    const start=event.window?.[0]||day.sunrise;
    if(!start)return null;
    const end=event.window?.[1];
    return {...event,name:event.status==='preview'?`${event.name} (preview)`:event.name,start,
      end:end&&+new Date(end)>+new Date(start)+60000?end:new Date(+new Date(start)+60000).toISOString(),
      reason:`${event.reason} Calendar marker at the calculation's deciding moment/window, not a fasting or puja duration.`};
  }).filter(Boolean));
}

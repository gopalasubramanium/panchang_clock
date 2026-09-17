import {sunDay,indices,calendarAt,angaName} from './engine.js';
import {observances} from './festivals.js';
import {addDays} from './time.js';
self.onmessage = ({data:{id,start,count,location,settings}}) => {
  try {
    const days=[];
    for(let i=0;i<count;i++){
      const date=addDays(start,i), sun=sunDay(date,location,settings.sunriseMode);
      const instant=sun.sunrise || new Date(+new Date(sun.start)+12*3600000).toISOString();
      const at=indices(instant), calendar=calendarAt(instant,settings.convention);
      days.push({date,tithi:at.tithi,tithiName:angaName('tithi',at.tithi),nakshatra:at.nakshatra,calendar,
        sunrise:sun.sunrise,observances:observances(date,location,settings)});
    }
    self.postMessage({id,days});
  }catch(error){self.postMessage({id,error:error.message});}
};

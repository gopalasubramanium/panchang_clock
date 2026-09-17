"""Generate independent numeric fixtures with separately installed pyswisseph.
Swiss Ephemeris is used only as a validation tool, not linked/distributed in the app.
No external ephemeris files: explicitly use and record the Moshier fallback.
"""
import json, swisseph as swe
swe.set_sid_mode(swe.SIDM_LAHIRI)
rows=[]
for year in range(1900,2101,5):
 for month in [1,4,7,10]:
  jd=swe.julday(year,month,15,12)
  ayan=swe.get_ayanamsa_ut(jd)
  vals={}
  for name,body in [('Sun',swe.SUN),('Moon',swe.MOON),('Mars',swe.MARS),('Mercury',swe.MERCURY),('Jupiter',swe.JUPITER),('Venus',swe.VENUS),('Saturn',swe.SATURN)]:
   position,flags=swe.calc_ut(jd,body,swe.FLG_MOSEPH)
   assert flags & swe.FLG_MOSEPH
   vals[name]=position[0]
  rows.append({'date':f'{year}-{month:02d}-15T12:00:00Z','ayanamsa':ayan,'longitude':vals})
out={'source':'pyswisseph 2.10.3.2 / Swiss Ephemeris Moshier mode, apparent geocentric ecliptic-of-date longitude; SIDM_LAHIRI mean ayanamsa', 'generated':'2026-09-17','samples':rows}
with open('tests/ephemeris-reference.json','w') as f:json.dump(out,f,indent=2)
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

def jd_to_iso(jd): return datetime.fromtimestamp((jd-2440587.5)*86400,timezone.utc).isoformat().replace('+00:00','Z')
def idx(jd,kind):
 sun=swe.calc_ut(jd,swe.SUN,swe.FLG_MOSEPH)[0][0]
 moon=swe.calc_ut(jd,swe.MOON,swe.FLG_MOSEPH)[0][0]
 ay=swe.get_ayanamsa_ut(jd)
 if kind=='tithi':return int(((moon-sun)%360)/12)
 if kind=='karana':return int(((moon-sun)%360)/6)
 if kind=='nakshatra':return int(((moon-ay)%360)/(360/27))
 return int(((sun+moon-2*ay)%360)/(360/27))
transitions=[]
for m in range(1,13):
 for day in [1,15]:
  jd=swe.julday(2026,m,day,12)
  for kind in ['tithi','nakshatra','yoga','karana']:
   index=idx(jd,kind);lo=jd;hi=jd+1/24
   while idx(hi,kind)==index:lo=hi;hi+=1/24
   while (hi-lo)*86400>0.1:
    mid=(lo+hi)/2
    if idx(mid,kind)==index:lo=mid
    else:hi=mid
   transitions.append({'date':jd_to_iso(jd),'kind':kind,'index':index,'end':jd_to_iso((lo+hi)/2)})
locations=[('Delhi',28.6139,77.209,'Asia/Kolkata'),('New York',40.7128,-74.006,'America/New_York'),('Sydney',-33.8688,151.2093,'Australia/Sydney'),('Singapore',1.3521,103.8198,'Asia/Singapore'),('Kathmandu',27.7172,85.324,'Asia/Kathmandu'),('London',51.5074,-.1278,'Europe/London')]
solar=[]
for name,lat,lon,zone in locations:
 for month in [1,3,6,9,12]:
  dt=datetime(2026,month,15,tzinfo=ZoneInfo(zone));jd=dt.timestamp()/86400+2440587.5
  result={'date':dt.strftime('%Y-%m-%d'),'location':{'name':name,'lat':lat,'lon':lon,'zone':zone}}
  for key,flag in [('sunrise',swe.CALC_RISE),('sunset',swe.CALC_SET)]:
   code,times=swe.rise_trans(jd,swe.SUN,flag|swe.BIT_DISC_CENTER|swe.BIT_NO_REFRACTION,(lon,lat,0),flags=swe.FLG_MOSEPH)
   result[key]=jd_to_iso(times[0]) if code==0 else None
  solar.append(result)
with open('tests/events-reference.json','w') as f:json.dump({'source':out['source'],'transitions':transitions,'solar':solar},f,indent=2)

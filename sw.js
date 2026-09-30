const PREFIX='eksaar-panchang-'+btoa(self.registration.scope)+'-';
const CACHE=PREFIX+'790dfe3a4de2fa39';
const ASSETS=["THIRD_PARTY_NOTICES.txt","apps.css","apps.html","assets/calendar-worker-EaegyAjw.js","assets/index-BIb78a8b.css","assets/index-BQ0uiRzo.js","assets/web-BcDxIRI0.js","assets/web-BvPKDooN.js","assets/web-I4h1P-gA.js","assets/web-MW-eBtiT.js","cities-world.json","credits.txt","icon-192.png","icon-512.png","icon-maskable.png","icon.svg","index.html","information.css","manifest.webmanifest","privacy.html","support.html"];
// A cached HTML response may have followed a host's /index.html redirect.
// Reconstruct it so a navigation with redirect mode 'manual' can use it safely.
const usable=response=>response?.redirected?new Response(response.body,{status:response.status,statusText:response.statusText,headers:response.headers}):response;
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(p=>new URL(p,self.registration.scope).href)))));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith(caches.open(CACHE).then(async cache=>{
  if(event.request.mode==='navigate'){
   const url=new URL(event.request.url);url.search='';url.hash='';
   return usable((await cache.match(url.href,{ignoreVary:true}))||(await cache.match(new URL('index.html',self.registration.scope).href,{ignoreVary:true})))||fetch(event.request);
  }
  return usable(await cache.match(event.request,{ignoreVary:true}))||fetch(event.request);
 }));
});

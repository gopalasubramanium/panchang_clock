import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
async function walk(dir){const result=[];for(const entry of await readdir(dir,{withFileTypes:true})){const path=`${dir}/${entry.name}`;if(entry.isDirectory())result.push(...await walk(path));else if(!['sw.js','_headers','_redirects'].includes(entry.name))result.push(path);}return result;}
const paths=(await walk('dist')).sort();
const hash=createHash('sha256');hash.update(await readFile(new URL(import.meta.url)));for(const path of paths)hash.update(path).update(await readFile(path));
const version=hash.digest('hex').slice(0,16),assets=paths.map(p=>p.slice(5));
await writeFile('dist/sw.js',`const PREFIX='eksaar-panchang-'+btoa(self.registration.scope)+'-';
const CACHE=PREFIX+'${version}';
const ASSETS=${JSON.stringify(assets)};
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
`);
console.log(`Offline cache ${version}: ${assets.length} bundled files.`);

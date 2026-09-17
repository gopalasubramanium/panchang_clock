// Exercise production-like HTML redirects through a real service worker.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const root=resolve('dist'),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/index.html'){res.writeHead(308,{Location:'/'});res.end();return;}
 const file=resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));
 if(!file.startsWith(root+'/')){res.writeHead(403);res.end();return;}
 try{const body=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'text/plain','Cache-Control':'no-cache'});res.end(body);}catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,...(process.platform==='darwin'?{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}:{})});
try{
 const context=await browser.newContext();const page=await context.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/?date=2026-09-17&time=12:00`);await page.locator('.hero h2').waitFor();await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await context.setOffline(true);await page.reload();await page.locator('.hero h2').waitFor();assert.match(await page.locator('.hero h2').innerText(),/Shukla|Krishna/);await page.goto(`http://127.0.0.1:${server.address().port}/privacy.html`);assert.match(await page.locator('h1').innerText(),/stays with you/);console.log('HTML redirect cache: online reload, offline reload and privacy page passed.');
}finally{await browser.close();server.close();}

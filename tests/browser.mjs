import {chromium,webkit,firefox} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browserName=process.env.TEST_BROWSER||'chromium';
const executable=browserName==='chromium'?(process.env.CHROME_PATH||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined)):undefined;
const browser=await ({chromium,webkit,firefox}[browserName]).launch({headless:true,...(executable?{executablePath:executable}:{})});
const base=process.env.TEST_URL||'http://127.0.0.1:4173';
await mkdir('test-results',{recursive:true});
const results=[];
try{
 const context=await browser.newContext({viewport:{width:1440,height:1080},acceptDownloads:true});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?date=2026-09-17&time=12:00&lat=28.6139&lon=77.209&zone=Asia%2FKolkata&place=New+Delhi');
 await page.locator('.hero h2').waitFor();
 assert.match(await page.locator('.hero h2').innerText(),/Saptami/);
 const boxes=await Promise.all(['#city','#date','#time','#controls button.primary','#today'].map(selector=>page.locator(selector).boundingBox()));
 for(const box of boxes){assert.ok(Math.abs(box.height-boxes[0].height)<1,'Controls must have equal height');assert.ok(Math.abs(box.y-boxes[0].y)<1,'Controls must align at desktop width');}
 await page.screenshot({path:'test-results/desktop.png',fullPage:true});
 let axe=await new AxeBuilder({page}).analyze();results.push({check:'desktop accessibility',violations:axe.violations});assert.equal(axe.violations.length,0,JSON.stringify(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))));
 const dl=page.waitForEvent('download');await page.getByRole('button',{name:'Add periods to calendar'}).click();assert.match((await dl).suggestedFilename(),/\.ics$/);
 for(const name of ['Timings','Sky & planets','My dates','About & accuracy']){await page.getByRole('button',{name,exact:true}).click();assert.equal(await page.locator('.view:visible').count(),1);}
 await page.getByRole('button',{name:'Calendar',exact:true}).click();await page.locator('.calendar-day[data-date]').first().waitFor({timeout:60000});assert.equal(await page.locator('.calendar-day[data-date]').count(),30);const monthDownload=page.waitForEvent('download');await page.locator('#month-export').click();assert.match((await monthDownload).suggestedFilename(),/2026-09\.ics$/);await page.locator('[data-filter=monthly]').uncheck();await page.locator('#month-export:not([disabled])').waitFor();assert.equal(await page.locator('[data-filter=monthly]').isChecked(),false);
 await page.locator('[data-date="2026-09-22"]').click();assert.equal(await page.locator('#date').inputValue(),'2026-09-22');
 await page.getByRole('button',{name:'My dates',exact:true}).click();await page.locator('#personal-name').fill('Family birthday');await page.getByRole('button',{name:'Save lunar date'}).click();assert.match(await page.locator('#view-personal').innerText(),/Family birthday/);
 await page.reload();await page.getByRole('button',{name:'My dates',exact:true}).click();assert.match(await page.locator('#view-personal').innerText(),/Family birthday/);
 await page.getByRole('button',{name:'Open settings'}).click();await page.locator('#language').selectOption('ta');await page.locator('#theme').selectOption('dark');await page.getByRole('button',{name:'Save settings'}).click();assert.equal(await page.locator('html').getAttribute('lang'),'ta');
 await page.getByRole('button',{name:'Today',exact:true}).click();axe=await new AxeBuilder({page}).analyze();results.push({check:'dark Tamil accessibility',violations:axe.violations});assert.equal(axe.violations.length,0,JSON.stringify(axe.violations.map(v=>v.id)));
 await page.getByRole('button',{name:'Open settings'}).click();await page.locator('#language').selectOption('ur');await page.getByRole('button',{name:'Save settings'}).click();assert.equal(await page.locator('html').getAttribute('dir'),'rtl');
 await page.getByRole('button',{name:'Open settings'}).click();await page.locator('#language').selectOption('en');await page.locator('#theme').selectOption('light');await page.getByRole('button',{name:'Save settings'}).click();
 await page.getByRole('button',{name:'Open settings'}).click();await page.locator('#city-search').fill('Sao Paulo');await page.locator('#city-results button').first().waitFor();await page.locator('#city-results button').first().click();assert.equal(await page.locator('#zone').inputValue(),'America/Sao_Paulo');await page.locator('#text-size').selectOption('large');await page.getByRole('button',{name:'Save settings'}).click();assert.equal(await page.locator('html').getAttribute('data-text-size'),'large');assert.ok(await page.evaluate(()=>parseFloat(getComputedStyle(document.body).fontSize)>18));
 await page.getByRole('button',{name:'Share Panchang',exact:true}).click();assert.equal(await page.locator('#share-options').isVisible(),true);assert.match(await page.locator('#share-options').innerText(),/coordinates/);await page.locator('#share-close').click();
 await page.getByRole('button',{name:'Report a difference',exact:true}).click();assert.doesNotMatch(await page.locator('#report-text').inputValue(),/-23\.|-46\.|Family birthday/);await page.locator('#report-close').click();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 axe=await new AxeBuilder({page}).analyze();results.push({check:'mobile accessibility',violations:axe.violations});assert.equal(axe.violations.length,0);
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.reload();await context.setOffline(true);if(browserName==='chromium'){await page.reload();await page.locator('.hero h2').waitFor();}else{await page.locator('#date').fill('2026-09-24');await page.getByRole('button',{name:'Apply',exact:true}).click();}assert.match(await page.locator('.hero h2').innerText(),/Shukla|Krishna/);await page.getByRole('button',{name:'Open settings'}).click();await page.locator('#city-search').fill('London GB');await page.locator('#city-results button').first().waitFor();assert.match(await page.locator('#city-results button').first().innerText(),/London/);await page.locator('#settings-close').click();await context.setOffline(false);
 const api=await context.newPage();await api.goto(base+'/?api=true&date=2026-09-17&time=12:00&lat=0&lon=0&zone=UTC');await api.locator('#api-output').waitFor();const payload=JSON.parse(await api.locator('#api-output').innerText());assert.equal(payload.location.lat,0);assert.equal(payload.location.lon,0);
 await api.goto(base+'/?api=true&date=2026-02-30');await api.locator('#api-output').waitFor();assert.match(JSON.parse(await api.locator('#api-output').innerText()).error,/valid date/);
 await page.goto(base+'/?date=2026-03-08&time=01:30&lat=40.7128&lon=-74.006&zone=America%2FNew_York');await page.locator('.hero h2').waitFor();await page.locator('#time').fill('02:30');await page.getByRole('button',{name:'Apply',exact:true}).click();assert.match(await page.locator('#error').innerText(),/does not exist/);assert.equal(await page.locator('.hero').count(),0);
 assert.deepEqual(errors,[]);results.push({check:'functional and offline scenarios',passed:true});
 console.log(`${browserName}: desktop/mobile, accessibility, calendar, personal dates, Tamil/Urdu, ICS, ${browserName==='chromium'?'offline reload':'offline calculations (reload not covered)'}, JSON mode passed.`);
}finally{await writeFile(`test-results/${browserName}-report.json`,JSON.stringify(results,null,2));await browser.close();}

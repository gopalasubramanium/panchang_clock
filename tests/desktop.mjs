import {_electron} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const app=await _electron.launch({args:['.']});
try{
 const window=await app.firstWindow();await window.locator('.hero h2').waitFor({timeout:30000});
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1600,1000));
 await mkdir('test-results',{recursive:true});
 await window.screenshot({path:'test-results/desktop-native-daily.png'});
 assert.match(window.url(),/^panchang:\/\/app\//);
 const prefs=await app.evaluate(({BrowserWindow})=>{const p=BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();return {sandbox:p.sandbox,contextIsolation:p.contextIsolation,nodeIntegration:p.nodeIntegration};});
 assert.deepEqual(prefs,{sandbox:true,contextIsolation:true,nodeIntegration:false});
 assert.equal(await window.evaluate(()=>typeof window.require),'undefined');
 assert.equal(await window.evaluate(async()=>{try{await fetch('https://example.com/');return 'allowed';}catch{return 'blocked';}}),'blocked');
 assert.equal(await window.evaluate(async()=>{const r=await fetch('panchang://app/%2e%2e%2fpackage.json');return r.status;}),403);
 await window.getByRole('button',{name:'Open settings'}).click();await window.locator('#city-search').fill('London GB');await window.locator('#city-results button').first().waitFor();await window.locator('#settings-close').click();
 await window.getByRole('button',{name:'Calendar',exact:true}).click();await window.locator('.calendar-day[data-date]').first().waitFor();
 await mkdir('test-results',{recursive:true});await window.screenshot({path:'test-results/desktop-native.png'});
 console.log('Desktop app: local origin, sandbox, isolated renderer, daily view and calendar passed.');
}finally{await app.close();}

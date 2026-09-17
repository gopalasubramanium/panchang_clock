import {_electron} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const app=await _electron.launch({args:['.']});
try{
 const window=await app.firstWindow();await window.locator('.hero h2').waitFor({timeout:30000});
 assert.match(window.url(),/^panchang:\/\/app\//);
 const prefs=await app.evaluate(({BrowserWindow})=>{const p=BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();return {sandbox:p.sandbox,contextIsolation:p.contextIsolation,nodeIntegration:p.nodeIntegration};});
 assert.deepEqual(prefs,{sandbox:true,contextIsolation:true,nodeIntegration:false});
 await window.getByRole('button',{name:'Calendar',exact:true}).click();await window.locator('.calendar-day[data-date]').first().waitFor();
 await mkdir('test-results',{recursive:true});await window.screenshot({path:'test-results/desktop-native.png'});
 console.log('Desktop app: local origin, sandbox, isolated renderer, daily view and calendar passed.');
}finally{await app.close();}

const {app,BrowserWindow,protocol,net,session,shell}=require('electron');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {isAppURL,isExternalURL,assetPath}=require('./security.cjs');
protocol.registerSchemesAsPrivileged([{scheme:'panchang',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
app.enableSandbox();
app.whenReady().then(()=>{
 const root=path.resolve(__dirname,'../dist');
 protocol.handle('panchang',async request=>{
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
  const file=assetPath(root,request.url);
  if(!file)return new Response('Forbidden',{status:403});
  try{return await net.fetch(pathToFileURL(file).href);}catch{return new Response('Not found',{status:404});}
 });
 const mayWriteClipboard=(contents,permission,origin)=>permission==='clipboard-sanitized-write'&&isAppURL(origin)&&contents&&!contents.isDestroyed()&&isAppURL(contents.getURL());
 session.defaultSession.setPermissionRequestHandler((contents,permission,callback,details)=>callback(!!mayWriteClipboard(contents,permission,details.requestingUrl||contents.getURL())));
 session.defaultSession.setPermissionCheckHandler((contents,permission,origin)=>!!mayWriteClipboard(contents,permission,origin));
 // The renderer calculates offline. External references open only in the user's browser.
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*','ws://*/*','wss://*/*']},(_details,callback)=>callback({cancel:true}));
 function create(){
  const win=new BrowserWindow({width:1280,height:900,minWidth:360,minHeight:600,title:'Eksaar Panchang',backgroundColor:'#f7f6f1',webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  win.webContents.setWindowOpenHandler(({url})=>{if(isExternalURL(url))void shell.openExternal(url).catch(()=>{});return {action:'deny'};});
  win.webContents.on('will-navigate',(event,url)=>{if(!isAppURL(url))event.preventDefault();});
  win.webContents.on('will-frame-navigate',event=>{if(!isAppURL(event.url))event.preventDefault();});
  win.webContents.on('will-redirect',(event,url)=>{if(!isAppURL(url))event.preventDefault();});
  win.webContents.on('will-attach-webview',event=>event.preventDefault());
  win.loadURL('panchang://app/index.html');
 }
 create();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)create();});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});

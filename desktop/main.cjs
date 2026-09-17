const {app,BrowserWindow,protocol,net,session,shell}=require('electron');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
protocol.registerSchemesAsPrivileged([{scheme:'panchang',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
app.enableSandbox();
app.whenReady().then(()=>{
 const root=path.resolve(__dirname,'../dist');
 protocol.handle('panchang',request=>{
  const url=new URL(request.url);
  let pathname;
  try{pathname=decodeURIComponent(url.pathname);}catch{return new Response('Bad path',{status:400});}
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(url.host!=='app'||!file.startsWith(root+path.sep))return new Response('Forbidden',{status:403});
  return net.fetch(pathToFileURL(file).href);
 });
 session.defaultSession.setPermissionRequestHandler((_contents,permission,callback)=>callback(permission==='clipboard-sanitized-write'));
 function create(){
  const win=new BrowserWindow({width:1280,height:900,minWidth:360,minHeight:600,title:'Eksaar Panchang',backgroundColor:'#f7f6f1',webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  win.webContents.setWindowOpenHandler(({url})=>{if(new URL(url).protocol==='https:')shell.openExternal(url);return {action:'deny'};});
  win.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('panchang://app/'))event.preventDefault();});
  win.loadURL('panchang://app/index.html');
 }
 create();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)create();});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});

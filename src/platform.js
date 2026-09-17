import {Capacitor} from '@capacitor/core';
import {Filesystem,Directory} from '@capacitor/filesystem';
import {Share} from '@capacitor/share';
import {LocalNotifications} from '@capacitor/local-notifications';
import {Geolocation} from '@capacitor/geolocation';
export const isNative = Capacitor.isNativePlatform();
export async function download(name,body,type){
  const blob=body instanceof Blob?body:new Blob([body],{type});
  if(isNative){
    const base64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=reject;r.readAsDataURL(blob);});
    await clearNativeExports();
    const file=await Filesystem.writeFile({path:`exports/${name.replace(/[^a-zA-Z0-9._-]/g,'_')}`,data:base64,directory:Directory.Cache,recursive:true});
    await Share.share({title:name,files:[file.uri]});
    return;
  }
  const url=URL.createObjectURL(blob), link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
export async function shareText(text,url){
  if(isNative) return Share.share({title:'Eksaar Panchang',text,url});
  if(navigator.share) return navigator.share({title:'Eksaar Panchang',text,url});
  await navigator.clipboard.writeText(`${text}\n${url}`);
}
export async function locate(){
  if(isNative)return (await Geolocation.getCurrentPosition({enableHighAccuracy:false,timeout:15000})).coords;
  return new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(p=>resolve(p.coords),reject,{enableHighAccuracy:false,timeout:15000}));
}
export async function remind(event){
  const at=new Date(+new Date(event.start)-15*60000);
  if(at<=new Date())throw new Error('Choose a future period more than 15 minutes from now.');
  if(!isNative)throw new Error('Use Add to calendar for a reminder on this device.');
  const permission=await LocalNotifications.requestPermissions();
  if(permission.display!=='granted')throw new Error('Notification permission was not granted.');
  await LocalNotifications.schedule({notifications:[{id:Math.floor((+new Date(event.start)/60000)%2147483647),title:event.name,body:'Begins in 15 minutes. Times follow your selected location.',schedule:{at},isExactNotification:false,extra:{source:'panchang'}}]});
}
export async function clearNativeReminders(){
  if(isNative){const {notifications}=await LocalNotifications.getPending();await LocalNotifications.cancel({notifications});await clearNativeExports();}
}

export async function clearNativeExports(){
  if(!isNative)return;
  try{await Filesystem.rmdir({path:'exports',directory:Directory.Cache,recursive:true});}
  catch(error){if(!/not exist|not found|no such file/i.test(error.message||''))throw error;}
}

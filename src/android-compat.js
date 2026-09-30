// Android 7 can ship with an older System WebView. These two small standard-library
// shims are confined to the private Android calculation runtime, never the web UI.
if (!Object.fromEntries) Object.defineProperty(Object, 'fromEntries', {
  configurable:true,writable:true,value(entries) {
    const result={};
    for(const [key,value] of entries) Object.defineProperty(result,key,{value,writable:true,enumerable:true,configurable:true});
    return result;
  }
});
if (!Array.prototype.at) Object.defineProperty(Array.prototype,'at',{
  configurable:true,writable:true,value(index) {
    const number=Number(index),n=Number.isNaN(number)?0:Math.trunc(number),i=n<0?this.length+n:n;
    return i<0||i>=this.length?undefined:this[i];
  }
});

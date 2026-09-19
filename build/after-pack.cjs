const {execFileSync}=require('node:child_process');
const path=require('node:path');
module.exports=async context=>{
  if(context.electronPlatformName!=='darwin')return;
  const bundle=path.join(context.appOutDir,context.packager.appInfo.productFilename+'.app');
  await require('./mac-icon.cjs')(bundle);
  // Finder/iCloud metadata on newly built bundles invalidates Apple code signing.
  // Remove only disallowed metadata from our generated app, never quarantine or user files.
  for(const attribute of ['com.apple.FinderInfo','com.apple.ResourceFork']){
    try{execFileSync('/usr/bin/xattr',['-r','-d',attribute,bundle],{stdio:['ignore','pipe','pipe']});}
    catch(error){if(!String(error.stderr).includes('No such xattr'))throw error;}
  }
};

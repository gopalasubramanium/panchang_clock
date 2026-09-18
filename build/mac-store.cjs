// Mac App Store requires Electron's MAS runtime and Apple's App Sandbox.
// This is separate from the notarized, direct-download macOS build.
const {build:base}=require('../package.json');
const unsigned=process.env.MAS_UNSIGNED==='1';
module.exports={
 ...base,extends:null,
 extraMetadata:{version:'2.0.0'},buildVersion:'4',
 directories:{output:'store-release/mac-app-store'},
 forceCodeSigning:!unsigned,
 mac:{
  ...base.mac,target:[{target:'mas',arch:['universal']}],
  hardenedRuntime:false,
  extendInfo:{ElectronTeamID:'TF2VBZ3XH7'}
 },
 mas:{
  ...(unsigned?{identity:null}:{}),
  hardenedRuntime:false,
  entitlements:'build/entitlements.mas.plist',
  entitlementsInherit:'build/entitlements.mas.inherit.plist',
  ...(process.env.MAS_PROVISIONING_PROFILE?{provisioningProfile:process.env.MAS_PROVISIONING_PROFILE}:{})
 }
};

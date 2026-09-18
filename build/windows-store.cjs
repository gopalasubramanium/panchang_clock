// Partner Center assigns the identity. Never invent one or silently use a development identity.
const {build:base}=require('../package.json');
function required(name,pattern){
 const value=process.env[name]?.trim();
 if(!value||!pattern.test(value))throw new Error(`Set ${name} to the exact value from Partner Center > Product identity.`);
 return value;
}
module.exports={
 ...base,extends:null,
 directories:{output:'store-release/windows'},
 win:{...base.win,target:[{target:'appx',arch:['x64','arm64']}]},
 appx:{
  identityName:required('WINDOWS_STORE_IDENTITY',/^[A-Za-z0-9][A-Za-z0-9.-]{2,49}$/),
  publisher:required('WINDOWS_STORE_PUBLISHER',/^CN=[A-Za-z0-9 -]+$/),
  publisherDisplayName:required('WINDOWS_STORE_PUBLISHER_NAME',/^[^<>&"'\r\n]{1,100}$/),
  applicationId:'EksaarPanchang',displayName:'Eksaar Panchang',
  backgroundColor:'#183d34',languages:['en-US'],
  capabilities:['runFullTrust'],addAutoLaunchExtension:false,
  minVersion:'10.0.19041.0',maxVersionTested:'10.0.26100.0',setBuildNumber:false,
  artifactName:'Eksaar-Panchang-${version}-Windows-Store-${arch}.appx'
 }
};

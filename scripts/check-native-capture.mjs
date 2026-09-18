// Detect the app's green content cards, excluding status-bar/loading chrome.
// This checks a thumbnail in memory and never changes the captured store image.
import sharp from 'sharp';
const {data,info}=await sharp(process.argv[2]).resize({width:128}).removeAlpha().raw().toBuffer({resolveWithObject:true});
let content=0,total=0;
for(let y=Math.floor(info.height*.1);y<info.height;y++)for(let x=0;x<info.width;x++){
 const offset=(y*info.width+x)*info.channels;
 const [r,g,b]=data.subarray(offset,offset+3);
 if(g>r+10&&g>b+4&&g<180)content++;
 total++;
}
const greenContentFraction=content/total;
console.log(JSON.stringify({hasAppContent:greenContentFraction>.03,greenContentFraction}));

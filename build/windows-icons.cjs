// AppX tiles are separate from the executable icon. Without these resources,
// electron-builder silently includes its SampleAppx artwork.
const {mkdir,readFile}=require('node:fs/promises');
const path=require('node:path');
const sharp=require('sharp');
module.exports=async()=>{
  const output=path.join(__dirname,'appx');
  const svg=await readFile(path.join(__dirname,'../public/icon.svg'));
  await mkdir(output,{recursive:true});
  // SmallTile/LargeTile are electron-builder's filenames for the 71/310 manifest slots.
  const tiles={StoreLogo:[50,50],Square44x44Logo:[44,44],SmallTile:[71,71],Square150x150Logo:[150,150],Wide310x150Logo:[310,150],LargeTile:[310,310]};
  async function render(name,width,height){
    // Centre the established brand mark; never stretch it on the wide tile.
    const image=sharp(svg).resize(width,height,{fit:'contain',background:'#183d35'});
    if(width!==height)image.flatten({background:'#183d35'});
    await image.png().toFile(path.join(output,name+'.png'));
  }
  for(const [name,[width,height]] of Object.entries(tiles)){
    for(const scale of [100,125,150,200,400]){
      await render(name+(scale===100?'':`.scale-${scale}`),Math.round(width*scale/100),Math.round(height*scale/100));
    }
  }
  for(const size of [16,20,24,30,32,36,48,256]){
    await render(`Square44x44Logo.targetsize-${size}`,size,size);
    await render(`Square44x44Logo.targetsize-${size}_altform-unplated`,size,size);
  }
};

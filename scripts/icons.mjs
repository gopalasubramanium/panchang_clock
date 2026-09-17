import {readFile,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const svg=await readFile('public/icon.svg');
for(const size of [192,512])await sharp(svg).resize(size,size).png().toFile(`public/icon-${size}.png`);
await sharp({create:{width:512,height:512,channels:4,background:'#183d35'}}).composite([{input:await sharp(svg).resize(380,380).png().toBuffer(),left:66,top:66}]).png().toFile('public/icon-maskable.png');
// Native launch icons use the same artwork at each platform's required size.
await sharp(svg).resize(1024,1024).flatten({background:'#183d35'}).png().toFile('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
for(const [density,size] of Object.entries({mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192})){
 for(const name of ['ic_launcher','ic_launcher_round'])await sharp(svg).resize(size,size).png().toFile(`android/app/src/main/res/mipmap-${density}/${name}.png`);
 await sharp({create:{width:Math.round(size*2.25),height:Math.round(size*2.25),channels:4,background:'#183d35'}}).composite([{input:await sharp(svg).resize(size,size).png().toBuffer(),gravity:'centre'}]).png().toFile(`android/app/src/main/res/mipmap-${density}/ic_launcher_foreground.png`);
}

const splash=await sharp({create:{width:2732,height:2732,channels:3,background:'#f7f6f1'}}).composite([{input:await sharp(svg).resize(420,420).png().toBuffer(),gravity:'centre'}]).png().toBuffer();
for(const name of ['splash-2732x2732.png','splash-2732x2732-1.png','splash-2732x2732-2.png'])await writeFile('ios/App/App/Assets.xcassets/Splash.imageset/'+name,splash);
const {readdir}=await import('node:fs/promises');
for(const dir of await readdir('android/app/src/main/res'))if(dir.startsWith('drawable')){
 const path='android/app/src/main/res/'+dir+'/splash.png';
 try{const metadata=await sharp(path).metadata();await sharp(splash).resize(metadata.width,metadata.height,{fit:'cover'}).png().toFile(path+'.tmp');const {rename}=await import('node:fs/promises');await rename(path+'.tmp',path);}catch(e){if(!e.message.includes('missing'))throw e;}
}

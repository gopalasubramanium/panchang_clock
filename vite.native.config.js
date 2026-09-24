import {defineConfig} from 'vite';
export default defineConfig({publicDir:false,build:{outDir:'ios/App/App/NativeResources',emptyOutDir:true,
  lib:{entry:'src/native-engine.js',name:'EksaarNative',formats:['iife'],fileName:()=> 'native-engine.js'},
  target:'es2022',minify:true}});

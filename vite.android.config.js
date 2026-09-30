import {defineConfig} from 'vite';
export default defineConfig({publicDir:false,build:{outDir:'android/app/src/main/native-assets',emptyOutDir:true,lib:{entry:'src/android-engine.js',name:'EksaarNative',formats:['iife'],fileName:()=> 'native-engine.js'},target:'es2017',minify:true}});

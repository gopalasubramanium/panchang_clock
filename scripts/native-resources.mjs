import {copyFile} from 'node:fs/promises';
await copyFile('src/cities.json','ios/App/App/NativeResources/cities.json');

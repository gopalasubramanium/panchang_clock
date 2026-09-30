import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

test('Android compatibility helpers retain native semantics without prototype injection',()=>{
 const c=vm.createContext({});
 vm.runInContext('Object.fromEntries=undefined;Array.prototype.at=undefined;',c);
 vm.runInContext(readFileSync('src/android-compat.js','utf8'),c);
 assert.equal(vm.runInContext('JSON.stringify(Object.fromEntries([["hour",0],["year",2026]]))',c),'{"hour":0,"year":2026}');
 assert.equal(vm.runInContext('Object.getPrototypeOf(Object.fromEntries([["__proto__",{bad:true}]]))===Object.prototype',c),true);
 assert.equal(vm.runInContext('[1,2,3].at(-1)',c),3);
 assert.equal(vm.runInContext('[1,2,3].at(-4)',c),undefined);
 assert.equal(vm.runInContext('[1,2,3].at(NaN)',c),1);
 assert.equal(vm.runInContext('[1,2,3].at(Infinity)',c),undefined);
});

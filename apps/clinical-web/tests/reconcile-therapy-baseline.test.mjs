import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const script=fileURLToPath(new URL('../scripts/reconcile-therapy-baseline.mjs',import.meta.url));
const make=(eti='non_responsive',alyftrek='responsive')=>({variantId:'35',functionalClass:'I',classSubtype:'exceptional',entries:[{therapy:'ETI',coverage:'variant-response',response:eti},{therapy:'ALYFTREK',coverage:'variant-response',response:alyftrek}]});
function compare(a,b){
 const dir=mkdtempSync(join(tmpdir(),'nfq-baseline-'));
 try{
 const original=join(dir,'original.json'),migrated=join(dir,'migrated.json'),out=join(dir,'report.json');
 writeFileSync(original,JSON.stringify(a));writeFileSync(migrated,JSON.stringify(b));
 const run=spawnSync(process.execPath,[script,original,migrated,out],{encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
 return JSON.parse(readFileSync(out,'utf8'));
 }finally{rmSync(dir,{recursive:true,force:true});}
}
test('original Class I exception matches without inferring response',()=>{assert.equal(compare([make()],[make()]).matched,true);});
test('therapy mismatch is detected independently for ETI and Alyftrek',()=>{
 const result=compare([make()],[make('responsive','non_responsive')]);
 assert.deepEqual(result.differentFields.map(x=>x.field),['ETI response','ALYFTREK response']);
 assert.equal(result.matched,false);
});
test('missing and unexpected variant identifiers are both reported',()=>{
 const x=make();const y={...make(),variantId:'36'};
 const result=compare([x],[y]);
 assert.deepEqual(result.missingVariantIds,['35']);
 assert.deepEqual(result.unexpectedVariantIds,['36']);
});

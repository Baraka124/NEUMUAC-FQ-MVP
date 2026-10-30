import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const script=fileURLToPath(new URL('../scripts/audit-therapy-snapshot.mjs',import.meta.url));
const therapies=['ETI','ALYFTREK','IVACAFTOR','TEZACAFTOR_IVACAFTOR','LUMACAFTOR_IVACAFTOR'];
function variant(){
 return {variantId:'123',functionalClass:'I',classSubtype:'exceptional',legacyDrugFlags:{eti:true,alyftrek:false},
 entries:therapies.map(t=>({therapy:t,coverage:t==='ETI'||t==='ALYFTREK'?'variant-response':'genotype-rule-only',
 response:t==='ETI'?'non_responsive':t==='ALYFTREK'?'responsive':null}))};
}
function run(rows){
 const dir=mkdtempSync(join(tmpdir(),'nfq-audit-'));
 try{
 const input=join(dir,'input.json'),output=join(dir,'output.json');
 writeFileSync(input,JSON.stringify(rows));
 const result=spawnSync(process.execPath,[script,input,output],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 return JSON.parse(readFileSync(output,'utf8'));
 }finally{rmSync(dir,{recursive:true,force:true});}
}
test('five independent therapies and discrepancies retain original response',()=>{
 const report=run([variant()]);
 assert.equal(report.recordCount,1);
 assert.equal(report.historicalDisagreements.length,2);
 assert.equal(report.recordedClassIExceptions.length,1);
 assert.equal(report.recordedClassIExceptions[0].therapy,'ALYFTREK');
 assert.equal(report.coverage.ETI.nonResponsive,1);
 assert.equal(report.coverage.ALYFTREK.responsive,1);
 assert.equal(report.coverage.IVACAFTOR.notRecorded,1);
});
test('duplicate identifiers and missing therapy detected',()=>{
 const second=variant();second.entries.pop();
 const report=run([variant(),second]);
 assert.deepEqual(report.duplicateIds,['123']);
 assert.deepEqual(report.incompleteProfiles,['123']);
});
test('recorded response cannot silently populate genotype-rule-only therapy',()=>{
 const item=variant();
 item.entries[2].response='responsive';
 item.entries[2].coverage='variant-response';
 const report=run([item]);
 assert.equal(report.invalidResponses.length,1);
 assert.equal(report.invalidCoverage.length,1);
});

test('missing historical boolean is not interpreted as nonresponse',()=>{
 const item=variant();item.legacyDrugFlags={eti:null,alyftrek:null};
 const result=run([item]);
 assert.equal(result.historicalDisagreements.length,0);
});

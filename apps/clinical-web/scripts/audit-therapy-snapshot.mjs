#!/usr/bin/env node
// Offline and read-only scientific coverage inspection. Accepts non-patient JSON profiles.
import {readFileSync,writeFileSync,realpathSync} from 'node:fs';
import {resolve} from 'node:path';
const [source,destination]=process.argv.slice(2);
if(source&&destination&&resolve(source)===resolve(destination))throw Error('Input and output must differ');
if(!source||!destination)throw Error('Usage: node scripts/audit-therapy-snapshot.mjs variants.json audit.json');
if(realpathSync(source)===resolve(destination))throw Error('Input and output must differ');
const rows=JSON.parse(readFileSync(source,'utf8'));
if(!Array.isArray(rows))throw Error('Expected array of variant therapy profiles');
if(rows.length>100000)throw Error('Snapshot exceeds audit record limit');
const ids=['ETI','ALYFTREK','IVACAFTOR','TEZACAFTOR_IVACAFTOR','LUMACAFTOR_IVACAFTOR'];
const count=Object.fromEntries(ids.map(id=>[id,{present:0,responsive:0,nonResponsive:0,unknown:0,notRecorded:0}]));
const report={recordCount:rows.length,coverage:count,duplicateIds:[],incompleteProfiles:[],invalidResponses:[],invalidCoverage:[],historicalDisagreements:[],recordedClassIExceptions:[]};
const seen=new Set();
for(const profile of rows){
 const id=String(profile?.variantId??'');
 if(!/^[1-9]\d{0,17}$/.test(id))throw Error('Invalid variant record ID');
 if(seen.has(id))report.duplicateIds.push(id);
 seen.add(id);
 const entries=Array.isArray(profile.entries)?profile.entries:[];
 if(entries.some(entry=>entry===null||typeof entry!=='object'||Array.isArray(entry)))throw Error('Invalid therapy entry');
 if(entries.length!==5||new Set(entries.map(x=>x.therapy)).size!==5||ids.some(x=>!entries.some(e=>e.therapy===x)))report.incompleteProfiles.push(id);
 for(const therapy of ids){
  const entry=entries.find(e=>e.therapy===therapy);
  if(!entry)continue;
  const group=count[therapy];group.present++;
  const expectedCoverage=(therapy==='ETI'||therapy==='ALYFTREK')?'variant-response':'genotype-rule-only';
  if(entry.coverage!==expectedCoverage)report.invalidCoverage.push({id,therapy,expected:expectedCoverage});
  if(!['responsive','non_responsive','unknown',null].includes(entry.response)){report.invalidResponses.push({id,therapy});continue;}
  if(entry.response==='responsive')group.responsive++;
  else if(entry.response==='non_responsive')group.nonResponsive++;
  else if(entry.response==='unknown')group.unknown++;
  else group.notRecorded++;
  if(therapy==='ETI'||therapy==='ALYFTREK'){
   const flag=profile.legacyDrugFlags?.[therapy==='ETI'?'eti':'alyftrek'];
   if(flag!==undefined&&flag!==null&&typeof flag!=='boolean')report.invalidCoverage.push({id,therapy,reason:'Malformed historical flag'});
   if(typeof flag==='boolean'&&['responsive','non_responsive'].includes(entry.response)&&flag!==(entry.response==='responsive'))report.historicalDisagreements.push({id,therapy});
   if(/^\s*(class\s*)?i\s*$/i.test(profile.functionalClass??'')&&entry.response==='responsive')report.recordedClassIExceptions.push({id,therapy,subtype:profile.classSubtype??null});
  }else if(entry.response!==null)report.invalidResponses.push({id,therapy,reason:'Rule-only therapy must not carry variant response'});
 }
}
report.reviewSummary={
 totalVariants:rows.length,
 uniqueVariantIds:seen.size,
 duplicateIdCount:report.duplicateIds.length,
 incompleteProfileCount:report.incompleteProfiles.length,
 invalidResponseCount:report.invalidResponses.length,
 invalidCoverageCount:report.invalidCoverage.length,
 independentHistoricalFlagDisagreements:report.historicalDisagreements.length,
 recordedClassIResponsiveExceptions:report.recordedClassIExceptions.length
};
report.reviewRequired=rows.length===0||report.duplicateIds.length>0||report.incompleteProfiles.length>0||report.invalidResponses.length>0||report.invalidCoverage.length>0||report.historicalDisagreements.length>0;
writeFileSync(destination,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log('Wrote local audit:',destination,'records:',rows.length,'violations:',report.invalidCoverage.length+report.invalidResponses.length+report.incompleteProfiles.length);

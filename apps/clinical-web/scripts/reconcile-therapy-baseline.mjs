#!/usr/bin/env node
// Offline reconciliation of two explicitly supplied, de-identified source inventories.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const [originalPath,migratedPath,reportPath]=process.argv.slice(2);
if(!originalPath||!migratedPath||!reportPath)throw Error('Usage: node scripts/reconcile-therapy-baseline.mjs ORIGINAL.json MIGRATED.json REPORT.json');
if(new Set([resolve(originalPath),resolve(migratedPath),resolve(reportPath)]).size!==3)throw Error('Input and report paths must differ');
function read(path){
 const rows=JSON.parse(readFileSync(path,'utf8'));
 if(!Array.isArray(rows)||rows.length>100000)throw Error('Expected bounded array');
 const byId=new Map();
 for(const item of rows){
  const id=String(item?.variantId??'');
  if(!/^[1-9]\d{0,17}$/.test(id)||byId.has(id))throw Error('Invalid or repeated source variant ID');
  byId.set(id,item);
 }
 return byId;
}
const original=read(originalPath),migrated=read(migratedPath);
const missing=[],unexpected=[],different=[];
for(const [id,source] of original){
 const target=migrated.get(id);
 if(!target){missing.push(id);continue;}
 for(const field of ['functionalClass','classSubtype']){
  if((source[field]??null)!==(target[field]??null))different.push({variantId:id,field});
 }
 for(const therapy of ['ETI','ALYFTREK']){
  function response(row){
   const entries=Array.isArray(row.entries)?row.entries:[];
   const matches=entries.filter(e=>e?.therapy===therapy);
   if(matches.length!==1||matches[0].coverage!=='variant-response')throw Error('Invalid '+therapy+' source entry for '+id);
   const value=matches[0].response;
   if(!['responsive','non_responsive','unknown',null].includes(value))throw Error('Invalid response for '+id);
   return value;
  }
  if(response(source)!==response(target))different.push({variantId:id,field:therapy+' response'});
 }
}
for(const id of migrated.keys())if(!original.has(id))unexpected.push(id);
const result={originalCount:original.size,migratedCount:migrated.size,missingVariantIds:missing,unexpectedVariantIds:unexpected,differentFields:different,matched:missing.length===0&&unexpected.length===0&&different.length===0};
writeFileSync(reportPath,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log('Reconciliation complete:',result.matched?'MATCH':'REVIEW REQUIRED');

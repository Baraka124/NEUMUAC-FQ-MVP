#!/usr/bin/env node
/**
 * 14H213 · Run non-mutating expert registry authorization assertions on an
 * approved isolated Supabase staging instance. This never applies migrations.
 *
 * Required: NFQ_STAGING_DB_URL, NFQ_STAGING_PROJECT_REF
 * Optional: NFQ_PRODUCTION_PROJECT_REF
 * Prerequisite: psql installed; reviewed proposed migration already deployed
 * by the staging change-control process.
 */
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const stagingRef=process.env.NFQ_STAGING_PROJECT_REF?.trim()??'';
const productionRef=process.env.NFQ_PRODUCTION_PROJECT_REF?.trim()??'oxlkisjwfarseyqgeyuw';
const dbUrl=process.env.NFQ_STAGING_DB_URL??'';
if(!/^[a-z0-9]{15,32}$/.test(stagingRef)||
 stagingRef===productionRef||stagingRef==='oxlkisjwfarseyqgeyuw'){
 console.error('Refusing to run: a distinct, explicit CFTR staging project reference is required.');
 process.exit(2);
}
let parsed;
try{parsed=new URL(dbUrl);}catch{
 console.error('Refusing to run: NFQ_STAGING_DB_URL must be a valid PostgreSQL URI.');
 process.exit(2);
}
const referenceInHost=parsed.hostname===('db.'+stagingRef+'.supabase.co');
const referenceInUser=decodeURIComponent(parsed.username).endsWith('.'+stagingRef);
if(!['postgres:','postgresql:'].includes(parsed.protocol)||
 !referenceInHost&&!referenceInUser||
 parsed.hostname.includes('oxlkisjwfarseyqgeyuw')||
 decodeURIComponent(parsed.username).endsWith('.oxlkisjwfarseyqgeyuw')){
 console.error('Refusing to run: database URI does not identify the approved staging reference.');
 process.exit(2);
}
if(parsed.searchParams.has('application_name')&&
 parsed.searchParams.get('application_name')?.length>100){
 console.error('Invalid database connection parameters.');
 process.exit(2);
}
// Supply the connection URI only via the process environment, never command
// arguments, stdout, debug logging, or a generated repository artifact.
const files=[
 'supabase/tests/14h202_expert_registry_security.sql',
 'supabase/tests/14h208_expert_registry_negative_auth.sql'
];
for(const file of files){
 const result=spawnSync('psql',[
  '--no-psqlrc','--set=ON_ERROR_STOP=1','--quiet',
  '--file',resolve(root,file)
 ],{
  cwd:root,env:{...process.env,PGDATABASE:dbUrl},
  encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:120000
 });
 if(result.error||result.status!==0){
  console.error('STAGING AUTHORIZATION TEST FAILED:',file);
  const message=String(result.stderr??result.error??'SQL assertion failure');
  // Do not echo connection strings if psql emits a transport-level error.
  console.error(message.replaceAll(dbUrl,'[redacted]'));
  process.exit(1);
 }
 console.log('PASS:',file);
}
console.log('Staging-only SQL security assertions passed. This does not certify scientific accuracy or live deployment.');

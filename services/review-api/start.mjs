/**
 * Phase 14G7C: executable isolated-testing startup for future Node hosting.
 *
 * Deliberately NOT deployable as a public Railway endpoint: binds loopback
 * only, rejects Railway environment, and requires explicit test scope.
 * A production release needs a reviewed activation change, real Auth tests,
 * private DB role provisioning, monitored secrets and scientific signoff.
 */
import {pathToFileURL} from 'node:url';
import {readReviewServiceConfig} from './reviewConfig.mjs';
import {createReviewService} from './composition.mjs';

function portFrom(environment){
 const raw=environment.PORT??'0';
 if(!/^(?:0|[1-9]\d{0,4})$/.test(String(raw)))throw new Error('Invalid isolated service port');
 const value=Number(raw);
 if(value>65535)return 0; // Refuse invalid value below in next guard.
 return value;
}
export function createIsolatedReviewRuntime({environment=process.env,postgresFactory,authTransport=fetch}={}){
 const config=readReviewServiceConfig(environment);
 if(!config.active)throw new Error('Review service is disabled by default');
 if(environment.RAILWAY_ENVIRONMENT||environment.RAILWAY_PROJECT_ID||
    environment.NFQ_REVIEW_EXECUTION_SCOPE!=='isolated-testing')
  throw new Error('A hosted review release is not authorized');
 if(typeof postgresFactory!=='function')throw new Error('Postgres adapter must be supplied');
 if(!config.queue&&!config.submissions&&!config.decisions)
  throw new Error('No review operation enabled for this isolated exercise');
 const pool=postgresFactory(config.transportDsn,{
  max:1,prepare:false,connect_timeout:5,idle_timeout:10,ssl:'require'
 });
 if(!pool||typeof pool.begin!=='function'||typeof pool.end!=='function')
  throw new Error('Invalid private database connection');
 const withTransaction=work=>pool.begin(async tx=>{
  if(typeof tx?.unsafe!=='function')throw new Error('Invalid transaction connection');
  return work(async(sql,values)=>Array.from(await tx.unsafe(sql,values)));
 });
 const {server}=createReviewService({
  environment,databaseTransaction:withTransaction,authTransport
 });
 return Object.freeze({
  server,
  /** Always local-only; never read arbitrary HOST headers or env host values. */
  listen:async()=>{
   const port=portFrom(environment);
   if(port>65535)throw new Error('Invalid isolated service port');
   await new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(port,'127.0.0.1',resolve);
   });
   return server.address();
  },
  close:async()=>{
   if(server.listening)
    await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
   await pool.end({timeout:2});
  }
 });
}

async function main(){
 const config=readReviewServiceConfig(process.env);
 if(!config.active)throw new Error('Review service is not activated');
 // The external PostgreSQL module is imported only after configuration
 // checks pass. Production DB access must never happen during CI by default.
 const {default:postgres}=await import('postgres');
 const runtime=createIsolatedReviewRuntime({
  environment:process.env,postgresFactory:postgres
 });
 const address=await runtime.listen();
 process.stdout.write('neumuacFQ isolated review backend listening on loopback port '+address.port+'\n');
 let stopping=false;
 const stop=async()=>{
  if(stopping)return;stopping=true;
  await runtime.close();
 };
 process.once('SIGTERM',()=>{void stop().catch(()=>{process.exitCode=1})});
 process.once('SIGINT',()=>{void stop().catch(()=>{process.exitCode=1})});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 main().catch(error=>{
  // Never print raw connection URLs, secrets or transport error details.
  process.stderr.write('Review backend startup denied or unavailable\n');
  process.exitCode=1;
 });
}

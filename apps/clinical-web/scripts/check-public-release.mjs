import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

export const ORIGIN='https://fq.neumact.org/';
const SHA=/^[a-f0-9]{40}$/i;

/** Parse the public Vite release marker, never an authenticated page or API. */
export function extractPublicCommit(html){
 if(typeof html!=='string'||html.length>2_000_000)return null;
 const markers=[...html.matchAll(/<meta\b[^>]*\bname=["']nfq-release-commit["'][^>]*>/gi)];
 if(markers.length!==1)return null;
 const match=markers[0][0].match(/\bcontent=["']([a-f0-9]{40})["']/i);
 return match?match[1].toLowerCase():null;
}
export function comparePublishedCommit(html,expected){
 if(typeof expected!=='string'||!SHA.test(expected))return {ok:false,code:'INVALID_EXPECTED',detail:'Expected commit is not a full Git SHA.'};
 const actual=extractPublicCommit(html);
 if(!actual)return {ok:false,code:'UNVERIFIED',detail:'Public HTML has no valid unique release marker.'};
 if(actual!==expected.toLowerCase())
  return {ok:false,code:'STALE',detail:`Production is serving commit ${actual}; requested ${expected.toLowerCase()}.`};
 return {ok:true,code:'MATCH',detail:`Production HTML matches ${actual}.`};
}
/** One GET to one fixed public origin, without auth tokens, cookies, or API reads. */
export async function checkPublicRelease(expected,transport=fetch){
 if(typeof expected!=='string'||!SHA.test(expected))
  return {ok:false,code:'INVALID_EXPECTED',detail:'Set NFQ_EXPECTED_COMMIT to a full Git SHA.'};
 let response;
 try{
  response=await transport(ORIGIN,{
   method:'GET',
   redirect:'error',
   headers:{Accept:'text/html','Cache-Control':'no-cache'},
   signal:AbortSignal.timeout(20000)
  });
 }catch{
  return {ok:false,code:'UNREACHABLE',detail:'Could not retrieve the official public origin without redirects.'};
 }
 if(!response.ok)return {ok:false,code:'HTTP_ERROR',detail:`Public origin returned HTTP ${response.status}.`};
 const mime=response.headers.get('content-type')||'';
 if(!mime.toLowerCase().includes('text/html'))
  return {ok:false,code:'NOT_HTML',detail:'The public origin did not return HTML.'};
 const length=Number(response.headers.get('content-length'));
 if(Number.isFinite(length)&&length>2_000_000)
  return {ok:false,code:'TOO_LARGE',detail:'Unexpectedly large HTML response.'};
 let html;
 try{html=await response.text();}catch{
  return {ok:false,code:'UNREADABLE',detail:'Public HTML could not be read.'};
 }
 return comparePublishedCommit(html,expected);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const result=await checkPublicRelease(process.env.NFQ_EXPECTED_COMMIT);
 console.log(`neumuacFQ production release audit: ${result.code} — ${result.detail}`);
 if(!result.ok)process.exitCode=1;
}

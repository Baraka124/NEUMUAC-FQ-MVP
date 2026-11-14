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
/** Hashed Vite JS/CSS entry points are part of the published release identity. */
export function extractPublicAssets(html){
 if(typeof html!=='string'||html.length>2_000_000)return null;
 const scripts=[...html.matchAll(/<script\b[^>]*>/gi)]
  .map(x=>x[0]).filter(tag=>/\btype=["']module["']/i.test(tag));
 const links=[...html.matchAll(/<link\b[^>]*>/gi)]
  .map(x=>x[0]).filter(tag=>/\brel=["']stylesheet["']/i.test(tag));
 if(scripts.length!==1||links.length!==1)return null;
 const js=scripts[0].match(/\bsrc=["'](\.\/assets\/index-[A-Za-z0-9_-]+\.js)["']/i)?.[1];
 const css=links[0].match(/\bhref=["'](\.\/assets\/index-[A-Za-z0-9_-]+\.css)["']/i)?.[1];
 return js&&css?{js,css}:null;
}
export function comparePublishedArtifact(publicHtml,checkedInHtml){
 const source=extractPublicCommit(checkedInHtml);
 const expectedAssets=extractPublicAssets(checkedInHtml);
 if(!source||!expectedAssets)
  return {ok:false,code:'INVALID_CHECKED_IN_ROOT',detail:'Checked-in root lacks a valid source commit and asset manifest.'};
 const marker=comparePublishedCommit(publicHtml,source);
 if(!marker.ok)return marker;
 const actualAssets=extractPublicAssets(publicHtml);
 if(!actualAssets)
  return {ok:false,code:'UNVERIFIED_ASSETS',detail:'Public root lacks a unique Vue JS/CSS entry manifest.'};
 if(actualAssets.js!==expectedAssets.js||actualAssets.css!==expectedAssets.css)
  return {ok:false,code:'ASSET_MISMATCH',detail:'Public Vue JS/CSS entries differ from the checked-in root.'};
 return {ok:true,code:'MATCH',detail:'Production matches source '+source+' and both checked-in asset identifiers.'};
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
async function fetchPublicHtml(transport=fetch){
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
 if(!response.ok)return {ok:false,code:'HTTP_ERROR',detail:'Public origin returned HTTP '+response.status+'.'};
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
 return {ok:true,html};
}
export async function checkPublicRelease(expected,transport=fetch){
 if(typeof expected!=='string'||!SHA.test(expected))
  return {ok:false,code:'INVALID_EXPECTED',detail:'Set NFQ_EXPECTED_COMMIT to a full Git SHA.'};
 const observed=await fetchPublicHtml(transport);
 if(!observed.ok)return observed;
 return comparePublishedCommit(observed.html,expected);
}
/** Compare the public root to the actual compiled artifact checked into main. */
export async function checkPublicArtifact(checkedInHtml,transport=fetch,expectedSource=null){
 const checkedInSource=extractPublicCommit(checkedInHtml);
 if(!checkedInSource||!extractPublicAssets(checkedInHtml))
  return {ok:false,code:'INVALID_CHECKED_IN_ROOT',detail:'Checked-in root lacks a unique release marker or JS/CSS manifest.'};
 if(expectedSource!==null){
  if(typeof expectedSource!=='string'||!SHA.test(expectedSource))
   return {ok:false,code:'INVALID_EXPECTED',detail:'Latest source revision must be a full commit SHA.'};
  if(checkedInSource!==expectedSource.toLowerCase())
   return {ok:false,code:'SOURCE_STALE',detail:'Checked-in Vue build is not from the newest deployment-triggering source revision.'};
 }
 const observed=await fetchPublicHtml(transport);
 if(!observed.ok)return observed;
 return comparePublishedArtifact(observed.html,checkedInHtml);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 let result;
 if(process.env.NFQ_COMPARE_DEPLOYED_ROOT==='1'){
  const {readFile,stat}=await import('node:fs/promises');
  try{
   const root=new URL('../../../',import.meta.url);
   const checkedInHtml=await readFile(new URL('index.html',root),'utf8');
   const assets=extractPublicAssets(checkedInHtml);
   if(!assets)throw Error('Root asset manifest missing.');
   for(const name of Object.values(assets)){
    const file=new URL(name.replace(/^\.\//,''),root);
    if(!(await stat(file)).isFile())throw Error('Compiled asset missing.');
   }
   if(!(await stat(new URL('index.1.html',root))).isFile())
    throw Error('Frozen original HTML missing.');
   result=await checkPublicArtifact(checkedInHtml,fetch,process.env.NFQ_EXPECTED_SOURCE_COMMIT);
  }catch{
   result={ok:false,code:'INVALID_CHECKED_IN_ROOT',detail:'Checked-in root, original or assets are missing or invalid.'};
  }
 }else{
  result=await checkPublicRelease(process.env.NFQ_EXPECTED_COMMIT);
 }
 console.log('neumuacFQ production release audit: '+result.code+' — '+result.detail);
 if(!result.ok)process.exitCode=1;
}

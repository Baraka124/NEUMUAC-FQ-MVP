import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {checkPublicRelease,comparePublishedCommit,extractPublicCommit,extractPublicAssets,comparePublishedArtifact,checkPublicArtifact,ORIGIN} from '../scripts/check-public-release.mjs';
const SHA='c617ce8b8ddd1504b7763b00c6fec3264d7b5c3c';
const html='<html><head><meta name="nfq-release-commit" content="'+SHA+'"/></head></html>';
describe('14H24 read-only public release verification',()=>{
 it('reads a single validated Git marker and rejects mismatches',()=>{
  assert.equal(extractPublicCommit(html),SHA);
  assert.equal(comparePublishedCommit(html,SHA).code,'MATCH');
  assert.equal(comparePublishedCommit(html,'1'.repeat(40)).code,'STALE');
  assert.equal(comparePublishedCommit('<head></head>',SHA).code,'UNVERIFIED');
  assert.equal(comparePublishedCommit(html,'main').code,'INVALID_EXPECTED');
 });
 it('rejects repeated or invalid public markers',()=>{
  assert.equal(extractPublicCommit(html+html),null);
  assert.equal(extractPublicCommit('<meta name="nfq-release-commit" content="main">'),null);
  assert.equal(extractPublicCommit('a'.repeat(2_000_001)),null);
 });
 it('uses one fixed origin, no credentials, no redirects and no write operations',async()=>{
  const calls=[];
  const transport=async(url,init)=>{
   calls.push({url,init});
   return new Response(html,{status:200,headers:{'content-type':'text/html; charset=UTF-8'}});
  };
  const r=await checkPublicRelease(SHA,transport);
  assert.equal(r.code,'MATCH');assert.equal(calls.length,1);
  assert.equal(calls[0].url,ORIGIN);
  assert.equal(calls[0].init.method,'GET');
  assert.equal(calls[0].init.redirect,'error');
  assert.equal(calls[0].init.headers.Authorization,undefined);
  assert.equal(calls[0].init.headers.Cookie,undefined);
 });
 it('fails closed on network errors, authorization errors, wrong mime or missing marker',async()=>{
  assert.equal((await checkPublicRelease(SHA,async()=>{throw Error('offline')})).code,'UNREACHABLE');
  assert.equal((await checkPublicRelease(SHA,async()=>new Response('denied',{status:403}))).code,'HTTP_ERROR');
  assert.equal((await checkPublicRelease(SHA,async()=>new Response('json',{headers:{'content-type':'application/json'}}))).code,'NOT_HTML');
  assert.equal((await checkPublicRelease(SHA,async()=>new Response('<html></html>',{headers:{'content-type':'text/html'}}))).code,'UNVERIFIED');
 });
});

describe('14H144 immutable GitHub Pages root release contract',()=>{
 const built='<html><head><meta name="nfq-release-commit" content="'+SHA+'"/>'+
  '<script type="module" crossorigin src="./assets/index-CGAiwox8.js"></script>'+
  '<link rel="stylesheet" crossorigin href="./assets/index-DmlnG3x0.css"></head><body></body></html>';
 const transport=async()=>new Response(built,{status:200,headers:{'content-type':'text/html'}});
 it('matches the actual source marker and both hashed Vue entry assets',async()=>{
  assert.deepEqual(extractPublicAssets(built),{js:'./assets/index-CGAiwox8.js',css:'./assets/index-DmlnG3x0.css'});
  assert.equal(comparePublishedArtifact(built,built).code,'MATCH');
  assert.equal((await checkPublicArtifact(built,transport)).code,'MATCH');
 });
 it('detects a different source revision without conflating it with the Pages bot commit',()=>{
  const stale=built.replace(SHA,'f'.repeat(40));
  assert.equal(comparePublishedArtifact(stale,built).code,'STALE');
 });
 it('rejects a different JS or CSS artifact even with the same source SHA',()=>{
  assert.equal(comparePublishedArtifact(built.replace('CGAiwox8','stale123'),built).code,'ASSET_MISMATCH');
  assert.equal(comparePublishedArtifact(built.replace('DmlnG3x0','stale123'),built).code,'ASSET_MISMATCH');
 });
 it('fails closed on duplicate, absolute, or absent asset entry points',async()=>{
  assert.equal(extractPublicAssets(built+built),null);
  assert.equal(extractPublicAssets(built.replace('./assets/index-CGAiwox8.js','https://example.org/unsafe.js')),null);
  assert.equal(comparePublishedArtifact(built.replace(/<link\b[^>]*>/,''),built).code,'UNVERIFIED_ASSETS');
  const invalid=built.replace(/<script\b[^>]*>/,'');
  assert.equal((await checkPublicArtifact(invalid,async()=>{throw Error('must not GET');})).code,'INVALID_CHECKED_IN_ROOT');
 });
 it('uses only the original unauthenticated fixed-origin GET',async()=>{
  const calls=[];
  const result=await checkPublicArtifact(built,async(url,init)=>{
   calls.push({url,init});
   return transport();
  });
  assert.equal(result.code,'MATCH');
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,ORIGIN);
  assert.equal(calls[0].init.method,'GET');
  assert.equal(calls[0].init.redirect,'error');
  assert.equal(calls[0].init.headers.Authorization,undefined);
 });
});

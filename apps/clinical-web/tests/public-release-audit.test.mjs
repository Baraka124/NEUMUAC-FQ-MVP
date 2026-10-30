import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {checkPublicRelease,comparePublishedCommit,extractPublicCommit,ORIGIN} from '../scripts/check-public-release.mjs';
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

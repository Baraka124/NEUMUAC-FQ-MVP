import {describe,it,expect} from 'vitest';
import {transitionReview,type ReviewSnapshot,type TrustedReviewContext,type ReviewCommand} from './trustedReviewModel';
const stamp='2026-10-14T12:00:00Z';
const seed=():ReviewSnapshot=>({id:'NFQ-NOM-101',revision:1,kind:'alias-equivalence',proposerId:'author',phase:'draft',version:0,approvals:[],applied:[],history:[]});
const context=(subject:string,roles:TrustedReviewContext['principal']['roles'],overrides:Partial<TrustedReviewContext>={}):TrustedReviewContext=>({principal:{subject,authenticated:true,roles},serverTime:stamp,evidenceVerified:true,releaseAuthorizationVerified:false,...overrides});
const command=(action:'submit'|'release',version:number,key:string):ReviewCommand=>({action,decisionId:'NFQ-NOM-101',revision:1,expectedVersion:version,idempotencyKey:key,rationale:'Synthetic workflow test'});
const vote=(role:'scientific'|'engineering',version:number,key:string,vote:'approve'|'reject'='approve'):ReviewCommand=>({action:'review',role,vote,decisionId:'NFQ-NOM-101',revision:1,expectedVersion:version,idempotencyKey:key,rationale:'Synthetic test decision'});
const next=(result:ReturnType<typeof transitionReview>):ReviewSnapshot=>{if(!result.ok)throw Error(result.error);return result.next;};
describe('Phase 2H offline trusted review workflow model',()=>{
 it('requires proposer and verified evidence to submit',()=>{
  expect(transitionReview(seed(),command('submit',0,'submit-0000001'),context('other',[]))).toMatchObject({ok:false,error:'not-authorized'});
  expect(transitionReview(seed(),command('submit',0,'submit-0000001'),context('author',[],{evidenceVerified:false}))).toMatchObject({ok:false,error:'evidence-not-verified'});
 });
 it('requires independent scientific and engineering approvals before release',()=>{
  const submitted=next(transitionReview(seed(),command('submit',0,'submit-0000001'),context('author',[])));
  expect(transitionReview(submitted,vote('scientific',1,'review-0000001'),context('author',['scientific']))).toMatchObject({ok:false,error:'reviewer-not-independent'});
  const one=next(transitionReview(submitted,vote('scientific',1,'review-0000001'),context('scientist',['scientific'])));
  expect(one.phase).toBe('under-review');
  expect(transitionReview(one,command('release',2,'release-000001'),context('operator',['release-manager'],{releaseAuthorizationVerified:true}))).toMatchObject({ok:false,error:'invalid-transition'});
  const two=next(transitionReview(one,vote('engineering',2,'review-0000002'),context('engineer',['engineering'])));
  expect(two.phase).toBe('ready-for-release');
  expect(transitionReview(two,command('release',3,'release-000001'),context('operator',['release-manager']))).toMatchObject({ok:false,error:'release-not-verified'});
  const released=next(transitionReview(two,command('release',3,'release-000001'),context('operator',['release-manager'],{releaseAuthorizationVerified:true})));
  expect(released.phase).toBe('released');expect(released.version).toBe(4);expect(released.history.map(x=>x.action)).toEqual(['submitted','review-approved','review-approved','released']);
 });
 it('fails closed on unauthenticated and insufficient-role reviewers',()=>{
  const open=next(transitionReview(seed(),command('submit',0,'submit-0000001'),context('author',[])));
  expect(transitionReview(open,vote('scientific',1,'review-0000001'),context('unknown',['scientific'],{principal:{subject:'unknown',authenticated:false,roles:['scientific']}}))).toMatchObject({ok:false,error:'not-authenticated'});
  expect(transitionReview(open,vote('scientific',1,'review-0000001'),context('engineer',['engineering']))).toMatchObject({ok:false,error:'not-authorized'});
  expect(transitionReview(open,vote('scientific',0,'review-0000001'),context('scientist',['scientific']))).toMatchObject({ok:false,error:'stale-version'});
 });
 it('protects reviewer independence and prevents a second approval by same actor',()=>{
  const open=next(transitionReview(seed(),command('submit',0,'submit-0000001'),context('author',[])));
  const one=next(transitionReview(open,vote('scientific',1,'review-0000001'),context('scientist',['scientific'])));
  expect(transitionReview(one,vote('engineering',2,'review-0000002'),context('scientist',['scientific','engineering']))).toMatchObject({ok:false,error:'duplicate-review'});
  expect(transitionReview(one,vote('scientific',2,'review-0000002'),context('other',['scientific']))).toMatchObject({ok:false,error:'duplicate-review'});
 });
 it('idempotent same-actor retry cannot create duplicate event, changed command fails',()=>{
  const command1=command('submit',0,'submit-0000001');
  const submitted=next(transitionReview(seed(),command1,context('author',[])));
  expect(transitionReview(submitted,command1,context('author',[]))).toMatchObject({ok:true,replayed:true});
  expect(submitted.history).toHaveLength(1);
  expect(transitionReview(submitted,{...command1,rationale:'Another action'},context('author',[]))).toMatchObject({ok:false,error:'conflicting-idempotency-key'});
  expect(transitionReview(submitted,command1,context('other',[]))).toMatchObject({ok:false,error:'not-authorized'});
 });
 it('rejects a review and never converts rejection into quiet approval',()=>{
  const open=next(transitionReview(seed(),command('submit',0,'submit-0000001'),context('author',[])));
  const rejected=next(transitionReview(open,vote('scientific',1,'review-0000001','reject'),context('scientist',['scientific'])));
  expect(rejected.phase).toBe('rejected');
  expect(transitionReview(rejected,vote('engineering',2,'review-0000002'),context('engineer',['engineering']))).toMatchObject({ok:false,error:'invalid-transition'});
 });
});

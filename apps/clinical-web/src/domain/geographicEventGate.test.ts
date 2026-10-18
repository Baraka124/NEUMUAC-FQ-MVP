import {describe,it,expect} from 'vitest';
import {considerGeographicRecording,type GeographicRecordingContext} from './geographicEventGate';
const configured:GeographicRecordingContext={
 enabled:true,userAuthenticated:true,emailVerified:true,adminPermissionVerified:true,
 actorId:'researcher-uuid',consentGranted:true,privacyAndRetentionApproved:true,
 session:{id:'trial-session-uuid',actorId:'researcher-uuid',active:true,serverAuthorized:true,mode:'trial',productionApproved:false,allowedRegionCodes:['GA','MD']},
 region:{code:'GA',source:'authorized-session-region'}
};
describe('geographic activity preflight stays deny-by-default and side-effect free',()=>{
 it('always excludes unverified typing/suggestion/failed search outcomes',()=>{
  expect(considerGeographicRecording('excluded',configured)).toMatchObject({eligible:false});
 });
 it('denies even a verified candidate while the feature is disabled',()=>{
  expect(considerGeographicRecording('hit-candidate',{...configured,enabled:false})).toEqual({eligible:false,reason:'collection-disabled'});
  expect(considerGeographicRecording('miss-review-candidate',{...configured,enabled:false})).toEqual({eligible:false,reason:'collection-disabled'});
 });
 it('requires separately reviewed actor permission, consent and retention',()=>{
  for(const missing of [
   {userAuthenticated:false},{emailVerified:false},{adminPermissionVerified:false},
   {actorId:null},{consentGranted:false},{privacyAndRetentionApproved:false}
  ])expect(considerGeographicRecording('hit-candidate',{...configured,...missing}).eligible).toBe(false);
 });
 it('requires an active, server-authorized session owned by the same user',()=>{
  for(const session of [
   null,{...configured.session!,serverAuthorized:false},
   {...configured.session!,actorId:'another-user'},
   {...configured.session!,active:false},
   {...configured.session!,id:''}
  ])expect(considerGeographicRecording('hit-candidate',{...configured,session}).eligible).toBe(false);
 });
 it('rejects inferred and patient geography, foreign regions and unapproved production mode',()=>{
  for(const region of [
    null,{code:'GA',source:'ip' as const},{code:'GA',source:'device' as const},
    {code:'GA',source:'patient' as const},{code:'ZZ',source:'authorized-session-region' as const},
    {code:'GA;DELETE',source:'authorized-session-region' as const}
  ])expect(considerGeographicRecording('hit-candidate',{...configured,region}).eligible).toBe(false);
  expect(considerGeographicRecording('hit-candidate',{...configured,session:{...configured.session!,mode:'production'}}).eligible).toBe(false);
 });
 it('only returns an eligible CANDIDATE for later server review, never stores an event',()=>{
  expect(considerGeographicRecording('hit-candidate',configured)).toEqual({eligible:true,mode:'trial',kind:'hit',regionCode:'GA'});
  expect(considerGeographicRecording('miss-review-candidate',configured)).toEqual({eligible:true,mode:'trial',kind:'miss',regionCode:'GA'});
 });
});

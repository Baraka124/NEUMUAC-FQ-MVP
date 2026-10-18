import type {ResearchEventDecision} from './variantQueryIntent';

/**
 * Defensive, UI-independent preflight for a FUTURE authorized regional event.
 * This code has NO persistence, location lookup, timer, HTTP client or analytics
 * call. A positive result is not authorization; a trusted server must repeat
 * every check before accepting an event.
 */
export interface GeographicRecordingContext {
 readonly enabled:boolean;
 readonly userAuthenticated:boolean;
 readonly emailVerified:boolean;
 readonly adminPermissionVerified:boolean;
 readonly actorId:string|null;
 readonly consentGranted:boolean;
 readonly privacyAndRetentionApproved:boolean;
 readonly session:{
  readonly id:string;
  readonly actorId:string;
  readonly active:boolean;
  readonly serverAuthorized:boolean;
  readonly mode:'trial'|'production';
  readonly productionApproved:boolean;
  readonly allowedRegionCodes:readonly string[];
 }|null;
 /** Only a preselected session region; never inferred from device, IP or patients. */
 readonly region:{readonly code:string;readonly source:'authorized-session-region'|'device'|'ip'|'patient'}|null;
}
export type GeographicRecordingDecision=
 | {readonly eligible:false;readonly reason:string}
 | {readonly eligible:true;readonly mode:'trial'|'production';readonly kind:'hit'|'miss';readonly regionCode:string};
/** Candidate inputs must already pass verified-search-event checks; never use raw keystrokes. */
export function considerGeographicRecording(candidate:ResearchEventDecision,context:GeographicRecordingContext):GeographicRecordingDecision {
 const refuse=(reason:string):GeographicRecordingDecision=>({eligible:false,reason});
 if(candidate==='excluded')return refuse('not-a-verified-search-candidate');
 if(!context.enabled)return refuse('collection-disabled');
 if(!context.userAuthenticated||!context.emailVerified||!context.adminPermissionVerified||
    !context.actorId||!context.consentGranted||!context.privacyAndRetentionApproved)
    return refuse('actor-or-purpose-not-authorized');
 const session=context.session;
 if(!session||!session.id||!session.active||!session.serverAuthorized||
    session.actorId!==context.actorId)return refuse('session-not-authorized');
 if(session.mode==='production'&&!session.productionApproved)return refuse('production-not-approved');
 const region=context.region;
 if(!region||region.source!=='authorized-session-region'||
    !/^[A-Z]{2,3}$/.test(region.code)||
    !session.allowedRegionCodes.includes(region.code))
    return refuse('unapproved-region-source');
 return {eligible:true,mode:session.mode,kind:candidate==='hit-candidate'?'hit':'miss',regionCode:region.code};
}

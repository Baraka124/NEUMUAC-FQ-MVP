import {resolveStudyIdentityLinks} from './reportedStudyIdentity';
import type {ApprovedDatasetSnapshot} from '../services/approvedResearchDataset';

export const ADJUDICATION_SOURCE='nfq-study-adjudication-v1' as const;
export type AdjudicationDisposition='same-study'|'distinct-studies'|'insufficient-evidence';
export type AdjudicationStatus='pending'|'approved'|'rejected'|'superseded';
export interface StudyAdjudication {
 readonly id:string;
 readonly claimA:string;
 readonly claimB:string;
 readonly revision:number;
 readonly disposition:AdjudicationDisposition;
 readonly rationale:string;
 readonly evidenceLocator:string;
 readonly status:AdjudicationStatus;
 readonly submittedAt:string;
 readonly decidedAt:string|null;
 readonly reviewCount:number;
 readonly submittedByMe:boolean;
 readonly canReview:boolean;
}
export interface PairAdjudicationCandidate {
 readonly claimA:string;
 readonly claimB:string;
 readonly studyGroupKey:string;
 readonly claimAReference:number;
 readonly claimBReference:number;
 readonly claimAStudyFamily:string;
 readonly claimBStudyFamily:string;
 readonly registeredConflict:boolean;
 readonly approvedDisposition:AdjudicationDisposition|null;
 readonly revision:number;
 readonly status:'not-proposed'|AdjudicationStatus;
 readonly needsFurtherReview:boolean;
 readonly pendingReviews:number;
}
export interface AdjudicationReadiness {
 readonly candidateCount:number;
 readonly approvedSameStudy:number;
 readonly unresolvedCount:number;
 readonly pendingCount:number;
 readonly distinctNeedsReconciliation:number;
 readonly rejectedCount:number;
 readonly sourceRegistrationConflicts:number;
 readonly truncated:boolean;
 readonly candidates:readonly PairAdjudicationCandidate[];
 readonly unresolvedStudyGroupKeys:ReadonlySet<string>;
}
export const pairKey=(a:string,b:string):string=>
 a<b?a+'|'+b:b+'|'+a;

export function evaluateStudyAdjudications(
 snapshot:ApprovedDatasetSnapshot,
 reviewed:readonly StudyAdjudication[]
):AdjudicationReadiness{
 const groups=resolveStudyIdentityLinks(snapshot.records);
 const byGroup=new Map<string,typeof snapshot.records[number][]>();
 for(const record of snapshot.records){
  const key=groups.get(record.claimId)?.key;
  if(!key)throw new Error('Incomplete study identity graph');
  const list=byGroup.get(key)??[];list.push(record);byGroup.set(key,list);
 }
 const accepted=new Map<string,StudyAdjudication>();
 for(const record of reviewed){
  const key=pairKey(record.claimA,record.claimB);
  if(accepted.has(key))throw new Error('Repeated latest adjudication of one claim pair');
  accepted.set(key,record);
 }
 const candidates:PairAdjudicationCandidate[]=[];
 const unresolved=new Set<string>();
 let conflicts=0;
 const maxCandidates=250;
 let truncated=false;
 for(const [groupKey,records] of [...byGroup].sort(([a],[b])=>a.localeCompare(b))){
  const sorted=[...records].sort((a,b)=>a.claimId.localeCompare(b.claimId));
  const issue=groups.get(sorted[0].claimId);
  if(issue?.identityConflict){conflicts++;unresolved.add(groupKey);}
  if(sorted.length<=1)continue;
  const pivot=sorted[0];
  for(const counterpart of sorted.slice(1)){
   if(candidates.length>=maxCandidates){
    truncated=true;unresolved.add(groupKey);continue;
   }
   const id=pairKey(pivot.claimId,counterpart.claimId);
   const current=accepted.get(id);
   const resolved=current?.status==='approved'&&current.disposition==='same-study'&&
    !issue?.identityConflict;
   if(!resolved)unresolved.add(groupKey);
   candidates.push(Object.freeze({
    claimA:pivot.claimId,claimB:counterpart.claimId,studyGroupKey:groupKey,
    claimAReference:pivot.referenceId,claimBReference:counterpart.referenceId,
    claimAStudyFamily:pivot.studyFamilyId,claimBStudyFamily:counterpart.studyFamilyId,
    registeredConflict:issue?.identityConflict??false,
    approvedDisposition:current?.status==='approved'?current.disposition:null,
    revision:current?.revision??0,
    status:current?.status??'not-proposed',
    needsFurtherReview:!resolved,pendingReviews:current?.status==='pending'?current.reviewCount:0
   }));
  }
 }
 return Object.freeze({
  candidateCount:candidates.length,
  approvedSameStudy:candidates.filter(c=>!c.needsFurtherReview).length,
  unresolvedCount:candidates.filter(c=>c.needsFurtherReview).length+(truncated?1:0),
  pendingCount:candidates.filter(c=>c.status==='pending').length,
  distinctNeedsReconciliation:candidates.filter(c=>
   c.approvedDisposition==='distinct-studies').length,
  rejectedCount:candidates.filter(c=>c.status==='rejected').length,
  sourceRegistrationConflicts:conflicts,truncated,
  candidates:Object.freeze(candidates),
  unresolvedStudyGroupKeys:unresolved
 });
}

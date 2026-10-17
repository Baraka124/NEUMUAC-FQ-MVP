/**
 * Proposed, source-attributed alias relationships. Research review metadata only.
 * No database persistence or search-equivalence promotion is implemented here.
 */
export type AliasReviewState='proposed'|'under-review'|'approved'|'rejected';
export interface AliasReviewRecord{
 readonly variantId:string;
 readonly alias:string;
 readonly sourceUri:string;
 readonly sourceLabel:string;
 readonly submittedBy:string;
 readonly submittedAt:string;
 readonly state:AliasReviewState;
 readonly reviewedBy?:string;
 readonly reviewedAt?:string;
 readonly reviewRationale?:string;
}
/** Reject incomplete scientific provenance and unsupported lifecycle states. */
export function validateAliasReview(input:AliasReviewRecord):readonly string[]{
 const issues:string[]=[];
 if(!/^[1-9]\d{0,17}$/.test(input.variantId))issues.push('A canonical recorded variant ID is required.');
 if(!input.alias.trim()||input.alias.length>100)issues.push('An explicit concise recorded alias is required.');
 if(!input.sourceLabel.trim()||input.sourceLabel.length>180)issues.push('Name the source supporting the proposed relationship.');
 let validSource=false;
 try{const url=new URL(input.sourceUri);validSource=url.protocol==='https:'&&!!url.hostname&&!url.username&&!url.password;}catch{}
 if(!validSource)issues.push('A valid HTTPS source reference is required.');
 if(!input.submittedBy.trim()||!Number.isFinite(Date.parse(input.submittedAt)))issues.push('Submission attribution and timestamp are required.');
 if(!['proposed','under-review','approved','rejected'].includes(input.state))issues.push('Review state is not recognized.');
 if(input.state==='approved'||input.state==='rejected'){
  if(!input.reviewedBy?.trim()||!input.reviewRationale?.trim()||!input.reviewedAt||!Number.isFinite(Date.parse(input.reviewedAt)))
   issues.push('A review decision requires reviewer, date and rationale.');
 }
 return issues;
}
export function isScientificallyReviewedAlias(input:AliasReviewRecord):boolean{
 return input.state==='approved'&&validateAliasReview(input).length===0;
}

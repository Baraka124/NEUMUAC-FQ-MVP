/** Professional affiliation is separate from FQ scientific authorization.
 * Never infer affiliation or independent-review eligibility from email,
 * a displayed name, a researcher role, or user-editable metadata.
 */
export type AffiliationState='member'|'guest'|'unverified';
export type CredentialAction='invite'|'resend-invite'|'reset-password'|'revoke-sessions'|'suspend'|'reactivate';

export interface VerifiedProfessionalLink{
 fqAuthUserId:string;
 deskStaffId:string;
 status:'verified'|'revoked';
 source:'neumdesk';
 verifiedAt:string;
}
export interface IdentityProfile{
 affiliation:AffiliationState;
 deskStaffId:string|null;
 displayName:string|null;
 researchGroup:'neumACt'|null;
}

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** Only accepts a fully server-verified linkage; no guessing from emails. */
export function resolveProfessionalProfile(subject:string,link:VerifiedProfessionalLink|null,verifiedDisplayName:string|null):IdentityProfile{
 const valid=uuid.test(subject)&&link?.source==='neumdesk'&&link.status==='verified'&&
  link.fqAuthUserId.toLowerCase()===subject.toLowerCase()&&uuid.test(link.deskStaffId)&&
  Number.isFinite(Date.parse(link.verifiedAt))&&link.verifiedAt.length>=20;
 if(!valid)return {affiliation:'unverified',deskStaffId:null,displayName:null,researchGroup:null};
 const name=verifiedDisplayName?.trim();
 return {affiliation:'member',deskStaffId:link.deskStaffId,displayName:name&&name.length<=160?name:null,researchGroup:'neumACt'};
}
/** Guest is assigned by the invitation/link registry, not inferred from a missing or failed fetch. */
export function classifyGuest(verifiedGuestDesignation:boolean,hasVerifiedProfessionalLink:boolean):AffiliationState{
 if(hasVerifiedProfessionalLink)return 'member';
 return verifiedGuestDesignation?'guest':'unverified';
}
/** Independent human verification, not merely a distinct login, is required. */
export function canIndependentlyReview(
 proposerAccount:string,reviewerAccount:string,
 proposerPersonId:string|null,reviewerPersonId:string|null
):boolean{
 return uuid.test(proposerAccount)&&uuid.test(reviewerAccount)&&
  proposerAccount.toLowerCase()!==reviewerAccount.toLowerCase()&&
  Boolean(proposerPersonId&&reviewerPersonId&&uuid.test(proposerPersonId)&&uuid.test(reviewerPersonId))&&
  proposerPersonId!.toLowerCase()!==reviewerPersonId!.toLowerCase();
}
/** This is a UI request classification only; server authorization is mandatory. */
export function requiresPrivilegedAccountOperation(action:CredentialAction):boolean{
 return action!=='reset-password';
}

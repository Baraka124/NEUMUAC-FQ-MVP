import type {ResearchRoleState} from '../services/researchRole';
import {canManageResearchRoles} from '../services/roleAdministration';
import {canReadSourceReviewQueue} from '../services/sourceCorrectionReviewQueue';
import {canDecideSourceCorrection} from '../services/sourceCorrectionDecision';

export type GovernanceCapability='membership'|'source-review'|'research-contribution';
export interface GovernanceReadiness{
 readonly membership:'eligible'|'not-verified';
 readonly sourceReview:'eligible'|'not-verified';
 readonly researchContribution:'eligible'|'not-verified';
 readonly verifiedRole:string;
 readonly verified:boolean;
}
/** UI eligibility is derived from existing verified membership only.
 * An enabled client is never proof of a successful server-side authorization. */
export function deriveGovernanceReadiness(
 signedIn:boolean,
 role:Pick<ResearchRoleState,'phase'|'role'>,
 configured:boolean
):GovernanceReadiness{
 const phase=signedIn?'signed-in':'signed-out';
 const verified=signedIn&&role.phase==='verified'&&
  (role.role==='contributor'||role.role==='reviewer'||role.role==='administrator');
 const membership=configured&&canManageResearchRoles(phase,role);
 const sources=configured&&canReadSourceReviewQueue(true,phase,role)&&
  canDecideSourceCorrection(true,phase,role);
 return Object.freeze({
  membership:membership?'eligible':'not-verified',
  sourceReview:sources?'eligible':'not-verified',
  researchContribution:configured&&verified?'eligible':'not-verified',
  verifiedRole:verified?role.role!:'Not verified',
  verified
 });
}

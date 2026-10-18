/**
 * 14D: defensive acceptance model for a FUTURE independently audited backend.
 * Never use this client-side helper as authorization. A caller may forge all
 * arguments; only trusted server transactions/RLS can enforce permissions.
 * This module invokes no API and cannot enable legacy Helios writes.
 */
export interface ReviewBackendEvidence {
 readonly anonymousMutationDenied:boolean;
 readonly anonymousSensitiveReadsDenied:boolean;
 readonly trustedIdentityDerivedOnServer:boolean;
 readonly reviewerRolesServerVerified:boolean;
 readonly sameActorReviewDenied:boolean;
 readonly atomicDecisionAndAudit:boolean;
 readonly auditAppendOnlyEnforced:boolean;
 readonly revisionLockAndIdempotencyVerified:boolean;
 readonly evidenceSnapshotBoundToDecision:boolean;
 readonly independentReleaseAuthorization:boolean;
 readonly legacyPinFunctionsRestricted:boolean;
 readonly stagingAdversarialTestsPassed:boolean;
 readonly productionApprovalRecorded:boolean;
}
export type ReviewSecurityCheck=keyof ReviewBackendEvidence;
export const REVIEW_SECURITY_REQUIREMENTS:readonly ReviewSecurityCheck[]=[
 'anonymousMutationDenied',
 'anonymousSensitiveReadsDenied',
 'trustedIdentityDerivedOnServer',
 'reviewerRolesServerVerified',
 'sameActorReviewDenied',
 'atomicDecisionAndAudit',
 'auditAppendOnlyEnforced',
 'revisionLockAndIdempotencyVerified',
 'evidenceSnapshotBoundToDecision',
 'independentReleaseAuthorization',
 'legacyPinFunctionsRestricted',
 'stagingAdversarialTestsPassed',
 'productionApprovalRecorded'
] as const;
export type ReviewBackendAssessment=
 | {readonly ready:false;readonly missing:readonly ReviewSecurityCheck[]}
 | {readonly ready:true;readonly missing:readonly []};
/** Admission checklist only. No browser feature switch may override server checks. */
export function assessReviewBackendReadiness(
 evidence:Partial<ReviewBackendEvidence>|null|undefined
):ReviewBackendAssessment{
 const missing=REVIEW_SECURITY_REQUIREMENTS.filter(key=>evidence?.[key]!==true);
 return missing.length
  ?{ready:false,missing}
  :{ready:true,missing:[]};
}
/** Unconnected production writes stay unavailable regardless of browser login. */
export const TRUSTED_REVIEW_WRITE_CONNECTION:'not-connected'='not-connected';

import type {ScientificDossier} from '../services/scientificDossier';
import type {ClinVarAuthoritySummary} from '../services/liveClinVar';
import type {LiveEvidenceReference} from '../services/liveEvidence';

/**
 * Source-attributed research comparison only. Different classification labels
 * cannot safely be compared without disease, assertion type and review scope.
 */
export interface EvidenceComparison {
 readonly localClaim:string|null;
 readonly localSource:string|null;
 readonly externalClaim:string|null;
 readonly externalReview:string|null;
 readonly externalEvaluation:string|null;
 readonly externalRetrieved:string;
 readonly referencesCount:number;
 readonly sourceNames:readonly string[];
 readonly status:'both-sources'|'no-local-determination'|'no-external-classification';
 readonly interpretation:string;
}

export function compareRecordedEvidence(
 dossier:ScientificDossier,summary:ClinVarAuthoritySummary,references:readonly LiveEvidenceReference[]
):EvidenceComparison {
 if(dossier.clinvarId===null)throw new Error('No recorded ClinVar link');
 if(!Number.isInteger(references.length))throw new Error('Invalid evidence collection');
 if(references.some(ref=>ref.variantId!==dossier.id))
   throw new Error('Variant evidence scope mismatch');
 const externalClaim=summary.germlineDescription||null;
 const localClaim=dossier.recordedDetermination||null;
 return Object.freeze({
  localClaim,localSource:dossier.sourceSummary,
  externalClaim,externalReview:summary.reviewStatus,
  externalEvaluation:summary.lastEvaluated,externalRetrieved:summary.retrievedAt,
  referencesCount:references.length,
  sourceNames:Object.freeze([...new Set(references.map(ref=>ref.source))].sort()),
  status:!localClaim?'no-local-determination':!externalClaim?'no-external-classification':'both-sources',
  interpretation:'Side-by-side source descriptions only. A mismatch or apparent agreement is not an adjudicated conflict, clinical agreement, or evidence of treatment eligibility. ClinVar is a condition-dependent aggregate and source definitions may differ.'
 });
}

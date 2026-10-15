import {decideSearchInteraction} from './searchGovernance';
/**
 * Conservative variant-intent triage, not HGVS validation. A query alone
 * NEVER authorizes telemetry, establishes variant existence or classifies a miss.
 */
export type CandidateDisposition='ignore'|'needs-review'|'well-formed-candidate';
export function assessVariantQueryIntent(raw:string):CandidateDisposition {
 const query=raw.trim();
 if(decideSearchInteraction(query).disposition!=='search')return 'ignore';
 if(/[,;]/.test(query))return 'ignore'; // compound searches are not single scientific misses
 if(/\s/.test(query))return 'ignore'; // prevent annotations and sensitive narrative
 // Keep only recognizably CFTR/variant-like notation for further server validation.
 // Letter-only aliases can be searched but are NOT automatically analytics candidates.
 if(/^[cgnrmp]\.[0-9]+(?:_[0-9]+)?(?:[ACGT]+>[ACGT]+|del(?:[ACGT0-9]*)?|dup(?:[ACGT0-9]*)?|ins[ACGT]+|[+-][0-9]+[ACGT]*>[ACGT]+)$/i.test(query))
  return 'well-formed-candidate';
 if(/^[A-Z][0-9]{2,5}[A-Z*]$/i.test(query)||/^\u0394F508$/i.test(query))return 'well-formed-candidate';
 if(/[0-9]/.test(query)&&/^[a-zA-Z0-9.+_>\-*]{3,55}$/.test(query))return 'needs-review';
 return 'ignore';
}
export type SearchOutcome='matched'|'unmatched'|'ambiguous'|'not-searched'|'service-error';
export type ResearchEventDecision='hit-candidate'|'miss-review-candidate'|'excluded';
export function classifyResearchEvent(raw:string,outcome:SearchOutcome):ResearchEventDecision {
 const syntax=assessVariantQueryIntent(raw);
 if(syntax==='ignore'||outcome==='not-searched'||outcome==='service-error'||outcome==='ambiguous')return 'excluded';
 if(outcome==='matched')return 'hit-candidate';
 if(outcome==='unmatched'&&syntax==='well-formed-candidate')return 'miss-review-candidate';
 return 'excluded';
}
/** A candidate classification has NO logging side effect or access to patient locations. */

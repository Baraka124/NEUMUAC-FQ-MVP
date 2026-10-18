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
 if(/^[A-Z][0-9]{2,5}(?:[A-Z*]|del|dup|ins[ACGT]{1,6})$/i.test(query)||/^\u0394F508$/i.test(query))return 'well-formed-candidate';
 if(/^\d{2,5}(?:[+-]\d{1,5})?[ACGT]\/[ACGT]$/i.test(query))return 'well-formed-candidate';
 if(/[0-9]/.test(query)&&/^[a-zA-Z0-9.+_>\-*]{3,55}$/.test(query))return 'needs-review';
 return 'ignore';
}
export type SearchOutcome='matched'|'unmatched'|'ambiguous'|'not-searched'|'service-error';
export type ResearchEventDecision='hit-candidate'|'miss-review-candidate'|'excluded';
/**
 * A search list, suggestion, query keystroke and UI selection are not proof
 * of a HIT. A confirmed dossier must exist, be visible and contain the
 * recorded identity literally searched (not an inferred fuzzy synonym).
 * A MISS requires a deliberate submission and a successful exhaustive,
 * unfiltered zero-result search of the accessible catalogue.
 *
 * This is a defensive, pure candidate contract, NOT an event writer and
 * NOT evidence of live authorization or of worldwide variant absence.
 */
export type SearchEventProof=
 | {readonly kind:'confirmed-record';readonly queryAtRead:string;
    readonly recordId:string;readonly recordedIdentities:readonly string[];
    readonly fullRecordRead:boolean;readonly dossierVisible:boolean}
 | {readonly kind:'completed-empty';readonly queryAtRead:string;
    readonly manuallyCommitted:boolean;readonly readSucceeded:boolean;
    readonly unfiltered:boolean;readonly firstPage:boolean;
    readonly hasMore:boolean;readonly resultCount:number};

function sameQuery(a:string,b:string):boolean{
 return a.trim().normalize('NFKC').toLocaleLowerCase('en')===
        b.trim().normalize('NFKC').toLocaleLowerCase('en');
}
export function classifyResearchEvent(raw:string,outcome:SearchOutcome,proof?:SearchEventProof):ResearchEventDecision{
 const syntax=assessVariantQueryIntent(raw);
 if(syntax==='ignore'||!proof||outcome==='ambiguous'||outcome==='not-searched'||outcome==='service-error')return 'excluded';
 if(!sameQuery(raw,proof.queryAtRead))return 'excluded'; // stale response
 if(outcome==='matched'&&proof.kind==='confirmed-record'&&
    proof.fullRecordRead&&proof.dossierVisible&&/^[1-9]\d{0,17}$/.test(proof.recordId)&&
    proof.recordedIdentities.some(name=>sameQuery(raw,name)))return 'hit-candidate';
 if(outcome==='unmatched'&&proof.kind==='completed-empty'&&
    syntax==='well-formed-candidate'&&proof.manuallyCommitted&&proof.readSucceeded&&
    proof.unfiltered&&proof.firstPage&&!proof.hasMore&&proof.resultCount===0)
    return 'miss-review-candidate';
 return 'excluded';
}
/** No geographic or search event is persisted by this classifier. */

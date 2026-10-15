import {it,expect} from 'vitest';
import {compareRecordedEvidence} from './evidenceComparison';
import type {ScientificDossier} from '../services/scientificDossier';
import type {ClinVarAuthoritySummary} from '../services/liveClinVar';
import type {LiveEvidenceReference} from '../services/liveEvidence';
const dossier:ScientificDossier={id:'18',functionalClass:'II',subtype:null,confidence:null,
 recordedDetermination:'Recorded local label',sourceSummary:'Recorded source',dataStatus:null,
 validationCount:2,lastValidatedAt:null,lastEvidenceUpdate:null,clinvarId:'7105'};
const external:ClinVarAuthoritySummary={variationId:'7105',accession:'VCV000007105',
 title:'External record',germlineDescription:'ClinVar external label',reviewStatus:'External status',
 lastEvaluated:null,retrievedAt:'2026-10-15T10:00:00Z',
 sourceUrl:'https://www.ncbi.nlm.nih.gov/clinvar/variation/7105/'};
const ref={id:1,variantId:'18',title:'Recorded citation',url:'https://doi.org/10.1234/example',
 source:'DOI',type:null,category:null,journal:null,year:null,pmid:null,doi:null,
 recordedQualityScore:null,recordedSourceWeight:null,recordedCitationCount:null} satisfies LiveEvidenceReference;
it('preserves local and ClinVar attribution without clinical agreement inference',()=>{
 const value=compareRecordedEvidence(dossier,external,[ref]);
 expect(value.localClaim).toBe('Recorded local label');
 expect(value.externalClaim).toBe('ClinVar external label');
 expect(value.status).toBe('both-sources');
 expect(value.interpretation).toContain('not an adjudicated conflict');
 expect(value.sourceNames).toEqual(['DOI']);
});
it('does not invent missing claims or references',()=>{
 const value=compareRecordedEvidence({...dossier,recordedDetermination:null},
 {...external,germlineDescription:null},[]);
 expect(value.status).toBe('no-local-determination');
 expect(value.externalClaim).toBeNull();
 expect(value.referencesCount).toBe(0);
});
it('rejects cross-variant local evidence',()=>{
 expect(()=>compareRecordedEvidence(dossier,external,[{...ref,variantId:'77'}])).toThrow('scope mismatch');
});

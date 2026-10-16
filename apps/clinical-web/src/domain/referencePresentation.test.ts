import {it,expect} from 'vitest';
import {referenceMetadata} from './referencePresentation';
import type {LiveEvidenceReference} from '../services/liveEvidence';
const base:LiveEvidenceReference={id:4,variantId:'12',title:'Recorded reference',url:'https://doi.org/10.1/test',source:'PubMed',type:null,category:null,journal:'Journal',year:2024,pmid:'12345',doi:'10.1/test',recordedQualityScore:null,recordedSourceWeight:null,recordedCitationCount:null};
it('preserves recorded source fields without suggesting external verification',()=>{
 expect(referenceMetadata(base)).toEqual(['PubMed','2024 (recorded)','Journal','PMID 12345','DOI 10.1/test']);
 expect(referenceMetadata({...base,year:null,journal:null,pmid:null,doi:null})).toEqual(['PubMed']);
});

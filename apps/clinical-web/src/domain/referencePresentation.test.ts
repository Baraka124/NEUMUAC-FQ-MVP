import {it,expect} from 'vitest';
import {referenceMetadata,referenceLinkConsistency,dossierReferencePreview,DOSSIER_REFERENCE_PREVIEW_LIMIT} from './referencePresentation';
import type {LiveEvidenceReference} from '../services/liveEvidence';
const base:LiveEvidenceReference={id:4,variantId:'12',title:'Recorded reference',url:'https://doi.org/10.1/test',source:'PubMed',type:null,category:null,journal:'Journal',year:2024,pmid:'12345',doi:'10.1/test',recordedQualityScore:null,recordedSourceWeight:null,recordedCitationCount:null};
it('preserves recorded source fields without suggesting external verification',()=>{
 expect(referenceMetadata(base)).toEqual(['PubMed','2024 (recorded)','Journal','PMID 12345','DOI 10.1/test']);
 expect(referenceMetadata({...base,year:null,journal:null,pmid:null,doi:null})).toEqual(['PubMed']);
});

it('limits the dossier preview to ten recorded references without mutating the source collection',()=>{
 const source=Array.from({length:15},(_,i):LiveEvidenceReference=>({...base,id:i+1,year:i<3?null:2020+i%4}));
 const original=source.map(ref=>ref.id);
 const preview=dossierReferencePreview(source);
 expect(DOSSIER_REFERENCE_PREVIEW_LIMIT).toBe(10);
 expect(preview).toHaveLength(10);
 expect(source.map(ref=>ref.id)).toEqual(original);
 expect(preview.every(ref=>ref.year!==null)).toBe(true);
 expect(preview.map(ref=>ref.year)).toEqual([...preview.map(ref=>ref.year)].sort((a,b)=>Number(b)-Number(a)));
});
it('puts undated references last and uses a stable identifier tie-breaker, not recorded quality scores',()=>{
 const links:LiveEvidenceReference[]=[
  {...base,id:9,year:null,recordedQualityScore:999},
  {...base,id:5,year:2022,recordedQualityScore:1000},
  {...base,id:3,year:2024,recordedQualityScore:0},
  {...base,id:1,year:2024,recordedQualityScore:null},
 ];
 expect(dossierReferencePreview(links).map(link=>link.id)).toEqual([1,3,5,9]);
});


it('shows only recorded study metadata without inferring a study design',()=>{
 const entry={...base,type:'Article',category:'Publication'};
 expect(referenceMetadata(entry)).toContain('Recorded type: Article');
 expect(referenceMetadata(entry)).toContain('Recorded category: Publication');
 expect(referenceMetadata({...entry,type:null,category:null}).some(s=>s.startsWith('Recorded type:'))).toBe(false);
});
it('compares stored DOI/PMID and links without scientific verification claims',()=>{
 expect(referenceLinkConsistency({...base,url:'https://doi.org/10.1/test'})).toEqual({kind:'consistent',label:'Recorded DOI and link agree'});
 expect(referenceLinkConsistency({...base,url:'https://doi.org/10.2/other'}).kind).toBe('mismatch');
 expect(referenceLinkConsistency({...base,url:'https://pubmed.ncbi.nlm.nih.gov/12345/'}).kind).toBe('consistent');
 expect(referenceLinkConsistency({...base,url:'https://pubmed.ncbi.nlm.nih.gov/12346/'}).kind).toBe('mismatch');
 expect(referenceLinkConsistency({...base,url:'https://cftr2.org/',pmid:'12345'}).kind).toBe('unassessed');
 expect(referenceLinkConsistency({...base,url:'https://doi.org/10.1/test',doi:null}).kind).toBe('unassessed');
});

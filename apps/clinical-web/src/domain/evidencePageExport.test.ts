import {expect,it} from 'vitest';
import {evidencePageCsv} from './evidencePageExport';
import type {LiveEvidenceReference} from '../services/liveEvidence';
const reference:LiveEvidenceReference={
 id:12,variantId:'383',title:'Recorded "source", example',url:'https://pubmed.ncbi.nlm.nih.gov/1234/',
 source:'PubMed',type:null,category:null,journal:'Test journal',year:2023,pmid:'1234',doi:null,
 recordedQualityScore:null,recordedSourceWeight:null,recordedCitationCount:null
};
it('exports only bounded recorded citation fields and source identifiers',()=>{
 const csv=evidencePageCsv([reference]);
 if(csv===null)throw Error('Valid visible page should export');
 expect(csv).toContain('"12","383","PubMed"');
 expect(csv).toContain('Recorded ""source"", example');
 expect(csv).toContain('"https://pubmed.ncbi.nlm.nih.gov/1234/"');
 expect(csv).not.toContain('quality_score');
 expect(csv).not.toContain('modulator');
 expect(csv.split('\r\n').length).toBe(3);
});
it('protects spreadsheets against untrusted source text formula injection',()=>{
 const csv=evidencePageCsv([{...reference,title:' =HYPERLINK("https://evil.example","click")',source:'@SUM(1)',journal:'-10',pmid:'+1'}]);
 if(csv===null)throw Error('Valid identifiers must export');
 expect(csv).toContain('"\'=HYPERLINK');
 expect(csv).toContain('"\'@SUM');
 expect(csv).toContain('"\'-10"');
 expect(csv).toContain('"\'+1"');
});
it('never exports empty, duplicate, oversized, malformed or insecure pages',()=>{
 expect(evidencePageCsv([])).toBeNull();
 expect(evidencePageCsv([reference,reference])).toBeNull();
 expect(evidencePageCsv(Array.from({length:31},(_,i)=>({...reference,id:i+1})))).toBeNull();
 expect(evidencePageCsv([{...reference,variantId:'01'}])).toBeNull();
 expect(evidencePageCsv([{...reference,url:'http://untrusted.example'}])).toBeNull();
});

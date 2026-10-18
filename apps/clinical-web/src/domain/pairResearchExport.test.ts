import {expect,it} from 'vitest';
import {pairResearchMarkdown} from './pairResearchExport';
import type {RealVariant} from '../services/liveVariants';
import type {LiveEvidenceReference} from '../services/liveEvidence';
const a:RealVariant={id:'18',legacyName:'F508del',proteinName:'p.Phe508del',cdnaName:'c.1521_1523delCTT',aliases:['DF508']};
const b:RealVariant={id:'383',legacyName:'R117H',proteinName:'p.Arg117His',cdnaName:'c.350G>A',aliases:[]};
const source:LiveEvidenceReference={id:1,variantId:'18',title:'Recorded source A',url:'https://pubmed.ncbi.nlm.nih.gov/123/',
 source:'PubMed',type:null,category:null,journal:null,year:2021,pmid:'123',doi:null,
 recordedQualityScore:null,recordedSourceWeight:null,recordedCitationCount:null};
const snapshot={first:a,second:b,firstReferences:[source],secondReferences:[]};
it('produces an explicitly nonclinical two-record comparison and full available source list',()=>{
 const md=pairResearchMarkdown(snapshot);
 if(md===null)throw Error('Expected valid record snapshots');
 expect(md).toContain('Record A');
 expect(md).toContain('Record B');
 expect(md).toContain('p.Phe508del');
 expect(md).toContain('https://pubmed.ncbi.nlm.nih.gov/123/');
 expect(md).toContain('No linked references returned');
 expect(md).toContain('does not establish allelic phase');
 expect(md).not.toContain('treatment recommendation');
});
it('does not guess a genotype from repeated research record selection',()=>{
 const md=pairResearchMarkdown({first:a,second:a,firstReferences:[],secondReferences:[]});
 expect(md).toContain('does not establish homozygosity');
});
it('fails closed on mismatched, duplicate or malformed evidence',()=>{
 expect(pairResearchMarkdown({...snapshot,firstReferences:[{...source,variantId:'383'}]})).toBeNull();
 expect(pairResearchMarkdown({...snapshot,firstReferences:[source,source]})).toBeNull();
 expect(pairResearchMarkdown({...snapshot,firstReferences:[{...source,id:0}]})).toBeNull();
 expect(pairResearchMarkdown({...snapshot,firstReferences:[{...source,url:'javascript:alert(1)'}]})).toBeNull();
 expect(pairResearchMarkdown({...snapshot,first:{...a,id:'00'} })).toBeNull();
 expect(pairResearchMarkdown({...snapshot,firstReferences:Array.from({length:201},(_,i)=>({...source,id:i+1}))})).toBeNull();
});
it('escapes source text rather than interpreting source metadata as Markdown',()=>{
 const md=pairResearchMarkdown({...snapshot,firstReferences:[{...source,title:'**unreviewed** <claim>'}]});
 expect(md).toContain('\\*\\*unreviewed\\*\\*');
 expect(md).toContain('\\<claim\\>');
});

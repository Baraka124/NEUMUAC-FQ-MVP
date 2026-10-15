import {it,expect} from 'vitest';
import {parseDiscoveryTerms,buildDiscoveryExpression,assessScientificDiscovery} from './compoundDiscovery';
it('supports bounded OR discovery for multiple scientific identifiers',()=>{
 expect(parseDiscoveryTerms('F508del, G551D; R117H')).toEqual(['F508del','G551D','R117H']);
 expect(buildDiscoveryExpression(['F508del','G551D'],false)).toContain('protein_name.ilike.*G551D*');
 expect(buildDiscoveryExpression(['F508del'],true)).not.toContain('alt_names');
});
it('rejects incomplete, excessive and query-injection shaped compound terms',()=>{
 expect(()=>parseDiscoveryTerms('F508del,')).toThrow();
 expect(()=>parseDiscoveryTerms('a,b,c,d,e')).toThrow();
 expect(()=>parseDiscoveryTerms('a,id.eq.1')).toThrow();
});

it('keeps recorded transcript accessions literal without assuming equivalence',()=>{
 const {assessScientificDiscovery}=requireAssessment();
 const term='NM_000492.4:c.1521_1523delCTT';
 expect(assessScientificDiscovery(term)).toMatchObject({blocked:false,sequenceQualified:true});
 expect(parseDiscoveryTerms(term)).toEqual([term]);
 expect(buildDiscoveryExpression([term],false)).toContain('cdna_name.ilike.*NM_000492.4:c.1521_1523delCTT*');
});
it('rejects uncertain, predicted or allele-level notation without making up equivalences',()=>{
 const {assessScientificDiscovery}=requireAssessment();
 for(const term of ['p.(Phe508del)','p.[Phe508del;Gly551Asp]','c.(123_124)del','p.?','c.1521=','c.123/124','F508del,']){
  expect(assessScientificDiscovery(term).blocked).toBe(true);
  expect(()=>parseDiscoveryTerms(term)).toThrow();
 }
 expect(assessScientificDiscovery('F508del, G551D')).toMatchObject({blocked:false});
});
function requireAssessment(){return {assessScientificDiscovery};}

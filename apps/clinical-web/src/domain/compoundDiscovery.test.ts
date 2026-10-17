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

it('searches recorded legacy nucleotide slash names literally without claiming HGVS equivalence',()=>{
 for(const term of ['1001+11C/T','621+1G/T','c.869+11C/T','1001+11c/t']){
  expect(assessScientificDiscovery(term).blocked).toBe(false);
  expect(parseDiscoveryTerms(term)).toEqual([term]);
  expect(buildDiscoveryExpression([term],false)).toContain('legacy_name.ilike.*'+term+'*');
 }
 for(const term of ['c.123/124','1001+11C/T/G','C/T','1001+11C/','c.123/124;R117H']){
  expect(assessScientificDiscovery(term).blocked).toBe(true);
 }
 expect(assessScientificDiscovery('1001+11C/T, R117H').blocked).toBe(false);
 expect(buildDiscoveryExpression(['1001+11C/T'],true)).toContain('legacy_name.ilike.1001+11C/T');
});

it('Phase 4F-11A baseline: explicit multi-term discovery is textual OR, not a genotype',()=>{
 const terms=parseDiscoveryTerms('F508del, G551D');
 expect(terms).toEqual(['F508del','G551D']);
 const expression=buildDiscoveryExpression(terms,false);
 expect(expression).toContain('legacy_name.ilike.*F508del*');
 expect(expression).toContain('legacy_name.ilike.*G551D*');
 expect(expression).not.toContain('eti_prediction');
});
it('Phase 4F-11A baseline: unverified eponyms and positional nicknames are not silently normalized',()=>{
 expect(parseDiscoveryTerms('la variante gallega')).toEqual(['la variante gallega']);
 expect(parseDiscoveryTerms('508')).toEqual(['508']);
 expect(parseDiscoveryTerms('F508del G551D')).toEqual(['F508del G551D']);
});
it('Phase 4F-11A baseline: scientific uncertainty and phase cannot be transformed into search synonyms',()=>{
 for(const query of ['p.(Phe508del)','p.[Phe508del;Gly551Asp]','p.?','c.1521=']){
  expect(assessScientificDiscovery(query).blocked).toBe(true);
 }
});

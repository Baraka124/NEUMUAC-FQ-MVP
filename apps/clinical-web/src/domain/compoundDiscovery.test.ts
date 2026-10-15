import {it,expect} from 'vitest';
import {parseDiscoveryTerms,buildDiscoveryExpression} from './compoundDiscovery';
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

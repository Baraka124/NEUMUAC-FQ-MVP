import {it,expect} from 'vitest';
import {clinVarVariationUrl} from './externalAuthority';
it('links only recorded ClinVar variation identifiers to official NCBI',()=>{
 expect(clinVarVariationUrl('7105')).toBe('https://www.ncbi.nlm.nih.gov/clinvar/variation/7105/');
 expect(clinVarVariationUrl('VCV000007105')).toContain('/variation/VCV000007105/');
 expect(clinVarVariationUrl('RCV000007523')).toBeNull();
 expect(clinVarVariationUrl('javascript:alert(1)')).toBeNull();
 expect(clinVarVariationUrl(null)).toBeNull();
});

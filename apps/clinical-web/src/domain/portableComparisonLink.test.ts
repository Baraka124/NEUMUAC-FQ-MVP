import {expect,it} from 'vitest';
import {portableComparisonLink} from './portableComparisonLink';

it('builds stable shareable two-source comparison paths without browsing context',()=>{
 expect(portableComparisonLink('18','383','https://fq.neumact.org/?session=private#/variants/12?q=private'))
  .toBe('https://fq.neumact.org/#/genotype?a=18&b=383');
 expect(portableComparisonLink('18','18','https://fq.neumact.org/app/'))
  .toBe('https://fq.neumact.org/app/#/genotype?a=18&b=18');
});
it('never shares incomplete or untrusted IDs and origins',()=>{
 for(const [a,b] of [[null,'383'],['18','00'],['0','383'],['abc','123'],['18;evil','383'],['18',12]]){
  expect(portableComparisonLink(a,b,'https://fq.neumact.org/')).toBeNull();
 }
 expect(portableComparisonLink('18','383','javascript:alert(1)')).toBeNull();
 expect(portableComparisonLink('18','383','https://user:pass@fq.neumact.org/')).toBeNull();
});

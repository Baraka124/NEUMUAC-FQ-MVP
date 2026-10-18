import {expect,it} from 'vitest';
import {portableEvidenceLink} from './portableEvidenceLink';
it('shares only canonical evidence filters without other browsing context',()=>{
 expect(portableEvidenceLink('/evidence?q=CFTR&page=2','https://fq.neumact.org/?token=private#/variants/12?q=ABC'))
  .toBe('https://fq.neumact.org/#/evidence?q=CFTR&page=2');
 expect(portableEvidenceLink('/evidence?variant=383&page=1','https://fq.neumact.org/#/helios'))
  .toBe('https://fq.neumact.org/#/evidence?variant=383&page=1');
});
it('rejects unsafe routes, invalid filter values and non-web origins',()=>{
 for(const path of ['/variants/12','/evidence?q=R117H&from=/variants/23',
  '/evidence?variant=00','/evidence?q=a%23b','//outside.com/evidence',
  '/evidence?variant=12&variant=13'])
  expect(portableEvidenceLink(path,'https://fq.neumact.org/')).toBeNull();
 expect(portableEvidenceLink('/evidence','file:///local/index.html')).toBeNull();
 expect(portableEvidenceLink('/evidence','https://user:password@fq.neumact.org')).toBeNull();
});

import {expect,it} from 'vitest';
import {portableSavedVariantsCsv,portableVariantLink} from './portableVariantReference';

it('creates a stable direct record reference stripped of browsing context',()=>{
 expect(portableVariantLink('42','https://fq.neumact.org/?tracking=abc#/variants?q=R117H'))
 .toBe('https://fq.neumact.org/#/variants/42');
 expect(portableVariantLink('42','https://fq.neumact.org/path/?q=private#/something'))
 .toBe('https://fq.neumact.org/path/#/variants/42');
});
it('rejects noncanonical identifiers and unsafe origins',()=>{
 for(const id of ['01','0','3;=1+1','p.F508del','',18])
  expect(portableVariantLink(id,'https://fq.neumact.org/')).toBeNull();
 expect(portableVariantLink('3','javascript:alert(1)')).toBeNull();
 expect(portableVariantLink('3','https://user:pass@fq.neumact.org')).toBeNull();
});
it('exports only deduplicated public record identities, no search or user context',()=>{
 const csv=portableSavedVariantsCsv(['2','2','5','01','=HYPERLINK(1)'],'https://fq.neumact.org/?user=email@example.org#/variants?q=secret');
 expect(csv).toContain('2,"https://fq.neumact.org/#/variants/2"');
 expect(csv).toContain('5,"https://fq.neumact.org/#/variants/5"');
 expect(csv).not.toContain('example.org#/variants');
 expect(csv).not.toContain('email@example.org');
 expect(csv).not.toContain('secret');
 expect(csv).not.toContain('HYPERLINK');
 expect(csv.split('2,"https://fq.neumact.org/').length).toBe(2);
 expect(portableSavedVariantsCsv(['2'],'file:///tmp/secret')).toBeNull();
});

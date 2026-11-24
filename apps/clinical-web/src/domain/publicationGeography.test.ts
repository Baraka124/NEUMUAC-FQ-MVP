import {describe,it,expect} from 'vitest';
import {canonicalPublicationDoi,decodePublicationGeography} from './publicationGeography';
const doi='10.1234/example';
const institution={id:'https://openalex.org/I123',display_name:'Example institution',country_code:'ES'};
describe('publication geography',()=>{
 it('normalizes DOI and rejects arbitrary URLs',()=>{
 expect(canonicalPublicationDoi('https://doi.org/10.1234/EXAMPLE')).toBe(doi);
 expect(canonicalPublicationDoi('https://example.org/private')).toBeNull();
 });
 it('deduplicates institutions across authors',()=>{
 const work={doi:'https://doi.org/'+doi,display_name:'Example',authorships:[{institutions:[institution]},{institutions:[institution]}]};
 expect(decodePublicationGeography(work,doi).institutions).toEqual([{id:institution.id,name:institution.display_name,countryCode:'ES'}]);
 });
 it('rejects mismatched DOI',()=>expect(()=>decodePublicationGeography({doi:'10.1234/other',display_name:'Example',authorships:[]},doi)).toThrow());
 it('retains empty resolved coverage without inventing institutions',()=>expect(decodePublicationGeography({doi,display_name:'Example',authorships:[]},doi).institutions).toEqual([]));
});

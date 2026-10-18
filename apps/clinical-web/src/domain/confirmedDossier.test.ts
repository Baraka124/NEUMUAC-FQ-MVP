import {describe,it,expect} from 'vitest';
import {confirmedDossierRecord} from './confirmedDossier';
import type {RealVariant} from '../services/liveVariants';
const verified:RealVariant={id:'383',legacyName:'1001+11C/T',proteinName:null,cdnaName:null,aliases:[]};
describe('confirmed scientific dossier identity',()=>{
 it('accepts a freshly retrieved, same-ID record',()=>expect(confirmedDossierRecord('383',verified)).toBe(verified));
 it('never presents a suggestion, missing record or mismatched identity as a dossier',()=>{
  expect(confirmedDossierRecord('383',null)).toBeNull();
  expect(confirmedDossierRecord('383',undefined)).toBeNull();
  expect(confirmedDossierRecord('382',verified)).toBeNull();
 });
 it('rejects malformed and noncanonical route identifiers before rendering',()=>{
  for(const id of ['0','0383','383;DELETE',' 383 ','383/123',null])
   expect(confirmedDossierRecord(id,verified)).toBeNull();
 });
});

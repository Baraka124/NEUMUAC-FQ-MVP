import {describe,it,expect} from 'vitest';
import {canonicalGeographyVariantId,geographyVariantEmptyState} from './variantGeographyContext';

describe('14H157 variant-linked geography contract',()=>{
 it('accepts only canonical positive database IDs without inventing location',()=>{
  for(const id of ['1','18','123456789012345678'])
   expect(canonicalGeographyVariantId(id)).toBe(id);
  for(const value of ['0','01','1.0','-1','1/../2','F508del','1?','1234567890123456789','',undefined,null,['1'],{}])
   expect(canonicalGeographyVariantId(value)).toBeNull();
 });
 it('provides an explicit published-data boundary only for a supported record identity',()=>{
  expect(geographyVariantEmptyState('1')).toBe('No verified geographic information is currently published for this variant.');
  expect(geographyVariantEmptyState('01')).toBeNull();
 });
});

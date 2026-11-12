import {describe,expect,it} from 'vitest';
import {haplotypeContextFindings} from './haplotypeContext';

describe('14H132 preserve original R117H haplotype-dependent signal',()=>{
 it('recognizes recorded legacy, protein or alternate exact R117H names',()=>{
  const found=haplotypeContextFindings([
   {id:'117',names:['Some recorded name',' r117h ']},
   {id:'118',names:['R117H',null,'R117H']}
  ]);
  expect(found).toEqual([
   {variantId:'117',marker:'R117H',modifier:'Intron 8 poly-T and TG repeat context',status:'not-assessed'},
   {variantId:'118',marker:'R117H',modifier:'Intron 8 poly-T and TG repeat context',status:'not-assessed'}
  ]);
  expect(Object.isFrozen(found)).toBe(true);
  expect(Object.isFrozen(found[0])).toBe(true);
 });
 it('does not derive a haplotype from substrings, class, or unrecorded aliases',()=>{
  expect(haplotypeContextFindings([
   {id:'1',names:['R117HX','c.350G>A']},
   {id:'2',names:['other R117H',null]},
   {id:'3',names:[null,'p.Arg117His']},
   {id:'4',names:[]}
  ])).toEqual([]);
 });
 it('does not duplicate a finding for the same selected record',()=>{
  expect(haplotypeContextFindings([
   {id:'117',names:['R117H']},{id:'117',names:['r117h']}
  ])).toHaveLength(1);
 });
});

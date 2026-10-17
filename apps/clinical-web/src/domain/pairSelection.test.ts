import {describe,it,expect} from 'vitest';
import {pairRecordId,pairSelectionQuery} from './pairSelection';
describe('pair selection URL',()=>{
 it('preserves the other independently selected record',()=>{
  expect(pairSelectionQuery({a:'18',b:'383'},0,'42')).toEqual({a:'42',b:'383'});
  expect(pairSelectionQuery({a:'18',b:'383'},1,null)).toEqual({a:'18'});
  expect(pairSelectionQuery({a:'18'},1,'18')).toEqual({a:'18',b:'18'});
 });
 it('drops unsupported fields and does not accept malformed IDs',()=>{
  expect(pairSelectionQuery({a:'18',b:'../admin',from:'https://bad.example'},1,'383')).toEqual({a:'18',b:'383'});
  for(const id of ['-1','0','01','1.5','../../admin','9999999999999999999']){
   expect(pairRecordId(id)).toBeNull();
   expect(()=>pairSelectionQuery({},0,id)).toThrow();
  }
  expect(pairRecordId(['383'])).toBeNull();
 });
});

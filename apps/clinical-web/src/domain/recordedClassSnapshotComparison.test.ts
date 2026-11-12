import {describe,it,expect} from 'vitest';
import type {ResearchHistory,ValidationEvent} from '../services/liveResearchHistory';
import {compareRecordedClassSnapshots} from './recordedClassSnapshotComparison';

const e=(id:number,cls:string|null,action='VALIDATED'):ValidationEvent=>({
 id,variantId:'35',action,recordedClass:cls,at:null,confidence:null
});
const history=(validations:ValidationEvent[]):ResearchHistory=>({validations,conflicts:[]});

describe('14H136b independent validation is not inferable from redacted snapshots',()=>{
 it('detects different historical class texts without inventing a medical contradiction',()=>{
  const source=history([e(1,'I'),e(2,'II')]);
  const original=JSON.stringify(source);
  const result=compareRecordedClassSnapshots(source);
  expect(result).toEqual({
   status:'different-class-text-recorded',
   recordedValidationEvents:2,recordedClassSnapshots:2,
   withoutClassSnapshot:0,distinctRecordedClasses:['I','II'],
   independentValidatorsEstablished:false
  });
  expect(JSON.stringify(source)).toBe(original);
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.distinctRecordedClasses)).toBe(true);
 });
 it('does not confuse casing and whitespace with different classifications',()=>{
  const result=compareRecordedClassSnapshots(history([e(1,' II '),e(2,'ii')]));
  expect(result.status).toBe('same-class-text-recorded');
  expect(result.distinctRecordedClasses).toEqual(['II']);
  expect(result.independentValidatorsEstablished).toBe(false);
 });
 it('does not interpret absent snapshots as nonresponsive, other class or corroboration',()=>{
  expect(compareRecordedClassSnapshots(history([])).status).toBe('no-recorded-validations');
  const one=compareRecordedClassSnapshots(history([e(1,'I'),e(2,null)]));
  expect(one.status).toBe('not-enough-class-snapshots');
  expect(one.withoutClassSnapshot).toBe(1);
  expect(one.distinctRecordedClasses).toEqual(['I']);
 });
 it('excludes nonvalidation actions from class comparison',()=>{
  const result=compareRecordedClassSnapshots(history([
   e(1,'I','VALIDATED'),e(2,'II','CLASSIFICATION_CHANGED'),
   e(3,'III','DRAFT'),e(4,'I',' validated ')
  ]));
  expect(result.status).toBe('same-class-text-recorded');
  expect(result.recordedValidationEvents).toBe(2);
  expect(result.distinctRecordedClasses).toEqual(['I']);
 });
 it('never treats repeated validation entries as proof of two distinct clinicians',()=>{
  const result=compareRecordedClassSnapshots(history([e(1,'I'),e(2,'I'),e(3,'I')]));
  expect(result.recordedValidationEvents).toBe(3);
  expect(result.independentValidatorsEstablished).toBe(false);
  expect(result.status).toBe('same-class-text-recorded');
  expect(Object.keys(result)).not.toContain('clinician');
 });
});

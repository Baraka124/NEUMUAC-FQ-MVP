import {describe,expect,it} from 'vitest';
import {describeRecordedEti} from './responseDisplay';

describe('14H5 restrained research response presentation',()=>{
 it('preserves all historical categories without attaching medical certainty',()=>{
  expect(describeRecordedEti('responsive').label).toBe('Responsive');
  expect(describeRecordedEti('non_responsive').label).toBe('Non-responsive');
  expect(describeRecordedEti('responsive').tone).toBe('recorded');
  expect(describeRecordedEti('non_responsive').tone).toBe('recorded');
 });
 it('does not convert unknown or absent to non-responsive or eligible',()=>{
  for(const value of ['unknown',null] as const){
   const status=describeRecordedEti(value);
   expect(status.tone).toBe('unresolved');
   expect(status.label).not.toMatch(/Non-responsive|Eligible/);
   expect(status.description).toMatch(/original register|record/);
  }
  expect(describeRecordedEti('unknown').label).toBe('Unknown');
  expect(describeRecordedEti(null).label).toBe('Not recorded');
 });
});

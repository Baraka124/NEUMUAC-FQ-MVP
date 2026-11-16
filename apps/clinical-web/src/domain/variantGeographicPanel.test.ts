import {describe,expect,it} from 'vitest';
import {variantActivityGate} from './variantGeographicPanel';

describe('14H163 in-dossier protected geography gate',()=>{
 it('does not request anything before the user opens an identified variant',()=>{
  expect(variantActivityGate(false,'18','signed-in','verified')).toBe('closed');
  expect(variantActivityGate(true,'F508del','signed-in','verified')).toBe('closed');
  expect(variantActivityGate(true,'01','signed-in','verified')).toBe('closed');
  expect(variantActivityGate(true,null,'signed-in','verified')).toBe('closed');
 });
 it('does not treat a signed-in account as a verified researcher',()=>{
  for(const role of ['unassigned','unavailable','signed-out'])
   expect(variantActivityGate(true,'18','signed-in',role)).toBe('restricted');
  expect(variantActivityGate(true,'18','signed-out','verified')).toBe('restricted');
 });
 it('waits for authentication and active membership verification',()=>{
  expect(variantActivityGate(true,'18','checking','signed-out')).toBe('checking');
  expect(variantActivityGate(true,'18','signed-in','checking')).toBe('checking');
  expect(variantActivityGate(true,'18','signed-in','verified')).toBe('ready');
 });
});

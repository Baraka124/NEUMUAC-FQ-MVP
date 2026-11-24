import {describe,it,expect} from 'vitest';
import {decodePopulationEvidence,recordedRsIds} from './populationEvidence';
const row={population:'1000GENOMES:phase_3:IBS',allele:'A',count:2,frequency:.01};
describe('population evidence',()=>{
 it('uses exact recorded identifiers only',()=>expect(recordedRsIds(['rs123',' RS123 ','alias rs5','rs0'])).toEqual(['rs123']));
 it('retains reported alleles without assigning pathogenicity',()=>expect(decodePopulationEvidence({name:'rs123',populations:[row]},'rs123')).toEqual([{cohort:'IBS',allele:'A',count:2,frequency:.01}]));
 it('rejects mismatched identity',()=>expect(()=>decodePopulationEvidence({name:'rs124',populations:[row]},'rs123')).toThrow());
 it('rejects invalid frequency and duplicates',()=>{
 expect(()=>decodePopulationEvidence({name:'rs123',populations:[{...row,frequency:2}]},'rs123')).toThrow();
 expect(()=>decodePopulationEvidence({name:'rs123',populations:[row,row]},'rs123')).toThrow();
 });
 it('distinguishes no supported observations from a zero frequency',()=>expect(decodePopulationEvidence({name:'rs123',populations:[]},'rs123')).toEqual([]));
});

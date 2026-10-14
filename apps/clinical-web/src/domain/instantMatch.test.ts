import {describe,it,expect} from 'vitest';
import {unambiguousExactMatch} from './instantMatch';
const one={id:'18',legacyName:'F508del',proteinName:'p.Phe508del',cdnaName:'c.1521_1523delCTT',aliases:['DF508']};
const two={id:'19',legacyName:'G551D',proteinName:'p.Gly551Asp',cdnaName:'c.1652G>A',aliases:[]};
describe('automatic scientific identity selection',()=>{
 it('auto-selects only one exact name or recorded alias',()=>{expect(unambiguousExactMatch('F508del',[one,two],false)?.id).toBe('18');expect(unambiguousExactMatch(' df508 ',[one,two],false)?.id).toBe('18');expect(unambiguousExactMatch('p.Phe508del',[one,two],false)?.id).toBe('18');});
 it('does not guess on short, partial, ambiguous or truncated results',()=>{expect(unambiguousExactMatch('F50',[one],false)).toBeNull();expect(unambiguousExactMatch('F508del',[one],true)).toBeNull();expect(unambiguousExactMatch('F508del',[one,{...one,id:'20'}],false)).toBeNull();expect(unambiguousExactMatch('F',[one],false)).toBeNull();});
});

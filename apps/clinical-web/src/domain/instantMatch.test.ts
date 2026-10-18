import {describe,it,expect} from 'vitest';
import {unambiguousExactMatch} from './instantMatch';
import {rankVisibleSearchPage} from './searchPresentation';
const one={id:'18',legacyName:'F508del',proteinName:'p.Phe508del',cdnaName:'c.1521_1523delCTT',aliases:['DF508']};
const two={id:'19',legacyName:'G551D',proteinName:'p.Gly551Asp',cdnaName:'c.1652G>A',aliases:[]};
describe('automatic scientific identity selection',()=>{
 it('auto-selects only one exact name or recorded alias',()=>{expect(unambiguousExactMatch('F508del',[one,two],false)?.id).toBe('18');expect(unambiguousExactMatch(' df508 ',[one,two],false)?.id).toBe('18');expect(unambiguousExactMatch('p.Phe508del',[one,two],false)?.id).toBe('18');});

 it('preserves distinct p., c. and unqualified identities during auto-open',()=>{
  const protein={id:'31',legacyName:null,proteinName:'p.Arg123Ser',cdnaName:null,aliases:[]};
  const coding={id:'32',legacyName:null,proteinName:null,cdnaName:'c.Arg123Ser',aliases:[]};
  const bare={id:'33',legacyName:'Arg123Ser',proteinName:null,cdnaName:null,aliases:[]};
  expect(unambiguousExactMatch('p.Arg123Ser',[protein,coding,bare],false)?.id).toBe('31');
  expect(unambiguousExactMatch('c.Arg123Ser',[protein,coding,bare],false)?.id).toBe('32');
  expect(unambiguousExactMatch('Arg123Ser',[protein,coding,bare],false)?.id).toBe('33');
  expect(unambiguousExactMatch('p.Arg123Ser',[coding,bare],false)).toBeNull();
  expect(unambiguousExactMatch('Arg123Ser',[protein,coding],false)).toBeNull();
 });
 it('does not guess on short, partial, ambiguous or truncated results',()=>{expect(unambiguousExactMatch('F50',[one],false)).toBeNull();expect(unambiguousExactMatch('F508del',[one],true)).toBeNull();expect(unambiguousExactMatch('F508del',[one,{...one,id:'20'}],false)).toBeNull();expect(unambiguousExactMatch('F',[one],false)).toBeNull();});
});

it('keeps f508 partial results available without promoting F508C into an exact dossier hit',()=>{
 const f508c={id:'24',legacyName:'F508C',proteinName:'p.Phe508Cys',cdnaName:'c.1523T>G',aliases:[],recordedClass:'II'};
 const f508del={id:'18',legacyName:'F508del',proteinName:'p.Phe508del',cdnaName:'c.1521_1523delCTT',aliases:[]};
 const suggestions=rankVisibleSearchPage([f508c,f508del],'f508');
 expect(suggestions.map(row=>row.id)).toEqual(['24','18']);
 expect(unambiguousExactMatch('f508',suggestions,false)).toBeNull();
 expect(unambiguousExactMatch('F508C',suggestions,false)?.id).toBe('24');
 expect(unambiguousExactMatch('f508DEL',suggestions,false)?.id).toBe('18');
});

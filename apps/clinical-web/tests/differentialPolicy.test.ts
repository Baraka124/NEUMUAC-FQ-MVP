import {expect,it} from 'vitest';
import {auditDifferences,differencesFor,reviewedDeviations,type DifferentialCase} from './differentialPolicy';
it('fails an unreviewed new mismatch',()=>{
 const row:DifferentialCase={query:'unexpected',legacy:{ids:['a'],normalized:'a',blocked:false},modern:{ids:[],normalized:'a',blocked:false},differences:['result-ids-or-order']};
 expect(auditDifferences([row],[]).unexpected).toHaveLength(1);
});
it('detects missing and changed policy exceptions rather than silently allowing them',()=>{
 expect(auditDifferences([],reviewedDeviations).missing).toHaveLength(3);
 const row:DifferentialCase={query:'ΔF508',legacy:{ids:[],normalized:'delf508',blocked:false},modern:{ids:[],normalized:'canonical',blocked:false},differences:['normalization']};
 expect(auditDifferences([row],reviewedDeviations).unexpected).toHaveLength(1);
});
it('compares result identity, normalization and gate independently',()=>{
 expect(differencesFor({ids:['a'],normalized:'a',blocked:false},{ids:['b'],normalized:'x',blocked:true})).toEqual(['normalization','result-ids-or-order','structural-gate']);
});

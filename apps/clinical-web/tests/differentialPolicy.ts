export type DifferenceKind = 'normalization' | 'result-ids-or-order' | 'structural-gate';
export interface DifferentialCase {
  query:string;
  legacy:{ids:readonly string[];normalized:string;blocked:boolean};
  modern:{ids:readonly string[];normalized:string;blocked:boolean};
  differences:readonly DifferenceKind[];
}
export interface ReviewedDeviation {
  query:string;
  differences:readonly DifferenceKind[];
  decision:'pending-clinical-review'|'pending-technical-review';
  rationale:string;
}
export const reviewedDeviations:readonly ReviewedDeviation[]=[
  {query:'ΔF508',differences:['result-ids-or-order'],decision:'pending-clinical-review',rationale:'Uppercase Greek-delta shortcut has divergent result identities. Do not assume automatic normalization to a canonical CFTR variant.'},
  {query:'δF508',differences:['result-ids-or-order'],decision:'pending-clinical-review',rationale:'Lowercase Greek-delta shortcut has the same unresolved search identity mismatch. Scientific nomenclature review required.'},
  {query:'patient treatment report',differences:['structural-gate'],decision:'pending-technical-review',rationale:'Search rejection and analytics logging are different boundaries; make deliberate product decision before adoption.'}
];
export function differencesFor(legacy:DifferentialCase['legacy'],modern:DifferentialCase['modern']):DifferenceKind[]{
 const d:DifferenceKind[]=[];
 if(legacy.normalized!==modern.normalized)d.push('normalization');
 if(JSON.stringify(legacy.ids)!==JSON.stringify(modern.ids))d.push('result-ids-or-order');
 if(legacy.blocked!==modern.blocked)d.push('structural-gate');
 return d;
}
export function auditDifferences(cases:readonly DifferentialCase[],exceptions:readonly ReviewedDeviation[]=reviewedDeviations){
 const unexpected:string[]=[];const missing:string[]=[];
 for(const row of cases){
  const expected=exceptions.find(ex=>ex.query===row.query);
  if(!expected){
   if(row.differences.length)unexpected.push(row.query+': '+row.differences.join(', '));
  }else if(JSON.stringify([...row.differences].sort())!==JSON.stringify([...expected.differences].sort())){
   unexpected.push(row.query+': deviation drift: observed '+row.differences.join(', ')+' expected '+expected.differences.join(', '));
  }
 }
 for(const ex of exceptions)if(!cases.some(row=>row.query===ex.query))missing.push(ex.query);
 return {unexpected,missing,approvedCount:exceptions.length};
}

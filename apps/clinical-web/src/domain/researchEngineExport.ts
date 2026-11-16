import type {MultiTherapyResearchReport} from './multiTherapyResearch';
import {THERAPIES} from './therapyRegistry';

/** Research worksheet, not an adjudication or an export of source documents. */
const escape=(value:string):string=>value.replace(/[\u0000-\u001f\u007f]/g,' ')
 .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
 .replace(/[\\\x60*_{}\[\]()#+.!|~-]/g,ch=>'\\'+ch);
const response=(value:string|null):string=>value==='responsive'?'Recorded responsive':
 value==='non_responsive'?'Recorded non-responsive':
 value==='unknown'?'Recorded unknown':'Not recorded';
export function researchEngineWorksheet(
 report:MultiTherapyResearchReport,variantName:string
):string{
 if(!/^[1-9]\d{0,17}$/.test(report.variantId)||report.assessedTherapies.length!==5||
  report.clinicalDecisionProvided!==false)throw new Error('Unsupported research report');
 const lines=[
  '# neumuacFQ · Multi-therapy research evidence worksheet',
  '',
  '**Scope:** research only; not a clinical decision or treatment-response prediction',
  '**Variant:** '+escape(variantName)+' (catalogue #'+report.variantId+')',
  '**Source:** live CFTR variant records and historical research metadata',
  '**Linked bibliography:** '+report.bibliographicLinks+' catalogued references',
  '**Independently reviewed study families:** '+report.independentlyReviewedClaims,
  '**Review coverage:** linked bibliography does not automatically establish reviewed source observations',
  '',
  '| Therapy | Archived variant status | Reviewed source observation | Source status |',
  '|---|---|---|---|'
 ];
 for(const def of THERAPIES){
  const row=report.assessedTherapies.find(x=>x.therapy===def.id);
  if(!row)throw new Error('Incomplete five-regimen report');
  lines.push('| '+escape(def.label)+' | '+response(row.recordedResponse)+
   ' | '+row.sourceAssessment.verifiedStudyFamilies+' independent study families | '+row.state+' |');
 }
 lines.push('','## Source discrepancies requiring independent review','');
 let conflictRows=0;
 for(const row of report.assessedTherapies){
  if(row.archiveDisagreesWithRecorded){
   lines.push('- '+row.therapy+': historical response category differs from the older research evidence flag.');
   conflictRows++;
  }
  for(const conflict of row.conflicts){
   lines.push('- '+row.therapy+' ('+conflict.kind+'): '+escape(conflict.message));
   conflictRows++;
  }
 }
 if(!conflictRows)lines.push('No independently reviewed source conflict was detected in the available snapshot. This does not prove agreement.');
 lines.push('','## Scientific interpretation limits','');
 for(const limitation of report.dataLimitations)lines.push('- '+escape(limitation));
 lines.push('','**No patient-genotype phase, medication eligibility, dosing, individual effect, statistical certainty or clinical recommendation is calculated.**','');
 return lines.join('\n');
}

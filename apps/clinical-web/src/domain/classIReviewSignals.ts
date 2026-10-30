import type {VariantTherapyProfile} from './therapyRegistry';

/** Class is an identity/functional descriptor, not a treatment response.
 * Report anomalies to the curation workflow; NEVER overwrite source records.
 */
export type ClassIReviewSignal='unflagged-class-i-eti-response'|
 'exceptional-subtype-without-eti-response'|
 'class-i-drug-divergence'|
 'missing-classification'|'validation-not-recorded';
export interface ClassIReviewFinding{
 readonly kind:ClassIReviewSignal;readonly message:string;
 readonly action:'review-record'|'inspect-evidence';
}
export function classIReviewSignals(profile:VariantTherapyProfile):readonly ClassIReviewFinding[]{
 const results:ClassIReviewFinding[]=[];
 const emit=(kind:ClassIReviewSignal,message:string,action:ClassIReviewFinding['action'])=>
  results.push(Object.freeze({kind,message,action}));
 const eti=profile.entries.find(x=>x.therapy==='ETI')?.response??null;
 const aly=profile.entries.find(x=>x.therapy==='ALYFTREK')?.response??null;
 if(profile.functionalClass===null){
  emit('missing-classification','Functional class not recorded.','review-record');
  return Object.freeze(results);
 }
 if(profile.functionalClass!=='I')return Object.freeze(results);
 if(eti==='responsive'&&profile.classSubtype!=='exceptional')
  emit('unflagged-class-i-eti-response','Review Class I ETI response and subtype.','inspect-evidence');
 if(profile.classSubtype==='exceptional'&&eti!=='responsive')
  emit('exceptional-subtype-without-eti-response','Exceptional subtype and ETI response should be reviewed separately.','inspect-evidence');
 if(eti==='non_responsive'&&aly==='responsive')
  emit('class-i-drug-divergence','ETI and Alyftrek have different recorded response categories.','inspect-evidence');
 if(profile.validationCount===0||profile.validationCount===null)
  emit('validation-not-recorded','No completed validation is recorded for this variant.','review-record');
 return Object.freeze(results);
}

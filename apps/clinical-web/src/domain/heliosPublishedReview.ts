/**
 * Helios read boundary: only explicitly authorized, server-filtered publication
 * data may reach the UI. Never query the legacy public review table directly:
 * its current anonymous RLS SELECT exposes sensitive review content.
 */
export interface HeliosPublishedReview {
 readonly reviewId:string;
 readonly variantId:string;
 readonly recordedValue:string|null;
 readonly proposedValue:string|null;
 readonly evidenceSummary:string|null;
 readonly uncertaintyNote:string|null;
 readonly sourceReferences:readonly string[];
}
export type HeliosReadState=
 | {readonly kind:'not-connected'}
 | {readonly kind:'access-denied'}
 | {readonly kind:'empty'}
 | {readonly kind:'ready';readonly records:readonly HeliosPublishedReview[]};

/** Strict mapper for a future server-controlled and reviewed presentation API. */
export function decodePublishedReview(value:unknown):HeliosPublishedReview {
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid published review');
 const v=value as Record<string,unknown>;
 const id=(name:string)=>typeof v[name]==='string'&&/^[1-9]\d{0,17}$/.test(v[name] as string)?v[name] as string:null;
 const reviewId=id('reviewId'),variantId=id('variantId');
 if(!reviewId||!variantId)throw Error('Review identity missing');
 const optional=(name:string)=>v[name]===null?null:typeof v[name]==='string'&&(v[name] as string).length<=2000?v[name] as string:null;
 if(!Array.isArray(v.sourceReferences)||v.sourceReferences.length>20||
  !v.sourceReferences.every(x=>typeof x==='string'&&x.length<=500&&/^https:\/\//.test(x)))
  throw Error('Invalid published references');
 return {reviewId,variantId,recordedValue:optional('recordedValue'),
  proposedValue:optional('proposedValue'),evidenceSummary:optional('evidenceSummary'),
  uncertaintyNote:optional('uncertaintyNote'),sourceReferences:[...v.sourceReferences]};
}

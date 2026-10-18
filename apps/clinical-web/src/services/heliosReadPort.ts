import {decodePublishedReview,type HeliosReadState} from '../domain/heliosPublishedReview';

/**
 * Deny-by-default port. No REST URL, raw Supabase table access or fetch is
 * embedded here. Backend authentication/RLS is mandatory before wiring a port.
 */
export interface AuthorizedHeliosPort {
 readonly loadPublishedReviews:()=>Promise<unknown>;
}
export async function loadHeliosReviewList(port?:AuthorizedHeliosPort):Promise<HeliosReadState>{
 if(!port)return {kind:'not-connected'};
 try{
  const result=await port.loadPublishedReviews();
  if(!Array.isArray(result))return {kind:'access-denied'};
  if(result.length>100)return {kind:'access-denied'};
  const decoded=result.map(decodePublishedReview);
  const ids=new Set(decoded.map(item=>item.reviewId));
  if(ids.size!==decoded.length)return {kind:'access-denied'};
  return decoded.length?{kind:'ready',records:decoded}:{kind:'empty'};
 }catch{return {kind:'access-denied'};}
}

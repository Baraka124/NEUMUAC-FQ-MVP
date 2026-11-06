import {validateReadOnlyConfig,type ReadOnlyConfig} from './liveVariants';
import type {AuthController} from './authSession';

export interface ProfessionalProfile{
 name:string;
 staffType:string;
 department:string|null;
 researchGroup:string|null;
 researchLine:string|null;
 sourceVerifiedAt:string;
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function nullableText(x:unknown,max:number):string|null{
 if(x===null)return null;
 if(typeof x!=='string'||x.length>max)throw Error('Invalid professional profile.');
 return x.trim()||null;
}
export function parseProfessionalProfile(input:unknown):ProfessionalProfile|null{
 if(!Array.isArray(input)||input.length>1)throw Error('Invalid professional profile response.');
 if(input.length===0)return null;
 const r=input[0] as Record<string,unknown>|null;
 if(!r||typeof r!=='object'||Array.isArray(r)||
  typeof r.display_name!=='string'||!r.display_name.trim()||r.display_name.length>160||
  typeof r.staff_type!=='string'||!r.staff_type.trim()||r.staff_type.length>80||
  typeof r.source_verified_at!=='string'||!Number.isFinite(Date.parse(r.source_verified_at)))
   throw Error('Invalid professional profile.');
 return {
  name:r.display_name.trim(),staffType:r.staff_type.trim(),
  department:nullableText(r.department,160),
  researchGroup:nullableText(r.research_group,80),
  researchLine:nullableText(r.research_line,160),
  sourceVerifiedAt:r.source_verified_at
 };
}
/** Only the FQ database is contacted. RLS additionally restricts access to the signed-in user. */
export function createProfessionalProfileClient(
 config:ReadOnlyConfig,
 session:Pick<AuthController,'state'|'getAccessToken'>,
 transport:typeof fetch=fetch
){
 const endpoint=validateReadOnlyConfig(config);
 return {
  async readOwn(signal?:AbortSignal):Promise<ProfessionalProfile|null>{
   const subject=session.state.userId;
   if(session.state.phase!=='signed-in'||!subject||!uuid.test(subject))throw Error('Sign-in required.');
   const token=await session.getAccessToken();
   if(!token||session.state.phase!=='signed-in'||session.state.userId!==subject)
    throw Error('Session changed.');
   const url=new URL('/rest/v1/nfq_professional_profiles',endpoint);
   url.searchParams.set('select','display_name,staff_type,department,research_group,research_line,source_verified_at');
   url.searchParams.set('user_id','eq.'+subject);
   url.searchParams.set('limit','1');
   const response=await transport(url.toString(),{
    method:'GET',credentials:'omit',redirect:'error',cache:'no-store',signal,
    headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,Accept:'application/json'}
   });
   if(session.state.phase!=='signed-in'||session.state.userId!==subject)
    throw Error('Session changed.');
   if(!response.ok)throw Error('Profile is unavailable.');
   const profile=parseProfessionalProfile(await response.json());
   if(session.state.phase!=='signed-in'||session.state.userId!==subject)
    throw Error('Session changed.');
   return profile;
  }
 };
}

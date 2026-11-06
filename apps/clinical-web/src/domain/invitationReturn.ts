/** Extracts only a Supabase invite return. Never logs, stores or displays tokens. */
export interface InvitationTokens {accessToken:string;refreshToken:string}
export type InvitationReturn = {kind:'invite';tokens:InvitationTokens}|{kind:'error'}|{kind:'none'};
export function readInvitationReturn(fragment:string):InvitationReturn{
 if(typeof fragment!=='string'||fragment.length>16000)return {kind:'none'};
 const raw=fragment.replace(/^#/,'');
 if(!raw||raw.startsWith('/'))return {kind:'none'};
 const q=new URLSearchParams(raw);
 const type=q.get('type');
 if(type!=='invite')return {kind:'none'};
 if(q.has('error')||q.has('error_code'))return {kind:'error'};
 const accessToken=q.get('access_token'),refreshToken=q.get('refresh_token');
 if(!accessToken||!refreshToken||accessToken.length>10000||refreshToken.length>3000||
  q.getAll('access_token').length!==1||q.getAll('refresh_token').length!==1)
  return {kind:'error'};
 return {kind:'invite',tokens:{accessToken,refreshToken}};
}
export function validActivationPassword(password:string):boolean{
 return password.length>=12&&password.length<=128&&
  !/[\u0000-\u001f\u007f]/.test(password);
}

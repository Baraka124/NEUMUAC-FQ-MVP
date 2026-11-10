// 14H127 controlled activation: server-enforced Administrator-only email dispatch.
// Never embed privileged Supabase keys in the Vue app or GitHub Pages.
import {createClient} from 'npm:@supabase/supabase-js@2.57.0';
import {createInvitationGateway} from '../_shared/adminInvitationGateway.mjs';

const origin='https://fq.neumact.org';
const endpoint=Deno.env.get('SUPABASE_URL')||'';
const keys=Deno.env.get('SUPABASE_SECRET_KEYS')||'';
let namedKey='';
try{namedKey=JSON.parse(keys).default||'';}catch{/* legacy projects */}
const secret=Deno.env.get('SUPABASE_SECRET_KEY')||namedKey||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
// Dispatch is possible only with a Supabase-managed privileged server key.
// Operators can disable sending immediately through the server-only kill switch.
// No invitation is sent without an explicit authenticated POST.
const enabled=Boolean(endpoint&&secret)&&Deno.env.get('NFQ_ADMIN_INVITES_DISABLED')!=='true';
const admin=enabled?createClient(endpoint,secret,{
 auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}
}):null;

const handler=createInvitationGateway({
 enabled,
 allowedOrigin:origin,
 async verifyAdministrator(token:string){
  if(!admin)return null;
  // getUser validates the bearer against Supabase Auth (JWT alone is insufficient).
  const {data:userData,error:authError}=await admin.auth.getUser(token);
  const user=userData.user;
  if(authError||!user?.id||!user.email)return null;
  const {data:member,error:memberError}=await admin.from('nfq_research_memberships')
   .select('role,revoked_at')
   .eq('user_id',user.id).eq('role','administrator').is('revoked_at',null)
   .maybeSingle();
  if(memberError)throw Error('Research membership verification failed');
  return member?.role==='administrator'?{id:user.id,email:user.email}:null;
 },
 async listDispatch(_actorId:string){
  if(!admin)throw Error('Disabled');
  const {data,error}=await admin.from('nfq_account_invitations')
   .select('id,recipient_email,intended_kind,status,requested_at,updated_at')
   .order('requested_at',{ascending:false}).limit(20);
  if(error||!data)throw Error('Unable to read invitation audit');
  return data.map(item=>({id:item.id,email:item.recipient_email,kind:item.intended_kind,
   status:item.status,createdAt:item.requested_at,updatedAt:item.updated_at}));
 },
 async recordDispatch(input:{email:string;kind:'clinician'|'guest';actorId:string}){
  if(!admin)throw Error('Disabled');
  // Applies to both successful and failed requests; a new database row must
  // be reserved before an email is requested.
  const oneHour=new Date(Date.now()-3600_000).toISOString();
  const oneDay=new Date(Date.now()-86400_000).toISOString();
  const [{count:actorCount,error:auditError},{count:recipientCount,error:recipientError}]=await Promise.all([
   admin.from('nfq_account_invitations').select('id',{count:'exact',head:true})
    .eq('requested_by',input.actorId).gte('requested_at',oneHour),
   admin.from('nfq_account_invitations').select('id',{count:'exact',head:true})
    .eq('recipient_email',input.email).gte('requested_at',oneDay)
  ]);
  if(auditError||recipientError)throw Error('Audit history not available');
  if((actorCount??0)>=10||(recipientCount??0)>=3)throw Error('Invitation limit reached');
  const {data,error}=await admin.from('nfq_account_invitations')
   .insert({recipient_email:input.email,intended_kind:input.kind,requested_by:input.actorId,status:'dispatching'})
   .select('id').single();
  if(error||!data?.id)throw Error('Unable to reserve invitation');
  return String(data.id);
 },
 async sendInvitation(email:string){
  if(!admin)throw Error('Disabled');
  // Supabase Auth owns the one-use link and email delivery. Never return tokens.
  // This does not create FQ research membership or neumDESK affiliation.
  const {data,error}=await admin.auth.admin.inviteUserByEmail(email,{
   redirectTo:'https://fq.neumact.org'
  });
  if(error||!data.user?.id)throw Error('Invitation provider did not confirm delivery');
  return data.user.id;
 },
 async markStatus(id:string,status:'sent'|'uncertain',userId:string|null){
  if(!admin)throw Error('Disabled');
  const {data,error}=await admin.from('nfq_account_invitations')
   .update({status,invited_user_id:userId,updated_at:new Date().toISOString()})
   .eq('id',id).eq('status','dispatching').select('id').single();
  if(error||!data?.id)throw Error('Invitation audit update not verified');
 }
});
Deno.serve(request=>handler(request));

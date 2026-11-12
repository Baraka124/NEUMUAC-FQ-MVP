<script setup lang="ts">
import {computed,ref,watch,onUnmounted,nextTick} from 'vue';
import ContextHelp from './ContextHelp.vue';
import {normalizedInviteAddress,type InvitationKind,type InvitationRecord,type createAdminInvitationClient} from '../services/adminInvitations';
import type {ResearchAccountRow} from '../services/researchAccountDirectory';

const props=defineProps<{
 allowed:boolean;
 client:ReturnType<typeof createAdminInvitationClient>|null;
 knownAccounts:readonly ResearchAccountRow[];
}>();
const open=ref(false);
const launchButton=ref<HTMLButtonElement|null>(null);
const emailField=ref<HTMLInputElement|null>(null);
const address=ref('');
const kind=ref<InvitationKind>('clinician');
const acknowledged=ref(false);
const loading=ref(false);
const sending=ref(false);
const phase=ref<'idle'|'ready'|'unavailable'>('idle');
const records=ref<InvitationRecord[]>([]);
const notice=ref('');
const warning=ref(false);
// A possibly dispatched request must never be repeated from this mounted session.
const unconfirmedAddress=ref<string|null>(null);
let epoch=0;
let currentAbort:AbortController|null=null;
const normalized=computed(()=>normalizedInviteAddress(address.value));
const registered=computed(()=>Boolean(normalized.value&&props.knownAccounts.some(a=>a.email.toLowerCase()===normalized.value)));
const alreadyInvited=computed(()=>Boolean(normalized.value&&records.value.some(a=>a.email===normalized.value&&['sent','dispatching','uncertain'].includes(a.status))));
const canSend=computed(()=>props.allowed&&phase.value==='ready'&&!loading.value&&!sending.value&&
 Boolean(normalized.value)&&normalized.value!==unconfirmedAddress.value&&
 !registered.value&&!alreadyInvited.value&&acknowledged.value);
async function refresh(){
 const current=++epoch;
 currentAbort?.abort();
 currentAbort=new AbortController();
 records.value=[];phase.value='idle';loading.value=true;
 if(!props.allowed||!props.client){loading.value=false;return;}
 try{
  const next=await props.client.list(currentAbort.signal);
  if(current!==epoch||!props.allowed)return;
  records.value=next;phase.value='ready';loading.value=false;
 }catch{
  if(current!==epoch||!props.allowed)return;
  phase.value='unavailable';loading.value=false;
 }
}
watch(()=>props.allowed,allowed=>{
 if(!allowed){++epoch;currentAbort?.abort();phase.value='idle';records.value=[];open.value=false;notice.value='';}
 else void refresh();
},{immediate:true});
onUnmounted(()=>{++epoch;currentAbort?.abort();});
async function openComposer(){
 if(open.value||sending.value||loading.value||phase.value!=='ready')return;
 open.value=true;
 await nextTick();
 emailField.value?.focus();
}
async function closePanel(){
 if(sending.value)return;
 open.value=false;
 address.value='';acknowledged.value=false;
 await nextTick();
 launchButton.value?.focus();
}
async function submit(){
 if(!canSend.value||!normalized.value||!props.client)return;
 const email=normalized.value;
 sending.value=true;notice.value='';warning.value=false;
 try{
  await props.client.send(email,kind.value);
  notice.value='Invitation requested for '+email+'. Check its history before assuming delivery. Access is assigned only after activation.';
  address.value='';acknowledged.value=false;open.value=false;
  await refresh();
 }catch(error){
  warning.value=true;
  unconfirmedAddress.value=email;
  notice.value=(error instanceof Error?error.message:'Delivery cannot be confirmed.')+
   ' This address is blocked from another send in this session. Review the invitation history before taking further action.';
  await refresh();
 }finally{sending.value=false;}
}
const prettyStatus=(status:InvitationRecord['status']):string=>{
 if(status==='sent')return 'Provider accepted request';
 if(status==='dispatching')return 'Sending';
 if(status==='uncertain')return 'Delivery unconfirmed';
 return 'Not delivered';
};
</script>
<template>
 <div class="nfq-admin-invites" data-testid="admin-invitations">
  <div class="nfq-invite-toolbar">
   <div class="nfq-invite-intro">
    <strong>Invitations</strong>
    <span v-if="loading" role="status">Checking service…</span>
    <span v-else-if="phase==='unavailable'" role="status">Invitation service unavailable or unverified</span>
    <span v-else-if="phase==='ready'">{{records.length}} recent {{records.length===1?'request':'requests'}}</span>
    <ContextHelp label="About clinician invitations" title="Research account invitations">
     <p>Each invitation is emailed privately to the recipient by Supabase Auth. No passwords or one-use links are exposed here.</p>
     <p>Inviting does not grant scientific permissions or neumDESK affiliation. Once a clinician activates, an Administrator verifies the account and assigns its research role. Guest designation is a separate controlled process.</p>
    </ContextHelp>
   </div>
   <div class="nfq-invite-actions">
    <button type="button" class="nfq-invite-light" :disabled="loading||sending" title="Refresh invitation history" @click="refresh">Refresh</button>
    <button ref="launchButton" type="button" class="nfq-invite-launch" :disabled="phase!=='ready'||loading||sending" :aria-expanded="open" aria-controls="nfq-invite-composer" @click="open?closePanel():openComposer()">{{open?'Close':'Invite researcher'}}</button>
   </div>
  </div>
  <form v-if="open&&phase==='ready'" id="nfq-invite-composer" class="nfq-invite-composer" aria-label="Compose research account invitation" data-testid="admin-invite-composer" @submit.prevent="submit" @keydown.esc.stop.prevent="closePanel">
   <div class="nfq-invite-field">
    <label for="nfq-invite-address">Recipient email</label>
    <input ref="emailField" id="nfq-invite-address" v-model.trim="address" type="email" inputmode="email"
     autocomplete="off" spellcheck="false" maxlength="254" required placeholder="clinician@example.org" :disabled="sending"/>
   </div>
   <fieldset class="nfq-invite-kind" :disabled="sending">
    <legend>Account invitation</legend>
    <label><input v-model="kind" type="radio" value="clinician"/> Clinician / researcher</label>
    <label><input v-model="kind" type="radio" value="guest"/> External guest</label>
   </fieldset>
   <p v-if="registered" class="nfq-invite-alert">This email already has an FQ account. Manage its permissions in the directory instead of sending a new invitation.</p>
   <p v-else-if="alreadyInvited" class="nfq-invite-alert">An invitation for this address is already recorded. Check its status before requesting another.</p>
   <p v-else-if="normalized===unconfirmedAddress" class="nfq-invite-alert" role="alert">Delivery for this address could not be confirmed. Another request is blocked in this session.</p>
   <label class="nfq-invite-confirm"><input v-model="acknowledged" type="checkbox" :disabled="sending"/>
    <span>I have confirmed the recipient and authorize this one-time invitation email. No research role is assigned automatically.</span>
   </label>
   <div class="nfq-invite-form-actions">
    <button type="submit" class="nfq-invite-send" :disabled="!canSend">{{sending?'Requesting…':'Send invitation'}}</button>
    <button type="button" class="nfq-invite-light" :disabled="sending" @click="closePanel">Cancel</button>
   </div>
  </form>
  <p v-if="notice" :role="warning?'alert':'status'" class="nfq-invite-notice" :class="{'nfq-invite-notice-warning':warning}">{{notice}}</p>
  <details v-if="records.length" class="nfq-invite-history" data-testid="admin-invitation-history">
   <summary>Recent invitation requests</summary>
   <div class="nfq-invite-history-rows">
    <div v-for="record in records" :key="record.id" class="nfq-invite-history-row">
     <span>{{record.email}} <small>· {{record.kind==='guest'?'Guest':'Clinician'}}</small></span>
     <span :class="{'nfq-invite-uncertain':record.status==='uncertain'}">{{prettyStatus(record.status)}}</span>
    </div>
   </div>
  </details>
 </div>
</template>
<style scoped>
.nfq-admin-invites{border:1px solid #e6edf3;background:#fcfdff;border-radius:9px;padding:10px 13px;margin:0 0 15px;min-width:0}
.nfq-invite-toolbar{display:flex;justify-content:space-between;align-items:center;gap:8px 14px;flex-wrap:wrap}
.nfq-invite-intro{display:flex;align-items:center;flex-wrap:wrap;gap:7px 9px;color:#657c90;font-size:10.5px}
.nfq-invite-intro strong{font-size:12px;color:#2b4660;font-weight:710}
.nfq-invite-intro :deep(.nfq-context-help summary){width:23px;height:23px}
.nfq-invite-actions{display:flex;align-items:center;gap:10px}
.nfq-invite-light{border:0;background:transparent;padding:4px 2px;color:#326991;cursor:pointer;font-size:11px;font-weight:640}
.nfq-invite-launch{border:1px solid #c8d9e8;border-radius:6px;background:#fff;color:#285c83;font-size:11px;padding:7px 10px;font-weight:690;cursor:pointer}
.nfq-invite-launch:hover{background:#f4f9fd}
.nfq-invite-launch:disabled,.nfq-invite-light:disabled{opacity:.45;cursor:not-allowed}
.nfq-invite-composer{display:grid;gap:11px;margin-top:12px;border-top:1px solid #e8edf2;padding:13px 0 2px;max-width:560px}
.nfq-invite-field{display:grid;gap:5px}
.nfq-invite-field label,.nfq-invite-kind legend{font-size:11px;color:#526a80;font-weight:660}
.nfq-invite-field input{min-height:38px;width:100%;border:1px solid #d3e0ea;border-radius:7px;background:#fff;color:#29435b;padding:8px 10px;font-size:12px}
.nfq-invite-kind{border:0;padding:0;margin:0;display:flex;gap:5px 16px;flex-wrap:wrap}
.nfq-invite-kind legend{margin-bottom:7px}
.nfq-invite-kind label,.nfq-invite-confirm{font-size:11px;display:flex;align-items:center;gap:7px;color:#546b80}
.nfq-invite-kind input,.nfq-invite-confirm input{accent-color:#275e89}
.nfq-invite-confirm{align-items:flex-start;line-height:1.5}
.nfq-invite-confirm input{margin:3px 0 0;flex:none}
.nfq-invite-form-actions{display:flex;gap:14px;align-items:center}
.nfq-invite-send{padding:8px 12px;min-height:36px;border:1px solid #265e89;border-radius:6px;background:#265e89;color:#fff;font-weight:680;font-size:11.5px;cursor:pointer}
.nfq-invite-send:disabled{opacity:.42;cursor:not-allowed}
.nfq-invite-alert,.nfq-invite-notice{font-size:11px;line-height:1.5;margin:0;color:#95603a}
.nfq-invite-notice{margin:9px 0 0;color:#5b7389}
.nfq-invite-notice-warning{color:#915b39}
.nfq-invite-history{margin-top:10px;font-size:10.5px;color:#647d92}
.nfq-invite-history summary{cursor:pointer}
.nfq-invite-history-rows{display:grid;margin-top:8px;gap:0}
.nfq-invite-history-row{display:flex;justify-content:space-between;flex-wrap:wrap;gap:3px 15px;border-top:1px solid #edf2f6;padding:7px 0;color:#2c455d;font-size:11px}
.nfq-invite-history-row small{color:#8094a5}
.nfq-invite-history-row>span:last-child{color:#667f92}
.nfq-invite-history-row .nfq-invite-uncertain{color:#966443}
.nfq-admin-invites button:focus-visible,.nfq-admin-invites input:focus-visible{outline:2px solid #4187b9;outline-offset:2px}
@media(max-width:540px){.nfq-admin-invites{padding:10px}.nfq-invite-toolbar{align-items:flex-start}.nfq-invite-intro{flex:1;min-width:170px}}

/* 14H137C5 · Quiet, correctly-sized invitation composer with keyboard focus
   and intact independent confirmation and audited delivery semantics. */
.nfq-admin-invites{
 min-width:0;
 border-color:#dce5ef;
 border-radius:8px;
 background:transparent;
 box-shadow:none;
 padding:12px 13px;
}
.nfq-invite-intro{min-width:0;gap:5px 9px}
.nfq-invite-toolbar{gap:9px 13px}
.nfq-invite-actions{min-width:0;flex-wrap:wrap;gap:5px}
.nfq-invite-launch,.nfq-invite-light,.nfq-invite-send{
 display:inline-flex;
 align-items:center;
 justify-content:center;
 width:auto;
 min-width:0;
 max-width:100%;
 min-height:40px;
 padding:7px 10px;
 background:transparent;
 border:1px solid #c6d7e9;
 border-radius:6px;
 color:#285caa;
 font:inherit;
 font-size:11.5px;
 font-weight:590;
 line-height:1.3;
 box-shadow:none;
 white-space:normal;
 overflow-wrap:anywhere;
 cursor:pointer;
}
.nfq-invite-light{border-color:transparent}
.nfq-invite-launch:hover:not(:disabled),
.nfq-invite-light:hover:not(:disabled),
.nfq-invite-send:hover:not(:disabled){
 background:rgba(41,121,255,.06);
 border-color:#9dbce6;
 color:#20549b;
}
.nfq-invite-composer{
 width:100%;
 max-width:510px;
 min-width:0;
 gap:9px;
 margin-top:11px;
 padding-top:12px;
}
.nfq-invite-field input{
 height:42px;
 min-height:42px;
 max-width:100%;
 border-radius:6px;
 border-color:#cbd9e8;
 background:transparent;
}
.nfq-invite-kind{gap:6px 15px}
.nfq-invite-kind label{
 min-height:30px;
 width:auto;
 max-width:100%;
 overflow-wrap:anywhere;
}
.nfq-invite-form-actions{flex-wrap:wrap;gap:5px 8px}
.nfq-invite-confirm span{min-width:0;overflow-wrap:anywhere}
.nfq-invite-history{min-width:0}
.nfq-invite-history-row{min-width:0;gap:4px 12px}
.nfq-invite-history-row>span{min-width:0;overflow-wrap:anywhere}
.nfq-admin-invites :is(button,input,summary):focus-visible{
 outline:2px solid #2979ff;
 outline-offset:2px;
}
@media(max-width:540px){
 .nfq-admin-invites{padding:10px}
 .nfq-invite-toolbar{align-items:flex-start}
 .nfq-invite-intro{flex:1 1 150px}
 .nfq-invite-actions{justify-content:flex-start}
 .nfq-invite-composer{max-width:100%}
}

</style>

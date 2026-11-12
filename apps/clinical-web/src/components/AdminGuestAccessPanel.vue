<script setup lang="ts">
import {computed,ref,watch,onUnmounted} from 'vue';
import type {ResearchAccountRow} from '../services/researchAccountDirectory';
import type {createGuestAccessAdminClient,GuestAccessAction,GuestAccessState} from '../services/guestAccessAdministration';
const props=defineProps<{target:ResearchAccountRow|null;allowed:boolean;
 client:ReturnType<typeof createGuestAccessAdminClient>|null}>();
const emit=defineEmits<{changed:[]}>();
const current=ref<GuestAccessState|null>(null),loading=ref(false);
const reason=ref(''),confirmed=ref(false),saving=ref(false),uncertain=ref(false);
const notice=ref(''),failed=ref(false);
let epoch=0;
let abort:AbortController|null=null;
const action=computed<GuestAccessAction>(()=>current.value?.active?'revoke':'grant');
const blocked=computed(()=>!props.target?.emailConfirmed||
 (action.value==='grant'&&Boolean(props.target?.role&&!props.target?.revoked)));
const canSubmit=computed(()=>Boolean(props.allowed&&props.client&&props.target&&current.value)&&
 !saving.value&&!loading.value&&!uncertain.value&&!blocked.value&&confirmed.value&&
 reason.value.trim().length>=8&&reason.value.trim().length<=160);
async function check(preserveNotice=false){
 const id=++epoch;
 abort?.abort();abort=new AbortController();
 current.value=null;loading.value=true;
 if(!preserveNotice)notice.value='';
 failed.value=false;uncertain.value=false;confirmed.value=false;reason.value='';
 if(!props.allowed||!props.target||!props.client){loading.value=false;return;}
 try{
  const next=await props.client.read(props.target.userId,abort.signal);
  if(id!==epoch||!props.allowed)return;
  current.value=next;
  loading.value=false;
 }catch{
  if(id!==epoch||!props.allowed)return;
  notice.value='Guest designation could not be verified. Access changes are unavailable.';
  failed.value=true;loading.value=false;
 }
}
watch(()=>[props.target?.userId,props.allowed],()=>{void check();},{immediate:true});
onUnmounted(()=>{++epoch;abort?.abort();});
async function submit(){
 if(!canSubmit.value||!props.target||!props.client)return;
 const target=props.target.userId,operation=action.value;
 const rationale=reason.value;
 const id=epoch;
 saving.value=true;notice.value='';failed.value=false;
 try{
  await props.client.set(target,operation,rationale);
  if(id!==epoch)return;
  // The write response alone does not prove the new designation state.
  // Re-read before showing a success message, retaining the result visibly.
  await check(true);
  if(current.value?.active===(operation==='grant')){
   notice.value=operation==='grant'?'Guest access designated and verified.':'Guest access revoked and verified.';
   failed.value=false;
  }else if(current.value){
   notice.value='The server accepted a change request, but the current Guest designation does not match it. Recheck before taking another action.';
   failed.value=true;uncertain.value=true;
  }
  emit('changed');
 }catch(error){
  if(id!==epoch)return;
  uncertain.value=true;failed.value=true;
  notice.value=error instanceof Error?error.message:'Server state is uncertain. Refresh before attempting any change.';
 }finally{saving.value=false;}
}
</script>
<template>
 <section class="nfq-guest-access" aria-label="Guest access administration" data-testid="admin-guest-access">
  <div class="nfq-guest-top">
   <div><strong>External Guest access</strong>
    <span v-if="loading" role="status">Checking…</span>
    <span v-else-if="current" data-testid="guest-designation-status">{{current.active?'Active':'Not designated'}}</span>
   </div>
   <button type="button" :disabled="saving||loading" class="nfq-guest-light" @click="check()">Recheck</button>
  </div>
  <p class="nfq-guest-explain">Guest designation is separate from Contributor and Reviewer membership and from neumDESK professional identity.</p>
  <p v-if="blocked&&current&&!current.active" class="nfq-guest-info">
   {{!target?.emailConfirmed?'Verify this account’s email first.':'Revoke the existing research membership before assigning external Guest access.'}}
  </p>
  <form v-if="current&&!blocked" class="nfq-guest-form" @submit.prevent="submit">
   <label for="nfq-guest-reason">{{current.active?'Reason for revocation':'Reason for designation'}}</label>
   <textarea id="nfq-guest-reason" v-model="reason" minlength="8" maxlength="160"
    rows="2" required :disabled="saving||uncertain" placeholder="Explain the research access decision"/>
   <label class="nfq-guest-ack">
    <input type="checkbox" v-model="confirmed" :disabled="saving||uncertain"/>
    <span>I verified the account and authorize this audited {{current.active?'revocation':'Guest designation'}}.</span>
   </label>
   <button type="submit" class="nfq-guest-action" :disabled="!canSubmit">
    {{saving?'Saving…':current.active?'Revoke Guest access':'Designate external Guest'}}
   </button>
  </form>
  <p v-if="notice" :role="failed?'alert':'status'" class="nfq-guest-message">{{notice}}</p>
  <p v-if="uncertain" class="nfq-guest-message">Recheck current status before taking further action.</p>
 </section>
</template>
<style scoped>
.nfq-guest-access{min-width:0;border-top:1px solid #e4ebf2;padding-top:12px;margin-top:12px;display:grid;gap:9px}
.nfq-guest-top{display:flex;gap:12px;justify-content:space-between;align-items:center}
.nfq-guest-top div{display:flex;flex-wrap:wrap;gap:7px;align-items:center;font-size:11px;color:#647b8e}
.nfq-guest-top strong{font-weight:680;color:#29455e;font-size:12px}
.nfq-guest-light{background:transparent;border:0;font-size:11px;color:#326c96;cursor:pointer}
.nfq-guest-light:disabled{opacity:.5}
.nfq-guest-explain,.nfq-guest-info,.nfq-guest-message{font-size:11px;color:#61798e;line-height:1.5;margin:0}
.nfq-guest-info,.nfq-guest-message{color:#86643e}
.nfq-guest-form{display:grid;gap:8px}
.nfq-guest-form>label:first-child{font-size:11px;color:#526b81;font-weight:650}
.nfq-guest-form textarea{width:100%;resize:vertical;min-height:56px;border:1px solid #cfdce7;border-radius:7px;background:#fff;color:#29445b;font:12px/1.5 inherit;padding:8px 9px}
.nfq-guest-ack{display:flex;gap:7px;align-items:flex-start;font-size:11px;color:#5a7185;line-height:1.5}
.nfq-guest-ack input{margin-top:3px;accent-color:#295f88}
.nfq-guest-action{justify-self:start;padding:7px 11px;background:#fff;border:1px solid #b4cadd;border-radius:6px;color:#2e5d7f;font-size:11.5px;font-weight:670;cursor:pointer}
.nfq-guest-action:disabled{opacity:.45;cursor:not-allowed}
.nfq-guest-form :focus-visible,.nfq-guest-light:focus-visible{outline:2px solid #2c7db7;outline-offset:2px}

/* 14H137C5: verified guest actions and status remain visible without
   oversized fills or illegible tiny hit targets. */
.nfq-guest-access{min-width:0;gap:8px}
.nfq-guest-top{flex-wrap:wrap;min-width:0;gap:6px 12px}
.nfq-guest-top>div{min-width:0}
.nfq-guest-light,.nfq-guest-action{
 display:inline-flex;
 align-items:center;
 justify-content:center;
 min-height:40px;
 width:auto;
 max-width:100%;
 padding:7px 10px;
 background:transparent;
 border:1px solid #c6d7e9;
 border-radius:6px;
 color:#285caa;
 font:inherit;
 font-size:11.5px;
 font-weight:590;
 line-height:1.35;
 cursor:pointer;
 box-shadow:none;
 white-space:normal;
 overflow-wrap:anywhere;
}
.nfq-guest-light{margin-left:auto}
.nfq-guest-light:hover:not(:disabled),
.nfq-guest-action:hover:not(:disabled){
 background:rgba(41,121,255,.065);
 border-color:#9bbbe4;
}
.nfq-guest-form{min-width:0}
.nfq-guest-form textarea{
 min-width:0;
 max-width:100%;
 min-height:64px;
 border-radius:6px;
 background:transparent;
}
.nfq-guest-ack span{min-width:0;overflow-wrap:anywhere}
.nfq-guest-message{overflow-wrap:anywhere}
.nfq-guest-access :is(button,textarea,input):focus-visible{
 outline:2px solid #2979ff;outline-offset:2px;
}
@media(max-width:410px){
 .nfq-guest-top{align-items:flex-start}
 .nfq-guest-top>div{flex:1 1 130px}
 .nfq-guest-light{margin-left:0}
}

</style>

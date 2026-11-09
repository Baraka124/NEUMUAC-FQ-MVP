<script setup lang="ts">
import {computed,ref,watch,onUnmounted} from 'vue';
import {authController} from '../services/authSession';
import {researcherRole} from '../services/researchRole';
import {readConfigFromEnvironment,type RealVariant} from '../services/liveVariants';
import {
 canOfferVariantCuration,canReviewVariantCuration,createVariantCurationClient,
 type VariantCurationField,type VariantCurationProposal,type VariantCurationDecision
} from '../services/variantCuration';

const props=defineProps<{variant:RealVariant}>();
const emit=defineEmits<{(e:'published'):void}>();
// FQ 14H122 is installed. UI availability defaults on for verified members;
// the server independently authorizes every operation. Set the flag to 'false' to disable.
const enabled=import.meta.env.VITE_NFQ_VARIANT_CURATION_ENABLED!=='false';
const config=readConfigFromEnvironment();
const client=enabled&&config&&authController?createVariantCurationClient(config,authController):null;
const authPhase=computed(()=>authController?.state.phase??'signed-out');
const canSubmit=computed(()=>Boolean(client)&&canOfferVariantCuration(enabled,authPhase.value,researcherRole));
const canReview=computed(()=>Boolean(client)&&canReviewVariantCuration(enabled,authPhase.value,researcherRole));
const expanded=ref(false);
const field=ref<VariantCurationField>('legacy_name');
const proposedValue=ref('');
const rationale=ref('');
const sourceReference=ref('');
const proposalStatus=ref('');
const queueNotice=ref('');
const queue=ref<readonly VariantCurationProposal[]>([]);
const busy=ref(false);
const loading=ref(false);
const reviewNotes=ref<Record<string,string>>({});
const confirmedProposal=ref<string|null>(null);
const currentValue=computed(()=>({
 legacy_name:props.variant.legacyName,
 protein_name:props.variant.proteinName,
 cdna_name:props.variant.cdnaName,
 alt_names:props.variant.aliases.join(', ')
})[field.value]||'Not recorded');
const fields:readonly {value:VariantCurationField;label:string}[]=[
 {value:'legacy_name',label:'Legacy name'},
 {value:'protein_name',label:'Protein notation'},
 {value:'cdna_name',label:'cDNA notation'},
 {value:'alt_names',label:'Recorded aliases'}
];
let generation=0;
let queueAbort:AbortController|null=null;
async function refreshQueue(){
 queueAbort?.abort();const epoch=++generation;
 queue.value=[];queueNotice.value='';loading.value=false;
 if(!client||!canSubmit.value||!expanded.value)return;
 const abort=new AbortController();queueAbort=abort;loading.value=true;
 try{
  const list=await client.pending(props.variant.id,abort.signal);
  if(epoch!==generation||abort.signal.aborted)return;
  queue.value=list;
 }catch{
  if(epoch===generation&&!abort.signal.aborted)queueNotice.value='Curation queue unavailable. No editing permissions were changed.';
 }finally{if(epoch===generation)loading.value=false;}
}
watch([()=>props.variant.id,canSubmit,expanded],()=>{
 ++generation;queueAbort?.abort();queue.value=[];proposalStatus.value='';busy.value=false;
 reviewNotes.value={};confirmedProposal.value=null;
 if(expanded.value&&canSubmit.value)void refreshQueue();
},{immediate:true});
watch(field,()=>{proposedValue.value='';proposalStatus.value='';});
onUnmounted(()=>{++generation;queueAbort?.abort();});
async function submit(){
 if(!client||!canSubmit.value||busy.value)return;
 busy.value=true;proposalStatus.value='';
 try{
  const id=await client.submit({
   variantId:props.variant.id,field:field.value,proposedValue:proposedValue.value,
   rationale:rationale.value,sourceReference:sourceReference.value
  });
  proposalStatus.value='Correction #'+id+' submitted. The published variant is unchanged until independent review.';
  proposedValue.value='';rationale.value='';sourceReference.value='';
  await refreshQueue();
 }catch{
  proposalStatus.value='Submission was not confirmed. Check the pending queue before attempting again.';
 }finally{busy.value=false;}
}
async function decide(proposal:VariantCurationProposal,decision:VariantCurationDecision){
 if(!client||!canReview.value||busy.value||confirmedProposal.value!==proposal.id)return;
 busy.value=true;proposalStatus.value='';
 try{
  await client.decide(proposal,decision,reviewNotes.value[proposal.id]??'');
  proposalStatus.value=decision==='approved'
   ?'Approved correction published with an audit entry. Reloading the current variant.'
   :'Correction rejected and review recorded. Published variant unchanged.';
  confirmedProposal.value=null;reviewNotes.value={};
  await refreshQueue();
  if(decision==='approved')emit('published');
 }catch{
  proposalStatus.value='Review result not confirmed. Reload the queue and check for a conflicting update.';
 }finally{busy.value=false;}
}
</script>

<template>
 <section v-if="canSubmit" class="nfq-curation" aria-label="Variant scientific curation" data-testid="variant-curation">
  <button type="button" class="nfq-curation-toggle" :aria-expanded="expanded"
   @click="expanded=!expanded">
   <span>Curate variant</span><span aria-hidden="true">{{expanded?'−':'+'}}</span>
  </button>
  <div v-if="expanded" class="nfq-curation-body">
   <p class="nfq-curation-note">Propose source-supported nomenclature corrections. Another authorized reviewer must approve before the published variant changes. Therapeutic conclusions are not editable here.</p>
   <form class="nfq-curation-form" @submit.prevent="submit">
    <label for="nfq-curation-field">Field</label>
    <select id="nfq-curation-field" v-model="field" :disabled="busy">
     <option v-for="item in fields" :key="item.value" :value="item.value">{{item.label}}</option>
    </select>
    <p class="nfq-curation-current">Currently recorded: {{currentValue}}</p>
    <label for="nfq-curation-value">Proposed replacement</label>
    <input id="nfq-curation-value" v-model="proposedValue" :disabled="busy" maxlength="500"
     required autocomplete="off" placeholder="Source-supported correction" />
    <label for="nfq-curation-source">Supporting source identifier or reference</label>
    <input id="nfq-curation-source" v-model="sourceReference" :disabled="busy" maxlength="250"
     required autocomplete="off" placeholder="DOI, PMID or source record" />
    <label for="nfq-curation-reason">Reason for change</label>
    <textarea id="nfq-curation-reason" v-model="rationale" :disabled="busy" maxlength="900"
     minlength="20" rows="3" required placeholder="Explain why this recorded value needs correction." />
    <button class="nfq-curation-action" type="submit" :disabled="busy||!proposedValue.trim()||!sourceReference.trim()||rationale.trim().length<20">{{busy?'Processing…':'Submit for scientific review'}}</button>
   </form>
   <p v-if="proposalStatus" role="status" class="nfq-curation-note">{{proposalStatus}}</p>
   <div class="nfq-curation-review">
    <div class="nfq-curation-review-head">
     <strong>Pending corrections</strong>
     <button type="button" :disabled="busy||loading" @click="refreshQueue">Refresh</button>
    </div>
    <p v-if="loading" role="status" class="nfq-curation-note">Loading the authorized queue…</p>
    <p v-if="queueNotice" role="alert" class="nfq-curation-note">{{queueNotice}}</p>
    <p v-else-if="!loading&&!queue.length" class="nfq-curation-note">No pending corrections visible to this account.</p>
    <ul v-if="queue.length" class="nfq-curation-items">
     <li v-for="item in queue" :key="item.id">
      <strong>{{fields.find(f=>f.value===item.field)?.label||item.field}} · #{{item.id}}</strong>
      <p>Recorded: {{item.recordedValue||'Not recorded'}}</p>
      <p>Proposed: {{item.proposedValue}}</p>
      <p>Reference: {{item.sourceReference}}</p>
      <p>Justification: {{item.rationale}}</p>
      <p v-if="item.submittedBy===authController?.state.userId" class="nfq-curation-note">Your proposal. An independent reviewer must decide.</p>
      <template v-else-if="canReview">
       <label :for="'nfq-review-note-'+item.id">Independent review note</label>
       <textarea :id="'nfq-review-note-'+item.id" v-model="reviewNotes[item.id]" rows="2" maxlength="900" :disabled="busy" placeholder="Justify acceptance or rejection (15+ characters)" />
       <label class="nfq-curation-confirm">
        <input type="checkbox" :checked="confirmedProposal===item.id" :disabled="busy" @change="confirmedProposal=confirmedProposal===item.id?null:item.id" />
        Confirm review of this exact proposal
       </label>
       <div class="nfq-curation-buttons">
        <button type="button" :disabled="busy||confirmedProposal!==item.id||(reviewNotes[item.id]??'').trim().length<15" @click="decide(item,'approved')">Approve &amp; publish</button>
        <button type="button" :disabled="busy||confirmedProposal!==item.id||(reviewNotes[item.id]??'').trim().length<15" @click="decide(item,'rejected')">Reject</button>
       </div>
      </template>
     </li>
    </ul>
   </div>
  </div>
 </section>
</template>

<style scoped>
.nfq-curation{margin:.6rem 0 1rem;border:1px solid var(--border,#dce2e7);border-radius:10px;background:var(--surface,#fff)}
.nfq-curation-toggle{display:flex;justify-content:space-between;align-items:center;width:100%;padding:.7rem .85rem;border:0;background:transparent;color:inherit;font:inherit;font-size:.83rem;font-weight:650;cursor:pointer}
.nfq-curation-body{padding:0 .85rem .9rem;display:grid;gap:.65rem}
.nfq-curation-note,.nfq-curation-current{font-size:.76rem;color:var(--text-muted,#637083);line-height:1.45;margin:0}
.nfq-curation-form{display:grid;gap:.4rem;max-width:580px}
.nfq-curation-form label,.nfq-curation-review label{font-size:.77rem;font-weight:600}
.nfq-curation input:not([type="checkbox"]),.nfq-curation select,.nfq-curation textarea{width:100%;max-width:100%;min-width:0;padding:.53rem .65rem;border:1px solid var(--border,#dce2e7);border-radius:7px;background:var(--surface,#fff);color:inherit;font:inherit;font-size:.82rem}
.nfq-curation button:focus-visible,.nfq-curation input:focus-visible,.nfq-curation textarea:focus-visible,.nfq-curation select:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.nfq-curation-action,.nfq-curation-buttons button,.nfq-curation-review-head button{padding:.53rem .8rem;border:1px solid var(--border,#dce2e7);border-radius:7px;background:var(--surface-secondary,#f4f6f8);color:inherit;font:inherit;font-size:.78rem;cursor:pointer}
.nfq-curation-action{justify-self:start;margin-top:.35rem}
.nfq-curation button:disabled{opacity:.52;cursor:not-allowed}
.nfq-curation-review{display:grid;gap:.6rem;padding-top:.75rem;border-top:1px solid var(--border,#dce2e7)}
.nfq-curation-review-head,.nfq-curation-buttons{display:flex;gap:.6rem;align-items:center;justify-content:space-between;flex-wrap:wrap}
.nfq-curation-review-head strong{font-size:.82rem}
.nfq-curation-items{padding:0;margin:0;list-style:none;display:grid;gap:.65rem}
.nfq-curation-items li{display:grid;gap:.4rem;padding:.75rem;border:1px solid var(--border,#dce2e7);border-radius:8px;overflow-wrap:anywhere}
.nfq-curation-items li>p{font-size:.77rem;margin:0}
.nfq-curation-confirm{display:flex;gap:.5rem;align-items:center}
.nfq-curation-confirm input{flex:none}
</style>

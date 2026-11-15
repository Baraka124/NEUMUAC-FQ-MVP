<script setup lang="ts">
import {computed,onUnmounted,ref,watch} from 'vue';
import {RouterLink} from 'vue-router';
import type {ResearchHistory} from '../services/liveResearchHistory';
import {readConfigFromEnvironment} from '../services/liveVariants';
import {createLiveEvidenceSource,type LiveEvidenceReference} from '../services/liveEvidence';
import EvidenceConflictTraceability from './EvidenceConflictTraceability.vue';
import {recordedConflictFocus} from '../domain/recordedConflictFocus';
import {prepareConflictReviewPacket} from '../domain/conflictReviewPacket';
import ContextHelp from './ContextHelp.vue';

const props=defineProps<{variantId:string;history:ResearchHistory}>();
const focus=computed(()=>recordedConflictFocus(props.history,props.variantId));
const config=readConfigFromEnvironment();
let source:ReturnType<typeof createLiveEvidenceSource>|null=null;
try{source=config?createLiveEvidenceSource(config):null;}catch{source=null;}
const phase=ref<'idle'|'loading'|'ready'|'unavailable'>('idle');
const message=ref('');
const packet=ref<string|null>(null);
const sourceCount=ref<number|null>(null);
const references=ref<readonly LiveEvidenceReference[]>([]);
let controller:AbortController|null=null;
let generation=0;
function invalidate():void{
 ++generation;
 controller?.abort();controller=null;
 packet.value=null;sourceCount.value=null;references.value=[];phase.value='idle';message.value='';
}
watch(()=>[props.variantId,props.history],invalidate);
onUnmounted(invalidate);
async function prepare():Promise<void>{
 invalidate();
 if(!source||!focus.value?.unresolved.length){
  phase.value='unavailable';
  message.value='A complete reference source and unresolved recorded contradictions are required.';
  return;
 }
 const run=generation,id=props.variantId,history=props.history;
 const pending=new AbortController();controller=pending;phase.value='loading';
 try{
  // A single, bounded complete-variant read (201st row rejects truncation).
  // No inferred association between any reference and any contradiction.
  const linkedSources=await source.forVariant(id,pending.signal);
  if(pending.signal.aborted||run!==generation||id!==props.variantId||history!==props.history)return;
  const result=prepareConflictReviewPacket(id,history,linkedSources,true);
  if(!result){
   phase.value='unavailable';
   message.value='The retrieved research records did not pass packet integrity checks.';
   return;
  }
  packet.value=result;references.value=linkedSources;sourceCount.value=linkedSources.length;phase.value='ready';
 }catch{
  if(pending.signal.aborted||run!==generation)return;
  packet.value=null;sourceCount.value=null;phase.value='unavailable';
  message.value='The complete variant-linked reference register was unavailable. No partial review packet was generated.';
 }
}
function download():void{
 if(phase.value!=='ready'||!packet.value||!focus.value?.unresolved.length)return;
 const id=props.variantId;
 if(!/^[1-9]\d{0,17}$/.test(id))return;
 const url=URL.createObjectURL(new Blob([packet.value],{type:'text/markdown;charset=utf-8'}));
 try{
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download='neumuacFQ-unresolved-review-'+id+'.md';
  document.body.appendChild(anchor);anchor.click();anchor.remove();
  message.value='Prepared research metadata exported. No review was submitted or approved.';
 }finally{window.setTimeout(()=>URL.revokeObjectURL(url),5000);}
}
</script>

<template>
 <section v-if="focus?.unresolved.length" class="nfq-audit-review" aria-labelledby="nfq-review-preparation-title"
  data-testid="nfq-unresolved-review">
  <div class="nfq-audit-review-head">
   <div>
    <span class="nfq-audit-label">RESEARCH HANDOFF · OPEN CONTRADICTIONS</span>
    <h2 id="nfq-review-preparation-title">Review preparation</h2>
    <p>{{focus.unresolved.length}} {{focus.unresolved.length===1?'record':'records'}} currently marked unresolved.
     Recorded severity is presented as source metadata, not independently assessed clinical priority.</p>
   </div>
   <ContextHelp label="About contradiction review preparation" title="Source-bound research preparation">
    <p>Only the selected variant's valid recorded contradictions are listed. A scientific review packet is prepared solely after the complete linked-reference register has been retrieved.</p>
    <p>References are listed as candidate context, not as proof supporting any individual contradiction. This workspace cannot assign reviewers, approve changes or resolve conflicts.</p>
   </ContextHelp>
  </div>
  <div class="nfq-audit-review-records">
   <div v-for="item in focus.unresolved" :key="item.id" class="nfq-audit-review-record">
    <span>CONFLICT {{item.id}}</span>
    <strong>{{item.field}}</strong>
    <small>Recorded severity · {{item.recordedSeverity||'Not recorded'}}</small>
   </div>
  </div>
  <div class="nfq-audit-review-actions">
   <button type="button" data-testid="nfq-prepare-review" :disabled="phase==='loading'||!source" @click="prepare">
    {{phase==='loading'?'Retrieving sources…':phase==='ready'?'Refresh source context':'Prepare source context'}}
   </button>
   <button v-if="phase==='ready'&&packet" type="button" data-testid="nfq-download-review" @click="download">
    Download research packet · MD
   </button>
   <RouterLink :to="{path:'/evidence',query:{variant:variantId}}">Inspect evidence register <span aria-hidden="true">→</span></RouterLink>
  </div>
  <p v-if="phase==='loading'" class="nfq-audit-review-notice" role="status">Verifying all accessible linked references for this one variant…</p>
  <p v-else-if="phase==='ready'" class="nfq-audit-review-notice" role="status">
   Complete source read · {{sourceCount}} {{sourceCount===1?'linked reference':'linked references'}} retrieved. The packet is ready for independent review, not approval.
  </p>
  <p v-else-if="phase==='unavailable'||(!source&&phase==='idle')" class="nfq-audit-review-notice" role="alert">
   {{message||'Reference retrieval is not configured. No packet can be prepared.'}}
  </p>
  <p v-if="message&&phase==='ready'" class="nfq-audit-review-notice" role="status">{{message}}</p>
  <EvidenceConflictTraceability v-if="phase==='ready'&&packet&&references.length"
   :variant-id="variantId" :history="history" :references="references" />
  <p class="nfq-audit-review-disclaimer">Read only · No clinical recommendations, decisions, role assignments, evidence-quality grading or modifications to the source records.</p>
 </section>
</template>

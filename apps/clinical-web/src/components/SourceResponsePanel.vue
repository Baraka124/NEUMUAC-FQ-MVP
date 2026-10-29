<script setup lang="ts">
import {computed,onUnmounted,ref,watch} from 'vue';
import {createSourceSpecificResponseSource,type SourceSpecificResponse} from '../services/sourceSpecificResponse';
import {describeSourceFinding} from '../domain/responseDisplay';
import {assessRecordedResponseParity} from '../domain/recordedResponseParity';
import {readConfigFromEnvironment} from '../services/liveVariants';
import {authSessionProvider} from '../services/authSession';
import type {LegacyEtiRecord} from '../services/legacyEtiResponse';

const props=defineProps<{variantId:string;legacy:LegacyEtiRecord}>();
const config=readConfigFromEnvironment();
const source=config?createSourceSpecificResponseSource(config,fetch,authSessionProvider):null;
const rows=ref<readonly SourceSpecificResponse[]>([]);
const ready=ref(false),loading=ref(false),error=ref('');
let abort:AbortController|null=null;
const parity=computed(()=>ready.value&&!error.value&&props.legacy.id===props.variantId?
 assessRecordedResponseParity(props.legacy,rows.value):null);
const disagreements=computed(()=>parity.value?.signals.filter(signal=>
 ['category-flag-disagreement','category-source-disagreement','source-source-disagreement'].includes(signal.kind))||[]);
watch(()=>props.variantId,async id=>{
 abort?.abort();rows.value=[];ready.value=false;loading.value=false;error.value='';
 if(!source)return;
 const controller=new AbortController();abort=controller;
 loading.value=true;
 try{
  const found=await source.get(id,controller.signal);
  if(!controller.signal.aborted&&props.variantId===id){rows.value=found;ready.value=true;}
 }catch{
  if(!controller.signal.aborted&&props.variantId===id)
   error.value='Source-specific response records could not be loaded.';
 }finally{if(!controller.signal.aborted)loading.value=false;}
},{immediate:true});
onUnmounted(()=>abort?.abort());
</script>

<template>
 <section class="nfq-source-response" aria-labelledby="nfq-source-response-title">
  <div class="source-head">
   <h4 id="nfq-source-response-title">Source evidence</h4>
   <span v-if="ready" class="source-count">{{rows.length}} linked {{rows.length===1?'record':'records'}}</span>
  </div>
  <p v-if="loading" role="status" class="source-status">Loading source records…</p>
  <p v-else-if="error" role="status" class="source-status">{{error}}</p>
  <p v-else-if="!source" role="status" class="source-status">Source register not configured.</p>
  <p v-else-if="ready&&!rows.length" role="status" class="source-empty">No source-specific response recorded for this variant.</p>
  <div v-else-if="ready" class="source-list">
   <article v-for="item in rows" :key="item.id" class="source-row">
    <div class="source-row-heading">
     <strong>{{item.source.name}}</strong>
     <span>{{item.source.year??'Undated'}} · row #{{item.id}}</span>
    </div>
    <dl class="source-findings">
     <div><dt>ETI</dt><dd>{{describeSourceFinding(item.eti)}}</dd></div>
     <div v-if="item.alyftrek!==null"><dt>Alyftrek</dt><dd>{{describeSourceFinding(item.alyftrek)}}</dd></div>
    </dl>
    <div class="source-foot">
     <span>{{item.source.type.replaceAll('_',' ')}}</span>
     <a v-if="item.source.url" :href="item.source.url" target="_blank" rel="noopener noreferrer">Source document ↗</a>
     <span v-else>Document link not recorded</span>
    </div>
   </article>
  </div>
  <div v-if="ready&&disagreements.length" class="source-disagreement" role="note" data-testid="eti-parity-status">
   <strong>Recorded values disagree</strong>
   <ul data-testid="eti-parity-signals">
    <li v-for="signal in disagreements" :key="signal.kind">{{signal.description}}<span v-if="signal.evidenceIds.length"> Source row #{{signal.evidenceIds.join(', #')}}.</span></li>
   </ul>
  </div>
  <p v-else-if="ready&&rows.length&&parity?.state==='incomplete'" class="source-qualification" data-testid="eti-parity-status">Comparison incomplete · some original response fields are unknown or missing.</p>
  <p v-else-if="ready&&rows.length&&parity?.state==='aligned-recorded-fields'" class="source-qualification" data-testid="eti-parity-status">Recorded fields agree · source verification pending.</p>
 </section>
</template>

<style scoped>
.nfq-source-response{min-width:0;border-left:1px solid var(--border,#dce4e5);padding:.2rem 0 .1rem 1.1rem;margin:0}
.source-head{display:flex;align-items:baseline;justify-content:space-between;gap:.55rem;flex-wrap:wrap;margin-bottom:.55rem}
.source-head h4{font-size:.82rem;font-weight:680;margin:0}
.source-count{font-size:.7rem;color:var(--text-muted,#687381);font-variant-numeric:tabular-nums}
.source-status,.source-empty{font-size:.76rem;color:var(--text-muted,#687381);line-height:1.5;margin:.6rem 0}
.source-empty{max-width:39ch}
.source-list{display:grid;gap:.6rem;margin:0}
.source-row{border-top:1px solid var(--border,#e1e6e8);padding:.55rem 0 0;min-width:0}
.source-row-heading{display:flex;justify-content:space-between;align-items:baseline;gap:.4rem;flex-wrap:wrap}
.source-row-heading strong{font-size:.77rem;line-height:1.4;font-weight:650}
.source-row-heading span{font-size:.68rem;color:var(--text-muted,#687381);white-space:nowrap}
.source-findings{display:flex;gap:.6rem 1rem;flex-wrap:wrap;margin:.6rem 0 .45rem}
.source-findings>div{display:flex;align-items:baseline;gap:.35rem;font-size:.75rem}
.source-findings dt{color:var(--text-muted,#687381)}
.source-findings dd{margin:0;font-weight:670}
.source-foot{display:flex;justify-content:space-between;align-items:baseline;gap:.4rem .9rem;flex-wrap:wrap;font-size:.68rem;line-height:1.4;color:var(--text-muted,#687381)}
.source-foot a{color:inherit;font-weight:600}
.source-disagreement{margin-top:.7rem;border-left:2px solid #b18b53;padding:.35rem 0 .35rem .65rem}
.source-disagreement>strong{font-size:.76rem;font-weight:680}
.source-disagreement ul{padding-left:1rem;font-size:.72rem;line-height:1.5;margin:.45rem 0 0}
.source-disagreement li+li{margin-top:.25rem}
.source-qualification{border-top:1px solid var(--border,#e1e6e8);margin:.65rem 0 0;padding-top:.5rem;font-size:.71rem;line-height:1.5;color:var(--text-muted,#687381)}
@media(max-width:820px){.nfq-source-response{border-left:0;border-top:1px solid var(--border,#dce4e5);padding:.85rem 0 0}}
@media(max-width:600px){.source-row-heading span{white-space:normal}}
</style>

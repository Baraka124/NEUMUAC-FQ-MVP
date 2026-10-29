<script setup lang="ts">
import {computed,onUnmounted,ref,watch} from 'vue';
import {createSourceSpecificResponseSource,responseLabel,type SourceSpecificResponse} from '../services/sourceSpecificResponse';
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
   error.value='Source-specific response records are unavailable or could not be verified.';
 }finally{if(!controller.signal.aborted)loading.value=false;}
},{immediate:true});
onUnmounted(()=>{abort?.abort();});
</script>

<template>
 <section class="nfq-source-response" aria-labelledby="nfq-source-response-title">
  <header>
   <h4 id="nfq-source-response-title">Source-specific response records</h4>
   <span>Original research register</span>
  </header>
  <p class="source-note">Original source labels are preserved here. Names, source types, and recorded findings have not been independently verified against source documents.</p>
  <p v-if="loading" role="status">Loading source-linked responses…</p>
  <p v-else-if="error" role="status">{{error}}</p>
  <p v-else-if="!source" role="status">The source-specific register is not configured.</p>
  <p v-else-if="ready&&!rows.length" role="status">No source-linked response rows in this register. This does not establish absence of published evidence.</p>
  <div v-else-if="ready" class="source-rows">
   <article v-for="item in rows" :key="item.id" class="source-item">
    <div class="source-item-heading">
     <strong>{{item.source.name}}</strong>
     <span>{{item.source.year??'Year unrecorded'}} · {{item.source.type}} · source row #{{item.id}}</span>
    </div>
    <dl>
     <div><dt>ETI · source-specific label</dt><dd>{{responseLabel(item.eti)}}</dd></div>
     <div><dt>Alyftrek · source-specific label</dt><dd>{{responseLabel(item.alyftrek)}}</dd></div>
    </dl>
    <p v-if="item.source.active===false" class="source-note">This source is marked inactive in the original register.</p>
    <a v-if="item.source.url" :href="item.source.url" target="_blank" rel="noopener noreferrer">Recorded document URL</a>
    <p v-else class="source-note">No document URL is recorded for this source.</p>
   </article>
  </div>
  <div class="source-comparison" aria-labelledby="nfq-source-parity-title">
   <h4 id="nfq-source-parity-title">Original-field continuity check</h4>
   <p v-if="!ready" class="source-note">Comparison unavailable until source-specific records load successfully.</p>
   <template v-else-if="parity">
    <p class="parity-state" data-testid="eti-parity-status">{{parity.state==='requires-review'?'Recorded fields require comparison review':parity.state==='incomplete'?'Recorded evidence is incomplete':'Recorded fields align · scientific verification pending'}}</p>
    <p class="source-note">{{parity.sourceRecords}} source-specific records · {{parity.etiRecords}} with ETI response labels</p>
    <ul v-if="parity.signals.length" data-testid="eti-parity-signals">
     <li v-for="signal in parity.signals" :key="signal.kind">{{signal.description}}<span v-if="signal.evidenceIds.length"> Source row #{{signal.evidenceIds.join(', #')}}.</span></li>
    </ul>
    <p v-else class="source-note">These recorded fields agree. No scientific conclusion or patient-specific efficacy can be inferred.</p>
   </template>
  </div>
 </section>
</template>

<style scoped>
.nfq-source-response{margin-top:1rem;padding-top:.9rem;border-top:1px solid var(--border,#dce2e7)}
.nfq-source-response header{display:flex;justify-content:space-between;gap:.7rem;align-items:baseline;flex-wrap:wrap}
.nfq-source-response h4{margin:0;font-size:.84rem;font-weight:650}
.nfq-source-response header span{font-size:.68rem;letter-spacing:.03em;text-transform:uppercase;color:var(--text-muted,#687381)}
.source-note{font-size:.74rem;color:var(--text-muted,#687381);line-height:1.55;margin:.5rem 0}
.source-rows{display:grid;gap:.65rem;margin-top:.7rem}
.source-item{border:1px solid var(--border,#dce2e7);border-radius:8px;padding:.75rem}
.source-item-heading{display:flex;justify-content:space-between;align-items:baseline;gap:.6rem;flex-wrap:wrap}
.source-item-heading strong{font-size:.8rem}
.source-item-heading span{font-size:.68rem;color:var(--text-muted,#687381)}
.source-item dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem;margin:.7rem 0 .4rem}
.source-item dt{font-size:.7rem;color:var(--text-muted,#687381)}
.source-item dd{margin:.25rem 0 0;font-size:.78rem;font-weight:600;overflow-wrap:anywhere}
.source-item a{font-size:.74rem}
.source-comparison{margin-top:1rem;padding-top:.8rem;border-top:1px solid var(--border,#dce2e7)}
.parity-state{font-size:.8rem;font-weight:650;margin:.5rem 0 .2rem}
.source-comparison ul{padding-left:1.15rem;font-size:.75rem;line-height:1.55}
.source-comparison li{margin:.45rem 0}
@media(max-width:600px){.source-item dl{grid-template-columns:1fr}}
</style>

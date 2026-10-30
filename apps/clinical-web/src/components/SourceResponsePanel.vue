<script setup lang="ts">
import {computed,onUnmounted,ref,watch} from 'vue';
import {RouterLink} from 'vue-router';
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
const retryCount=ref(0);
let abort:AbortController|null=null;
const parity=computed(()=>ready.value&&!error.value&&props.legacy.id===props.variantId?
 assessRecordedResponseParity(props.legacy,rows.value):null);
const needsValidation=computed(()=>parity.value?.state==='requires-review');
watch([()=>props.variantId,retryCount],async ([id])=>{
 abort?.abort();rows.value=[];ready.value=false;loading.value=false;error.value='';
 if(!source)return;
 const controller=new AbortController();abort=controller;
 loading.value=true;
 try{
  const found=await source.get(id,controller.signal);
  if(!controller.signal.aborted&&props.variantId===id){rows.value=found;ready.value=true;}
 }catch{
  if(!controller.signal.aborted&&props.variantId===id)
   error.value='Could not load source evidence.';
 }finally{if(!controller.signal.aborted)loading.value=false;}
},{immediate:true});
onUnmounted(()=>abort?.abort());
</script>

<template>
 <section class="nfq-source-response" aria-labelledby="nfq-source-response-title">
  <div class="source-head">
   <h4 id="nfq-source-response-title">Source evidence</h4>
   <span v-if="ready&&rows.length" class="source-count">{{rows.length}} {{rows.length===1?'record':'records'}}</span>
  </div>
  <p v-if="loading" role="status" class="source-status">Loading source records…</p>
  <div v-else-if="error" role="alert" class="source-error"><span>{{error}}</span><button type="button" @click="retryCount++">Retry</button></div>
  <p v-else-if="!source" role="status" class="source-status">Source evidence unavailable.</p>
  <p v-else-if="ready&&!rows.length" role="status" class="source-empty">No linked source findings.</p>
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
  <div v-if="ready&&needsValidation" class="source-review" data-testid="eti-parity-status">
   <span>Review needed</span>
   <RouterLink :to="{path:'/evidence',query:{variant:variantId}}">Review evidence</RouterLink>
  </div>
 </section>
</template>

<style scoped>
.nfq-source-response{min-width:0;border-top:1px solid var(--border,#dce4e5);padding:.65rem 0 .05rem;margin:0}
.source-head{display:flex;align-items:baseline;justify-content:space-between;gap:.55rem;flex-wrap:wrap;margin-bottom:.35rem}
.source-head h4{font-size:.82rem;font-weight:680;margin:0}
.source-count{font-size:.7rem;color:var(--text-muted,#687381);font-variant-numeric:tabular-nums}
.source-status,.source-empty{font-size:.76rem;color:var(--text-muted,#687381);line-height:1.5;margin:.6rem 0}
.source-empty{max-width:39ch}
.source-list{display:grid;gap:.6rem;margin:0}
.source-row{border-top:1px solid var(--border,#e1e6e8);padding:.45rem 0 .1rem;min-width:0}
.source-row-heading{display:flex;justify-content:space-between;align-items:baseline;gap:.4rem;flex-wrap:wrap}
.source-row-heading strong{font-size:.77rem;line-height:1.4;font-weight:650}
.source-row-heading span{font-size:.68rem;color:var(--text-muted,#687381);white-space:nowrap}
.source-findings{display:flex;gap:.5rem 1rem;flex-wrap:wrap;margin:.4rem 0 .3rem}
.source-findings>div{display:flex;align-items:baseline;gap:.35rem;font-size:.75rem}
.source-findings dt{color:var(--text-muted,#687381)}
.source-findings dd{margin:0;font-weight:670}
.source-foot{display:flex;justify-content:space-between;align-items:baseline;gap:.4rem .9rem;flex-wrap:wrap;font-size:.68rem;line-height:1.4;color:var(--text-muted,#687381)}
.source-foot a{color:inherit;font-weight:600}
.source-error{display:flex;gap:.5rem 1rem;align-items:center;flex-wrap:wrap;font-size:.76rem;color:var(--text-muted,#687381);padding:.25rem 0}
.source-error button{font:inherit;color:inherit;border:1px solid var(--border,#dce4e5);border-radius:7px;background:transparent;cursor:pointer;padding:.3rem .65rem}
.source-error button:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.source-review{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.4rem .8rem;margin-top:.7rem;padding-top:.6rem;border-top:1px solid var(--border,#e1e6e8);font-size:.76rem;font-weight:600}
.source-review a{color:inherit;text-decoration:underline;text-underline-offset:3px}
@media(max-width:820px){.nfq-source-response{padding:.6rem 0 0}}
@media(max-width:600px){.source-row-heading span{white-space:normal}}
</style>

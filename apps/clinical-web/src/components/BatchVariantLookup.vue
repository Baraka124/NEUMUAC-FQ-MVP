<script setup lang="ts">
import {computed,onUnmounted,ref} from 'vue';
import type {RealVariantSource} from '../services/liveVariants';
import {variantDisplayName} from '../services/liveVariants';
import {MAX_BATCH_LOOKUP,parseBatchVariantText,resolveBatchVariants,batchLookupCsv,type BatchLookupRow} from '../domain/batchVariantLookup';
import ContextHelp from './ContextHelp.vue';

const props=defineProps<{source:RealVariantSource|null}>();
const emit=defineEmits<{close:[];open:[id:string]}>();
const raw=ref('');
const state=ref<'idle'|'running'|'ready'|'unavailable'>('idle');
const message=ref('');
const results=ref<readonly BatchLookupRow[]>([]);
const count=ref(0);
const total=ref(0);
const parsed=computed(()=>parseBatchVariantText(raw.value));
const summary=computed(()=>({
 exact:results.value.filter(x=>x.kind==='exact').length,
 candidates:results.value.filter(x=>x.kind==='candidates').length,
 missing:results.value.filter(x=>x.kind==='not-found').length,
 other:results.value.filter(x=>x.kind==='invalid'||x.kind==='unavailable').length
}));
let request:AbortController|null=null;
let epoch=0;
function reset():void{
 ++epoch;request?.abort();request=null;
 state.value='idle';results.value=[];count.value=0;total.value=0;message.value='';
}
function onInput():void{reset();}
onUnmounted(reset);
async function run():Promise<void>{
 reset();
 const validation=parsed.value;
 if(validation.error){state.value='unavailable';message.value=validation.error;return;}
 if(!props.source){state.value='unavailable';message.value='The authorized read-only catalog is not connected.';return;}
 const controller=new AbortController(),current=epoch;
 request=controller;state.value='running';total.value=validation.items.length;
 try{
  const rows=await resolveBatchVariants(props.source,raw.value,controller.signal,(done,countAll)=>{
   if(!controller.signal.aborted&&current===epoch){count.value=done;total.value=countAll;}
  });
  if(controller.signal.aborted||current!==epoch)return;
  results.value=rows;state.value='ready';
 }catch{
  if(controller.signal.aborted||current!==epoch)return;
  results.value=[];state.value='unavailable';
  message.value='Batch resolution could not be completed. No incomplete results are presented.';
 }finally{if(current===epoch)request=null;}
}
function open(id:string):void{reset();emit('open',id);}
function download():void{
 if(state.value!=='ready')return;
 const csv=batchLookupCsv(results.value);
 if(!csv){message.value='The current batch cannot be exported safely.';return;}
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 try{
  const a=document.createElement('a');a.href=url;a.download='neumuacFQ-batch-lookup.csv';
  document.body.appendChild(a);a.click();a.remove();
  message.value='This batch is exported as recorded research metadata, not verified clinical interpretation.';
 }finally{window.setTimeout(()=>URL.revokeObjectURL(url),5000);}
}
</script>

<template>
 <section class="nfq-batch" data-testid="nfq-batch-panel" aria-labelledby="nfq-batch-heading">
  <header class="nfq-batch-head">
   <div><span class="nfq-batch-kicker">ORIGINAL WORKFLOW · MODULAR RESEARCH</span>
    <h2 id="nfq-batch-heading">Batch variant lookup</h2>
    <p>Resolve many recorded variant identifiers together, without opening them one at a time.</p>
   </div>
   <div class="nfq-batch-head-actions">
    <ContextHelp label="About batch variant lookup" title="Identity matching and safety">
     <p>Paste one name per line, or separate identifiers with commas, semicolons or tabs. This feature makes up to {{MAX_BATCH_LOOKUP}} read-only catalog lookups per batch.</p>
     <p>Only an independently unambiguous database identity is marked an exact match. Other results remain candidate records and require review. The system never assigns pathogenicity, therapy response, genotype or clinical interpretation from a search suggestion.</p>
     <p>Enter variant identifiers only—never patient details or clinical notes. This tool does not upload a file, log a search to the analytics database, or change any research record.</p>
    </ContextHelp>
    <button type="button" aria-label="Close batch variant lookup" @click="reset();emit('close')">Close</button>
   </div>
  </header>
  <form class="nfq-batch-form" aria-label="Resolve pasted variants" @submit.prevent="run">
   <label for="nfq-batch-input">Paste identifiers · one per line or comma-separated</label>
   <textarea id="nfq-batch-input" v-model="raw" data-testid="nfq-batch-input" rows="4"
    :disabled="state==='running'" spellcheck="false" autocomplete="off" maxlength="12000"
    placeholder="F508del&#10;G551D&#10;R117H" @input="onInput"></textarea>
   <div class="nfq-batch-actions">
    <button type="submit" data-testid="nfq-batch-run" :disabled="state==='running'||!source||!raw.trim()">
     {{state==='running'?'Resolving…':'Resolve list'}}
    </button>
    <button v-if="state==='running'" type="button" @click="reset">Cancel</button>
    <button v-if="state==='ready'" type="button" data-testid="nfq-batch-export" @click="download">Export results · CSV</button>
    <span>{{parsed.error||parsed.items.length+' of '+MAX_BATCH_LOOKUP+' entries'}}</span>
   </div>
  </form>
  <p v-if="state==='running'" role="status" class="nfq-batch-feedback" data-testid="nfq-batch-progress">
   Checking {{count}} of {{total}} identifiers against the live research catalog…
  </p>
  <p v-if="state==='unavailable'" role="alert" class="nfq-batch-feedback">{{message}}</p>
  <p v-if="message&&state==='ready'" role="status" class="nfq-batch-feedback">{{message}}</p>
  <template v-if="state==='ready'">
   <div class="nfq-batch-summary" role="status" data-testid="nfq-batch-summary">
    <strong>{{summary.exact}} exact</strong><span>{{summary.candidates}} need review</span>
    <span>{{summary.missing}} not found</span><span v-if="summary.other">{{summary.other}} unclear/unavailable</span>
   </div>
   <div class="nfq-batch-results" aria-label="Batch lookup results">
    <article v-for="(row,index) in results" :key="index" class="nfq-batch-result" data-testid="nfq-batch-row">
     <div class="nfq-batch-result-top">
      <strong>{{row.input}}</strong>
      <span :class="'nfq-batch-kind-'+row.kind">{{row.kind==='exact'?'Exact recorded identity':row.kind==='candidates'?'Candidate records':row.kind==='not-found'?'No catalog match':row.kind==='invalid'?'Unclear input':'Source unavailable'}}</span>
     </div>
     <template v-if="row.kind==='exact'&&row.match">
      <div class="nfq-batch-confirmed">
       <span>{{variantDisplayName(row.match)}} · Record #{{row.match.id}}</span>
       <span v-if="row.match.recordedClass">Class {{row.match.recordedClass}}</span>
       <span v-if="row.match.etiPrediction&&row.match.etiPrediction!=='unknown'">Recorded ETI: {{row.match.etiPrediction}}</span>
       <span v-if="row.match.alyftrekPrediction&&row.match.alyftrekPrediction!=='unknown'">Recorded Alyftrek: {{row.match.alyftrekPrediction}}</span>
       <button type="button" :aria-label="'Open confirmed variant '+row.match.id" @click="open(row.match.id)">Open dossier</button>
      </div>
     </template>
     <template v-else-if="row.kind==='candidates'">
      <p>Possible matches are not accepted as exact. Open a candidate to check its independently retrieved identity.</p>
      <div class="nfq-batch-candidates">
       <button v-for="candidate in row.candidates" :key="candidate.id" type="button"
        :aria-label="'Inspect candidate variant '+candidate.id" @click="open(candidate.id)">
        {{variantDisplayName(candidate)}} · #{{candidate.id}} <span>Inspect</span>
       </button>
       <span v-if="row.moreCandidates">Additional candidates may exist. Refine this identifier.</span>
      </div>
     </template>
     <p v-else>{{row.message}}</p>
    </article>
   </div>
   <p class="nfq-batch-footnote">Results were retrieved from the current catalog. Unverified candidates and missing records are not evidence of variant absence, therapy response, or treatment eligibility.</p>
  </template>
 </section>
</template>

<script setup lang="ts">
import {ref,watch,onUnmounted} from 'vue';
import {RouterLink} from 'vue-router';
import {createLiveEvidenceSource, EVIDENCE_PAGE_SIZE, type LiveEvidenceReference} from '../services/liveEvidence';
import {readConfigFromEnvironment} from '../services/liveVariants';
const config=readConfigFromEnvironment();
const source=config?createLiveEvidenceSource(config):null;
const query=ref('');
const page=ref(0);
const expandedRows=ref<readonly number[]>([]);
function toggleRow(id:number){expandedRows.value=expandedRows.value.includes(id)?expandedRows.value.filter(x=>x!==id):[...expandedRows.value,id];}
const rows=ref<readonly LiveEvidenceReference[]>([]);
const hasMore=ref(false);
const loading=ref(false);
const error=ref('');
let abort:AbortController|null=null;
let sequence=0;
let debounce:ReturnType<typeof setTimeout>|undefined;
async function refresh(){
 abort?.abort();
 const run=++sequence;
 const controller=new AbortController();abort=controller;
 rows.value=[];hasMore.value=false;error.value='';
 if(!source){error.value='Live evidence access is not configured.';return;}
 loading.value=true;
 try{
  const data=await source.list({query:query.value,page:page.value,signal:controller.signal});
  if(run===sequence){rows.value=data.records;hasMore.value=data.hasMore;}
 }catch{
  if(!controller.signal.aborted&&run===sequence)error.value='Live references could not be retrieved.';
 }finally{if(run===sequence)loading.value=false;}
}
watch(query,()=>{page.value=0;});
watch([query,page],()=>{clearTimeout(debounce);debounce=setTimeout(()=>{void refresh();},query.value?250:0);},{immediate:true});
onUnmounted(()=>{abort?.abort();clearTimeout(debounce);});
</script>
<template>
 <div class="page evidence-page">
  <div class="eyebrow">CFTR RESEARCH / SOURCES</div>
  <h1>Evidence & provenance</h1>
  <p class="intro">Browse current source links recorded for CFTR variants in NeumuacFQ. These are research references, not independently validated clinical interpretations.</p>
  <div class="evidence-search-head">
   <label for="evidence-search">Find a source or reference</label>
   <input id="evidence-search" v-model="query" type="search" placeholder="Title, source or PMID"/>
  </div>
  <p v-if="loading" role="status">Loading current references…</p>
  <p v-else-if="error" role="alert" class="empty-result">{{error}}</p>
  <p v-else role="status" class="evidence-results-count">{{rows.length}} references on page {{page+1}}</p>
  <p v-if="!loading&&!error&&!rows.length" class="empty-result">No recorded source links match this search.</p>
  <div v-if="rows.length" class="evidence-register" aria-label="Recorded citations">
   <article v-for="item in rows" :key="item.id" class="evidence-row">
    <div class="evidence-row-meta"><span>{{item.source}}</span><span v-if="item.year">{{item.year}} (recorded)</span></div>
    <h2><button type="button" class="evidence-row-disclosure" :aria-expanded="expandedRows.includes(item.id)" @click="toggleRow(item.id)"><span>{{item.title}}</span><span aria-hidden="true">{{expandedRows.includes(item.id)?'−':'+'}}</span></button></h2>
    <div v-if="expandedRows.includes(item.id)" class="evidence-row-foot"><a :href="item.url" target="_blank" rel="noopener noreferrer">Open source ↗</a><RouterLink :to="'/variants/'+item.variantId">Variant record #{{item.variantId}}</RouterLink><span v-if="item.journal">{{item.journal}}</span><span v-if="item.pmid">PMID {{item.pmid}}</span></div>
   </article>
  </div>
  <nav class="pagination-controls" aria-label="Evidence pages">
   <button type="button" :disabled="loading||page===0" @click="page--">Previous</button>
   <span>Page {{page+1}} · {{EVIDENCE_PAGE_SIZE}} per page</span>
   <button type="button" :disabled="loading||!hasMore" @click="page++">Next</button>
  </nav>
  <p class="history-disclaimer">Source titles, dates and links reflect the live database. A recorded reference does not establish validation, clinical relevance or certainty.</p>
 </div>
</template>
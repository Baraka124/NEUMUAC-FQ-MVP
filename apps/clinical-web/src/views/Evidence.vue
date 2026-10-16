<script setup lang="ts">
import {ref,watch,onUnmounted} from 'vue';
import {RouterLink,useRoute} from 'vue-router';
import {computed} from 'vue';
import {safeResearchReturnPath,workspaceJourneyPath} from '../domain/researchJourney';
import {createLiveEvidenceSource, EVIDENCE_PAGE_SIZE, type LiveEvidenceReference} from '../services/liveEvidence';
import {readConfigFromEnvironment} from '../services/liveVariants';
import {referenceMetadata} from '../domain/referencePresentation';
import ContextHelp from '../components/ContextHelp.vue';
const route=useRoute();
const focusId=computed(()=>typeof route.query.variant==='string'&&/^[1-9]\d{0,17}$/.test(route.query.variant)?route.query.variant:null);
const returnToVariant=computed(()=>safeResearchReturnPath(route.query.from,'variant'));
const savedWorkspace=computed(()=>workspaceJourneyPath('/evidence',{q:query.value,page:String(page.value),variant:focusId.value||undefined}));
const config=readConfigFromEnvironment();
const source=config?createLiveEvidenceSource(config):null;
const query=ref(typeof route.query.q==='string'&&/^[a-zA-Z0-9 _-]{0,70}$/.test(route.query.q)?route.query.q:'');
const page=ref(typeof route.query.page==='string'&&/^\d{1,4}$/.test(route.query.page)?Math.min(Number(route.query.page),10000):0);
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
  if(focusId.value){
   const records=await source.forVariant(focusId.value,controller.signal);
   if(run===sequence){rows.value=records;hasMore.value=false;}
  }else{
   const data=await source.list({query:query.value,page:page.value,signal:controller.signal});
   if(run===sequence){rows.value=data.records;hasMore.value=data.hasMore;}
  }
 }catch{
  if(!controller.signal.aborted&&run===sequence)error.value='Live references could not be retrieved.';
 }finally{if(run===sequence)loading.value=false;}
}
watch(query,()=>{page.value=0;});
watch([query,page],()=>{clearTimeout(debounce);debounce=setTimeout(()=>{void refresh();},query.value?250:0);},{immediate:true});
onUnmounted(()=>{abort?.abort();clearTimeout(debounce);});
</script>
<template>
 <div class="page evidence-page nfq-science-ui">
  <header class="nfq-evidence-heading"><h1>Evidence & provenance</h1><ContextHelp label="About recorded references" title="Recorded reference details"><p>Links and source metadata come from the catalog. They do not independently establish study quality, pathogenicity or clinical relevance.</p></ContextHelp></header>
  <RouterLink v-if="returnToVariant" class="nfq-journey-return" :to="returnToVariant">← Return to variant dossier</RouterLink>
  <div v-if="focusId" class="nfq-variant-scope"><span>References for variant record #{{focusId}}</span><RouterLink to="/evidence">All records</RouterLink></div>
  <div v-if="!focusId" class="evidence-search-head" role="search" aria-label="Find recorded scientific sources">
   <label for="evidence-search">Find a source or reference</label>
   <div class="nfq-science-search-line"><input id="evidence-search" v-model="query" type="search" placeholder="Title, source or PMID"/><button v-if="query" type="button" class="nfq-science-clear" @click="query=''">Clear search</button></div>
  </div>
  <p v-if="loading" role="status">Loading current references…</p>
  <p v-else-if="error" role="alert" class="empty-result">{{error}}</p>
  <p v-else role="status" class="evidence-results-count">{{rows.length}} recorded {{rows.length===1?'reference':'references'}}{{focusId?'':' on page '+(page+1)}}</p>
  <p v-if="!loading&&!error&&!rows.length" class="empty-result">{{focusId?'No reference links recorded for this variant in the accessible catalog.':'No recorded source links match this search.'}}</p>
  <div v-if="rows.length" class="evidence-register" aria-label="Recorded citations">
   <article v-for="item in rows" :key="item.id" class="evidence-row">
    <div class="evidence-row-meta"><span>{{referenceMetadata(item).join(" · ")}}</span></div>
    <h2><button type="button" class="evidence-row-disclosure" :aria-expanded="expandedRows.includes(item.id)" :aria-controls="'evidence-details-'+item.id" @click="toggleRow(item.id)"><span>{{item.title}}</span><span aria-hidden="true">{{expandedRows.includes(item.id)?'−':'+'}}</span></button></h2>
    <div v-if="expandedRows.includes(item.id)" :id="'evidence-details-'+item.id" class="evidence-row-foot">
     <span>Recorded quality score: {{item.recordedQualityScore??'Not recorded'}}</span>
     <span>Recorded source weight: {{item.recordedSourceWeight??'Not recorded'}}</span>
     <span>Recorded citation count: {{item.recordedCitationCount??'Not recorded'}}</span><a :href="item.url" target="_blank" rel="noopener noreferrer">Open source ↗</a><RouterLink :to="{path:'/variants/'+encodeURIComponent(item.variantId),query:savedWorkspace?{from:savedWorkspace}:{}}">Variant record #{{item.variantId}}</RouterLink><span v-if="item.journal">{{item.journal}}</span><span v-if="item.pmid">PMID {{item.pmid}}</span></div>
   </article>
  </div>
  <nav v-if="!focusId" class="pagination-controls" aria-label="Evidence pages">
   <button type="button" :disabled="loading||page===0" @click="page--">Previous</button>
   <span>Page {{page+1}} · {{EVIDENCE_PAGE_SIZE}} per page</span>
   <button type="button" :disabled="loading||!hasMore" @click="page++">Next</button>
  </nav>

 </div>
</template>
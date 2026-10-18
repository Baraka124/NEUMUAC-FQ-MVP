<script setup lang="ts">
import {ref,watch,onUnmounted} from 'vue';
import {RouterLink,useRoute} from 'vue-router';
import {computed} from 'vue';
import {safeResearchReturnPath,workspaceJourneyPath} from '../domain/researchJourney';
import {createLiveEvidenceSource, EVIDENCE_PAGE_SIZE, type LiveEvidenceReference} from '../services/liveEvidence';
import {readConfigFromEnvironment} from '../services/liveVariants';
import {referenceMetadata} from '../domain/referencePresentation';
import {evidencePageCsv} from '../domain/evidencePageExport';
import ContextHelp from '../components/ContextHelp.vue';
import {portableEvidenceLink} from '../domain/portableEvidenceLink';
const route=useRoute();
const focusId=computed(()=>typeof route.query.variant==='string'&&/^[1-9]\d{0,17}$/.test(route.query.variant)?route.query.variant:null);
const returnToVariant=computed(()=>safeResearchReturnPath(route.query.from,'variant'));
const savedWorkspace=computed(()=>workspaceJourneyPath('/evidence',{q:query.value,page:String(page.value),variant:focusId.value||undefined}));
const shareableView=computed(()=>workspaceJourneyPath('/evidence',{q:focusId.value?undefined:query.value.trim(),page:String(page.value),variant:focusId.value||undefined}));
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
const shareStatus=ref('');
async function copyEvidenceView():Promise<void>{
 const url=portableEvidenceLink(shareableView.value,window.location.href);
 if(!url||!navigator.clipboard?.writeText){shareStatus.value='Cannot copy this view link. Check search filters or browser permissions.';return;}
 try{await navigator.clipboard.writeText(url);shareStatus.value='View link copied. It points to search filters, not verified evidence.';}
 catch{shareStatus.value='View link could not be copied. Clipboard access was denied.';}
}
watch([query,page,focusId],()=>{shareStatus.value='';});
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
   const data=await source.forVariantPage(focusId.value,page.value,controller.signal);
   if(run===sequence){rows.value=data.records;hasMore.value=data.hasMore;}
  }else{
   const data=await source.list({query:query.value,page:page.value,signal:controller.signal});
   if(run===sequence){rows.value=data.records;hasMore.value=data.hasMore;}
  }
 }catch{
  if(!controller.signal.aborted&&run===sequence)error.value='Live references could not be retrieved.';
 }finally{if(run===sequence)loading.value=false;}
}
// Hash-route navigation can reuse this mounted view. Restore the actual
// linked query and page instead of retaining a previous in-memory search.
watch(()=>[route.query.q,route.query.page],()=>{
 const raw=route.query.q;
 const nextQuery=typeof raw==='string'&&/^[a-zA-Z0-9 _-]{0,70}$/.test(raw)?raw:'';
 const rawPage=route.query.page;
 const nextPage=typeof rawPage==='string'&&/^[0-9]{1,4}$/.test(rawPage)?Math.min(Number(rawPage),10000):0;
 if(query.value!==nextQuery)query.value=nextQuery;
 if(page.value!==nextPage)page.value=nextPage;
});
watch(focusId,()=>{expandedRows.value=[];});
watch(page,()=>{expandedRows.value=[];});
watch([query,page,focusId],()=>{clearTimeout(debounce);debounce=setTimeout(()=>{void refresh();},query.value?250:0);},{immediate:true});
onUnmounted(()=>{abort?.abort();clearTimeout(debounce);});
const exportNotice=ref('');
function downloadEvidencePage():void{
 if(loading.value||error.value||!rows.value.length)return;
 const csv=evidencePageCsv(rows.value);
 if(csv===null){exportNotice.value='This reference page could not be exported safely.';return;}
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob);
 try{
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download='neumuacFQ-evidence-page-'+String(page.value+1)+'.csv';
  document.body.appendChild(anchor);anchor.click();anchor.remove();
  exportNotice.value='Current page exported. Recorded citations have not been independently validated.';
 }finally{window.setTimeout(()=>URL.revokeObjectURL(url),5000);}
}
watch([query,page,focusId],()=>{exportNotice.value='';});
</script>
<template>
 <div class="page evidence-page nfq-science-ui">
  <header class="nfq-evidence-heading"><h1>Evidence & provenance</h1><div class="nfq-evidence-heading-actions"><button type="button" data-testid="evidence-copy-view" @click="copyEvidenceView">Copy view link</button><ContextHelp label="About recorded references" title="Recorded reference details"><p>Links and source metadata come from the catalog. They do not independently establish study quality, pathogenicity or clinical relevance.</p></ContextHelp></div></header>
  <p v-if="shareStatus" role="status" class="nfq-evidence-share-status">{{shareStatus}}</p>
  <RouterLink v-if="returnToVariant" class="nfq-journey-return" :to="returnToVariant">← Return to variant dossier</RouterLink>
  <div v-if="focusId" class="nfq-variant-scope"><span>References for variant record #{{focusId}}</span><RouterLink to="/evidence">All records</RouterLink></div>
  <div v-if="!focusId" class="evidence-search-head" role="search" aria-label="Find recorded scientific sources">
   <label for="evidence-search">Find a source or reference</label>
   <div class="nfq-science-search-line"><input id="evidence-search" v-model="query" type="search" placeholder="Title, source or PMID" @input="page=0"/><button v-if="query" type="button" class="nfq-science-clear" @click="query='';page=0">Clear search</button></div>
  </div>
  <p v-if="loading" role="status">Loading current references…</p>
  <p v-else-if="error" role="alert" class="empty-result">{{error}}</p>
  <p v-else role="status" class="evidence-results-count">{{rows.length}} recorded {{rows.length===1?'reference':'references'}} on page {{page+1}}</p>
  <p v-if="!loading&&!error&&!rows.length" class="empty-result">{{page>0?'No references on this page. Return to the previous page.':focusId?'No reference links recorded for this variant in the accessible catalog.':'No recorded source links match this search.'}}</p>
  <div v-if="!loading&&!error&&rows.length" class="nfq-evidence-page-tools">
   <button type="button" data-testid="evidence-export-page" @click="downloadEvidencePage">Export page · CSV</button>
   <span>Current page only · Recorded citation metadata</span>
  </div>
  <p v-if="exportNotice" role="status" class="nfq-evidence-export-notice">{{exportNotice}}</p>
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
  <nav class="pagination-controls" aria-label="Evidence pages">
   <button type="button" :disabled="loading||page===0" @click="page--">Previous</button>
   <span>Page {{page+1}} · {{EVIDENCE_PAGE_SIZE}} per page</span>
   <button type="button" :disabled="loading||!hasMore" @click="page++">Next</button>
  </nav>

 </div>
</template>
<style scoped>
.nfq-evidence-heading-actions{display:inline-flex;align-items:center;gap:10px;flex:0 0 auto}
.nfq-evidence-heading-actions button{border:1px solid #c8dbce;border-radius:6px;background:transparent;color:#2b6348;padding:8px 12px;font:inherit;font-size:12px;font-weight:600;min-height:40px;cursor:pointer}
.nfq-evidence-heading-actions button:disabled{opacity:.45;cursor:not-allowed}
.nfq-evidence-heading-actions button:focus-visible{outline:2px solid #218466;outline-offset:3px}
.nfq-evidence-share-status{font-size:12px;color:#557463;margin:0 0 12px}
@media(max-width:600px){.nfq-evidence-heading{flex-wrap:wrap;min-width:0}.nfq-evidence-heading h1{min-width:0}.nfq-evidence-heading-actions{gap:6px;flex-wrap:wrap;margin-left:auto;min-width:0}.nfq-evidence-heading-actions button{font-size:11px;padding:7px 9px}}
</style>

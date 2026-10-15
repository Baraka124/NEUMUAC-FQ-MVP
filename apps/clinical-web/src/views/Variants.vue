<script setup lang="ts">
import { computed, nextTick, ref, watch, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import VariantFilterPanel from '../components/VariantFilterPanel.vue';
import {cftr2LinkedReferences} from '../domain/externalReferenceTypes';
import {authController,authSessionProvider} from '../services/authSession';
import {explainTextMatch,rankVisibleSearchPage} from '../domain/searchPresentation';
import {assessScientificDiscovery} from '../domain/compoundDiscovery';

import {createLiveEvidenceSource,type LiveEvidenceReference} from '../services/liveEvidence';
import {createScientificDossierSource,type ScientificDossier} from '../services/scientificDossier';
import {clinVarVariationUrl} from '../domain/externalAuthority';
import {retrieveClinVarSummary,type ClinVarAuthoritySummary} from '../services/liveClinVar';
import {compareRecordedEvidence} from '../domain/evidenceComparison';
import {createVariantResearchBrief} from '../services/researchBrief';
import {createLiveResearchHistorySource,type ResearchHistory} from '../services/liveResearchHistory';
import { createReadOnlyRepository, readConfigFromEnvironment, variantDisplayName, formatReadStatus, type RealVariant, type RealVariantSource } from '../services/liveVariants';
const route=useRoute(),router=useRouter();
const config=readConfigFromEnvironment();
let source:RealVariantSource|null=null;
const liveMode = Boolean(config);
const evidenceSource=config?createLiveEvidenceSource(config):null;
const dossierSource=config?createScientificDossierSource(config):null;
const dossier=ref<ScientificDossier|null>(null);
const dossierError=ref('');
let dossierAbort:AbortController|null=null;
const clinVarSummary=ref<ClinVarAuthoritySummary|null>(null);
const evidenceComparison=computed(()=>dossier.value&&clinVarSummary.value&&evidenceReady.value&&!evidenceError.value?compareRecordedEvidence(dossier.value,clinVarSummary.value,linkedEvidence.value):null);
const clinVarLoading=ref(false);
const clinVarError=ref('');
let clinVarAbort:AbortController|null=null;

async function checkClinVar():Promise<void>{
 const recordId=selected.value?.id,authorityId=dossier.value?.clinvarId;
 if(!recordId||!authorityId||clinVarLoading.value||!clinVarVariationUrl(authorityId))return;
 clinVarAbort?.abort();
 const controller=new AbortController();clinVarAbort=controller;
 clinVarSummary.value=null;clinVarError.value='';clinVarLoading.value=true;
 try{
  const summary=await retrieveClinVarSummary(authorityId,fetch,controller.signal);
  if(!controller.signal.aborted&&selected.value?.id===recordId&&dossier.value?.clinvarId===authorityId)
   clinVarSummary.value=summary;
 }catch{
  if(!controller.signal.aborted&&selected.value?.id===recordId)
   clinVarError.value='Current ClinVar summary could not be verified. The recorded dossier remains unchanged.';
 }finally{if(!controller.signal.aborted)clinVarLoading.value=false;}
}

const linkedEvidence=ref<readonly LiveEvidenceReference[]>([]);
const evidenceReady=ref(false);
const cftr2References=computed(()=>cftr2LinkedReferences(linkedEvidence.value));
const evidenceError=ref('');
let evidenceAbort:AbortController|null=null;


let configError='';
try { if(config) source=createReadOnlyRepository(config,fetch,authSessionProvider); } catch(e){configError=formatReadStatus(e);}
const rows=ref<readonly RealVariant[]>([]);

const selected=ref<RealVariant|null>(null);
watch(selected,()=>{
 clinVarAbort?.abort();
 clinVarSummary.value=null;clinVarError.value='';clinVarLoading.value=false;
});
const researchHistory=ref<ResearchHistory|null>(null);
const historyError=ref('');
const historyLoading=ref(false);
const historyOpen=ref(false);
let historyAbort:AbortController|null=null;
const historySource=config?createLiveResearchHistorySource(config):null;
watch(selected,()=>{historyAbort?.abort();researchHistory.value=null;historyError.value='';historyLoading.value=false;historyOpen.value=false;});
async function toggleResearchHistory():Promise<void>{
 historyOpen.value=!historyOpen.value;
 if(!historyOpen.value||researchHistory.value||historyLoading.value||!selected.value)return;
 if(!historySource){historyError.value='The historical register is not configured.';return;}
 const id=selected.value.id;const controller=new AbortController();historyAbort=controller;
 historyLoading.value=true;historyError.value='';
 try{
  const records=await historySource.get(id,controller.signal);
  if(!controller.signal.aborted&&selected.value?.id===id)researchHistory.value=records;
 }catch{
  if(!controller.signal.aborted&&selected.value?.id===id)historyError.value='Historical records could not be retrieved. No incomplete timeline is shown.';
 }finally{if(!controller.signal.aborted)historyLoading.value=false;}
}
const briefBusy=ref(false);
const briefStatus=ref('');
let briefAbort:AbortController|null=null;
watch(selected,()=>{briefAbort?.abort();briefBusy.value=false;briefStatus.value='';});
async function copyResearchBrief():Promise<void>{
 if(!selected.value||!config||briefBusy.value)return;
 const id=selected.value.id,controller=new AbortController();briefAbort?.abort();briefAbort=controller;
 briefBusy.value=true;briefStatus.value='';
 try{
  const contents=await createVariantResearchBrief(config,id,fetch,controller.signal);
  if(controller.signal.aborted||selected.value?.id!==id)return;
  await navigator.clipboard.writeText(contents);
  if(!controller.signal.aborted&&selected.value?.id===id)briefStatus.value='Research brief copied. It contains current recorded fields and linked references.';
 }catch{
  if(!controller.signal.aborted)briefStatus.value='Research brief could not be completed or copied. No partial report was produced.';
 }finally{if(!controller.signal.aborted)briefBusy.value=false;}
}
watch(selected,async record=>{
 dossierAbort?.abort();dossier.value=null;dossierError.value='';
 if(!record||!dossierSource)return;
 const controller=new AbortController();dossierAbort=controller;
 try{const data=await dossierSource.get(record.id,controller.signal);if(!controller.signal.aborted)dossier.value=data;}
 catch{if(!controller.signal.aborted)dossierError.value='Scientific fields could not be loaded.';}
});
watch(selected,async value=>{
 evidenceAbort?.abort(); linkedEvidence.value=[]; evidenceError.value='';evidenceReady.value=false;
 if(!value || !evidenceSource)return;
 const controller=new AbortController(); evidenceAbort=controller;
 try {const result=await evidenceSource.forVariant(value.id,controller.signal);
   if(!controller.signal.aborted){linkedEvidence.value=result;evidenceReady.value=true;}
 } catch {if(!controller.signal.aborted)evidenceError.value='Current source links could not be loaded.';}
});
const search=ref(typeof route.query.q==='string'?route.query.q:'');
const scientificInputAssessment=computed(()=>assessScientificDiscovery(search.value));
const inputActive=ref(false);
const exactMatchedId=ref<string|null>(null);
const showSearchInfo=ref(false);
const classFilter=ref(typeof route.query.class==='string'&&['I','II','III','IV','V','VI','unclassified'].includes(route.query.class)?route.query.class:'all');
const sort=ref(typeof route.query.sort==='string'&&['name-desc','recent-record','fewest-validations','most-validations'].includes(route.query.sort)?route.query.sort:'name-asc');
const searchMode=ref(typeof route.query.mode==='string'&&route.query.mode==='exact-name'?'exact-name':'contains');
const showAdvanced=ref(false);
const activeFilterCount=computed(()=>Number(classFilter.value!=='all')+Number(sort.value!=='name-asc')+Number(searchMode.value!=='contains'));
function resetAdvancedFilters():void{classFilter.value='all';sort.value='name-asc';searchMode.value='contains';}
watch(search,()=>{exactMatchedId.value=null;});
const scientificDetailsOpen=ref(false);
const showReferences=ref(false);
watch(selected,()=>{showReferences.value=false;scientificDetailsOpen.value=false;});
const page=ref(typeof route.query.page==='string'&&/^\d{1,4}$/.test(route.query.page)?Number(route.query.page):0);
const displayedRows=computed(()=>scientificInputAssessment.value.blocked?[]:
 (sort.value==='name-asc'&&page.value===0?rankVisibleSearchPage(rows.value,search.value):rows.value));
const activeResultIndex=ref(-1);
const previewCandidate=computed(()=>selected.value||detailBusy.value||route.params.id?null:
    (displayedRows.value[activeResultIndex.value]??(search.value.trim()?displayedRows.value[0]:null)??null));
let revealNextId:string|null=null;
async function revealSelectedRecord(id:string):Promise<void>{
 if(revealNextId!==id)return;
 await nextTick();
 if(route.params.id!==id)return;
 const target=document.querySelector<HTMLElement>('.record-overview');
 if(!target)return;
 revealNextId=null;
 target.scrollIntoView({behavior:'instant',block:'start'});
}
watch(displayedRows,()=>{activeResultIndex.value=-1;});
function matchExplanation(record:RealVariant):string{return explainTextMatch(record,search.value)?.label||'Recorded variant';}
function focusResult(index:number):void{const items=document.querySelectorAll<HTMLButtonElement>('.record-list button');if(!items.length)return;const next=(index+items.length)%items.length;activeResultIndex.value=next;items[next]?.focus();}
const hasMore=ref(false);
const busy=ref(false);
const detailBusy=ref(false);
const error=ref(configError);
let current:AbortController|null=null;
let detailRequest:AbortController|null=null;
let exactRequest:AbortController|null=null;
let exactSequence=0;
let timer:ReturnType<typeof setTimeout>|undefined;
let listSequence=0;
let detailSequence=0;
watch(scientificInputAssessment,assessment=>{
 if(!assessment.blocked)return;
 current?.abort();exactRequest?.abort();
 ++listSequence;++exactSequence;
 rows.value=[];hasMore.value=false;busy.value=false;exactMatchedId.value=null;
});
async function load():Promise<void>{
  current?.abort();const run=++listSequence;const abort=new AbortController();current=abort;
  hasMore.value=false;error.value='';
  if(scientificInputAssessment.value.blocked){rows.value=[];busy.value=false;return;}
  if(!source){error.value=configError||'The public variant catalog has not been connected yet.';return;}
  busy.value=true;
  try {const data=await source.list({query:search.value,page:page.value,classFilter:classFilter.value as 'all'|'I'|'II'|'III'|'IV'|'V'|'VI'|'unclassified',sort:sort.value as 'name-asc'|'name-desc'|'recent-record'|'fewest-validations'|'most-validations',searchMode:searchMode.value as 'contains'|'exact-name',signal:abort.signal});if(run===listSequence){
    rows.value=data.records;hasMore.value=data.hasMore;

  }}
  catch(e){if(!abort.signal.aborted&&run===listSequence)error.value=formatReadStatus(e);}
  finally {if(run===listSequence)busy.value=false;}
}
async function resolveSearch():Promise<void>{
 exactRequest?.abort();
 const run=++exactSequence;
 exactMatchedId.value=null;
 if(!source||scientificInputAssessment.value.blocked||searchMode.value!=='contains'||page.value!==0||search.value.trim().length<2)return;
 const abort=new AbortController();exactRequest=abort;
 const text=search.value.trim();
 try{
   const hit=await source.resolveExact(text,classFilter.value as 'all'|'I'|'II'|'III'|'IV'|'V'|'VI'|'unclassified',abort.signal);
   if(run!==exactSequence||abort.signal.aborted||scientificInputAssessment.value.blocked||search.value.trim()!==text)return;
   if(hit && route.params.id!==hit.id){
     revealNextId=hit.id;
     exactMatchedId.value=hit.id;
     void router.replace({path:'/variants/'+encodeURIComponent(hit.id),query:{...route.query,q:text}});
   }
 }catch{if(!abort.signal.aborted&&run===exactSequence)exactMatchedId.value=null;}
}
async function loadDetail(id:unknown):Promise<void>{
  detailRequest?.abort();const run=++detailSequence;
  selected.value=null;
  if(typeof id!=='string'||!source)return;
  const abort=new AbortController();detailRequest=abort;detailBusy.value=true;
  try {const record=await source.get(id,abort.signal);if(run===detailSequence){
    selected.value=record;
    if(record)void revealSelectedRecord(id);
  }}
  catch(e){if(!abort.signal.aborted&&run===detailSequence)error.value=formatReadStatus(e);}
  finally {if(run===detailSequence)detailBusy.value=false;}
}
watch(()=>authController?.state.phase,()=>{current?.abort();detailRequest?.abort();rows.value=[];selected.value=null;page.value=0;void load();});
watch([search,page,classFilter,sort,searchMode],()=>{clearTimeout(timer);timer=setTimeout(()=>{void load();void resolveSearch();},search.value?250:0)},{immediate:true});
watch([search,classFilter,sort,searchMode],()=>{page.value=0;});
watch(()=>route.params.id,id=>{void loadDetail(id);},{immediate:true});
onUnmounted(()=>{current?.abort();detailRequest?.abort();exactRequest?.abort();evidenceAbort?.abort();dossierAbort?.abort();clinVarAbort?.abort();briefAbort?.abort();historyAbort?.abort();clearTimeout(timer);});
function updateWorklistRoute():void {
 const query:Record<string,string>={};
 if(search.value.trim())query.q=search.value.trim();
 if(classFilter.value!=='all')query.class=classFilter.value;
 if(sort.value!=='name-asc')query.sort=sort.value;
 if(searchMode.value!=='contains')query.mode=searchMode.value;
 if(page.value>0)query.page=String(page.value);
 void router.replace({path:route.path,query});
}
watch([search,classFilter,sort,searchMode,page],updateWorklistRoute);
function onSearchKeydown(event:KeyboardEvent):void{
 if(event.key==='Escape'){search.value='';return;}
 if(event.key==='ArrowDown'){event.preventDefault();focusResult(0);}
 if(event.key==='Enter'&&displayedRows.value.length){event.preventDefault();select(displayedRows.value[0].id);}
}
function onResultKeydown(event:KeyboardEvent,index:number):void{
 if(event.key==='ArrowDown'){event.preventDefault();focusResult(index+1);}
 else if(event.key==='ArrowUp'){event.preventDefault();if(index===0){document.getElementById('search')?.focus();activeResultIndex.value=-1;}else focusResult(index-1);}
 else if(event.key==='Home'){event.preventDefault();focusResult(0);}
 else if(event.key==='End'){event.preventDefault();focusResult(displayedRows.value.length-1);}
 else if(event.key==='Escape'){event.preventDefault();document.getElementById('search')?.focus();activeResultIndex.value=-1;}
}
function select(id:string):void{
 exactMatchedId.value=null;
 revealNextId=id;
 if(route.params.id===id){void revealSelectedRecord(id);return;}
 void router.push({path:'/variants/'+encodeURIComponent(id),query:{...route.query}});
}
</script>
<template>
 <div class="page variant-page">
  <div class="variant-heading"><h1>Variants</h1><span class="fixture-stamp">{{liveMode ? "PUBLIC · READ ONLY" : "CONNECTION REQUIRED"}}</span></div>
  <div class="record-layout">
   <section class="record-rail" aria-labelledby="record-list-title">
    <div class="rail-topline">
      <h2 id="record-list-title">Search variants</h2>
      <button type="button" class="discovery-info-button" aria-label="Search help and scientific data limitations" :aria-expanded="showSearchInfo" aria-controls="discovery-search-help" @click="showSearchInfo=!showSearchInfo">i</button>
    </div>
    <label for="search" class="discovery-accessible-label">Variant name, HGVS or recorded alias</label>
    <div class="discovery-input" :class="{'discovery-input-active':inputActive}">
      <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>
      <input id="search" v-model="search" type="search" autocomplete="off" spellcheck="false" placeholder="Variant name or HGVS…" @focus="inputActive=true" @blur="inputActive=false" @keydown="onSearchKeydown"/>
      <button v-if="search" type="button" class="discovery-clear" aria-label="Clear variant search" @click="search=''">×</button>
    </div>
    <p v-if="scientificInputAssessment.message" class="discovery-notation-guidance" role="status">{{scientificInputAssessment.message}}</p>
    <div class="discovery-utility-row">
      <div class="variant-filter-anchor">
       <button type="button" class="variant-filter-trigger" :aria-expanded="showAdvanced" aria-controls="variant-filter-panel" @click="showAdvanced=!showAdvanced">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M7 12h10M10 17h4"/></svg>
        <span class="discovery-filter-label">Filters</span>
        <svg class="discovery-chevron" aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
        <span v-if="activeFilterCount" class="discovery-active-count">{{activeFilterCount}} active</span>
       </button>
       <VariantFilterPanel v-if="showAdvanced" v-model:class-filter="classFilter" v-model:sort="sort" v-model:search-mode="searchMode" @close="showAdvanced=false" @reset="resetAdvancedFilters"/>
      </div>
      <span class="record-total" aria-label="Results on this page">{{rows.length}} results</span>
    </div>
    <div v-if="showSearchInfo" id="discovery-search-help" class="discovery-help" role="note">
      Search updates while typing. Separate up to four recorded variant identifiers with commas or semicolons for OR search. A single unambiguous exact identity opens its dossier automatically. Filters and scientific labels reflect database records, not independently validated clinical conclusions.
    </div>
    <p v-if="exactMatchedId" role="status" class="discovery-sr-only">Exact recorded identity opened automatically.</p>
    <p v-if="busy" role="status" class="discovery-loading">Searching…</p>
    <p v-if="error" role="alert" class="empty-result">{{ error }} <RouterLink v-if="error.includes('Sign in')" to="/sign-in">Sign in</RouterLink></p>
    <p v-else-if="!busy&&!rows.length&&!scientificInputAssessment.blocked" role="status" class="empty-result">No matching variants.</p>
    <div v-if="rows.length&&!scientificInputAssessment.blocked" class="record-list" aria-label="Search results"><button v-for="(record,index) in displayedRows" :key="record.id" type="button" @keydown="onResultKeydown($event,index)" @focus="activeResultIndex=index" @mouseenter="activeResultIndex=index" :aria-current="selected?.id===record.id?'true':undefined" :class="{'record-selected':selected?.id===record.id}" @click="select(record.id)"><span class="record-first"><strong>{{ variantDisplayName(record) }}</strong></span><span v-if="record.proteinName && !/^p\.\?$/.test(record.proteinName.trim())" class="record-subline">{{record.proteinName}}</span><span v-else-if="record.cdnaName" class="record-subline">{{record.cdnaName}}</span><span v-if="search.trim()" class="record-match-reason">{{matchExplanation(record)}}</span><span v-if="record.recordedClass" class="record-class">Class {{record.recordedClass}}</span><span v-if="selected?.id===record.id" class="record-current-label">Selected</span></button></div>
    <nav class="pagination-controls discovery-pagination" aria-label="Variant result pages">
      <button type="button" :disabled="busy||page===0" aria-label="Previous variant page" @click="page--"><span aria-hidden="true">←</span> Previous</button>
      <span class="discovery-page-current" aria-current="page">Page {{page+1}}</span>
      <button type="button" :disabled="busy||!hasMore" aria-label="Next variant page" @click="page++">Next <span aria-hidden="true">→</span></button>
    </nav>
   </section>
   <div class="record-content">
    <article class="record-overview" aria-labelledby="selected-title">
     <p v-if="detailBusy" role="status">Loading record…</p>
     <template v-else-if="selected">
      <div class="nfq-dossier-primary">
       <div class="record-identity">
        <div>
         <RouterLink class="record-return nfq-mobile-return" :to="{path:'/variants',query:route.query}">← Back to results</RouterLink>
         <div class="nfq-identity-title">
          <h2 id="selected-title">{{variantDisplayName(selected)}}</h2>
          <span v-if="dossier?.functionalClass||selected.recordedClass" class="nfq-class-pill">Class {{dossier?.functionalClass||selected.recordedClass}}</span>
         </div>
        </div>
        <span v-if="selected.id===exactMatchedId" class="discovery-exact-chip">Exact match</span>
       </div>
       <dl class="identity-grid nfq-dossier-identity" aria-label="Variant nomenclature">
        <div><dt>Legacy name</dt><dd>{{selected.legacyName||'Not recorded'}}</dd></div>
        <div><dt>Protein notation</dt><dd>{{selected.proteinName||'Not recorded'}}<small v-if="selected.proteinName?.trim()==='p.?'" class="nfq-unknown-consequence">Protein consequence unknown</small></dd></div>
        <div><dt>cDNA notation</dt><dd>{{selected.cdnaName||'Not recorded'}}</dd></div>
        <div><dt>Aliases</dt><dd>{{selected.aliases.length?selected.aliases.join(', '):'Not recorded'}}</dd></div>
       </dl>
      </div><section class="dossier-science" aria-label="Additional scientific record details">
      <p v-if="dossierError" role="alert">{{dossierError}}</p>
      <div class="nfq-details-control">
       <button type="button" class="nfq-details-trigger" :aria-expanded="scientificDetailsOpen" aria-controls="nfq-secondary-science" @click="scientificDetailsOpen=!scientificDetailsOpen">
        <span class="nfq-details-trigger-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>
        <span class="nfq-details-trigger-label">{{scientificDetailsOpen?'Hide additional details':'Show additional details'}}</span>
       </button>
      </div>
      <div v-show="scientificDetailsOpen" id="nfq-secondary-science" class="nfq-dossier-expanded">
       <section aria-labelledby="nfq-dossier-classification">
        <h3 id="nfq-dossier-classification" class="nfq-dossier-group-title">Classification</h3>
        <p v-if="!dossier&&!dossierError" class="rail-caption" role="status">Loading classification fields…</p>
        <dl v-if="dossier" class="identity-grid nfq-supporting-fields">
         <div><dt>Subtype</dt><dd>{{dossier.subtype||'Not recorded'}}</dd></div>
         <div><dt>Determination · database</dt><dd>{{dossier.recordedDetermination||'Not recorded'}}</dd></div>
         <div><dt>Confidence · database</dt><dd>{{dossier.confidence||'Not recorded'}}</dd></div>
         <div><dt>Data status</dt><dd>{{dossier.dataStatus||'Not recorded'}}</dd></div>
        </dl>
       </section>
       <section aria-labelledby="nfq-dossier-sources">
        <h3 id="nfq-dossier-sources" class="nfq-dossier-group-title">Sources and validation</h3>
        <dl v-if="dossier" class="identity-grid nfq-supporting-fields">
         <div><dt>Source summary</dt><dd>{{dossier.sourceSummary||'Not recorded'}}</dd></div>
         <div><dt>ClinVar</dt><dd><a v-if="clinVarVariationUrl(dossier.clinvarId)" :href="clinVarVariationUrl(dossier.clinvarId)!" target="_blank" rel="noopener noreferrer">Open ClinVar record ↗</a><span v-else>{{dossier.clinvarId?'Identifier not recognized':'Not recorded'}}</span></dd></div>
         <div><dt>Validation entries</dt><dd>{{dossier.validationCount??'Not recorded'}}</dd></div>
         <div><dt>Latest validation</dt><dd>{{dossier.lastValidatedAt||'Not recorded'}}</dd></div>
        </dl>
       </section>
      <div v-if="dossier&&clinVarVariationUrl(dossier.clinvarId)" class="clinvar-verification" aria-label="On-demand external ClinVar verification">
       <div class="clinvar-verification-head"><div><strong>External authority · ClinVar</strong><p class="rail-caption">Fetch the NCBI summary only when requested. Separate from recorded NeumuacFQ findings.</p></div><button type="button" :disabled="clinVarLoading" @click="checkClinVar">{{clinVarLoading?'Checking NCBI…':clinVarSummary?'Refresh ClinVar summary':'Check current ClinVar summary'}}</button></div>
       <p v-if="clinVarLoading" role="status" class="rail-caption">Requesting the official ClinVar API…</p>
       <p v-if="clinVarError" role="alert" class="rail-caption">{{clinVarError}}</p>
       <section v-if="evidenceComparison" class="evidence-comparison" aria-label="Source-attributed scientific evidence comparison">
        <h4>Evidence comparison · source-attributed</h4>
        <p class="rail-caption">Descriptions are not normalized or ranked. Source context and review scope can differ.</p>
        <dl class="identity-grid">
         <div><dt>NeumuacFQ · recorded determination</dt><dd>{{evidenceComparison.localClaim||'Not recorded'}}</dd></div>
         <div><dt>Local source summary</dt><dd>{{evidenceComparison.localSource||'Not recorded'}}</dd></div>
         <div><dt>NCBI ClinVar · germline aggregate</dt><dd>{{evidenceComparison.externalClaim||'Not returned'}}</dd></div>
         <div><dt>External review status</dt><dd>{{evidenceComparison.externalReview||'Not returned'}}</dd></div>
         <div><dt>Linked local references</dt><dd>{{evidenceComparison.referencesCount}} recorded</dd></div>
         <div><dt>Recorded source names</dt><dd>{{evidenceComparison.sourceNames.join(', ')||'None returned'}}</dd></div>
        </dl>
        <p class="rail-caption">{{evidenceComparison.interpretation}}</p>
       </section>
       <template v-if="clinVarSummary">
        <dl class="identity-grid">
         <div><dt>Verified external accession</dt><dd>{{clinVarSummary.accession}}</dd></div>
         <div><dt>Authority title</dt><dd>{{clinVarSummary.title}}</dd></div>
         <div><dt>Germline classification · ClinVar</dt><dd>{{clinVarSummary.germlineDescription||'Not returned'}}</dd></div>
         <div><dt>ClinVar review status</dt><dd>{{clinVarSummary.reviewStatus||'Not returned'}}</dd></div>
         <div><dt>Last external evaluation</dt><dd>{{clinVarSummary.lastEvaluated||'Not returned'}}</dd></div>
         <div><dt>Retrieved from NCBI</dt><dd>{{clinVarSummary.retrievedAt}}</dd></div>
        </dl>
        <p class="rail-caption">External aggregate classifications can concern multiple conditions. This is not a CFTR-specific clinical reconciliation, conflict determination or treatment recommendation. <a :href="clinVarSummary.sourceUrl" target="_blank" rel="noopener noreferrer">Review authority record ↗</a></p>
       </template>
      </div>
      </div>
     </section>
     <section v-if="scientificDetailsOpen" class="variant-evidence-links" aria-label="Scientific references">
      <h3 class="nfq-dossier-group-title">References</h3>
      <div v-if="evidenceReady&&cftr2References.length" class="nfq-external-register" aria-label="CFTR2 source links">
       <span class="section-label">CFTR2 · LINKED REFERENCES</span>
       <p>External CFTR2 links exist for this variant. Their contents and scientific conclusions have not been verified here.</p>
       <ul><li v-for="item in cftr2References" :key="item.id"><a :href="item.url" rel="noopener noreferrer" target="_blank">{{item.title}} ↗</a></li></ul>
      </div>
      <button class="disclosure-button" type="button" :disabled="!evidenceReady" :aria-expanded="showReferences" aria-controls="variant-reference-list" @click="showReferences=!showReferences"><span>{{showReferences?'Hide references':'Show references'}} · {{evidenceReady?linkedEvidence.length:evidenceError?'Unavailable':'Loading…'}}</span><span aria-hidden="true">{{showReferences?'−':'+'}}</span></button>
      <p v-if="evidenceError" role="alert" class="rail-caption">{{evidenceError}}</p>
      <p v-else-if="evidenceReady&&!linkedEvidence.length" class="rail-caption">No source links returned from this register; published evidence has not been assessed.</p>
      <div id="variant-reference-list" v-show="showReferences">
       <ul v-if="linkedEvidence.length" class="variant-evidence-list">
        <li v-for="entry in linkedEvidence" :key="entry.id"><a :href="entry.url" target="_blank" rel="noopener noreferrer">{{entry.title}} ↗</a><span>{{entry.source}}</span></li>
       </ul>
      </div>
      <RouterLink class="variant-evidence-browse" to="/evidence">Browse the evidence register →</RouterLink>
     </section>
     <section v-if="scientificDetailsOpen" class="research-history-section" aria-label="Research history">
      <h3 class="nfq-dossier-group-title">Review history</h3>
      <button class="disclosure-button" type="button" :aria-expanded="historyOpen" aria-controls="variant-research-history" @click="toggleResearchHistory">
       <span>Validation & conflict history</span><span aria-hidden="true">{{historyOpen?'−':'+'}}</span>
      </button>
      <div v-if="historyOpen" id="variant-research-history">
       <p class="rail-caption">Database-recorded events only. Historical log entries do not establish an independently verified immutable audit trail. Personal identifiers and free-text annotations are excluded.</p>
       <p v-if="historyLoading" role="status">Loading recorded history…</p>
       <p v-else-if="historyError" role="alert">{{historyError}}</p>
       <template v-else-if="researchHistory">
        <h4>Validation entries · {{researchHistory.validations.length}}</h4>
        <p v-if="!researchHistory.validations.length" class="rail-caption">No validation events returned for this variant.</p>
        <ul v-else class="research-history-list">
         <li v-for="event in researchHistory.validations" :key="'v'+event.id"><strong>{{event.action}}</strong> · {{event.at||'Date not recorded'}}<small>Recorded class: {{event.recordedClass||'Not recorded'}} · Confidence: {{event.confidence||'Not recorded'}}</small></li>
        </ul>
        <h4>Recorded conflicts · {{researchHistory.conflicts.length}}</h4>
        <p v-if="!researchHistory.conflicts.length" class="rail-caption">No conflict events returned for this variant.</p>
        <ul v-else class="research-history-list">
         <li v-for="event in researchHistory.conflicts" :key="'c'+event.id"><strong>{{event.field}}</strong> · {{event.resolved?'Resolved':'Unresolved'}}<small>Detected: {{event.detectedAt||'Not recorded'}} · Resolution: {{event.resolvedAt||'Not recorded'}}</small></li>
        </ul>
       </template>
      </div>
     </section>
     <div v-if="scientificDetailsOpen" class="nfq-dossier-report">
      <div class="variant-export-actions" v-if="scientificDetailsOpen">
      <button type="button" :disabled="briefBusy" @click="copyResearchBrief">{{briefBusy?'Preparing full research brief…':'Copy scientific research brief'}}</button>
      <p role="status" v-if="briefStatus">{{briefStatus}}</p>
      <p class="rail-caption">Copies current scientific fields and recorded reference links. No patient data, clinical report or treatment recommendations.</p>
     </div>
     </div>
     <p v-if="scientificDetailsOpen" class="history-disclaimer">Database classifications and reference links are research information, not independently validated clinical conclusions.</p></template>
     <template v-else-if="previewCandidate">
      <div class="research-preview" aria-label="Search result preview">
       <span class="section-label">SEARCH PREVIEW · NOT OPENED</span>
       <h2 id="selected-title">{{variantDisplayName(previewCandidate)}}</h2>
       <p class="research-preview-intro">Recorded identity preview. Open the dossier for its scientific fields, references and history.</p>
       <dl class="identity-grid">
        <div><dt>Protein</dt><dd>{{previewCandidate.proteinName||'Not recorded'}}</dd></div>
        <div><dt>cDNA</dt><dd>{{previewCandidate.cdnaName||'Not recorded'}}</dd></div>
        <div><dt>Class (recorded)</dt><dd>{{previewCandidate.recordedClass||'Not recorded'}}</dd></div>
        <div><dt>Recorded validations</dt><dd>{{previewCandidate.validationCount??'Not recorded'}}</dd></div>
       </dl>
       <button class="preview-open" type="button" @click="select(previewCandidate.id)">Open scientific dossier <span aria-hidden="true">→</span></button>
       <p class="rail-caption">Textual match is not a clinical interpretation. Use ↑/↓ to explore results, Enter to open.</p>
      </div>
     </template>
     <template v-else><h2 id="selected-title">{{route.params.id?'Record unavailable':'Select a variant'}}</h2><p>{{route.params.id?'No accessible record was returned for this identifier.':'Choose a database record to view its available nomenclature.'}}</p></template>
    </article>
   </div>
  </div>
 </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {authController,authSessionProvider} from '../services/authSession';

import {createLiveEvidenceSource,type LiveEvidenceReference} from '../services/liveEvidence';
import {createScientificDossierSource,type ScientificDossier} from '../services/scientificDossier';
import {createVariantResearchBrief} from '../services/researchBrief';
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

const linkedEvidence=ref<readonly LiveEvidenceReference[]>([]);
const evidenceError=ref('');
let evidenceAbort:AbortController|null=null;


let configError='';
try { if(config) source=createReadOnlyRepository(config,fetch,authSessionProvider); } catch(e){configError=formatReadStatus(e);}
const rows=ref<readonly RealVariant[]>([]);
const selected=ref<RealVariant|null>(null);
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
 evidenceAbort?.abort(); linkedEvidence.value=[]; evidenceError.value='';
 if(!value || !evidenceSource)return;
 const controller=new AbortController(); evidenceAbort=controller;
 try {const result=await evidenceSource.forVariant(value.id,controller.signal);
   if(!controller.signal.aborted)linkedEvidence.value=result;
 } catch {if(!controller.signal.aborted)evidenceError.value='Current source links could not be loaded.';}
});
const search=ref(typeof route.query.q==='string'?route.query.q:'');
const classFilter=ref(typeof route.query.class==='string'&&['I','II','III','IV','V','VI','unclassified'].includes(route.query.class)?route.query.class:'all');
const sort=ref(typeof route.query.sort==='string'&&['name-desc','recent-record','fewest-validations','most-validations'].includes(route.query.sort)?route.query.sort:'name-asc');
const searchMode=ref(typeof route.query.mode==='string'&&route.query.mode==='exact-name'?'exact-name':'contains');
const showAdvanced=ref(classFilter.value!=='all'||sort.value!=='name-asc'||searchMode.value!=='contains');
const showReferences=ref(false);
watch(selected,()=>{showReferences.value=false;});
const page=ref(0);
const hasMore=ref(false);
const busy=ref(false);
const detailBusy=ref(false);
const error=ref(configError);
let current:AbortController|null=null;
let detailRequest:AbortController|null=null;
let timer:ReturnType<typeof setTimeout>|undefined;
let listSequence=0;
let detailSequence=0;
async function load():Promise<void>{
  current?.abort();const run=++listSequence;const abort=new AbortController();current=abort;
  rows.value=[];hasMore.value=false;error.value='';
  if(!source){error.value=configError||'The public variant catalog has not been connected yet.';return;}
  busy.value=true;
  try {const data=await source.list({query:search.value,page:page.value,classFilter:classFilter.value as 'all'|'I'|'II'|'III'|'IV'|'V'|'VI'|'unclassified',sort:sort.value as 'name-asc'|'name-desc'|'recent-record'|'fewest-validations'|'most-validations',searchMode:searchMode.value as 'contains'|'exact-name',signal:abort.signal});if(run===listSequence){rows.value=data.records;hasMore.value=data.hasMore;}}
  catch(e){if(!abort.signal.aborted&&run===listSequence)error.value=formatReadStatus(e);}
  finally {if(run===listSequence)busy.value=false;}
}
async function loadDetail(id:unknown):Promise<void>{
  detailRequest?.abort();const run=++detailSequence;
  selected.value=null;
  if(typeof id!=='string'||!source)return;
  const abort=new AbortController();detailRequest=abort;detailBusy.value=true;
  try {const record=await source.get(id,abort.signal);if(run===detailSequence)selected.value=record;}
  catch(e){if(!abort.signal.aborted&&run===detailSequence)error.value=formatReadStatus(e);}
  finally {if(run===detailSequence)detailBusy.value=false;}
}
watch(()=>authController?.state.phase,()=>{current?.abort();detailRequest?.abort();rows.value=[];selected.value=null;page.value=0;void load();});
watch([search,page,classFilter,sort,searchMode],()=>{clearTimeout(timer);timer=setTimeout(()=>{void load();},search.value?250:0)},{immediate:true});
watch([search,classFilter,sort,searchMode],()=>{page.value=0;});
watch(()=>route.params.id,id=>{void loadDetail(id);},{immediate:true});
onUnmounted(()=>{current?.abort();detailRequest?.abort();evidenceAbort?.abort();dossierAbort?.abort();briefAbort?.abort();clearTimeout(timer);});
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
function select(id:string):void{void router.push({path:'/variants/'+encodeURIComponent(id)});}
</script>
<template>
 <div class="page variant-page">
  <div class="eyebrow">RESEARCH WORKSPACES / VARIANT INTELLIGENCE</div>
  <div class="variant-heading"><div><h1>Variant workspace</h1><p class="intro">Read-only CFTR nomenclature from real research records. Scientific profiles and linked references are available for records where the source contains them. Clinical conclusions are not independently validated.</p></div><span class="fixture-stamp">{{liveMode ? "LIVE · READ ONLY" : "CONNECTION REQUIRED"}}</span></div>
  <div class="record-layout">
   <section class="record-rail" aria-labelledby="record-list-title">
    <div class="rail-topline"><div><span class="section-label">VARIANT INDEX</span><h2 id="record-list-title">Variant records</h2></div><span class="record-total">{{rows.length}} on page</span></div>
    <label for="search">Search variant identifier</label>
    <input id="search" v-model="search" type="search" autocomplete="off" placeholder="Variant name or HGVS notation"/>
    <details class="research-disclosure" :open="showAdvanced" @toggle="showAdvanced=($event.target as HTMLDetailsElement).open">
     <summary>Advanced search & prioritization <span>{{classFilter==='all'&&sort==='name-asc'&&searchMode==='contains'?'Optional filters':'Filters active'}}</span></summary>
     <div class="variant-worklist-filters" aria-label="Scientific worklist filters">
      <label for="class-filter">Functional class (recorded)</label>
      <label for="variant-sort">Order by</label>
      <select id="class-filter" v-model="classFilter">
       <option value="all">All classes</option>
       <option v-for="item in ['I','II','III','IV','V','VI']" :key="item" :value="item">Class {{item}}</option>
       <option value="unclassified">Unclassified in database</option>
      </select>
      <select id="variant-sort" v-model="sort">
       <option value="name-asc">Name A–Z</option><option value="name-desc">Name Z–A</option>
       <option value="recent-record">Record ID · newest first</option>
       <option value="fewest-validations">Fewest recorded validations</option>
       <option value="most-validations">Most recorded validations</option>
      </select>
      <label for="search-mode">Match mode</label><span></span>
      <select id="search-mode" v-model="searchMode"><option value="contains">Contains name, HGVS or alias</option><option value="exact-name">Exact recorded name or notation</option></select>
     </div>
    </details><p class="rail-caption">Live server-side class filtering. Labels reflect existing research records, not independent scientific validation.</p>
    <p v-if="busy" role="status">Loading public variant records…</p>
    <p v-else-if="error" role="alert" class="empty-result">{{ error }} <RouterLink v-if="error.includes('Sign in')" to="/sign-in">Sign in</RouterLink></p>
    <p v-else-if="!rows.length" role="status" class="empty-result">No variant records returned for this search. No demonstration records are substituted.</p>
    <div v-else class="record-list" aria-label="Search results"><button v-for="record in rows" :key="record.id" type="button" :aria-current="selected?.id===record.id?'true':undefined" :class="{'record-selected':selected?.id===record.id}" @click="select(record.id)"><span class="record-first"><strong>{{ variantDisplayName(record) }}</strong></span><span class="record-subline">{{ record.proteinName || record.cdnaName || 'Additional nomenclature not recorded' }}</span><span v-if="record.recordedClass" class="record-class">Class {{record.recordedClass}} · recorded</span><span v-if="record.validationCount!==null&&record.validationCount!==undefined" class="record-class">{{record.validationCount}} recorded validations</span><span class="record-bottom">Database record <span aria-hidden="true">→</span></span></button></div>
    <div class="pagination-controls"><button type="button" :disabled="busy||page===0" @click="page--">Previous</button><span>Page {{page+1}}</span><button type="button" :disabled="busy||!hasMore" @click="page++">Next</button></div>
   </section>
   <div class="record-content">
    <article class="record-overview" aria-labelledby="selected-title">
     <div class="section-label">DATABASE RECORD / READ ONLY</div>
     <p v-if="detailBusy" role="status">Loading record…</p>
     <template v-else-if="selected"><div class="record-identity"><div><h2 id="selected-title">{{variantDisplayName(selected)}}</h2><p>Recorded variant identity fields only. No scientific conclusions or clinical validation are inferred.</p></div><span class="record-state">Nomenclature only</span></div><dl class="identity-grid"><div><dt>Legacy name</dt><dd>{{selected.legacyName||'Not recorded'}}</dd></div><div><dt>Protein notation</dt><dd>{{selected.proteinName||'Not recorded'}}</dd></div><div><dt>cDNA notation</dt><dd>{{selected.cdnaName||'Not recorded'}}</dd></div><div><dt>Recorded aliases</dt><dd>{{selected.aliases.length?selected.aliases.join(', '):'Not recorded'}}</dd></div></dl><div class="variant-export-actions">
      <button type="button" :disabled="briefBusy" @click="copyResearchBrief">{{briefBusy?'Preparing full research brief…':'Copy scientific research brief'}}</button>
      <p role="status" v-if="briefStatus">{{briefStatus}}</p>
      <p class="rail-caption">Copies current scientific fields and recorded reference links. No patient data, clinical report or treatment recommendations.</p>
     </div><section class="dossier-science" aria-label="Recorded scientific classification">
      <h3>Scientific record</h3>
      <p class="rail-caption">Values below are recorded database fields, not independently adjudicated conclusions.</p>
      <p v-if="dossierError" role="alert">{{dossierError}}</p>
      <dl v-else-if="dossier" class="identity-grid">
       <div><dt>CFTR functional class</dt><dd>{{dossier.functionalClass||'Not recorded'}}</dd></div>
       <div><dt>Class subtype</dt><dd>{{dossier.subtype||'Not recorded'}}</dd></div>
       <div><dt>Recorded determination</dt><dd>{{dossier.recordedDetermination||'Not recorded'}}</dd></div>
       <div><dt>Class confidence (recorded)</dt><dd>{{dossier.confidence||'Not recorded'}}</dd></div>
       <div><dt>Source summary</dt><dd>{{dossier.sourceSummary||'Not recorded'}}</dd></div>
       <div><dt>Data status</dt><dd>{{dossier.dataStatus||'Not recorded'}}</dd></div>
       <div><dt>Recorded validations</dt><dd>{{dossier.validationCount??'Not recorded'}}</dd></div>
       <div><dt>Last validation</dt><dd>{{dossier.lastValidatedAt||'Not recorded'}}</dd></div>
      </dl>
     </section>
     <section class="variant-evidence-links" aria-label="Recorded source references">
      <button class="disclosure-button" type="button" :aria-expanded="showReferences" aria-controls="variant-reference-list" @click="showReferences=!showReferences"><span>Recorded references · {{linkedEvidence.length}}</span><span aria-hidden="true">{{showReferences?'−':'+'}}</span></button>
      <p class="rail-caption">Current source links from the research database. A recorded link is not a clinical assessment or an independently verified claim.</p>
      <p v-if="evidenceError" role="alert" class="rail-caption">{{evidenceError}}</p><p v-else-if="!linkedEvidence.length" class="rail-caption">No source links currently returned for this variant. This does not establish an absence of published research.</p>
      <ul v-else-if="showReferences" id="variant-reference-list" class="variant-evidence-list">
        <li v-for="entry in linkedEvidence" :key="entry.id"><a :href="entry.url" target="_blank" rel="noopener noreferrer">{{entry.title}} ↗</a><span>{{entry.source}}</span></li>
      </ul>
      <RouterLink class="variant-evidence-browse" to="/evidence">Browse the evidence register →</RouterLink>
     </section>
     <p class="history-disclaimer">Clinical assessment, private annotations and review history are not available in this view.</p></template>
     <template v-else><h2 id="selected-title">{{route.params.id?'Record unavailable':'Select a variant'}}</h2><p>{{route.params.id?'No accessible record was returned for this identifier.':'Choose a database record to view its available nomenclature.'}}</p></template>
    </article>
   </div>
  </div>
 </div>
</template>

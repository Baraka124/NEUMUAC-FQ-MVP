<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {authController,authSessionProvider} from '../services/authSession';
import { createReadOnlyRepository, readConfigFromEnvironment, variantDisplayName, formatReadStatus, type RealVariant, type RealVariantSource } from '../services/liveVariants';
const route=useRoute(),router=useRouter();
const config=readConfigFromEnvironment();
let source:RealVariantSource|null=null;
let configError='';
try { if(config) source=createReadOnlyRepository(config,fetch,authSessionProvider); } catch(e){configError=formatReadStatus(e);}
const rows=ref<readonly RealVariant[]>([]);
const selected=ref<RealVariant|null>(null);
const search=ref('');
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
  try {const data=await source.list({query:search.value,page:page.value,signal:abort.signal});if(run===listSequence){rows.value=data.records;hasMore.value=data.hasMore;}}
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
watch([search,page],()=>{clearTimeout(timer);timer=setTimeout(()=>{void load();},search.value?250:0)},{immediate:true});
watch(search,()=>{page.value=0;});
watch(()=>route.params.id,id=>{void loadDetail(id);},{immediate:true});
onUnmounted(()=>{current?.abort();detailRequest?.abort();clearTimeout(timer);});
function select(id:string):void{void router.push({path:'/variants/'+encodeURIComponent(id)});}
</script>
<template>
 <div class="page variant-page">
  <div class="eyebrow">RESEARCH WORKSPACES / VARIANT INTELLIGENCE</div>
  <div class="variant-heading"><div><h1>Variant workspace</h1><p class="intro">Read-only CFTR variant nomenclature available to visitors when the public catalog is connected. Scientific assessment and editorial review are not yet migrated.</p></div><span class="fixture-stamp">READ ONLY</span></div>
  <div class="record-layout">
   <section class="record-rail" aria-labelledby="record-list-title">
    <div class="rail-topline"><div><span class="section-label">VARIANT INDEX</span><h2 id="record-list-title">Variant records</h2></div><span class="record-total">{{ rows.length }} on page</span></div>
    <label for="search">Search variant identifier</label>
    <input id="search" v-model="search" type="search" autocomplete="off" placeholder="Variant name or HGVS notation"/>
    <p class="rail-caption">Search is a read-only database lookup. The full legacy scientific ranking and alias engine are not yet active.</p>
    <p v-if="busy" role="status">Loading public variant records…</p>
    <p v-else-if="error" role="alert" class="empty-result">{{ error }} <RouterLink v-if="error.includes('Sign in')" to="/sign-in">Sign in</RouterLink></p>
    <p v-else-if="!rows.length" role="status" class="empty-result">No variant records returned for this search. No demonstration records are substituted.</p>
    <div v-else class="record-list" aria-label="Search results"><button v-for="record in rows" :key="record.id" type="button" :aria-current="selected?.id===record.id?'true':undefined" :class="{'record-selected':selected?.id===record.id}" @click="select(record.id)"><span class="record-first"><strong>{{ variantDisplayName(record) }}</strong></span><span class="record-subline">{{ record.proteinName || record.cdnaName || 'Additional nomenclature not recorded' }}</span><span class="record-bottom">Database record <span aria-hidden="true">→</span></span></button></div>
    <div class="pagination-controls"><button type="button" :disabled="busy||page===0" @click="page--">Previous</button><span>Page {{page+1}}</span><button type="button" :disabled="busy||!hasMore" @click="page++">Next</button></div>
   </section>
   <div class="record-content">
    <article class="record-overview" aria-labelledby="selected-title">
     <div class="section-label">DATABASE RECORD / READ ONLY</div>
     <p v-if="detailBusy" role="status">Loading record…</p>
     <template v-else-if="selected"><div class="record-identity"><div><h2 id="selected-title">{{variantDisplayName(selected)}}</h2><p>Variant identity fields returned by the configured data source. No scientific conclusions are inferred.</p></div><span class="record-state">Unassessed in new workspace</span></div><dl class="identity-grid"><div><dt>Legacy name</dt><dd>{{selected.legacyName||'Not recorded'}}</dd></div><div><dt>Protein notation</dt><dd>{{selected.proteinName||'Not recorded'}}</dd></div><div><dt>cDNA notation</dt><dd>{{selected.cdnaName||'Not recorded'}}</dd></div><div><dt>Recorded aliases</dt><dd>{{selected.aliases.length?selected.aliases.join(', '):'Not recorded'}}</dd></div></dl><p class="history-disclaimer">Evidence, provenance, curation and review history are not loaded until their underlying authorization and schema are verified.</p></template>
     <template v-else><h2 id="selected-title">{{route.params.id?'Record unavailable':'Select a variant'}}</h2><p>{{route.params.id?'No accessible record was returned for this identifier.':'Choose a database record to view its available nomenclature.'}}</p></template>
    </article>
   </div>
  </div>
 </div>
</template>

<script setup lang="ts">
import {computed,ref,watch,onUnmounted} from 'vue';
import {RouterLink} from 'vue-router';
import {MECHANISM_CATEGORIES,type MechanismCategory} from '../domain/mechanismAnnotationDraft';
import {THERAPIES,type CoreModulatorId} from '../domain/therapyRegistry';
import {createMolecularDiscoveryService,type MolecularDiscoveryEntry} from '../services/molecularDiscoveryService';
import {readConfigFromEnvironment} from '../services/liveVariants';
import {authSessionProvider} from '../services/authSession';
const props=defineProps<{active:boolean;currentVariantId:string}>();
const config=readConfigFromEnvironment();
const service=config&&authSessionProvider?
 createMolecularDiscoveryService(config,authSessionProvider,fetch):null;
const expanded=ref(false);
const category=ref<MechanismCategory|null>(null);
const scope=ref<'all'|'current'>('all');
const state=ref<'idle'|'loading'|'ready'|'unavailable'>('idle');
const rows=ref<readonly MolecularDiscoveryEntry[]>([]);
const hasMore=ref(false);
const offset=ref(0);
const limit=20;
let controller:AbortController|null=null;
const selection=computed(()=>({
 category:category.value,variantId:scope.value==='current'?props.currentVariantId:null,
 limit,offset:offset.value
}));
function clear():void{
 controller?.abort();controller=null;rows.value=[];offset.value=0;
 hasMore.value=false;state.value='idle';
}
function close():void{expanded.value=false;clear();}
function toggle():void{if(expanded.value)close();else {expanded.value=true;void load(false);}}
async function load(more:boolean):Promise<void>{
 controller?.abort();controller=new AbortController();
 const current=controller;
 if(!more){rows.value=[];offset.value=0;hasMore.value=false;}
 if(!props.active||!service){state.value='unavailable';return;}
 const params={...selection.value,offset:more?offset.value:0};
 state.value='loading';
 try{
  const page=await service.search(params,current.signal);
  if(current.signal.aborted||controller!==current||!props.active)return;
  const merged=more?[...rows.value,...page.entries]:page.entries;
  if(new Set(merged.map(r=>r.id)).size!==merged.length)
   throw new Error('Overlapping discovery pages');
  rows.value=merged;offset.value=params.offset+page.entries.length;
  hasMore.value=page.hasMore;state.value='ready';
 }catch{
  if(!current.signal.aborted&&controller===current){
   rows.value=[];offset.value=0;hasMore.value=false;state.value='unavailable';
  }
 }finally{if(controller===current)controller=null;}
}
watch([category,scope,()=>props.currentVariantId],()=>{
 if(expanded.value)void load(false);
});
watch(()=>props.active,active=>{if(!active)close();});
onUnmounted(()=>controller?.abort());
const therapyLabel=(id:CoreModulatorId)=>THERAPIES.find(x=>x.id===id)?.label??id;
</script>
<template>
 <section class="nfq-discovery" data-testid="nfq-molecular-discovery">
  <header class="nfq-discovery-head">
   <div><strong>Reviewed molecular evidence register</strong>
    <p>Research discovery across CFTR variants · original sources · independent scientific adjudication</p></div>
   <button type="button" :aria-expanded="expanded" @click="toggle">
    {{expanded?'Close register':'Explore approved mechanisms'}}
   </button>
  </header>
  <div v-if="expanded" class="nfq-discovery-content">
   <p class="nfq-discovery-note">
    Only molecular interpretations approved by two independent scientific reviewers,
    and linked to independently approved source claims, appear here.
    Matching mechanisms are not equivalent variants or predicted therapeutic responses.
   </p>
   <div class="nfq-discovery-controls">
    <label>Mechanism
     <select v-model="category">
      <option :value="null">All reviewed mechanisms</option>
      <option v-for="mechanism in MECHANISM_CATEGORIES" :key="mechanism.id"
       :value="mechanism.id">{{mechanism.label}}</option>
     </select>
    </label>
    <label>Variant scope
     <select v-model="scope">
      <option value="all">All catalogue variants</option>
      <option value="current">Current variant #{{currentVariantId}}</option>
     </select>
    </label>
   </div>
   <p v-if="state==='loading'" role="status" class="nfq-discovery-note">Verifying approved source records…</p>
   <p v-else-if="state==='unavailable'" role="status" class="nfq-discovery-note">
    The independently approved molecular register could not be verified. No partial results are shown.
   </p>
   <p v-else-if="state==='ready'&&!rows.length" role="status" class="nfq-discovery-note">
    No independently approved molecular observations are recorded for these filters.
    This does not indicate absence of biological evidence.
   </p>
   <div v-if="rows.length" class="nfq-discovery-results" role="list">
    <article v-for="entry in rows" :key="entry.id" role="listitem">
     <div class="nfq-discovery-head">
      <strong>{{entry.legacyName||entry.cdnaName||'Variant #'+entry.variantId}}</strong>
      <span>{{entry.categories.join(' · ')}}</span>
     </div>
     <p class="nfq-discovery-meta">
      #{{entry.variantId}} · {{entry.cdnaName||'cDNA not recorded'}} ·
      {{entry.proteinName||'Protein not recorded'}} · Class {{entry.recordedClass||'not recorded'}}
     </p>
     <p>{{entry.statement}}</p>
     <p class="nfq-discovery-meta">{{entry.interpretation}} · {{therapyLabel(entry.therapy)}}
      · {{entry.experimentalContext}}</p>
     <details>
      <summary>Study context, limitations &amp; provenance</summary>
      <p>{{entry.limitations}}</p>
      <p>Source study family: {{entry.studyFamilyId}} ·
       claim {{entry.sourceClaimId}} · {{entry.exactLocator}}</p>
      <p>Molecular revision {{entry.revision}} · identifier {{entry.id}}</p>
     </details>
     <div class="nfq-discovery-links">
      <RouterLink :to="'/variants/'+entry.variantId">Open variant dossier</RouterLink>
      <a :href="entry.sourceUrl" rel="noopener noreferrer" target="_blank">
       Original publication · {{entry.sourceTitle}}</a>
     </div>
    </article>
   </div>
   <button v-if="state==='ready'&&hasMore" type="button" @click="load(true)">
    Load next approved records
   </button>
   <p v-if="state==='ready'&&rows.length" class="nfq-discovery-note">
    {{rows.length}} source-linked approved record{{rows.length===1?'':'s'}} loaded.
    This is a paginated research register, not a population prevalence estimate.
   </p>
  </div>
 </section>
</template>
<style scoped>
.nfq-discovery{padding:12px 0;border-top:1px solid var(--border,#dde7ef);color:var(--text,#243d5b);font-size:11px}
.nfq-discovery-head{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:9px 15px}
.nfq-discovery-head strong{font-size:12px;font-weight:670}
.nfq-discovery-head p,.nfq-discovery-note,.nfq-discovery-meta{font-size:11px;color:var(--text-muted,#6b839b);line-height:1.55;margin:5px 0}
.nfq-discovery button{background:transparent;border:1px solid var(--border,#c7d8e7);color:inherit;border-radius:5px;padding:6px 9px;font:inherit;font-size:11px;cursor:pointer}
.nfq-discovery button:focus-visible,.nfq-discovery select:focus-visible,.nfq-discovery a:focus-visible{outline:2px solid #3876c5;outline-offset:2px}
.nfq-discovery-content{padding-top:8px}
.nfq-discovery-controls{display:flex;flex-wrap:wrap;gap:10px 16px;padding:8px 0}
.nfq-discovery-controls label{display:grid;gap:5px}
.nfq-discovery-controls select{border:1px solid var(--border,#c7d8e7);border-radius:5px;padding:6px 8px;font:inherit;font-size:11px;background:transparent;color:inherit;max-width:230px}
.nfq-discovery-results article{padding:11px 0;border-top:1px solid var(--border,#dde7ef)}
.nfq-discovery-results article>p{line-height:1.55;margin:7px 0}
.nfq-discovery-results details{margin:7px 0}
.nfq-discovery-results summary{cursor:pointer}
.nfq-discovery-links{display:flex;flex-wrap:wrap;gap:8px 19px;margin-top:9px}
.nfq-discovery-links a{font-size:11px;color:var(--link,#2869a9);text-decoration:underline;text-underline-offset:3px}
.nfq-discovery-head>span{font-size:10px;color:var(--text-muted,#6b839b)}
</style>

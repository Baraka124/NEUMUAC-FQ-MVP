<script setup lang="ts">
import {computed,ref,onMounted,onUnmounted} from 'vue';
import {RouterLink} from 'vue-router';
import {readConfigFromEnvironment,variantDisplayName} from '../services/liveVariants';
import {loadLiveCoverage,type CoverageReport} from '../services/liveCoverage';
import {filterDocumentation,summarizeDocumentation,type DocumentationGroup} from '../domain/documentationCoverage';

const report=ref<CoverageReport|null>(null);
const loading=ref(true),error=ref(''),filter=ref<DocumentationGroup>('none'),query=ref(''),visible=ref(40);
const groups=[
 {id:'none',label:'No links recorded'},
 {id:'single',label:'One recorded link'},
 {id:'multiple',label:'Two or more links'},
 {id:'all',label:'All variants'}
] as const;
let abort:AbortController|null=null;
const summary=computed(()=>summarizeDocumentation(report.value?.variants||[]));
const filtered=computed(()=>filterDocumentation(report.value?.variants||[],filter.value,query.value));
const shown=computed(()=>filtered.value.slice(0,visible.value));
const pct=computed(()=>report.value?.variants.length
  ?Math.round(1000*report.value.linkedVariants/report.value.variants.length)/10+'%':'—');
function reset(){visible.value=40;}
function chooseGroup(group:DocumentationGroup){filter.value=group;reset();}
function clearFilters(){filter.value='all';query.value='';reset();}
async function refresh(){
 abort?.abort();const request=new AbortController();abort=request;
 loading.value=true;error.value='';report.value=null;
 const cfg=readConfigFromEnvironment();
 if(!cfg){error.value='Live research coverage connection is not configured.';loading.value=false;return;}
 try{const value=await loadLiveCoverage(cfg,request.signal);if(!request.signal.aborted)report.value=value;}
 catch{if(!request.signal.aborted)error.value='The full coverage register could not be retrieved. No partial figures are displayed.';}
 finally{if(!request.signal.aborted)loading.value=false;}
}
onMounted(()=>void refresh());
onUnmounted(()=>abort?.abort());
</script>
<template>
 <div class="page intelligence-page nfq-science-ui">
  <div class="eyebrow">CFTR RESEARCH / EVIDENCE COVERAGE</div>
  <h1>Research intelligence</h1>
  <p class="intro">Review which variant records have reference links in the research catalog. Link counts describe documentation coverage only—not scientific evidence strength or clinical priority.</p>
  <p v-if="loading" role="status">Retrieving the complete live variant and reference-link registers…</p>
  <p v-else-if="error" role="alert" class="empty-result">{{error}} <button type="button" @click="refresh">Retry</button></p>
  <template v-else-if="report">
   <section class="intelligence-metrics" aria-label="Recorded evidence coverage">
    <div><strong>{{summary.all.toLocaleString()}}</strong><span>Live variant records</span></div>
    <div><strong>{{report.totalLinks.toLocaleString()}}</strong><span>Recorded reference links</span></div>
    <div><strong>{{report.linkedVariants.toLocaleString()}}</strong><span>Variants with links</span></div>
    <div><strong>{{pct}}</strong><span>Catalog with recorded links</span></div>
   </section>
   <div class="nfq-coverage-section-head">
    <div>
     <h2>Documentation coverage</h2>
     <p>Explore records by the number of references linked in this catalog.</p>
    </div>
    <button type="button" class="nfq-coverage-refresh" :disabled="loading" @click="refresh">Refresh coverage</button>
   </div>
   <nav class="nfq-coverage-groups" aria-label="Documentation coverage groups">
    <button v-for="group in groups" :key="group.id" type="button"
      :aria-pressed="filter===group.id" :class="{'nfq-coverage-active':filter===group.id}"
      @click="chooseGroup(group.id)">
      <span>{{group.label}}</span><strong>{{summary[group.id].toLocaleString()}}</strong>
    </button>
   </nav>
   <div class="intelligence-filters nfq-coverage-search">
    <label for="coverage-search">Find a recorded variant</label>
    <input id="coverage-search" v-model="query" type="search" placeholder="Recorded name, HGVS or alias" @input="reset"/>
    <button v-if="query" type="button" class="nfq-coverage-clear" @click="query='';reset()">Clear search</button>
   </div>
   <p class="rail-caption" role="status">{{filtered.length.toLocaleString()}} matching {{filtered.length===1?'record':'records'}} · Link counts are not a scientific quality assessment.</p>
   <div v-if="!filtered.length" class="nfq-coverage-empty" role="status">
    <p>No recorded variants match the current documentation view.</p>
    <button type="button" @click="clearFilters">Show all recorded variants</button>
   </div>
   <div v-else class="intelligence-register" aria-label="Variant coverage results">
    <article v-for="item in shown" :key="item.variant.id" class="intelligence-record">
     <div>
      <RouterLink :to="'/variants/'+encodeURIComponent(item.variant.id)">{{variantDisplayName(item.variant)}}</RouterLink>
      <p>{{item.variant.proteinName&&!/^p\.\?$/.test(item.variant.proteinName.trim())?item.variant.proteinName:item.variant.cdnaName||'Additional notation not recorded'}}</p>
     </div>
     <span v-if="item.links===0">No reference links recorded</span>
     <span v-else>{{item.links.toLocaleString()}} recorded {{item.links===1?'reference link':'reference links'}}</span>
    </article>
   </div>
   <button v-if="visible<filtered.length" class="evidence-more" type="button" @click="visible+=40">Show more variants</button>
   <section class="intelligence-sources" aria-label="Reference source distribution">
    <h2>Recorded source distribution</h2>
    <p v-if="!report.bySource.length" class="rail-caption">No source links recorded in the retrieved register.</p>
    <div v-for="source in report.bySource" :key="source.name"><span>{{source.name}}</span><strong>{{source.count.toLocaleString()}}</strong></div>
   </section>
   <p class="history-disclaimer">Figures reflect a complete, successful live read of the accessible variant and evidence_links registers when this view loaded. Missing links are documentation follow-up candidates, never proof of missing research, a negative finding or a classification. This view does not use individual search histories or geographic locations.</p>
  </template>
 </div>
</template>

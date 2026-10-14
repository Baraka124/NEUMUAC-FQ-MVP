<script setup lang="ts">
import {computed,ref,onMounted,onUnmounted} from 'vue';
import {RouterLink} from 'vue-router';
import {readConfigFromEnvironment,variantDisplayName} from '../services/liveVariants';
import {loadLiveCoverage,type CoverageReport} from '../services/liveCoverage';
const report=ref<CoverageReport|null>(null),loading=ref(true),error=ref(''),filter=ref('unlinked'),query=ref(''),visible=ref(40);
let abort:AbortController|null=null;
const filtered=computed(()=>{
 const q=query.value.trim().toLocaleLowerCase();
 return (report.value?.variants||[]).filter(item=>(filter.value==='all'||(filter.value==='unlinked'?item.links===0:item.links>0))&&
 (!q||[item.variant.legacyName,item.variant.proteinName,item.variant.cdnaName,...item.variant.aliases].some(v=>v?.toLocaleLowerCase().includes(q))))
 .sort((a,b)=>a.links-b.links||variantDisplayName(a.variant).localeCompare(variantDisplayName(b.variant)));
});
const shown=computed(()=>filtered.value.slice(0,visible.value));
const pct=computed(()=>report.value?.variants.length?Math.round(1000*report.value.linkedVariants/report.value.variants.length)/10:0);
function reset(){visible.value=40;}
async function refresh(){
 abort?.abort();abort=new AbortController();loading.value=true;error.value='';report.value=null;
 const cfg=readConfigFromEnvironment();
 if(!cfg){error.value='Live research coverage connection is not configured.';loading.value=false;return;}
 try{report.value=await loadLiveCoverage(cfg,abort.signal);}
 catch{if(!abort.signal.aborted)error.value='The full coverage register could not be retrieved. No partial figures are displayed.';}
 finally{if(!abort.signal.aborted)loading.value=false;}
}
onMounted(()=>void refresh());
onUnmounted(()=>abort?.abort());
</script>
<template>
 <div class="page intelligence-page">
  <div class="eyebrow">CFTR RESEARCH / EVIDENCE COVERAGE</div>
  <h1>Research intelligence</h1>
  <p class="intro">Assess the completeness of NeumuacFQ's recorded source links across the live variant catalog. This identifies documentation priorities, not gaps in published science or clinical evidence.</p>
  <p v-if="loading" role="status">Retrieving the full live variant and source registers…</p>
  <p v-else-if="error" role="alert" class="empty-result">{{error}} <button type="button" @click="refresh">Retry</button></p>
  <template v-else-if="report">
   <section class="intelligence-metrics" aria-label="Recorded evidence coverage">
    <div><strong>{{report.variants.length.toLocaleString()}}</strong><span>Live variant records</span></div>
    <div><strong>{{report.totalLinks.toLocaleString()}}</strong><span>Recorded reference links</span></div>
    <div><strong>{{report.linkedVariants.toLocaleString()}}</strong><span>Variants with links</span></div>
    <div><strong>{{pct}}%</strong><span>Catalog with recorded links</span></div>
   </section>
   <h2>Explore documentation coverage</h2>
   <div class="intelligence-filters">
    <label for="coverage-filter">Reference status</label>
    <select id="coverage-filter" v-model="filter" @change="reset"><option value="unlinked">No links recorded</option><option value="linked">With recorded links</option><option value="all">All variants</option></select>
    <label for="coverage-search">Find variant</label>
    <input id="coverage-search" v-model="query" type="search" placeholder="Name, HGVS or alias" @input="reset"/>
   </div>
   <p class="rail-caption" role="status">{{filtered.length.toLocaleString()}} matching variants · linked records are not a scientific quality assessment</p>
   <div class="intelligence-register" aria-label="Variant coverage results">
    <article v-for="item in shown" :key="item.variant.id" class="intelligence-record">
     <div><RouterLink :to="'/variants/'+item.variant.id">{{variantDisplayName(item.variant)}}</RouterLink><p>{{item.variant.proteinName||item.variant.cdnaName||'Additional notation not recorded'}}</p></div>
     <span>{{item.links}} {{item.links===1?'reference':'references'}} recorded</span>
    </article>
   </div>
   <button v-if="visible<filtered.length" class="evidence-more" type="button" @click="visible+=40">Show more variants</button>
   <section class="intelligence-sources"><h2>Recorded source distribution</h2><div v-for="source in report.bySource" :key="source.name"><span>{{source.name}}</span><strong>{{source.count}}</strong></div></section>
   <p class="history-disclaimer">A missing database link does not imply a lack of research, a negative finding, or a classification of a variant. Figures reflect a completed live fetch of the variant and evidence_links registers at the time this view loaded. Refresh to update.</p>
  </template>
 </div>
</template>
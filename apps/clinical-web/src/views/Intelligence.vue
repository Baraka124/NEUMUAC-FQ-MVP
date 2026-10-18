<script setup lang="ts">
import {computed,ref,onMounted,onUnmounted} from 'vue';
import ContextHelp from '../components/ContextHelp.vue';
import {RouterLink,useRoute,useRouter} from 'vue-router';
import {safeResearchReturnPath,workspaceJourneyPath} from '../domain/researchJourney';
import {readConfigFromEnvironment,variantDisplayName} from '../services/liveVariants';
import {loadLiveCoverage,type CoverageReport} from '../services/liveCoverage';
import {filterDocumentation,summarizeDocumentation,type DocumentationGroup} from '../domain/documentationCoverage';
import {recordedNomenclature,unspecifiedSourceLinks} from '../domain/documentationTrace';
import {documentationWorklistCsv,MAX_DOCUMENTATION_EXPORT_ROWS} from '../domain/documentationWorklistExport';

const route=useRoute(),router=useRouter();
const returnToVariant=computed(()=>safeResearchReturnPath(route.query.from,'variant'));
const focusId=computed(()=>typeof route.query.variant==='string'&&/^[1-9]\d{0,17}$/.test(route.query.variant)?route.query.variant:null);
const focusedRecord=computed(()=>report.value?.variants.find(row=>row.variant.id===focusId.value)||null);
function clearScope(){void router.replace({path:'/intelligence'});}
const workspaceReturn=computed(()=>workspaceJourneyPath('/intelligence',{q:query.value,group:filter.value,shown:String(visible.value),expanded:expandedId.value||undefined,variant:focusId.value||undefined}));
const report=ref<CoverageReport|null>(null);
const loading=ref(true),error=ref(''),filter=ref<DocumentationGroup>(['none','single','multiple','all'].includes(String(route.query.group))?route.query.group as DocumentationGroup:'none'),query=ref(typeof route.query.q==='string'&&route.query.q.length<=75?route.query.q:''),visible=ref(typeof route.query.shown==='string'&&/^\d{2,4}$/.test(route.query.shown)&&Number(route.query.shown)%40===0?Math.min(Number(route.query.shown),4000):40);
const expandedId=ref<string|null>(typeof route.query.expanded==='string'&&/^\d{1,18}$/.test(route.query.expanded)?route.query.expanded:null);
const groups=[
 {id:'none',label:'No links recorded'},
 {id:'single',label:'One recorded link'},
 {id:'multiple',label:'Two or more links'},
 {id:'all',label:'All variants'}
] as const;
let abort:AbortController|null=null;
const summary=computed(()=>summarizeDocumentation(report.value?.variants||[]));
const filtered=computed(()=>focusId.value?(focusedRecord.value?[focusedRecord.value]:[]):filterDocumentation(report.value?.variants||[],filter.value,query.value));
const shown=computed(()=>filtered.value.slice(0,visible.value));
const exportNotice=ref('');
function exportDocumentationMatches():void{
 if(!report.value||loading.value||error.value)return;
 const csv=documentationWorklistCsv(filtered.value);
 if(!csv){
  exportNotice.value=filtered.value.length>MAX_DOCUMENTATION_EXPORT_ROWS
   ?'Too many matching records for a safe CSV download. Narrow the filter.'
   :'The current documentation worklist cannot be exported safely.';
  return;
 }
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob);
 try{
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download='neumuacFQ-documentation-'+filter.value+'.csv';
  document.body.appendChild(anchor);anchor.click();anchor.remove();
  exportNotice.value='Matching recorded documentation exported. Link counts do not establish scientific quality.';
 }finally{window.setTimeout(()=>URL.revokeObjectURL(url),5000);}
}
const pct=computed(()=>report.value?.variants.length
  ?Math.round(1000*report.value.linkedVariants/report.value.variants.length)/10+'%':'—');
function reset(){visible.value=40;expandedId.value=null;exportNotice.value='';}
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
  <header class="nfq-coverage-heading">
   <div><h1>Research coverage</h1><RouterLink v-if="returnToVariant" class="nfq-journey-return" :to="returnToVariant">← Return to variant dossier</RouterLink></div>
   <ContextHelp label="About research coverage" title="Understanding research coverage">
    <p>This view counts links stored between accessible CFTR variant records and reference entries.</p>
    <p>A link is a catalog association, not a measure of scientific strength, validity, pathogenicity or clinical priority.</p>
    <p>Totals come from a complete successful read of the available registers. Missing links do not mean that research is absent.</p>
    <p>No individual search history or geographic location is used.</p>
   </ContextHelp>
  </header>
  <p v-if="loading" role="status">Retrieving the complete live variant and reference-link registers…</p>
  <p v-else-if="error" role="alert" class="empty-result">{{error}} <button type="button" @click="refresh">Retry</button></p>
  <template v-else-if="report">
   <div v-if="focusId" class="nfq-variant-scope" role="status"><span>{{focusedRecord?variantDisplayName(focusedRecord.variant):"Variant record not in accessible coverage catalog"}}</span><button type="button" @click="clearScope">All records</button></div>
   <section class="intelligence-metrics" aria-label="Recorded evidence coverage">
    <div><strong>{{summary.all.toLocaleString()}}</strong><span>Live variant records</span></div>
    <div><strong>{{report.totalLinks.toLocaleString()}}</strong><span>Reference links</span></div>
    <div><strong>{{report.linkedVariants.toLocaleString()}}</strong><span>Variants with links</span></div>
    <div><strong>{{pct}}</strong><span>Catalog with recorded links</span></div>
   </section>
   <div class="nfq-coverage-section-head">
    <div class="nfq-coverage-section-title"><h2>Documentation coverage</h2>
     <ContextHelp label="About documentation groups" title="How the groups work">
      <dl>
       <div><dt>No links recorded</dt><dd>There are no reference associations for this variant in the retrieved catalog.</dd></div>
       <div><dt>One recorded link</dt><dd>Exactly one reference association exists in the catalog.</dd></div>
       <div><dt>Two or more links</dt><dd>Multiple reference associations exist; this does not establish independent studies or evidence quality.</dd></div>
      </dl>
     </ContextHelp>
    </div>
    <button type="button" class="nfq-coverage-refresh" :disabled="loading" @click="refresh">Refresh</button>
   </div>
   <nav v-if="!focusId" class="nfq-coverage-groups" aria-label="Documentation coverage groups">
    <button v-for="group in groups" :key="group.id" type="button"
      :aria-pressed="filter===group.id" :class="{'nfq-coverage-active':filter===group.id}"
      @click="chooseGroup(group.id)">
      <span>{{group.label}}</span><strong>{{summary[group.id].toLocaleString()}}</strong>
    </button>
   </nav>
   <div v-if="!focusId" class="intelligence-filters nfq-coverage-search">
    <label for="coverage-search">Find a recorded variant</label>
    <input id="coverage-search" v-model="query" type="search" placeholder="Recorded name, HGVS or alias" @input="reset"/>
    <button v-if="query" type="button" class="nfq-coverage-clear" @click="query='';reset()">Clear search</button>
   </div>
   <p class="rail-caption nfq-coverage-results-count" role="status">{{filtered.length.toLocaleString()}} matching {{filtered.length===1?'record':'records'}}</p>
   <div v-if="filtered.length" class="nfq-documentation-export">
    <button type="button" data-testid="coverage-export-matches" @click="exportDocumentationMatches">Export matches · CSV</button>
   </div>
   <p v-if="exportNotice" role="status" class="nfq-documentation-export-note">{{exportNotice}}</p>
   <div v-if="!filtered.length" class="nfq-coverage-empty" role="status">
    <p>No recorded variants match the current documentation view.</p>
    <button type="button" @click="clearFilters">Show all recorded variants</button>
   </div>
   <div v-else class="intelligence-register" aria-label="Variant coverage results">
    <article v-for="item in shown" :key="item.variant.id" class="intelligence-record nfq-coverage-record">
     <div class="nfq-coverage-record-line">
      <div>
       <RouterLink :to="{path:'/variants/'+encodeURIComponent(item.variant.id),query:workspaceReturn?{from:workspaceReturn}:{}}">{{variantDisplayName(item.variant)}}</RouterLink>
       <p>{{item.variant.proteinName&&!/^p\.\?$/.test(item.variant.proteinName.trim())?item.variant.proteinName:item.variant.cdnaName||'Additional notation not recorded'}}</p>
      </div>
      <span class="nfq-coverage-link-count">{{item.links===0?'No links recorded':item.links.toLocaleString()+(item.links===1?' reference link':' reference links')}}</span>
     </div>
     <button type="button" class="nfq-coverage-record-toggle" :aria-expanded="expandedId===item.variant.id" :aria-controls="'coverage-detail-'+item.variant.id" @click="expandedId=expandedId===item.variant.id?null:item.variant.id">
      {{expandedId===item.variant.id?'Hide record details':'Record details'}}
      <svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
     </button>
     <div v-if="expandedId===item.variant.id" :id="'coverage-detail-'+item.variant.id" class="nfq-coverage-record-detail">
      <section aria-label="Recorded nomenclature">
       <h3>Recorded nomenclature</h3>
       <dl class="nfq-coverage-fields">
        <div v-for="field in recordedNomenclature(item.variant)" :key="field.label">
         <dt>{{field.label}}</dt><dd :class="{'nfq-coverage-unrecorded':!field.value}">{{field.value||'Not recorded'}}</dd>
        </div>
       </dl>
      </section>
      <section aria-label="Reference source summary">
       <h3>Reference source summary</h3>
       <p v-if="item.links===0" class="nfq-coverage-unrecorded">No links recorded for this variant in the retrieved register.</p>
       <template v-else>
        <ul class="nfq-coverage-sources">
         <li v-for="(source,index) in item.sources" :key="index"><span>{{source.name||'Source not specified'}}</span><span>{{source.count.toLocaleString()}} {{source.count===1?'link':'links'}}</span></li>
        </ul>
        <p v-if="unspecifiedSourceLinks(item)>0" class="nfq-coverage-unrecorded">{{unspecifiedSourceLinks(item)}} {{unspecifiedSourceLinks(item)===1?'link has':'links have'}} no source name recorded.</p>
       </template>
       <p class="nfq-coverage-detail-note">Source names are recorded metadata, not independent verification. Open the variant dossier to inspect available references.</p>
      </section>
     </div>
    </article>
   </div>
   <button v-if="visible<filtered.length" class="evidence-more" type="button" @click="visible+=40">Show more variants</button>
   <section v-if="!focusId" class="intelligence-sources" aria-label="Reference source distribution">
    <h2>Recorded source distribution</h2>
    <p v-if="!report.bySource.length" class="rail-caption">No source links recorded in the retrieved register.</p>
    <div v-for="source in report.bySource" :key="source.name"><span>{{source.name}}</span><strong>{{source.count.toLocaleString()}}</strong></div>
   </section>
   <p class="history-disclaimer">Figures reflect a complete, successful live read of the accessible variant and evidence_links registers when this view loaded. Missing links are documentation follow-up candidates, never proof of missing research, a negative finding or a classification. This view does not use individual search histories or geographic locations.</p>
  </template>
 </div>
</template>

<style scoped>
.nfq-documentation-export{display:flex;align-items:center;max-width:100%;margin:0 0 14px}
.nfq-documentation-export button{min-height:38px;max-width:100%;border:1px solid #c8dbce;border-radius:7px;padding:8px 12px;background:transparent;color:#2b6348;font:inherit;font-size:12px;font-weight:600;cursor:pointer;white-space:normal;overflow-wrap:anywhere}
.nfq-documentation-export button:focus-visible{outline:2px solid #218466;outline-offset:3px}
.nfq-documentation-export-note{font-size:12px;line-height:1.45;color:#547662;margin:0 0 12px}
</style>

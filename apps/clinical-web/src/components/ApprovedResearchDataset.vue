<script setup lang="ts">
import {computed,ref,watch,onUnmounted} from 'vue';
import {RouterLink} from 'vue-router';
import {authController,authSessionProvider} from '../services/authSession';
import {researcherRole} from '../services/researchRole';
import {readConfigFromEnvironment} from '../services/liveVariants';
import {
 createApprovedDatasetService,assessApprovedDataset,
 approvedDatasetCsv,approvedDatasetJson,type ApprovedDatasetSnapshot
} from '../services/approvedResearchDataset';
import {THERAPIES} from '../domain/therapyRegistry';
import {statisticsSummary} from '../domain/reportedStudyStatistics';
import StudyFamilyAnalysisProtocol from './StudyFamilyAnalysisProtocol.vue';
const config=readConfigFromEnvironment();
const service=config&&authSessionProvider?createApprovedDatasetService(config,authSessionProvider):null;
const open=ref(false);
const snapshot=ref<ApprovedDatasetSnapshot|null>(null);
const phase=ref<'closed'|'restricted'|'loading'|'ready'|'failed'>('closed');
const notice=ref('');
const filter=ref<'all'|'numeric'|'missing'|'quality'>('all');
const page=ref(0);
const access=computed(()=>authController?.state.phase==='signed-in'&&researcherRole.phase==='verified'&&
 ['contributor','reviewer','administrator'].includes(researcherRole.role??''));
const quality=computed(()=>snapshot.value?assessApprovedDataset(snapshot.value):null);
const filtered=computed(()=>{
 const rows=quality.value?.rows??[];
 return rows.filter(x=>filter.value==='all'||
  filter.value==='numeric'&&x.record.endpoint?.value!==null&&x.record.endpoint?.value!==undefined||
  filter.value==='missing'&&x.record.endpoint?.value===null||
  filter.value==='quality'&&x.flags.length>0);
});
const pageSize=12;
const pages=computed(()=>Math.max(1,Math.ceil(filtered.value.length/pageSize)));
const visible=computed(()=>filtered.value.slice(page.value*pageSize,(page.value+1)*pageSize));
let active:AbortController|null=null;
async function load():Promise<void>{
 active?.abort();active=null;snapshot.value=null;
 if(!open.value){phase.value='closed';return;}
 if(!access.value||!service){phase.value='restricted';return;}
 const controller=new AbortController();active=controller;phase.value='loading';
 try{
  const data=await service.snapshot(controller.signal);
  if(controller.signal.aborted||active!==controller||!access.value)return;
  snapshot.value=data;phase.value='ready';page.value=0;
 }catch{
  if(!controller.signal.aborted&&active===controller)phase.value='failed';
 }finally{if(active===controller)active=null;}
}
function toggle():void{
 open.value=!open.value;
 if(!open.value){active?.abort();active=null;snapshot.value=null;phase.value='closed';return;}
 void load();
}
function download(kind:'json'|'csv'):void{
 if(!snapshot.value||!access.value||phase.value!=='ready')return;
 const data=kind==='json'?approvedDatasetJson(snapshot.value):approvedDatasetCsv(snapshot.value);
 const url=URL.createObjectURL(new Blob([data],{
  type:kind==='json'?'application/json;charset=utf-8':'text/csv;charset=utf-8'
 }));
 try{
  const a=document.createElement('a');
  a.href=url;
  a.download='neumuacFQ-approved-research-'+snapshot.value.snapshotSha256.slice(0,12)+'.'+kind;
  document.body.appendChild(a);a.click();a.remove();
  notice.value='Source-approved dataset exported. This does not establish model-training suitability or clinical validity.';
 }finally{window.setTimeout(()=>URL.revokeObjectURL(url),5000);}
}
watch(filter,()=>{page.value=0;});
watch([
 ()=>authController?.state.phase,()=>authController?.state.userId,
 ()=>researcherRole.phase,()=>researcherRole.role
],()=>{if(open.value)void load();});
onUnmounted(()=>active?.abort());
const therapyLabel=(value:string)=>THERAPIES.find(x=>x.id===value)?.label??value;
</script>
<template>
 <section class="nfq-dataset" data-testid="nfq-approved-dataset" aria-label="Approved research dataset">
  <header class="nfq-dataset-head">
   <div>
    <h2>Research dataset</h2>
    <p>Independently approved observations · reproducible source version · no clinical predictions</p>
   </div>
   <button type="button" class="nfq-dataset-button" data-testid="nfq-dataset-toggle"
    :aria-expanded="open" @click="toggle">{{open?'Close dataset':'Inspect approved dataset'}}</button>
  </header>
  <div v-if="open" class="nfq-dataset-body" data-testid="nfq-dataset-content">
   <p v-if="phase==='restricted'" role="status" class="nfq-dataset-muted">
    An active research membership is required for approved-source dataset exports.
   </p>
   <p v-else-if="phase==='loading'" role="status" class="nfq-dataset-muted">
    Verifying independently reviewed source records…
   </p>
   <p v-else-if="phase==='failed'" role="status" class="nfq-dataset-muted">
    The complete approved-source snapshot could not be verified; no partial dataset will be exported.
    <button type="button" class="nfq-dataset-button" @click="load">Retry</button>
   </p>
   <template v-else-if="phase==='ready'&&snapshot&&quality">
    <div class="nfq-dataset-stats" aria-label="Approved evidence dataset coverage">
     <span><strong>{{quality.total}}</strong> approved observations</span>
     <span><strong>{{quality.independentStudyFamilies}}</strong> study families</span>
     <span><strong>{{quality.variants}}</strong> variants</span>
     <span><strong>{{quality.therapies}}</strong> therapies</span>
     <span><strong>{{quality.numeric}}</strong> numeric outcomes</span>
     <span><strong>{{quality.reportedSampleN}}</strong> rows with source n</span>
     <span><strong>{{quality.reportedDispersion}}</strong> rows with uncertainty</span>
     <span><strong>{{quality.contextBounded}}</strong> context-bounded records</span>
    </div>
    <div class="nfq-dataset-manifest">
     <div>
      <strong>Versioned source snapshot</strong>
      <p>Schema v{{snapshot.schemaVersion}} · generated {{new Date(snapshot.generatedAt).toLocaleString()}}</p>
      <p class="nfq-dataset-hash" data-testid="nfq-dataset-hash">{{snapshot.snapshotSha256}}</p>
      <p class="nfq-dataset-muted">SHA-256 identifies the ordered, approved source content. A changed approval or source record produces a different snapshot.</p>
     </div>
     <div class="nfq-dataset-export">
      <button type="button" class="nfq-dataset-button" data-testid="nfq-dataset-export-json"
       @click="download('json')">Export source JSON</button>
      <button type="button" class="nfq-dataset-button" data-testid="nfq-dataset-export-csv"
       @click="download('csv')">Export observations CSV</button>
     </div>
    </div>
    <p v-if="notice" class="nfq-dataset-muted" role="status">{{notice}}</p>
    <StudyFamilyAnalysisProtocol :snapshot="snapshot" />
    <div v-if="quality.total===0" class="nfq-dataset-empty" data-testid="nfq-dataset-empty">
     <strong>No independently approved source observations yet.</strong>
     <p>The export schema is available, but the dataset contains no experimental
      measurements to analyze. Submit source claims through the variant dossier
      and obtain two independent scientific approvals before any records appear here.</p>
    </div>
    <template v-else>
     <p class="nfq-dataset-limits">
      {{quality.unextracted}} unextracted · {{quality.qualitativeOnly}} qualitative only ·
      {{quality.nonstandardNumeric}} noncomparable numeric · {{quality.reviewWarnings}} review flags.
      Exact assay-context groups are descriptive, not pooled effect estimates.
     </p>
     <div class="nfq-dataset-controls">
      <label>Evidence rows
       <select v-model="filter" data-testid="nfq-dataset-filter">
        <option value="all">All approved observations</option>
        <option value="numeric">Numerical outcomes</option>
        <option value="missing">Unextracted or nonnumerical</option>
        <option value="quality">Rows needing scientific attention</option>
       </select>
      </label>
      <span>{{filtered.length}} of {{quality.total}} rows</span>
     </div>
     <div class="nfq-dataset-records" role="list" data-testid="nfq-dataset-records">
      <article v-for="item in visible" :key="item.record.claimId" role="listitem"
       class="nfq-dataset-record">
       <div class="nfq-dataset-record-head">
        <strong>{{therapyLabel(item.record.therapy)}} · variant #{{item.record.variantId}}</strong>
        <span>{{item.readiness.replaceAll('-',' ')}}</span>
       </div>
       <p class="nfq-dataset-source">
        {{item.record.studyFamilyId}} · {{item.record.method}} ·
        {{item.record.referenceTitle}}
       </p>
       <p v-if="item.record.endpoint" class="nfq-dataset-value">
        {{item.record.endpoint.code}} ·
        {{item.record.endpoint.value===null?'Not reported':item.record.endpoint.value}}
        {{item.record.endpoint.value===null?'':item.record.endpoint.unit}} ·
        {{item.record.endpoint.model}} · {{item.record.endpoint.comparator}} ·
        {{item.record.endpoint.timepoint}}
       </p>
       <p v-else class="nfq-dataset-muted">No structured endpoint recorded in the historical claim revision.</p>
       <p class="nfq-dataset-value" data-testid="nfq-dataset-statistics">
         {{statisticsSummary(item.record.studyStats)}}
        </p>
        <p v-if="item.record.studyStats?.sourceLocator&&item.record.studyStats.sourceLocator!=='not-reported'"
         class="nfq-dataset-source">
         Sampling source: {{item.record.studyStats.sourceLocator}}
        </p>
        <p v-if="item.flags.length" class="nfq-dataset-flag">{{item.flags.join(' · ')}}</p>
       <div class="nfq-dataset-links">
        <a :href="item.record.referenceUrl" target="_blank" rel="noopener noreferrer">Inspect original source</a>
        <RouterLink :to="'/variants/'+item.record.variantId">Inspect variant</RouterLink>
        <span>Reference #{{item.record.referenceId}} · revision {{item.record.revision}} · 2 reviews</span>
       </div>
      </article>
     </div>
     <div v-if="pages>1" class="nfq-dataset-paging">
      <button type="button" class="nfq-dataset-button" :disabled="page===0" @click="page--">Previous</button>
      <span>Page {{page+1}} of {{pages}}</span>
      <button type="button" class="nfq-dataset-button" :disabled="page>=pages-1" @click="page++">Next</button>
     </div>
     <details v-if="quality.groups.length" class="nfq-dataset-contexts">
      <summary>Exact-context measurement groups · {{quality.groups.length}}</summary>
      <p>No assumption of methodological equivalence, statistical pooling, or treatment benefit.</p>
      <div v-for="group in quality.groups" :key="group.contextKey">
       {{group.observations}} observation{{group.observations===1?'':'s'}} ·
       {{group.studyFamilies}} independent study famil{{group.studyFamilies===1?'y':'ies'}} ·
       {{group.contextKey}}
      </div>
     </details>
    </template>
    <p class="nfq-dataset-muted">Source-level reviewed observations only.
     This dataset is not validated for clinical prediction, treatment selection,
     individual outcome estimation or quantitative meta-analysis.</p>
   </template>
  </div>
 </section>
</template>
<style scoped>
.nfq-dataset{margin:10px 0 18px;border-top:1px solid var(--border,#dce6ef);color:var(--text,#223e5c);min-width:0}
.nfq-dataset-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:12px 0}
.nfq-dataset-head h2{margin:0;font-size:13px;font-weight:660}
.nfq-dataset-head p{margin:4px 0 0;color:var(--text-muted,#627c96);font-size:11px;line-height:1.45}
.nfq-dataset-button{border:1px solid var(--border,#cddae8);border-radius:5px;background:transparent;color:inherit;font:inherit;font-size:11px;font-weight:600;padding:6px 9px;min-height:32px;cursor:pointer}
.nfq-dataset-button:disabled{opacity:.5;cursor:not-allowed}
.nfq-dataset button:focus-visible,.nfq-dataset a:focus-visible,.nfq-dataset select:focus-visible{outline:2px solid #3774cc;outline-offset:2px}
.nfq-dataset-body{min-width:0;padding:2px 0 14px}
.nfq-dataset-stats{display:flex;flex-wrap:wrap;gap:6px 17px;margin:4px 0 13px;color:var(--text-muted,#647e97);font-size:11px}
.nfq-dataset-stats strong{color:var(--text,#214367);font-size:12px}
.nfq-dataset-manifest{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:10px 0;border-top:1px solid var(--border,#e0e8ef)}
.nfq-dataset-manifest strong{font-size:11px}
.nfq-dataset-manifest p{font-size:11px;line-height:1.5;margin:4px 0;color:var(--text-muted,#69819a)}
.nfq-dataset-hash{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;word-break:break-all;max-width:630px}
.nfq-dataset-muted,.nfq-dataset-limits{font-size:11px;line-height:1.55;color:var(--text-muted,#687f96);margin:7px 0}
.nfq-dataset-export{display:flex;align-items:flex-start;gap:8px;flex-wrap:wrap}
.nfq-dataset-empty{padding:12px 0 16px;max-width:740px}
.nfq-dataset-empty strong{font-size:12px}
.nfq-dataset-empty p{font-size:11px;color:var(--text-muted,#687f96);line-height:1.65}
.nfq-dataset-controls{display:flex;justify-content:space-between;align-items:end;gap:12px;flex-wrap:wrap;margin:13px 0 7px}
.nfq-dataset-controls label{font-size:11px;display:grid;gap:4px;color:var(--text-muted,#667f95)}
.nfq-dataset-controls select{border:1px solid var(--border,#c9d9e8);background:var(--surface,#fff);padding:7px 9px;min-width:170px;font:inherit;color:var(--text,#284662);border-radius:5px}
.nfq-dataset-controls>span{font-size:11px;color:var(--text-muted,#687f96)}
.nfq-dataset-record{padding:10px 0;border-top:1px solid var(--border,#e0e8ef)}
.nfq-dataset-record-head{display:flex;justify-content:space-between;gap:12px;align-items:center}
.nfq-dataset-record-head strong{font-size:12px;font-weight:660}
.nfq-dataset-record-head span,.nfq-dataset-source,.nfq-dataset-links,.nfq-dataset-flag{font-size:11px;color:var(--text-muted,#607f98);line-height:1.55}
.nfq-dataset-source,.nfq-dataset-value,.nfq-dataset-flag{margin:5px 0;font-size:11px}
.nfq-dataset-source{overflow-wrap:anywhere}
.nfq-dataset-value{color:var(--text,#37536e)}
.nfq-dataset-flag{color:#976c3b}
.nfq-dataset-links{display:flex;flex-wrap:wrap;gap:8px 14px}
.nfq-dataset-links a{color:#286aab}
.nfq-dataset-paging{display:flex;align-items:center;justify-content:flex-end;gap:9px;padding:9px 0;font-size:11px;color:var(--text-muted,#647e96)}
.nfq-dataset-contexts{font-size:11px;margin:13px 0;color:var(--text-muted,#647e96)}
.nfq-dataset-contexts summary{cursor:pointer}
.nfq-dataset-contexts p{line-height:1.5}
.nfq-dataset-contexts>div{overflow-wrap:anywhere;padding:5px 0;border-bottom:1px solid var(--border,#e0e8ef)}
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-dataset-controls select{background:#12243a;color:#e8f0ff;border-color:#4a6380}
@media(max-width:750px){.nfq-dataset-head{flex-wrap:wrap}.nfq-dataset-export{width:100%}.nfq-dataset-record-head{flex-wrap:wrap}}
</style>

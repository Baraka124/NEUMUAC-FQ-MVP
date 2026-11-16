<script setup lang="ts">
import {ref,computed,watch,onUnmounted} from 'vue';
import {RouterLink} from 'vue-router';
import {authController,authSessionProvider} from '../services/authSession';
import {retrievePubMedMetadata,type PubMedPublicationMetadata} from '../services/livePubMed';
import {researcherRole} from '../services/researchRole';
import {readConfigFromEnvironment} from '../services/liveVariants';
import {
 createSourceAcquisitionService,sourceMetadataFlags,sourcePubMedId,summarizeSourceAcquisition,
 sourceAcquisitionCsv,SOURCE_STATES,SOURCE_LABELS,validTriageChange,
 type SourceAcquisitionRecord,type SourceTriageState
} from '../services/sourceAcquisitionWorklist';

const config=readConfigFromEnvironment();
const service=config&&authSessionProvider?createSourceAcquisitionService(config,authSessionProvider):null;
const open=ref(false);
const records=ref<readonly SourceAcquisitionRecord[]>([]);
const phase=ref<'closed'|'restricted'|'loading'|'ready'|'failed'>('closed');
const query=ref('');
const statusFilter=ref<SourceTriageState|'all'|'metadata-flags'>('all');
const page=ref(0);
const focus=ref<number|null>(null);
const draftState=ref<SourceTriageState>('source-located');
const rationale=ref('');
const busy=ref(false);
const notice=ref('');
const pubmed=ref<{
 readonly referenceId:number;
 readonly phase:'loading'|'ready'|'failed';
 readonly publication?:PubMedPublicationMetadata;
}|null>(null);
let pubmedAbort:AbortController|null=null;
async function inspectPubMed(item:SourceAcquisitionRecord):Promise<void>{
 const candidate=sourcePubMedId(item);
 if(!candidate||!access.value)return;
 pubmedAbort?.abort();
 const controller=new AbortController();pubmedAbort=controller;
 pubmed.value={referenceId:item.id,phase:'loading'};
 try{
  const publication=await retrievePubMedMetadata(candidate,fetch,controller.signal);
  if(!controller.signal.aborted&&focus.value===item.id&&access.value)
   pubmed.value={referenceId:item.id,phase:'ready',publication};
 }catch{
  if(!controller.signal.aborted&&focus.value===item.id)
   pubmed.value={referenceId:item.id,phase:'failed'};
 }finally{if(pubmedAbort===controller)pubmedAbort=null;}
}
const access=computed(()=>authController?.state.phase==='signed-in'&&
 researcherRole.phase==='verified'&&
 ['contributor','reviewer','administrator'].includes(researcherRole.role??''));
const summary=computed(()=>summarizeSourceAcquisition(records.value));
const visibleRecords=computed(()=>{
 const term=query.value.toLowerCase().trim();
 return records.value.filter(x=>{
  if(statusFilter.value==='metadata-flags'&&!sourceMetadataFlags(x).length)return false;
  if(statusFilter.value!=='all'&&statusFilter.value!=='metadata-flags'&&x.state!==statusFilter.value)return false;
  return !term||[
   x.id,x.variantId,x.title,x.source,x.pmid??'',x.doi??'',
   x.state,x.url,x.note??''
  ].some(v=>String(v).toLowerCase().includes(term));
 });
});
const PAGE_SIZE=20;
const pages=computed(()=>Math.max(1,Math.ceil(visibleRecords.value.length/PAGE_SIZE)));
const currentPage=computed(()=>visibleRecords.value.slice(page.value*PAGE_SIZE,(page.value+1)*PAGE_SIZE));
const current=computed(()=>records.value.find(x=>x.id===focus.value)||null);
const canSave=computed(()=>!!current.value&&access.value&&!busy.value&&
 current.value.state!==draftState.value&&
 validTriageChange(current.value.id,current.value.version,draftState.value,rationale.value));
let active:AbortController|null=null;
function choose(item:SourceAcquisitionRecord):void{
 pubmedAbort?.abort();pubmedAbort=null;pubmed.value=null;
 if(focus.value===item.id){focus.value=null;return;}
 focus.value=item.id;
 draftState.value=item.state==='untriaged'?'metadata-needs-check':item.state;
 rationale.value=item.note??'';
 notice.value='';
}
async function refresh():Promise<void>{
 active?.abort();active=null;
 pubmedAbort?.abort();pubmedAbort=null;pubmed.value=null;
 records.value=[];focus.value=null;
 if(!open.value){phase.value='closed';return;}
 if(!access.value||!service){phase.value='restricted';return;}
 const controller=new AbortController();active=controller;phase.value='loading';
 try{
  const rows=await service.list(controller.signal);
  if(controller.signal.aborted||active!==controller||!access.value)return;
  records.value=rows;phase.value='ready';page.value=0;
 }catch{
  if(!controller.signal.aborted&&active===controller)phase.value='failed';
 }finally{if(active===controller)active=null;}
}
function toggle():void{
 open.value=!open.value;
 if(!open.value){
  active?.abort();active=null;pubmedAbort?.abort();pubmedAbort=null;pubmed.value=null;
  records.value=[];focus.value=null;phase.value='closed';return;
 }
 void refresh();
}
async function save():Promise<void>{
 const item=current.value;
 if(!service||!item||!canSave.value)return;
 busy.value=true;notice.value='';
 try{
  await service.triage(item.id,item.version,draftState.value,rationale.value);
  notice.value='Source triage revision recorded. No scientific claim has been approved or changed.';
  await refresh();
 }catch{
  notice.value='The update was not confirmed. The source may have changed; refresh before retrying.';
 }finally{busy.value=false;}
}
function download():void{
 if(phase.value!=='ready'||!access.value)return;
 const data=sourceAcquisitionCsv(visibleRecords.value);
 const url=URL.createObjectURL(new Blob([data],{type:'text/csv;charset=utf-8'}));
 try{
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download='neumuacFQ-source-acquisition-worklist.csv';
  document.body.appendChild(anchor);anchor.click();anchor.remove();
  notice.value='Filtered research acquisition worksheet exported. Triage is not source validation.';
 }finally{window.setTimeout(()=>URL.revokeObjectURL(url),5000);}
}
watch([query,statusFilter],()=>{page.value=0;focus.value=null;});
watch([
 ()=>authController?.state.phase,()=>authController?.state.userId,
 ()=>researcherRole.phase,()=>researcherRole.role
],()=>{
 if(open.value)void refresh();
});
onUnmounted(()=>{active?.abort();pubmedAbort?.abort();});
</script>

<template>
 <section class="nfq-source-acquisition" data-testid="nfq-source-acquisition"
  aria-label="Scientific source acquisition and extraction readiness">
  <header class="nfq-acquisition-head">
   <div class="nfq-acquisition-heading">
    <h2>Source acquisition</h2>
    <p>Real reference inventory · extraction readiness · independent approval remains separate</p>
   </div>
   <button class="nfq-acquisition-toggle" type="button" :aria-expanded="open"
    data-testid="nfq-acquisition-toggle" @click="toggle">
    {{open?'Close worklist':'Open research worklist'}}
   </button>
  </header>
  <div v-if="open" class="nfq-acquisition-content" data-testid="nfq-acquisition-content">
   <p v-if="phase==='restricted'" role="status" class="nfq-acquisition-status">
    Active research membership is required to work with source acquisition records.
   </p>
   <p v-else-if="phase==='loading'" role="status" class="nfq-acquisition-status">Retrieving the complete source inventory…</p>
   <p v-else-if="phase==='failed'" role="status" class="nfq-acquisition-status">
    The source worklist could not be verified. No incomplete or synthetic inventory is displayed.
    <button type="button" @click="refresh">Retry</button>
   </p>
   <template v-else-if="phase==='ready'">
    <div class="nfq-acquisition-metrics" aria-label="Recorded source coverage">
     <span><strong>{{summary.total}}</strong> linked references</span>
     <span><strong>{{summary.variants}}</strong> linked variants</span>
     <span><strong>{{summary.untriaged}}</strong> not triaged</span>
     <span><strong>{{summary.metadataFlags}}</strong> metadata checks</span>
     <span><strong>{{summary.approved}}</strong> independently approved claims</span>
     <span><strong>{{summary.numeric}}</strong> approved numeric endpoints</span>
    </div>
    <p class="nfq-acquisition-explainer">
     Metadata flags identify catalogue fields worth checking, not invalid publications.
     Triage progress does not verify a treatment response.
    </p>
    <div class="nfq-acquisition-filters">
     <label>
      <span>Find reference</span>
      <input v-model="query" type="search" maxlength="100"
       placeholder="Title, PMID, variant or reference ID" data-testid="nfq-acquisition-search"/>
     </label>
     <label>
      <span>Worklist status</span>
      <select v-model="statusFilter" data-testid="nfq-acquisition-filter">
       <option value="all">All sources</option>
       <option value="untriaged">Not yet triaged</option>
       <option value="metadata-flags">Metadata checks</option>
       <option v-for="option in SOURCE_STATES" :key="option.value" :value="option.value">{{option.label}}</option>
      </select>
     </label>
     <button type="button" data-testid="nfq-acquisition-export" @click="download">Export filtered worklist</button>
    </div>
    <p class="nfq-acquisition-summary">{{visibleRecords.length}} of {{summary.total}} references match · {{summary.pending}} pending review claims across the register</p>
    <div v-if="!visibleRecords.length" class="nfq-acquisition-empty">
     No catalogue references match these filters. No placeholder records have been inserted.
    </div>
    <div v-else class="nfq-acquisition-rows" role="list" data-testid="nfq-acquisition-list">
     <article v-for="item in currentPage" :key="item.id" role="listitem"
      class="nfq-acquisition-item" :data-reference-id="item.id">
      <button type="button" class="nfq-acquisition-row" :aria-expanded="focus===item.id"
       @click="choose(item)">
       <span class="nfq-acquisition-record-title"><strong>{{item.title}}</strong>
        <small>Reference #{{item.id}} · Variant #{{item.variantId}} · {{item.source}}
         <template v-if="item.year"> · {{item.year}}</template></small>
       </span>
       <span class="nfq-acquisition-record-state">{{SOURCE_LABELS[item.state]}}</span>
       <span class="nfq-acquisition-expander" aria-hidden="true">{{focus===item.id?'−':'+'}}</span>
      </button>
      <div v-if="focus===item.id" class="nfq-acquisition-detail">
       <div class="nfq-acquisition-context">
        <span>{{item.claimPending}} awaiting independent review</span>
        <span>{{item.claimApproved}} approved source claims</span>
        <span>{{item.numericApproved}} approved numerical endpoints</span>
        <span>Audit revisions: {{item.auditCount}}</span>
       </div>
       <div v-if="sourceMetadataFlags(item).length" class="nfq-acquisition-flags">
        <span v-for="flag in sourceMetadataFlags(item)" :key="flag">{{flag}}</span>
       </div>
       <p v-else class="nfq-acquisition-muted">
        No catalogue-format discrepancy detected. This is not confirmation that the publication was verified.
       </p>
       <p v-if="item.note" class="nfq-acquisition-muted">Recorded triage note: {{item.note}}</p>
       <div v-if="sourcePubMedId(item)" class="nfq-acquisition-pubmed">
        <button type="button" data-testid="nfq-acquisition-pubmed"
         :disabled="pubmed?.phase==='loading'"
         @click="inspectPubMed(item)">
         {{pubmed?.referenceId===item.id&&pubmed.phase==='loading'?'Checking PubMed…':'Inspect official PubMed metadata'}}
        </button>
        <p v-if="pubmed?.referenceId===item.id&&pubmed.phase==='failed'" role="status">
         PubMed metadata could not be retrieved; the original catalogue entry remains unchanged.
        </p>
        <div v-if="pubmed?.referenceId===item.id&&pubmed.phase==='ready'&&pubmed.publication"
         class="nfq-acquisition-pubmed-summary" data-testid="nfq-acquisition-pubmed-result">
         <strong>{{pubmed.publication.title??'No indexed title returned'}}</strong>
         <span>PubMed #{{pubmed.publication.pmid}} · {{pubmed.publication.publicationTypes.join(' · ')||'No publication type returned'}}</span>
         <span>External indexing only · compared on request · not a reviewed treatment-response claim</span>
         <span v-if="pubmed.publication.title&&pubmed.publication.title!==item.title">
          Indexed title differs from the locally recorded catalogue title.
         </span>
        </div>
       </div>
       <div class="nfq-acquisition-links">
        <a :href="item.url" target="_blank" rel="noopener noreferrer">Open original reference</a>
        <RouterLink :to="{path:'/evidence',query:{variant:item.variantId}}">View variant references</RouterLink>
        <RouterLink :to="'/variants/'+item.variantId">Open variant dossier</RouterLink>
       </div>
       <form class="nfq-acquisition-editor" @submit.prevent="save">
        <label>
         <span>Update source triage</span>
         <select v-model="draftState" :disabled="busy" data-testid="nfq-acquisition-state">
          <option v-for="option in SOURCE_STATES" :key="option.value" :value="option.value">
           {{option.label}}
          </option>
         </select>
        </label>
        <label class="nfq-acquisition-note">
         <span>Research rationale (20–700 characters)</span>
         <textarea v-model.trim="rationale" rows="2" maxlength="700"
          :disabled="busy" data-testid="nfq-acquisition-note"
          placeholder="What was checked in the original source, or what prevents extraction?"/>
        </label>
        <button type="submit" :disabled="!canSave" data-testid="nfq-acquisition-save">
         {{busy?'Saving…':'Record triage revision'}}
        </button>
       </form>
      </div>
     </article>
    </div>
    <div v-if="pages>1" class="nfq-acquisition-pagination">
     <button type="button" :disabled="page===0" @click="page--;focus=null">Previous</button>
     <span>Page {{page+1}} of {{pages}}</span>
     <button type="button" :disabled="page>=pages-1" @click="page++;focus=null">Next</button>
    </div>
    <p v-if="notice" role="status" class="nfq-acquisition-status">{{notice}}</p>
   </template>
  </div>
 </section>
</template>
<style scoped>
.nfq-source-acquisition{margin:13px 0 19px;min-width:0;border-top:1px solid var(--border,#dce6ef);color:var(--text,#203c58)}
.nfq-acquisition-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:12px 0}
.nfq-acquisition-heading h2{margin:0;font-size:13px;font-weight:660;letter-spacing:-.015em}
.nfq-acquisition-heading p{margin:4px 0 0;color:var(--text-muted,#637d96);font-size:11px;line-height:1.45}
.nfq-acquisition-toggle,.nfq-acquisition-filters>button,.nfq-acquisition-editor>button,.nfq-acquisition-pagination button{border:1px solid var(--border,#cad9e8);border-radius:5px;background:transparent;padding:6px 9px;min-height:32px;font:inherit;font-weight:600;font-size:11px;color:inherit;cursor:pointer}
.nfq-source-acquisition button:disabled{opacity:.5;cursor:not-allowed}
.nfq-source-acquisition button:focus-visible,.nfq-source-acquisition a:focus-visible,.nfq-source-acquisition input:focus-visible,.nfq-source-acquisition select:focus-visible,.nfq-source-acquisition textarea:focus-visible{outline:2px solid #3577d4;outline-offset:2px}
.nfq-acquisition-content{padding:2px 0 13px}
.nfq-acquisition-status,.nfq-acquisition-explainer,.nfq-acquisition-summary,.nfq-acquisition-muted{font-size:11px;line-height:1.5;color:var(--text-muted,#647f98)}
.nfq-acquisition-metrics{display:flex;flex-wrap:wrap;gap:7px 18px;font-size:11px;color:var(--text-muted,#647f98);margin:3px 0 10px}
.nfq-acquisition-metrics strong{font-size:12px;font-weight:700;color:var(--text,#1d3e60)}
.nfq-acquisition-explainer{margin:4px 0 11px}
.nfq-acquisition-filters{display:flex;align-items:end;gap:8px;flex-wrap:wrap}
.nfq-acquisition-filters label{display:grid;gap:5px;min-width:145px;flex:1;font-size:10px;color:var(--text-muted,#687e97)}
.nfq-acquisition-filters label:first-child{flex:2;min-width:180px}
.nfq-acquisition-filters input,.nfq-acquisition-filters select,.nfq-acquisition-editor select,.nfq-acquisition-editor textarea{box-sizing:border-box;width:100%;min-height:34px;padding:6px 9px;font:inherit;font-size:11px;color:var(--text,#284560);background:var(--surface,#fff);border:1px solid var(--border,#cbdbe9);border-radius:5px}
.nfq-acquisition-filters>button{flex:0 0 auto}
.nfq-acquisition-summary{margin:9px 0 6px}
.nfq-acquisition-rows{border-top:1px solid var(--border,#e1e8f0)}
.nfq-acquisition-item{border-bottom:1px solid var(--border,#e1e8f0)}
.nfq-acquisition-row{border:0;background:transparent;display:grid;grid-template-columns:minmax(0,1fr) minmax(110px,175px) 14px;align-items:center;gap:10px;width:100%;min-height:53px;padding:9px 2px;text-align:left;font:inherit;color:inherit;cursor:pointer}
.nfq-acquisition-row:hover strong{color:#286ab3}
.nfq-acquisition-record-title{min-width:0;display:grid;gap:4px}
.nfq-acquisition-record-title strong{font-size:12px;font-weight:620;overflow-wrap:anywhere}
.nfq-acquisition-record-title small{font-size:10.5px;color:var(--text-muted,#6b8198)}
.nfq-acquisition-record-state{font-size:11px;color:var(--text-muted,#527394)}
.nfq-acquisition-expander{text-align:right;font-size:14px;color:#7f96af}
.nfq-acquisition-detail{padding:0 0 13px;max-width:940px}
.nfq-acquisition-context,.nfq-acquisition-flags,.nfq-acquisition-links{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:11px;color:var(--text-muted,#667f98);margin:3px 0 9px}
.nfq-acquisition-flags{color:#91653a}
.nfq-acquisition-links a{color:#276aab;text-decoration:underline;text-underline-offset:3px}
.nfq-acquisition-editor{display:grid;grid-template-columns:minmax(135px,1fr) minmax(220px,2fr) auto;gap:10px;align-items:end;margin:11px 0 2px}
.nfq-acquisition-editor label{display:grid;gap:4px;font-size:10.5px;color:var(--text-muted,#607c98)}
.nfq-acquisition-editor textarea{resize:vertical;min-height:48px}
.nfq-acquisition-pagination{display:flex;align-items:center;gap:12px;justify-content:flex-end;padding:10px 0;color:var(--text-muted,#647d95);font-size:11px}
.nfq-acquisition-empty{padding:13px 0;font-size:11px;color:var(--text-muted,#647d95)}
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-acquisition-filters input,
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-acquisition-filters select,
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-acquisition-editor select,
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-acquisition-editor textarea{background:#12243a;color:#e6f0ff;border-color:#4b6382}
@media(max-width:760px){.nfq-acquisition-head{flex-wrap:wrap}.nfq-acquisition-editor{grid-template-columns:1fr}.nfq-acquisition-row{grid-template-columns:minmax(0,1fr) 14px;gap:4px}.nfq-acquisition-record-state{grid-column:1;grid-row:2}.nfq-acquisition-expander{grid-column:2;grid-row:1/3}.nfq-acquisition-filters>button{width:100%}}
.nfq-acquisition-pubmed{margin:9px 0 10px;font-size:11px}
.nfq-acquisition-pubmed button{border:0;border-bottom:1px solid currentColor;background:transparent;
 color:#286aaa;padding:2px 0;font:inherit;font-size:11px;cursor:pointer}
.nfq-acquisition-pubmed button:disabled{opacity:.6;cursor:not-allowed}
.nfq-acquisition-pubmed p{font-size:11px;color:var(--text-muted,#637e99)}
.nfq-acquisition-pubmed-summary{display:grid;gap:4px;margin:8px 0;color:var(--text-muted,#638099);line-height:1.5}
.nfq-acquisition-pubmed-summary strong{font-weight:610;color:var(--text,#294660)}
</style>

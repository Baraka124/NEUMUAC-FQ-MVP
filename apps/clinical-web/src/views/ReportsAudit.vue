<script setup lang="ts">
import {computed,onUnmounted,ref,watch} from 'vue';
import {RouterLink,useRoute,useRouter} from 'vue-router';
import ContextHelp from '../components/ContextHelp.vue';
import {authSessionProvider} from '../services/authSession';
import {createReadOnlyRepository,readConfigFromEnvironment,variantDisplayName,formatReadStatus,
 type RealVariant,type RealVariantSource} from '../services/liveVariants';
import {createLiveResearchHistorySource,type ResearchHistory} from '../services/liveResearchHistory';
import {recordedResearchChronology} from '../domain/recordedResearchChronology';
import {recordedAuditCsv} from '../domain/recordedAuditExport';
import ConflictReviewPreparation from '../components/ConflictReviewPreparation.vue';

const route=useRoute(),router=useRouter();
const config=readConfigFromEnvironment();
let variantSource:RealVariantSource|null=null;
let historySource:ReturnType<typeof createLiveResearchHistorySource>|null=null;
let configurationIssue='';
try{
 if(config){
  variantSource=createReadOnlyRepository(config,fetch,authSessionProvider);
  historySource=createLiveResearchHistorySource(config);
 }
}catch{
 configurationIssue='The configured research source could not be verified.';
}
const canonicalId=(value:unknown):boolean=>
 typeof value==='string'&&/^[1-9][0-9]{0,17}$/.test(value);
const requestedId=computed(()=>typeof route.query.variant==='string'&&canonicalId(route.query.variant)?route.query.variant:null);
const invalidScope=computed(()=>route.query.variant!==undefined&&!requestedId.value);
const searchText=ref('');
const searchBusy=ref(false);
const searchNotice=ref('');
const variant=ref<RealVariant|null>(null);
const history=ref<ResearchHistory|null>(null);
const phase=ref<'idle'|'loading'|'ready'|'no-record'|'unavailable'|'inconsistent'|'not-connected'>('idle');
const notice=ref('');
const exportNotice=ref('');
const eventFilter=ref<'all'|'validation'|'conflict'>('all');
const filterOptions=[{id:'all',label:'All events'},{id:'validation',label:'Validations'},{id:'conflict',label:'Conflicts'}] as const;
const chronology=computed(()=>history.value&&variant.value
 ?recordedResearchChronology(history.value,variant.value.id):null);
const unresolvedCount=computed(()=>history.value?.conflicts.filter(item=>!item.resolved).length??0);
const dated=computed(()=>chronology.value?.dated.filter(item=>eventFilter.value==='all'||
 (eventFilter.value==='validation'?item.kind==='validation':item.kind!=='validation'))??[]);
const undated=computed(()=>chronology.value?.undated.filter(item=>eventFilter.value==='all'||
 (eventFilter.value==='validation'?item.kind==='validation':item.kind!=='validation'))??[]);
const eventCount=computed(()=>(chronology.value?.dated.length??0)+(chronology.value?.undated.length??0));
let request:AbortController|null=null;
let generation=0;
let lookup:AbortController|null=null;
async function load(id:string):Promise<void>{
 request?.abort();const controller=new AbortController();request=controller;
 const version=++generation;
 phase.value='loading';notice.value='';exportNotice.value='';variant.value=null;history.value=null;
 if(!variantSource||!historySource){
  phase.value='not-connected';return;
 }
 try{
  const record=await variantSource.get(id,controller.signal);
  if(controller.signal.aborted||version!==generation)return;
  if(!record){phase.value='no-record';return;}
  variant.value=record;
  const result=await historySource.get(id,controller.signal);
  if(controller.signal.aborted||version!==generation)return;
  if(!recordedResearchChronology(result,id)){
   phase.value='inconsistent';return;
  }
  history.value=result;phase.value='ready';
 }catch(error){
  if(controller.signal.aborted||version!==generation)return;
  notice.value=variant.value
   ?'The recorded history could not be retrieved in full. No partial timeline or totals are displayed.'
   :formatReadStatus(error);
  phase.value='unavailable';history.value=null;
 }
}
watch(()=>route.query.variant,raw=>{
 lookup?.abort();lookup=null;searchBusy.value=false;
 request?.abort();++generation;
 variant.value=null;history.value=null;notice.value='';searchNotice.value='';exportNotice.value='';
 eventFilter.value='all';
 if(raw===undefined){phase.value='idle';searchText.value='';return;}
 if(typeof raw!=='string'||!canonicalId(raw)){
  phase.value='idle';searchText.value=typeof raw==='string'?raw.slice(0,75):'';return;
 }
 searchText.value=raw;
 void load(raw);
},{immediate:true});
onUnmounted(()=>{request?.abort();lookup?.abort();++generation;});
async function search():Promise<void>{
 const q=searchText.value.trim();
 searchNotice.value='';
 if(!variantSource){searchNotice.value=configurationIssue||'Live research access is not configured.';return;}
 if(canonicalId(q)){
  if(route.query.variant===q){await load(q);}else await router.push({path:'/reports',query:{variant:q}});
  return;
 }
 if(q.length<2||q.length>75||/[;,]/.test(q)){
  searchNotice.value='Enter a recorded numeric ID or one exact variant name (2–75 characters).';return;
 }
 lookup?.abort();const controller=new AbortController();lookup=controller;searchBusy.value=true;
 try{
  const match=await variantSource.resolveExact(q,'all',controller.signal);
  if(controller.signal.aborted)return;
  if(!match){searchNotice.value='No unambiguous exact record found. Open Variants to refine the search.';return;}
  await router.push({path:'/reports',query:{variant:match.id}});
 }catch(error){
  if(!controller.signal.aborted)searchNotice.value=formatReadStatus(error);
 }finally{
  if(!controller.signal.aborted)searchBusy.value=false;
 }
}
function clearScope():void{lookup?.abort();request?.abort();void router.push('/reports');}
function exportCsv():void{
 exportNotice.value='';
 if(phase.value!=='ready'||!chronology.value||!variant.value)return;
 const csv=recordedAuditCsv(variant.value,chronology.value);
 if(!csv){exportNotice.value='No complete recorded events are available for a safe export.';return;}
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 try{
  const link=document.createElement('a');link.href=url;
  link.download='neumuacFQ-recorded-activity-'+variant.value.id+'.csv';
  document.body.appendChild(link);link.click();link.remove();
  exportNotice.value='The retrieved, variant-scoped metadata was exported. This is not a verified audit certificate.';
 }finally{window.setTimeout(()=>URL.revokeObjectURL(url),5000);}
}
</script>

<template>
 <div class="page nfq-audit-page nfq-science-ui">
  <header class="nfq-audit-head">
   <div>
    <span class="nfq-audit-eyebrow">RECORDED RESEARCH · SOURCE-BOUND</span>
    <h1>Reports &amp; Audit</h1>
    <p>Trace the recorded validation and conflict chronology of a CFTR variant.</p>
   </div>
   <ContextHelp label="About reports and audit" title="Scope and reliability of recorded activity">
    <p>This workspace retrieves only the requested variant and its accessible historical validation and conflict metadata.</p>
    <p>Events are neither an immutable audit trail nor evidence that independent clinicians reviewed the record. Dates are normalized to UTC; entries without dates are shown separately.</p>
    <p>Access may be restricted by the database. Unavailable, truncated or inconsistent histories are never replaced with estimated counts, synthetic activity or a partial report.</p>
   </ContextHelp>
  </header>

  <section class="nfq-audit-picker" aria-labelledby="nfq-audit-lookup-heading">
   <div class="nfq-audit-picker-head">
    <h2 id="nfq-audit-lookup-heading">Open a recorded variant</h2>
    <span>Live register · Read only</span>
   </div>
   <form class="nfq-audit-search" role="search" aria-label="Find a variant audit" @submit.prevent="search">
    <label for="nfq-audit-query">Recorded name or variant ID</label>
    <div class="nfq-audit-search-row">
     <input id="nfq-audit-query" v-model="searchText" type="search" autocomplete="off"
      spellcheck="false" maxlength="75" placeholder="e.g. R117H or 18" />
     <button type="submit" :disabled="searchBusy">{{searchBusy?'Finding…':'Open record'}} <span aria-hidden="true">→</span></button>
    </div>
   </form>
   <p v-if="searchNotice" class="nfq-audit-feedback" role="alert">{{searchNotice}}</p>
   <p v-if="invalidScope" class="nfq-audit-feedback" role="alert">The supplied variant identifier is invalid. Search for one recorded variant instead.</p>
  </section>

  <div v-if="phase==='idle'&&!invalidScope" class="nfq-audit-start" role="status">
   <strong>Start with a recorded variant.</strong>
   <p>Use an exact name or a catalog record ID. You can also open this workspace directly from a variant dossier.</p>
   <RouterLink to="/variants">Browse the variant register <span aria-hidden="true">→</span></RouterLink>
  </div>
  <p v-if="phase==='not-connected'" role="alert" class="nfq-audit-feedback">{{configurationIssue||'The read-only research connection has not been configured.'}}</p>
  <p v-if="phase==='loading'" role="status" class="nfq-audit-loading">Retrieving the variant and its recorded history…</p>
  <p v-if="phase==='no-record'" role="status" class="nfq-audit-feedback">No accessible variant matches this record ID. <RouterLink to="/variants">Search the live register</RouterLink>.</p>

  <template v-if="variant">
   <section class="nfq-audit-identity" aria-label="Selected variant">
    <div>
     <span class="nfq-audit-label">RECORD {{variant.id}}</span>
     <h2>{{variantDisplayName(variant)}}</h2>
     <p>{{variant.proteinName||variant.cdnaName||'Additional HGVS notation not recorded'}} <span v-if="variant.recordedClass"> · Recorded class {{variant.recordedClass}}</span></p>
    </div>
    <div class="nfq-audit-context">
     <RouterLink :to="'/variants/'+variant.id">Variant dossier</RouterLink>
     <RouterLink :to="{path:'/evidence',query:{variant:variant.id}}">Evidence sources</RouterLink>
     <button type="button" @click="clearScope">Change variant</button>
    </div>
   </section>
  </template>

  <p v-if="phase==='unavailable'" role="alert" class="nfq-audit-feedback">{{notice}}</p>
  <p v-if="phase==='inconsistent'" role="alert" class="nfq-audit-feedback">The recorded history is inconsistent. A chronology or audit export cannot be produced safely.</p>

  <template v-if="phase==='ready'&&chronology&&variant">
   <section class="nfq-audit-metrics" aria-label="Retrieved record totals">
    <div><strong>{{chronology.validationCount}}</strong><span>Validation entries</span></div>
    <div><strong>{{chronology.conflictCount}}</strong><span>Conflict records</span></div>
    <div><strong>{{unresolvedCount}}</strong><span>Marked unresolved</span></div>
    <div><strong>{{chronology.undated.length}}</strong><span>Undated events</span></div>
   </section>
   <ConflictReviewPreparation v-if="history&&unresolvedCount>0" :key="variant.id" :variant-id="variant.id" :history="history" />
   <section class="nfq-audit-chronology" aria-labelledby="nfq-audit-chronology-heading">
    <div class="nfq-audit-chronology-head">
     <div><span class="nfq-audit-label">REGISTERED ACTIVITY</span><h2 id="nfq-audit-chronology-heading">Recorded chronology</h2></div>
     <button type="button" class="nfq-audit-export" :disabled="!eventCount" data-testid="nfq-audit-export" @click="exportCsv">Export recorded events · CSV</button>
    </div>
    <div class="nfq-audit-filters" role="group" aria-label="Filter recorded events">
     <button v-for="item in filterOptions"
      :key="item.id" type="button" :aria-pressed="eventFilter===item.id" @click="eventFilter=item.id">{{item.label}}</button>
    </div>
    <p v-if="exportNotice" role="status" class="nfq-audit-export-note">{{exportNotice}}</p>
    <p v-if="!eventCount" class="nfq-audit-empty" role="status">The accessible register returned no validation or conflict events for this variant.</p>
    <template v-else>
     <div v-if="dated.length" class="nfq-audit-events" aria-label="Dated recorded events">
      <article v-for="item in dated" :key="item.key" class="nfq-audit-event">
       <div class="nfq-audit-event-rail"><span class="nfq-audit-event-dot"></span></div>
       <div>
        <div class="nfq-audit-event-meta"><time :datetime="item.recordedAt||undefined">{{item.timestampLabel}}</time><span>{{item.kind==='validation'?'Validation':'Conflict'}}</span></div>
        <h3>{{item.heading}}</h3>
        <p>{{item.details}}</p>
        <small>{{item.key}}</small>
       </div>
      </article>
     </div>
     <div v-if="undated.length" class="nfq-audit-undated">
      <h3>Without a recorded date <span>· {{undated.length}}</span></h3>
      <p>These entries have no verifiable position in the dated sequence.</p>
      <div v-for="item in undated" :key="item.key" class="nfq-audit-undated-row">
       <strong>{{item.heading}}</strong><span>{{item.details}}</span><small>{{item.key}}</small>
      </div>
     </div>
     <p v-if="!dated.length&&!undated.length" class="nfq-audit-empty">No events match this filter.</p>
    </template>
   </section>
   <p class="nfq-audit-disclaimer">Scope: record {{variant.id}} · {{chronology.validationCount}} validation records and {{chronology.conflictCount}} conflict records returned by the read-only register. The page does not establish a complete institutional audit trail, independent review, data quality or treatment guidance.</p>
  </template>
 </div>
</template>

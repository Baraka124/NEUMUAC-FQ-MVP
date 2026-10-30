<script setup lang="ts">
import { computed, nextTick, ref, watch, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import VariantFilterPanel from '../components/VariantFilterPanel.vue';
import {cftr2LinkedReferences} from '../domain/externalReferenceTypes';
import {referenceMetadata,dossierReferencePreview} from '../domain/referencePresentation';
import {safeResearchReturnPath,variantJourneyPath} from '../domain/researchJourney';
import {authController,authSessionProvider} from '../services/authSession';
import {explainMultiTermMatch,rankVisibleSearchPage} from '../domain/searchPresentation';
import {assessScientificDiscovery,parseDiscoveryTerms} from '../domain/compoundDiscovery';
import {historicalDiscoveryHint} from '../domain/legacyDiscoveryHints';
import {emptySearchReason} from '../domain/searchFeedback';
import {confirmedDossierRecord} from '../domain/confirmedDossier';

import {createLiveEvidenceSource,type LiveEvidenceReference} from '../services/liveEvidence';
import {createLegacyEtiSource,recordedTherapyFlag,type LegacyEtiRecord} from '../services/legacyEtiResponse';
import {describeRecordedEti} from '../domain/responseDisplay';
import SourceResponsePanel from '../components/SourceResponsePanel.vue';
import {createScientificDossierSource,type ScientificDossier} from '../services/scientificDossier';
import {clinVarVariationUrl} from '../domain/externalAuthority';
import {retrieveClinVarSummary,type ClinVarAuthoritySummary} from '../services/liveClinVar';
import {compareRecordedEvidence} from '../domain/evidenceComparison';
import {createVariantResearchBrief,createVariantResearchBriefMarkdown} from '../services/researchBrief';
import ContextHelp from '../components/ContextHelp.vue';
import {readSavedVariantIds,toggleSavedVariant} from '../domain/savedVariants';
import {portableSavedVariantsCsv,portableVariantLink} from '../domain/portableVariantReference';
import {scientificFieldInventory} from '../domain/scientificFieldInventory';
import {createLiveResearchHistorySource,type ResearchHistory} from '../services/liveResearchHistory';
import {recordedResearchChronology} from '../domain/recordedResearchChronology';
import {recordedConflictFocus} from '../domain/recordedConflictFocus';
import {prepareConflictReviewPacket} from '../domain/conflictReviewPacket';
import { createReadOnlyRepository, readConfigFromEnvironment, variantDisplayName, formatReadStatus, type RealVariant, type RealVariantSource } from '../services/liveVariants';
const route=useRoute(),router=useRouter();
const sourceWorkspace=computed(()=>safeResearchReturnPath(route.query.from,'workspace'));
const dossierReturn=computed(()=>variantJourneyPath(String(route.params.id||''),Object.fromEntries(Object.entries(route.query).filter(([key])=>key!=='from'))));
const config=readConfigFromEnvironment();
let source:RealVariantSource|null=null;
const liveMode = Boolean(config);
const evidenceSource=config?createLiveEvidenceSource(config):null;
const dossierSource=config?createScientificDossierSource(config):null;
const dossier=ref<ScientificDossier|null>(null);
const legacyEtiSource=config?createLegacyEtiSource(config,fetch,authSessionProvider):null;
const legacyEti=ref<LegacyEtiRecord|null>(null);
const legacyEtiError=ref('');
const legacyEtiLoading=ref(false);
let legacyEtiAbort:AbortController|null=null;
const fieldInventory=computed(()=>dossier.value?scientificFieldInventory(dossier.value):null);
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
const previewEvidence=computed(()=>dossierReferencePreview(linkedEvidence.value));
const cftr2References=computed(()=>cftr2LinkedReferences(linkedEvidence.value));
const evidenceError=ref('');
let evidenceAbort:AbortController|null=null;


let configError='';
try { if(config) source=createReadOnlyRepository(config,fetch,authSessionProvider); } catch(e){configError=formatReadStatus(e);}
const rows=ref<readonly RealVariant[]>([]);

const selected=ref<RealVariant|null>(null);
const detailNotice=ref('');
const savedOpen=ref(false);
const savedNotice=ref('');
const shareNotice=ref('');
function bookmarkStorage():Storage|null{try{return typeof window==='undefined'?null:window.localStorage;}catch{return null;}}
const savedIds=ref<readonly string[]>(readSavedVariantIds(bookmarkStorage()));
const selectedIsSaved=computed(()=>Boolean(selected.value&&savedIds.value.includes(selected.value.id)));
function savedVariantLabel(id:string):string{
 const record=selected.value?.id===id?selected.value:rows.value.find(v=>v.id===id);
 return record?variantDisplayName(record):'Recorded variant #'+id;
}
function changeSavedVariant(id:string):void{
 const outcome=toggleSavedVariant(bookmarkStorage(),id);
 if(!outcome){savedNotice.value='This browser could not update the saved worklist. No change was recorded.';return;}
 savedIds.value=outcome.ids;
 savedNotice.value=outcome.saved?'Variant saved on this browser.':'Variant removed from saved worklist.';
}
async function copyVariantLink():Promise<void>{
 const id=selected.value?.id;
 if(!id||selectedFromSearch.value)return;
 const link=portableVariantLink(id,window.location.href);
 if(!link||!navigator.clipboard?.writeText){
  shareNotice.value='A shareable record link is unavailable in this browser.';
  return;
 }
 try{
  await navigator.clipboard.writeText(link);
  if(selected.value?.id===id)shareNotice.value='Direct record link copied. The recipient must verify current evidence.';
 }catch{
  if(selected.value?.id===id)shareNotice.value='The record link could not be copied. Browser clipboard access may be restricted.';
 }
}
function downloadSavedWorklist():void{
 if(!savedIds.value.length)return;
 const csv=portableSavedVariantsCsv(savedIds.value,window.location.href);
 if(!csv){savedNotice.value='Portable record links could not be created. No export was produced.';return;}
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob);
 try{
  const a=document.createElement('a');a.href=url;a.download='neumuacFQ-saved-variant-links.csv';
  document.body.appendChild(a);a.click();a.remove();
  savedNotice.value='Saved record links exported. Open each record for current scientific information.';
 }finally{window.setTimeout(()=>URL.revokeObjectURL(url),5000);}
}

const selectedFromSearch=ref(false);
watch(selected,()=>{
 shareNotice.value='';
 clinVarAbort?.abort();
 clinVarSummary.value=null;clinVarError.value='';clinVarLoading.value=false;
});
const researchHistory=ref<ResearchHistory|null>(null);
const researchChronology=computed(()=>researchHistory.value&&selected.value?recordedResearchChronology(researchHistory.value,selected.value.id):null);
const conflictFocus=computed(()=>researchHistory.value&&selected.value?recordedConflictFocus(researchHistory.value,selected.value.id):null);
const unresolvedOpen=ref(false);
const reviewPacketNotice=ref('');
const historyError=ref('');
const historyLoading=ref(false);
const historyOpen=ref(false);
let historyAbort:AbortController|null=null;
const historySource=config?createLiveResearchHistorySource(config):null;
watch(selected,()=>{historyAbort?.abort();researchHistory.value=null;historyError.value='';historyLoading.value=false;historyOpen.value=false;unresolvedOpen.value=false;reviewPacketNotice.value='';});
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
function downloadConflictReviewPacket():void{
 if(!selected.value||!researchHistory.value||!evidenceReady.value||evidenceError.value){
  reviewPacketNotice.value='The complete source and conflict records must load before preparing a review packet.';
  return;
 }
 const packet=prepareConflictReviewPacket(selected.value.id,researchHistory.value,linkedEvidence.value,true);
 if(!packet){reviewPacketNotice.value='A consistent unresolved research packet could not be prepared.';return;}
 const url=URL.createObjectURL(new Blob([packet],{type:'text/markdown;charset=utf-8'}));
 try{
  const link=document.createElement('a');link.href=url;
  link.download='neumuacFQ-conflict-review-'+selected.value.id+'.md';
  document.body.appendChild(link);link.click();link.remove();
  reviewPacketNotice.value='Review packet downloaded. No records were changed.';
 }finally{window.setTimeout(()=>URL.revokeObjectURL(url),5000);}
}

const briefBusy=ref(false);
const briefStatus=ref('');
let briefAbort:AbortController|null=null;
watch(selected,()=>{briefAbort?.abort();briefBusy.value=false;briefStatus.value='';});
async function exportResearchBrief(mode:'copy'|'download'):Promise<void>{
 if(!selected.value||!config||briefBusy.value)return;
 const id=selected.value.id,controller=new AbortController();
 briefAbort?.abort();briefAbort=controller;
 briefBusy.value=true;briefStatus.value='';
 try{
  const contents=mode==='copy'
   ?await createVariantResearchBrief(config,id,fetch,controller.signal)
   :await createVariantResearchBriefMarkdown(config,id,fetch,controller.signal);
  if(controller.signal.aborted||selected.value?.id!==id)return;
  if(mode==='copy'){
   await navigator.clipboard.writeText(contents);
   if(!controller.signal.aborted&&selected.value?.id===id)briefStatus.value='Research brief copied with current recorded fields and references.';
  }else{
   const file=new Blob([contents],{type:'text/markdown;charset=utf-8'});
   const url=URL.createObjectURL(file);
   try{
    const link=document.createElement('a');
    link.href=url;link.download='neumuacFQ-variant-'+id+'-research-brief.md';
    document.body.appendChild(link);link.click();link.remove();
    briefStatus.value='Research brief downloaded as Markdown.';
   }finally{
    // Allow the browser to resolve the user-initiated download before revoking.
    window.setTimeout(()=>URL.revokeObjectURL(url),5000);
   }
  }
 }catch{
  if(!controller.signal.aborted&&selected.value?.id===id)
   briefStatus.value='Research brief could not be prepared. No incomplete export was produced.';
 }finally{
  if(!controller.signal.aborted)briefBusy.value=false;
 }
}

watch(selected,async record=>{
 dossierAbort?.abort();dossier.value=null;dossierError.value='';
 if(!record||!dossierSource)return;
 const controller=new AbortController();dossierAbort=controller;
 try{const data=await dossierSource.get(record.id,controller.signal);if(!controller.signal.aborted){dossier.value=data;if(!data)dossierError.value='No scientific metadata returned for this record.';}}
 catch{if(!controller.signal.aborted)dossierError.value='Scientific fields could not be loaded.';}
});
watch(selected,async record=>{
 legacyEtiAbort?.abort();
 legacyEti.value=null;legacyEtiError.value='';legacyEtiLoading.value=false;
 if(!record||!legacyEtiSource)return;
 const controller=new AbortController();legacyEtiAbort=controller;
 legacyEtiLoading.value=true;
 try{
  const result=await legacyEtiSource.get(record.id,controller.signal);
  if(!controller.signal.aborted&&selected.value?.id===record.id){
   legacyEti.value=result;
   if(!result)legacyEtiError.value='No recorded ETI response fields returned for this variant.';
  }
 }catch{
  if(!controller.signal.aborted&&selected.value?.id===record.id)
   legacyEtiError.value='Historical ETI response fields are unavailable for this record.';
 }finally{if(!controller.signal.aborted)legacyEtiLoading.value=false;}
});
watch(selected,async value=>{
 evidenceAbort?.abort(); linkedEvidence.value=[]; evidenceError.value='';evidenceReady.value=false;
 if(!value)return;
 if(!evidenceSource){evidenceError.value='Recorded reference access is not configured.';return;}
 const controller=new AbortController(); evidenceAbort=controller;
 try {const result=await evidenceSource.forVariant(value.id,controller.signal);
   if(!controller.signal.aborted){linkedEvidence.value=result;evidenceReady.value=true;}
 } catch {if(!controller.signal.aborted)evidenceError.value='Current source links could not be loaded.';}
});
const search=ref(typeof route.query.q==='string'?route.query.q:'');
const scientificInputAssessment=computed(()=>assessScientificDiscovery(search.value));
const legacyHint=computed(()=>scientificInputAssessment.value.blocked?null:historicalDiscoveryHint(search.value));
const inputActive=ref(false);
const exactMatchedId=ref<string|null>(null);
const showSearchInfo=ref(false);
const classFilter=ref(typeof route.query.class==='string'&&['I','II','III','IV','V','VI','unclassified'].includes(route.query.class)?route.query.class:'all');
const sort=ref(typeof route.query.sort==='string'&&['name-desc','recent-record','fewest-validations','most-validations'].includes(route.query.sort)?route.query.sort:'name-asc');
const searchMode=ref(typeof route.query.mode==='string'&&route.query.mode==='exact-name'?'exact-name':'contains');
const showAdvanced=ref(false);
const activeFilterCount=computed(()=>Number(classFilter.value!=='all')+Number(sort.value!=='name-asc')+Number(searchMode.value!=='contains'));
function resetAdvancedFilters():void{classFilter.value='all';sort.value='name-asc';searchMode.value='contains';}
watch(search,()=>{
 exactMatchedId.value=null;
 // A changed query is a new research context: never retain a previously opened dossier.
 if(route.params.id){
  detailRequest?.abort();
  ++detailSequence;
  detailBusy.value=false;
  selected.value=null;
  revealNextId=null;
 }
});
const scientificDetailsOpen=ref(false);
const showReferences=ref(false);
// A selected dossier takes visual priority over the long result list on phones.
// Desktop worklists remain fully visible, and users can expand results at any time.
const mobileResultsExpanded=ref(false);
watch(selected,value=>{showReferences.value=false;scientificDetailsOpen.value=false;mobileResultsExpanded.value=false;if(value)showSearchInfo.value=false;});
const page=ref(typeof route.query.page==='string'&&/^\d{1,4}$/.test(route.query.page)?Number(route.query.page):0);
const displayedRows=computed(()=>scientificInputAssessment.value.blocked?[]:
 (sort.value==='name-asc'&&page.value===0?rankVisibleSearchPage(rows.value,search.value):rows.value));
const activeResultIndex=ref(-1);
let revealNextId:string|null=null;
async function revealSelectedRecord(id:string):Promise<void>{
 if(revealNextId!==id)return;
 await nextTick();
 if(route.params.id!==id)return;
 const target=document.querySelector<HTMLElement>('.record-overview');
 if(!target)return;
 revealNextId=null;
 const bounds=target.getBoundingClientRect();
 const headerOffset=window.matchMedia('(max-width: 760px)').matches?82:74;
 // Do not jump the page when the dossier is already within the reading area.
 if(bounds.top<headerOffset || bounds.top>window.innerHeight-140){
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});
 }
}
watch(displayedRows,()=>{activeResultIndex.value=-1;});
function matchExplanation(record:RealVariant):string{
 const terms=parseDiscoveryTerms(search.value);
 return explainMultiTermMatch(record,terms)||'Recorded variant';
}
function focusResult(index:number):void{const items=document.querySelectorAll<HTMLButtonElement>('.record-list button');if(!items.length)return;const next=(index+items.length)%items.length;activeResultIndex.value=next;items[next]?.focus();}
const hasMore=ref(false);
const busy=ref(false);
const detailBusy=ref(false);
const error=ref(configError);
const completed=ref(false);
const pending=ref(true);
const emptyReason=computed(()=>emptySearchReason({query:search.value,completed:completed.value,pending:pending.value,blocked:scientificInputAssessment.value.blocked,error:Boolean(error.value),visibleCount:displayedRows.value.length,restrictiveFilters:classFilter.value!=='all'||searchMode.value!=='contains',page:page.value}));
function retrySearch():void{pending.value=true;completed.value=false;void load();void resolveSearch();}
function broadenSearch():void{classFilter.value='all';searchMode.value='contains';page.value=0;}
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
 rows.value=[];hasMore.value=false;busy.value=false;exactMatchedId.value=null;completed.value=false;pending.value=false;
});
async function load():Promise<void>{
  current?.abort();const run=++listSequence;const abort=new AbortController();current=abort;
  hasMore.value=false;error.value='';completed.value=false;
  if(scientificInputAssessment.value.blocked){rows.value=[];busy.value=false;pending.value=false;return;}
  if(!source){rows.value=[];pending.value=false;error.value=configError||'The public variant catalog has not been connected yet.';return;}
  busy.value=true;
  try {const data=await source.list({query:search.value,page:page.value,classFilter:classFilter.value as 'all'|'I'|'II'|'III'|'IV'|'V'|'VI'|'unclassified',sort:sort.value as 'name-asc'|'name-desc'|'recent-record'|'fewest-validations'|'most-validations',searchMode:searchMode.value as 'contains'|'exact-name',signal:abort.signal});if(run===listSequence){
    rows.value=data.records;hasMore.value=data.hasMore;completed.value=true;

  }}
  catch(e){if(!abort.signal.aborted&&run===listSequence){rows.value=[];error.value=formatReadStatus(e);}}
  finally {if(run===listSequence){busy.value=false;pending.value=false;}}
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
   if(hit && (route.params.id!==hit.id || selected.value?.id!==hit.id)){
     revealNextId=hit.id;
     exactMatchedId.value=hit.id;
     if(route.params.id===hit.id)void loadDetail(hit.id);
     else void router.replace({path:'/variants/'+encodeURIComponent(hit.id),query:{...route.query,q:text}});
   }
 }catch{if(!abort.signal.aborted&&run===exactSequence)exactMatchedId.value=null;}
}
async function loadDetail(id:unknown):Promise<void>{
  detailRequest?.abort();const run=++detailSequence;
  selected.value=null;selectedFromSearch.value=false;detailNotice.value='';
  if(typeof id!=='string'||!source)return;
  const abort=new AbortController();detailRequest=abort;detailBusy.value=true;
  try {const record=await source.get(id,abort.signal);if(run===detailSequence&&!abort.signal.aborted){
    // A list suggestion is not a verified dossier. Only the independently
    // retrieved, identity-matching record may enter the scientific canvas.
    selected.value=confirmedDossierRecord(id,record);
    if(!selected.value)detailNotice.value='This variant record could not be verified. No scientific dossier is shown.';
    else void revealSelectedRecord(id);
  }}
  catch(e){if(!abort.signal.aborted&&run===detailSequence){
    selected.value=null;
    detailNotice.value=formatReadStatus(e);
  }}
  finally {if(run===detailSequence)detailBusy.value=false;}
}
watch(()=>authController?.state.phase,()=>{current?.abort();detailRequest?.abort();rows.value=[];selected.value=null;page.value=0;void load();});
watch([search,page,classFilter,sort,searchMode],()=>{clearTimeout(timer);current?.abort();exactRequest?.abort();++listSequence;++exactSequence;rows.value=[];hasMore.value=false;busy.value=false;completed.value=false;pending.value=!scientificInputAssessment.value.blocked;timer=setTimeout(()=>{void load();void resolveSearch();},search.value?250:0)},{immediate:true});
watch([search,classFilter,sort,searchMode],()=>{page.value=0;});
watch(()=>route.params.id,id=>{void loadDetail(id);},{immediate:true});
onUnmounted(()=>{current?.abort();detailRequest?.abort();exactRequest?.abort();evidenceAbort?.abort();dossierAbort?.abort();legacyEtiAbort?.abort();clinVarAbort?.abort();briefAbort?.abort();historyAbort?.abort();clearTimeout(timer);});
function updateWorklistRoute():void {
 const query:Record<string,string>={};
 if(search.value.trim())query.q=search.value.trim();
 if(classFilter.value!=='all')query.class=classFilter.value;
 if(sort.value!=='name-asc')query.sort=sort.value;
 if(searchMode.value!=='contains')query.mode=searchMode.value;
 if(page.value>0)query.page=String(page.value);
 if(sourceWorkspace.value)query.from=sourceWorkspace.value;
 // Retain deep-link identity even during asynchronous detail loading.
 void router.replace({path:selected.value?.id===route.params.id?route.path:'/variants',query});
}
watch([search,classFilter,sort,searchMode,page],updateWorklistRoute);
function onSearchKeydown(event:KeyboardEvent):void{
 if(event.key==='Escape'){search.value='';return;}
 if(event.key==='ArrowDown'&&!pending.value&&!busy.value){event.preventDefault();focusResult(0);}
 // Enter in the search field must not open the first substring result.
 // It may only resolve an independently verified unambiguous exact identity.
 if(event.key==='Enter'){event.preventDefault();if(!scientificInputAssessment.value.blocked)void resolveSearch();}
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
 if(route.params.id===id){void loadDetail(id);return;}
 void router.push({path:'/variants/'+encodeURIComponent(id),query:{...route.query}});
}
</script>
<template>
 <div class="page variant-page">
  <div class="variant-heading"><h1>Variants</h1><span class="nfq-access-note">{{liveMode ? "Public access · Read only" : "Data connection required"}}</span></div>
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
    <p v-if="legacyHint" class="discovery-notation-guidance" role="status">Historical search lead: {{legacyHint.suggestedName}}. Not a verified synonym; search the recorded identifier independently.</p>
    <button v-if="scientificInputAssessment.blocked" type="button" class="nfq-guidance-link nfq-blocked-guidance" :aria-expanded="showSearchInfo" aria-controls="discovery-search-help" @click="showSearchInfo=!showSearchInfo">{{showSearchInfo?'Hide search guidance':'Search guidance'}}</button>
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
      <button type="button" class="nfq-saved-trigger" data-testid="saved-variants-toggle" :aria-expanded="savedOpen" aria-controls="saved-variants-panel" @click="savedOpen=!savedOpen">Saved<span v-if="savedIds.length"> · {{savedIds.length}}</span></button>
       <span v-if="!busy&&!error&&displayedRows.length" class="record-total" aria-live="polite" aria-label="Visible results on this page">{{displayedRows.length}} on page</span>
    </div>
    <section v-if="savedOpen" id="saved-variants-panel" class="nfq-saved-panel" aria-label="Saved variants" data-testid="saved-variants-panel">
      <div class="nfq-saved-panel-head"><strong>Saved variants</strong><button type="button" aria-label="Close saved variants" @click="savedOpen=false">Close</button></div>
      <p v-if="!savedIds.length" class="nfq-saved-muted">No saved variants on this browser.</p>
      <ul v-else class="nfq-saved-list">
       <li v-for="id in savedIds" :key="id">
        <button type="button" :aria-label="'Open saved variant '+id" @click="savedOpen=false;select(id)">{{savedVariantLabel(id)}}</button>
        <button type="button" :aria-label="'Remove saved variant '+id" @click="changeSavedVariant(id)">Remove</button>
       </li>
      </ul>
      <button v-if="savedIds.length" type="button" class="nfq-saved-export" @click="downloadSavedWorklist">Export links · CSV</button>
      <p class="nfq-saved-muted">Local to this browser. Saved links are not verified scientific dossiers or geographic activity.</p>
     </section>
     <p v-if="savedNotice" role="status" class="nfq-saved-feedback">{{savedNotice}}</p>
     <p v-if="exactMatchedId&&selected?.id===exactMatchedId" role="status" class="discovery-sr-only">Exact recorded identity opened automatically.</p>
    <p v-if="pending||busy" role="status" class="discovery-loading">{{busy?'Searching recorded variants…':'Preparing search…'}}</p>
    <div v-if="error" role="alert" class="empty-result nfq-search-feedback">
      <p>{{error}}</p>
      <RouterLink v-if="error.includes('Sign in')" to="/sign-in">Sign in</RouterLink>
      <button v-else-if="source" type="button" @click="retrySearch">Retry search</button>
    </div>
    <div v-else-if="emptyReason" role="status" class="empty-result nfq-search-feedback">
      <p v-if="emptyReason==='no-match'">No recorded variant matches this search. Check its spelling or try a separately recorded identifier.</p>
      <p v-else-if="emptyReason==='restricted'">No results under the current search preferences.</p>
      <p v-else-if="emptyReason==='empty-page'">There are no records on this page.</p>
      <p v-else>No variant records are available from this source.</p>
      <div class="nfq-search-actions">
        <button v-if="emptyReason==='restricted'" type="button" @click="broadenSearch">Clear restrictive filters</button>
        <button v-else-if="emptyReason==='empty-page'" type="button" @click="page=0">Return to first page</button>
        <button v-else-if="emptyReason==='no-match'" type="button" @click="search=''">Clear search</button>
        <button v-if="emptyReason==='no-match'||emptyReason==='restricted'" type="button" class="nfq-guidance-link" :aria-expanded="showSearchInfo" aria-controls="discovery-search-help" @click="showSearchInfo=!showSearchInfo">{{showSearchInfo?'Hide search guidance':'Search guidance'}}</button>
      </div>
    </div>
    <div v-if="showSearchInfo" id="discovery-search-help" class="discovery-help nfq-search-guide" role="note" aria-label="Search guidance">
      <strong>Search guidance</strong>
      <p>Search updates while typing. A single unambiguous recorded identity may open automatically.</p>
      <ul>
        <li>Use a name, protein or cDNA notation, or an alias already recorded in the catalog. Letter case is ignored; retain punctuation.</li>
        <li>For example, <code>1001+11C/T</code> and <code>c.869+11C&gt;T</code> are different written forms. This search does not translate or assume equivalence between them.</li>
        <li>Filters and exact-name mode narrow results. Separate up to four identifiers with commas or semicolons for an OR search, not a genotype interpretation.</li>
      </ul>
      <p class="nfq-search-guide-note">Unsupported or uncertain notation is not automatically corrected. No match means no accessible recorded result for this search, not proof that a variant does not exist or is novel. Search suggestions and typing are not geographic hit/miss events; regional activity recording is currently disabled.</p>
    </div>
    <button v-if="!pending&&!busy&&!error&&selected&&rows.length&&!scientificInputAssessment.blocked" type="button" class="nfq-mobile-results-toggle" :aria-expanded="mobileResultsExpanded" aria-controls="variant-results" @click="mobileResultsExpanded=!mobileResultsExpanded">
      <span>{{mobileResultsExpanded?'Hide other results':'View other results'}} <small>({{displayedRows.length}} on page)</small></span>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
    </button>
    <div v-if="!pending&&!busy&&!error&&rows.length&&!scientificInputAssessment.blocked" id="variant-results" class="record-list" :class="{'nfq-mobile-results-hidden':selected&&!mobileResultsExpanded}" aria-label="Search results"><button v-for="(record,index) in displayedRows" :key="record.id" type="button" @keydown="onResultKeydown($event,index)" @focus="activeResultIndex=index" @mouseenter="activeResultIndex=index" :aria-current="selected?.id===record.id?'true':undefined" :class="{'record-selected':selected?.id===record.id}" @click="select(record.id)"><span class="record-first"><strong>{{ variantDisplayName(record) }}</strong></span><span v-if="record.proteinName && !/^p\.\?$/.test(record.proteinName.trim())" class="record-subline">{{record.proteinName}}</span><span v-else-if="record.cdnaName" class="record-subline">{{record.cdnaName}}</span><span class="nfq-record-meta"><span v-if="search.trim()" class="record-match-reason">{{matchExplanation(record)}}</span><span v-if="record.recordedClass" class="record-class">Class {{record.recordedClass}}</span><span v-if="selected?.id===record.id" class="record-current-label">Selected</span></span></button></div>
    <nav v-if="!pending&&!busy&&!error&&(rows.length||page>0||hasMore)" class="pagination-controls discovery-pagination" :class="{'nfq-mobile-results-hidden':selected&&!mobileResultsExpanded}" aria-label="Variant result pages">
      <button type="button" :disabled="busy||page===0" aria-label="Previous variant page" @click="page--"><span aria-hidden="true">←</span> Previous</button>
      <span class="discovery-page-current" aria-current="page">Page {{page+1}}</span>
      <button type="button" :disabled="busy||!hasMore" aria-label="Next variant page" @click="page++">Next <span aria-hidden="true">→</span></button>
    </nav>
    <RouterLink class="regional-research-link" to="/geography" aria-label="Explore aggregated geographic research activity for Spain">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14"/></svg>
      <span>Regional research activity</span><span aria-hidden="true">↗</span>
    </RouterLink>
   </section>
   <div class="record-content">
    <article class="record-overview" aria-labelledby="selected-title">
     <p v-if="detailBusy" role="status">Loading record…</p>
     <template v-else-if="selected">
      <p v-if="detailNotice" role="status" class="nfq-detail-notice">{{detailNotice}} <button type="button" @click="loadDetail(selected.id)">Retry full record</button></p>
      <div class="nfq-dossier-primary">
       <div class="record-identity">
        <div>
         <RouterLink class="record-return nfq-mobile-return" :to="{path:'/variants',query:route.query}">← Back to results</RouterLink>
         <div class="nfq-identity-title">
          <h2 id="selected-title">{{variantDisplayName(selected)}}</h2>
          <span v-if="dossier?.functionalClass||selected.recordedClass" class="nfq-class-annotation"><span class="nfq-class-caption">Recorded class</span><strong>{{dossier?.functionalClass||selected.recordedClass}}</strong></span>
         </div>
        </div>
        <span v-if="selected.id===exactMatchedId" class="discovery-exact-chip">Exact match</span>
         <button v-if="!selectedFromSearch" type="button" class="nfq-save-record" data-testid="save-current-variant" :aria-pressed="selectedIsSaved" @click="changeSavedVariant(selected.id)">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4z"/></svg>
          {{selectedIsSaved?'Saved':'Save'}}
         </button>
         <button v-if="!selectedFromSearch" type="button" class="nfq-save-record" data-testid="copy-variant-record-link" @click="copyVariantLink">Copy link</button>
       </div>
       <p v-if="shareNotice" role="status" class="nfq-saved-feedback">{{shareNotice}}</p>
       <RouterLink v-if="sourceWorkspace" class="nfq-journey-return" :to="sourceWorkspace">← Return to {{sourceWorkspace.startsWith("/evidence")?"evidence":"research coverage"}}</RouterLink>
       <dl class="identity-grid nfq-dossier-identity" aria-label="Variant nomenclature">
        <div><dt>Legacy name</dt><dd>{{selected.legacyName||'Not recorded'}}</dd></div>
        <div><dt>Protein notation</dt><dd>{{selected.proteinName||'Not recorded'}}<small v-if="selected.proteinName?.trim()==='p.?'" class="nfq-unknown-consequence">Protein consequence unknown</small></dd></div>
        <div><dt>cDNA notation</dt><dd>{{selected.cdnaName||'Not recorded'}}</dd></div>
        <div><dt>Aliases</dt><dd>{{selected.aliases.length?selected.aliases.join(', '):'Not recorded'}}</dd></div>
       </dl>
       <section class="nfq-response-section" aria-labelledby="nfq-eti-response-heading">
        <div class="nfq-response-heading">
         <h3 id="nfq-eti-response-heading">ETI</h3>
         <ContextHelp label="Interpret ETI classification" title="About this classification">
          <p>This is the original database classification for this variant. It is not an independently verified treatment outcome, clinical recommendation, or prediction for an individual patient.</p>
          <p>Source disagreements are shown separately. A historical therapy-response flag does not establish ETI efficacy.</p>
         </ContextHelp>
        </div>
        <p v-if="legacyEtiLoading" role="status" class="nfq-response-loading">Loading historical classification…</p>
        <p v-else-if="legacyEtiError" role="status" class="nfq-response-loading">{{legacyEtiError}}</p>
        <p v-else-if="!legacyEtiSource" role="status" class="nfq-response-loading">Historical response source not configured.</p>
        <div v-else-if="legacyEti" class="nfq-response-layout">
         <strong class="nfq-response-status" :data-state="describeRecordedEti(legacyEti.recordedEtiCategory).tone" data-testid="eti-recorded-category">{{describeRecordedEti(legacyEti.recordedEtiCategory).label}}</strong>
         <SourceResponsePanel :key="legacyEti.id" :variant-id="legacyEti.id" :legacy="legacyEti"/>
         <div class="nfq-response-actions">
          <details class="nfq-response-metadata">
           <summary>Original database fields</summary>
           <dl class="nfq-response-fields">
            <div><dt>Therapy response flag</dt><dd>{{recordedTherapyFlag(legacyEti.legacyTherapyFlag)}}</dd></div>
            <div><dt>ETI evidence level</dt><dd>{{legacyEti.recordedEvidenceLevel||'Not recorded'}}</dd></div>
            <div><dt>Evidence tier</dt><dd>{{legacyEti.recordedEvidenceTier||'Not recorded'}}</dd></div>
            <div><dt>Source label</dt><dd>{{legacyEti.recordedAuthority||'Not recorded'}}</dd></div>
            <div><dt>CFTR2 response</dt><dd>{{legacyEti.recordedCftr2Response||'Not recorded'}}</dd></div>
            <div><dt>Last evidence update</dt><dd>{{legacyEti.lastEvidenceUpdate||'Not recorded'}}</dd></div>
           </dl>
           <p class="nfq-response-detail-note">Original fields reproduced without scientific adjudication.</p>
          </details>
          <RouterLink class="nfq-response-reference-link" :to="{path:'/evidence',query:{variant:selected.id}}">Research references <span aria-hidden="true">↗</span></RouterLink>
         </div>
        </div>
       </section>
      </div><section v-if="!selectedFromSearch" class="dossier-science" aria-label="Additional scientific record details">
      <p v-if="dossierError" role="alert">{{dossierError}}</p>
      <div class="nfq-details-control">
       <button type="button" class="nfq-details-trigger" :aria-expanded="scientificDetailsOpen" aria-controls="nfq-secondary-science" @click="scientificDetailsOpen=!scientificDetailsOpen">
        <span class="nfq-details-trigger-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>
        <span class="nfq-details-trigger-copy">
         <span class="nfq-details-trigger-label">{{scientificDetailsOpen?'Hide additional details':'Show additional details'}}</span>
         <small class="nfq-details-hint">Classification · Sources · References · Review history</small>
        </span>
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
        <div class="nfq-provenance-header">
         <h3 id="nfq-dossier-sources" class="nfq-dossier-group-title">Sources and validation</h3>
         <ContextHelp label="About recorded provenance" title="Recorded metadata and provenance">
          <p>These fields are reproduced from the research database. A recorded source name, confidence label or validation entry does not mean that the scientific assertion was independently verified.</p>
          <p v-if="fieldInventory">Recorded fields ({{fieldInventory.recorded.length}} of 10 inspected): {{fieldInventory.recorded.join(', ')||'None'}}.</p>
          <p v-if="fieldInventory&&fieldInventory.absent.length">Not recorded in this profile: {{fieldInventory.absent.join(', ')}}.</p>
          <p>Field presence is not a completeness grade. Missing catalog entries do not establish absent scientific evidence.</p>
         </ContextHelp>
        </div>
        <dl v-if="dossier" class="identity-grid nfq-supporting-fields">
         <div><dt>Source summary</dt><dd>{{dossier.sourceSummary||'Not recorded'}}</dd></div>
         <div><dt>ClinVar</dt><dd><a v-if="clinVarVariationUrl(dossier.clinvarId)" :href="clinVarVariationUrl(dossier.clinvarId)!" target="_blank" rel="noopener noreferrer">Open ClinVar record ↗</a><span v-else>{{dossier.clinvarId?'Identifier not recognized':'Not recorded'}}</span></dd></div>
         <div><dt>Validation entries</dt><dd>{{dossier.validationCount??'Not recorded'}}</dd></div>
         <div><dt>Latest validation</dt><dd>{{dossier.lastValidatedAt||'Not recorded'}}</dd></div>
         <div><dt>Last evidence update</dt><dd>{{dossier.lastEvidenceUpdate||'Not recorded'}}</dd></div>
        </dl>
       </section>
      <div v-if="dossier&&clinVarVariationUrl(dossier.clinvarId)" class="clinvar-verification" aria-label="On-demand external ClinVar verification">
       <div class="clinvar-verification-head"><div class="nfq-provenance-header"><strong>External authority · ClinVar</strong><ContextHelp label="About external ClinVar data" title="External source interpretation"><p>The NCBI ClinVar summary is retrieved only on request. It is separate from the local NeumuacFQ research catalog, may aggregate different clinical conditions and has not been clinically reconciled with local labels.</p></ContextHelp></div><button type="button" :disabled="clinVarLoading" @click="checkClinVar">{{clinVarLoading?'Checking NCBI…':clinVarSummary?'Refresh ClinVar summary':'Check current ClinVar summary'}}</button></div>
       <p v-if="clinVarLoading" role="status" class="rail-caption">Requesting the official ClinVar API…</p>
       <p v-if="clinVarError" role="alert" class="rail-caption">{{clinVarError}}</p>
       <section v-if="evidenceComparison" class="evidence-comparison" aria-label="Source-attributed scientific evidence comparison">
        <h4>Evidence comparison · source-attributed</h4>
        <ContextHelp label="About source comparison" title="Scope of source comparison"><p>Descriptions are shown side by side. They are not normalized, ranked or independently adjudicated; differences in clinical condition, scope and review status may explain apparent agreement or conflict.</p><p>{{evidenceComparison.interpretation}}</p></ContextHelp>
        <dl class="identity-grid">
         <div><dt>NeumuacFQ · recorded determination</dt><dd>{{evidenceComparison.localClaim||'Not recorded'}}</dd></div>
         <div><dt>Local source summary</dt><dd>{{evidenceComparison.localSource||'Not recorded'}}</dd></div>
         <div><dt>NCBI ClinVar · germline aggregate</dt><dd>{{evidenceComparison.externalClaim||'Not returned'}}</dd></div>
         <div><dt>External review status</dt><dd>{{evidenceComparison.externalReview||'Not returned'}}</dd></div>
         <div><dt>Linked local references</dt><dd>{{evidenceComparison.referencesCount}} recorded</dd></div>
         <div><dt>Recorded source names</dt><dd>{{evidenceComparison.sourceNames.join(', ')||'None returned'}}</dd></div>
        </dl>
        
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
        <p class="nfq-authority-link"><a :href="clinVarSummary.sourceUrl" target="_blank" rel="noopener noreferrer">Review authority record ↗</a></p>
       </template>
      </div>
      </div>
     </section>
     <section v-if="!selectedFromSearch&&scientificDetailsOpen" class="variant-evidence-links" aria-label="Scientific references">
      <div class="nfq-provenance-header">
       <h3 class="nfq-dossier-group-title">References</h3>
       <ContextHelp label="About recorded references" title="Recorded references and their limits">
        <p>Source titles, publication years and identifiers are taken from the accessible research catalogue, not independently verified evidence assessments.</p>
        <p>The dossier previews up to ten links, ordered by recorded publication year, with undated links last. This order does not measure study quality or clinical relevance. The evidence register offers additional pages.</p>
       </ContextHelp>
      </div>
      <div v-if="evidenceReady&&cftr2References.length" class="nfq-external-register" aria-label="CFTR2 source links">
       <span class="section-label">CFTR2 · LINKED REFERENCES</span>
       <ContextHelp label="About linked CFTR2 references" title="Linked CFTR2 records"><p>External CFTR2 links are recorded for this variant. The linked contents and conclusions have not been independently verified by NeumuacFQ.</p></ContextHelp>
       <ul><li v-for="item in cftr2References" :key="item.id"><a :href="item.url" rel="noopener noreferrer" target="_blank">{{item.title}} ↗</a></li></ul>
      </div>
      <button v-if="evidenceReady&&linkedEvidence.length" class="disclosure-button" type="button" :aria-expanded="showReferences" aria-controls="variant-reference-list" @click="showReferences=!showReferences"><span>{{showReferences?'Hide':'Show'}} references · {{previewEvidence.length}}{{linkedEvidence.length>previewEvidence.length?' of '+linkedEvidence.length:''}} recorded links</span><span aria-hidden="true">{{showReferences?'−':'+'}}</span></button>
      <p v-if="evidenceError" role="alert" class="rail-caption">{{evidenceError}}</p>
      <p v-else-if="!evidenceReady" role="status" class="rail-caption">Loading recorded references…</p>
      <p v-else-if="!linkedEvidence.length" class="rail-caption">No source links returned from this register; published evidence has not been assessed.</p>
      <div v-if="evidenceReady&&previewEvidence.length" id="variant-reference-list" v-show="showReferences">
       <ul class="variant-evidence-list">
        <li v-for="entry in previewEvidence" :key="entry.id"><a :href="entry.url" target="_blank" rel="noopener noreferrer">{{entry.title}} ↗</a><span class="nfq-reference-meta">{{referenceMetadata(entry).join(" · ")}}</span></li>
       </ul>
      </div>
      <RouterLink class="variant-evidence-browse" :to="{path:'/evidence',query:dossierReturn?{from:dossierReturn,variant:selected.id}:{}}">Browse the evidence register →</RouterLink>
       <RouterLink class="variant-evidence-browse nfq-journey-secondary" :to="{path:'/intelligence',query:dossierReturn?{from:dossierReturn,variant:selected.id}:{}}">Inspect documentation coverage →</RouterLink>
     </section>
     <section v-if="!selectedFromSearch&&scientificDetailsOpen" class="research-history-section" aria-label="Research history">
      <div class="nfq-provenance-header">
       <h3 class="nfq-dossier-group-title">Review history</h3>
       <ContextHelp label="About recorded review history" title="Limits of the review register">
        <p>Events come from database-recorded validation and conflict records. Dates are normalized to UTC; entries without dates are shown separately and cannot be placed in time.</p>
        <p>Resolution status is recorded metadata, not proof of a medically validated decision or an immutable audit trail. Personal identities and free-text notes are excluded.</p>
       </ContextHelp>
      </div>
      <button class="disclosure-button" type="button" :aria-expanded="historyOpen" aria-controls="variant-research-history" data-testid="variant-history-toggle" @click="toggleResearchHistory">
       <span>Recorded chronology</span><span aria-hidden="true">{{historyOpen?'−':'+'}}</span>
      </button>
      <div v-if="historyOpen" id="variant-research-history" data-testid="variant-history-panel">
       <p v-if="historyLoading" role="status">Loading recorded history…</p>
       <p v-else-if="historyError" role="alert">{{historyError}}</p>
       <p v-else-if="researchHistory&&!researchChronology" role="alert">The recorded history is inconsistent and cannot be placed in a reliable chronology.</p>
       <template v-else-if="researchChronology">
        <p class="nfq-history-count" role="status">{{researchChronology.validationCount}} validation entries · {{researchChronology.conflictCount}} conflict records</p>
        <div v-if="conflictFocus?.unresolved.length" class="nfq-conflict-focus" data-testid="recorded-unresolved-focus">
         <button type="button" class="disclosure-button" :aria-expanded="unresolvedOpen" aria-controls="nfq-unresolved-conflicts" @click="unresolvedOpen=!unresolvedOpen">Unresolved records · {{conflictFocus.unresolved.length}} <span aria-hidden="true">{{unresolvedOpen?'−':'+'}}</span></button>
         <ul v-if="unresolvedOpen" id="nfq-unresolved-conflicts" class="research-history-list" aria-label="Recorded unresolved conflicts">
          <li v-for="item in conflictFocus.unresolved" :key="item.id"><strong>{{item.field}}</strong><small>Conflict record #{{item.id}} · Recorded severity: {{item.recordedSeverity||'Not recorded'}}</small></li>
         </ul>
         <p v-if="unresolvedOpen" class="rail-caption">Recorded unresolved status only. This is not a verified review assignment, approval decision or clinical priority.</p>
         <button v-if="unresolvedOpen" type="button" class="nfq-save-record" data-testid="export-conflict-review" :disabled="!evidenceReady||Boolean(evidenceError)" @click="downloadConflictReviewPacket">Download research review packet · .md</button>
         <p v-if="unresolvedOpen&&!evidenceReady" role="status" class="rail-caption">Complete linked reference records are required to prepare this packet.</p>
         <p v-if="unresolvedOpen&&reviewPacketNotice" role="status" class="rail-caption">{{reviewPacketNotice}}</p>
        </div>
        <p v-if="!researchChronology.dated.length&&!researchChronology.undated.length" class="rail-caption">No recorded validation or conflict events were returned for this variant.</p>
        <ol v-if="researchChronology.dated.length" class="research-history-list nfq-history-timeline" aria-label="Dated research events, newest first">
         <li v-for="event in researchChronology.dated" :key="event.key">
          <time class="nfq-history-time" :datetime="event.recordedAt||undefined">{{event.timestampLabel}}</time>
          <strong>{{event.heading}}</strong>
          <small>{{event.details}}</small>
         </li>
        </ol>
        <div v-if="researchChronology.undated.length" class="nfq-history-undated">
         <p class="nfq-history-undated-label">Without recorded date · {{researchChronology.undated.length}}</p>
         <ul class="research-history-list" aria-label="Undated research events, not chronologically ordered">
          <li v-for="event in researchChronology.undated" :key="event.key">
           <strong>{{event.heading}}</strong><small>{{event.details}}</small>
          </li>
         </ul>
        </div>
       </template>
      </div>
     </section>
     <div v-if="!selectedFromSearch&&scientificDetailsOpen" class="nfq-dossier-report">
      <div class="variant-export-actions" role="group" aria-label="Research brief actions">
       <button type="button" :disabled="briefBusy" @click="exportResearchBrief('copy')">{{briefBusy?'Preparing brief…':'Copy research brief'}}</button>
       <button type="button" :disabled="briefBusy" @click="exportResearchBrief('download')">Download .md</button>
       <ContextHelp label="About the research brief" title="Research brief and provenance">
        <p>The brief is generated on request from the current live variant record, recorded scientific metadata and complete accessible reference links.</p>
        <p>It includes recorded source identifiers, citation details and database labels. Neither the source labels nor the scientific interpretation have been independently verified.</p>
        <p>Markdown is a portable text format, not a PDF, clinical report, patient record or treatment recommendation. If any required read fails, no brief is produced.</p>
       </ContextHelp>
       <p role="status" v-if="briefStatus" class="nfq-brief-status">{{briefStatus}}</p>
      </div>
     </div>
     </template>
     <template v-else>
      <div class="nfq-no-selection" aria-live="polite">
       <span class="section-label">SCIENTIFIC RECORD</span>
       <h2 id="selected-title">{{route.params.id?'Record unavailable':search.trim()&&!busy&&!error&&!displayedRows.length?'No matching variant':'Select a variant'}}</h2>
       <p v-if="detailNotice" role="alert">{{detailNotice}}</p>
       <p v-else>{{route.params.id?'No accessible record was returned for this identifier.':search.trim()&&!busy&&!error&&!displayedRows.length?'No recorded variant matches the current search. Check the notation or try a recorded alias.':'Choose a result to open its dossier. An unambiguous exact match opens automatically.'}}</p>
       <button v-if="route.params.id&&detailNotice" type="button" class="nfq-save-record" @click="loadDetail(route.params.id)">Retry record</button>
      </div>
     </template>
    </article>
   </div>
  </div>
 </div>
</template>

<style scoped>
.nfq-saved-trigger,.nfq-save-record{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;flex:none;border:1px solid var(--border,#dce2e7);border-radius:8px;background:transparent;color:inherit;padding:.4rem .65rem;font:inherit;font-size:.78rem;font-weight:550;cursor:pointer}
.nfq-saved-trigger[aria-expanded="true"],.nfq-save-record[aria-pressed="true"]{background:var(--surface-secondary,#f4f6f8)}
.nfq-saved-trigger:focus-visible,.nfq-save-record:focus-visible,.nfq-saved-panel button:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.nfq-saved-panel{border:1px solid var(--border,#dce2e7);border-radius:10px;padding:.8rem;margin:.5rem 0 1rem;background:var(--surface,#fff)}
.nfq-saved-panel-head{display:flex;justify-content:space-between;align-items:center;gap:.75rem;font-size:.82rem}
.nfq-saved-panel-head button{background:transparent;border:0;color:var(--text-muted,#687381);font:inherit;font-size:.78rem;cursor:pointer}
.nfq-saved-list{padding:0;margin:.7rem 0;list-style:none}
.nfq-saved-list li{display:flex;justify-content:space-between;gap:.65rem;align-items:center;padding:.55rem 0;border-bottom:1px solid var(--border,#dce2e7)}
.nfq-saved-list button{font:inherit;color:inherit;font-size:.78rem;cursor:pointer;border:0;background:transparent;text-align:left}
.nfq-saved-list button:first-child{overflow-wrap:anywhere;min-width:0}
.nfq-saved-list button:last-child{color:var(--text-muted,#687381)}
.nfq-saved-muted,.nfq-saved-feedback{font-size:.73rem;line-height:1.45;color:var(--text-muted,#687381);margin:.6rem 0 0}
.nfq-saved-export{margin-top:.35rem;border:1px solid var(--border,#dce2e7);border-radius:7px;background:transparent;padding:.5rem .7rem;color:inherit;font:inherit;font-size:.78rem;cursor:pointer}
@media(max-width:640px){.nfq-save-record{padding:.45rem .6rem}.nfq-saved-panel{max-width:100%}}
</style>

<style scoped>
.nfq-history-count{font-size:12px;color:var(--muted,#526b7b);margin:14px 0 6px}
.nfq-history-timeline{margin:5px 0 0;padding:0}
.nfq-history-time{display:block;color:#496d65;font-size:11px;font-variant-numeric:tabular-nums;font-weight:600;margin-bottom:3px}
.nfq-history-undated{margin-top:13px;border-top:1px solid var(--line,#dce5e8);padding-top:9px}
.nfq-history-undated-label{font-size:11px;color:var(--muted,#526b7b);font-weight:600;margin:0 0 4px}
.nfq-history-timeline li,.nfq-history-undated li{min-width:0;max-width:100%;overflow-wrap:anywhere}
@media(max-width:640px){.nfq-history-time{font-size:10.5px}}



.nfq-response-section{margin-top:1rem;border:1px solid var(--border,#dce4e5);border-radius:10px;background:var(--surface,#fff);padding:.9rem 1rem;min-width:0}
.nfq-response-heading{display:flex;justify-content:space-between;align-items:center;gap:.7rem;margin-bottom:.55rem}
.nfq-response-heading h3{font-size:.9rem;line-height:1.45;font-weight:690;letter-spacing:-.01em;margin:0;min-width:0}
.nfq-response-loading{font-size:.79rem;line-height:1.5;color:var(--text-muted,#687381);margin:.5rem 0}
.nfq-response-layout{min-width:0;display:grid;gap:.65rem}
.nfq-response-status{display:block;font-size:1.03rem;font-weight:660;letter-spacing:-.015em;line-height:1.5;overflow-wrap:anywhere}
.nfq-response-status[data-state='unresolved']{color:var(--text-muted,#637580)}
.nfq-response-actions{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:.35rem 1rem;border-top:1px solid var(--border,#e0e6e7);padding-top:.5rem}
.nfq-response-metadata{min-width:min(270px,100%);max-width:100%}
.nfq-response-metadata summary{font-size:.74rem;font-weight:560;cursor:pointer;color:var(--text-muted,#687381);padding:.2rem 0}
.nfq-response-metadata summary:focus-visible,.nfq-response-reference-link:focus-visible{outline:2px solid currentColor;outline-offset:3px}
.nfq-response-fields{display:grid;gap:.4rem;margin:.65rem 0}
.nfq-response-fields>div{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.7rem;align-items:baseline;font-size:.71rem}
.nfq-response-fields dt{color:var(--text-muted,#687381)}
.nfq-response-fields dd{margin:0;font-weight:550;text-align:right;overflow-wrap:anywhere}
.nfq-response-detail-note{font-size:.7rem;line-height:1.5;color:var(--text-muted,#687381)}
.nfq-response-reference-link{font-size:.74rem;font-weight:570;display:inline-flex;gap:.3rem;align-items:center;color:inherit;line-height:1.6}
@media(max-width:600px){.nfq-response-section{padding:.75rem .85rem}.nfq-response-heading h3{font-size:.85rem}.nfq-response-status{font-size:1rem}.nfq-response-actions{align-items:flex-start}}
</style>

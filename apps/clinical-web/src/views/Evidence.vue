<script setup lang="ts">
import {ref,watch,onUnmounted,nextTick} from 'vue';
import {RouterLink,useRoute} from 'vue-router';
import {computed} from 'vue';
import {safeResearchReturnPath,workspaceJourneyPath} from '../domain/researchJourney';
import {createLiveEvidenceSource, EVIDENCE_PAGE_SIZE, type LiveEvidenceReference} from '../services/liveEvidence';
import {readConfigFromEnvironment} from '../services/liveVariants';
import {referenceMetadata,referenceLinkConsistency} from '../domain/referencePresentation';
import {evidenceCurationPageFindings} from '../domain/evidenceCurationPage';
import {retrievePubMedMetadata,supportedPubMedId,type PubMedPublicationMetadata} from '../services/livePubMed';
import {evidencePageCsv} from '../domain/evidencePageExport';
import ContextHelp from '../components/ContextHelp.vue';
import EvidenceProposalDraft from '../components/EvidenceProposalDraft.vue';
import {portableEvidenceLink} from '../domain/portableEvidenceLink';
const route=useRoute();
const focusId=computed(()=>typeof route.query.variant==='string'&&/^[1-9]\d{0,17}$/.test(route.query.variant)?route.query.variant:null);
// Explicit but invalid variant scopes must never silently broaden to all evidence.
const invalidVariantScope=computed(()=>route.query.variant!==undefined&&!focusId.value);
const returnToResearch=computed(()=>safeResearchReturnPath(route.query.from,'research'));
const returnLabel=computed(()=>returnToResearch.value?.startsWith('/genotype')?'Return to variant comparison':'Return to variant dossier');
const savedWorkspace=computed(()=>workspaceJourneyPath('/evidence',{q:query.value,page:String(page.value),variant:focusId.value||undefined}));
const shareableView=computed(()=>invalidVariantScope.value?null:workspaceJourneyPath('/evidence',{q:focusId.value?undefined:query.value.trim(),page:String(page.value),variant:focusId.value||undefined}));
const config=readConfigFromEnvironment();
const source=config?createLiveEvidenceSource(config):null;
const query=ref(typeof route.query.q==='string'&&/^[a-zA-Z0-9 _-]{0,70}$/.test(route.query.q)?route.query.q:'');
const page=ref(typeof route.query.page==='string'&&/^\d{1,4}$/.test(route.query.page)?Math.min(Number(route.query.page),10000):0);
const expandedRows=ref<readonly number[]>([]);
type PubMedCheckState=
 | {readonly refId:number;readonly phase:'loading'}
 | {readonly refId:number;readonly phase:'ready';readonly metadata:PubMedPublicationMetadata}
 | {readonly refId:number;readonly phase:'error'};
const pubmedCheck=ref<PubMedCheckState|null>(null);
let pubmedAbort:AbortController|null=null;
async function inspectPubMed(item:LiveEvidenceReference):Promise<void>{
 if(!supportedPubMedId(item.pmid)||pubmedCheck.value?.phase==='loading')return;
 pubmedAbort?.abort();
 const controller=new AbortController();pubmedAbort=controller;
 pubmedCheck.value={refId:item.id,phase:'loading'};
 try{
  const metadata=await retrievePubMedMetadata(item.pmid,fetch,controller.signal);
  if(!controller.signal.aborted&&rows.value.some(row=>row.id===item.id&&row.pmid===item.pmid)&&expandedRows.value.includes(item.id))
   pubmedCheck.value={refId:item.id,phase:'ready',metadata};
 }catch{
  if(!controller.signal.aborted&&rows.value.some(row=>row.id===item.id)&&expandedRows.value.includes(item.id))
   pubmedCheck.value={refId:item.id,phase:'error'};
 }
}
function toggleRow(id:number){expandedRows.value=expandedRows.value.includes(id)?expandedRows.value.filter(x=>x!==id):[...expandedRows.value,id];if(pubmedCheck.value?.refId===id){pubmedAbort?.abort();pubmedCheck.value=null;}}
const rows=ref<readonly LiveEvidenceReference[]>([]);
const hasMore=ref(false);
const loading=ref(false);
const error=ref('');
const shareStatus=ref('');
const curationFindings=computed(()=>loading.value||error.value?[]:evidenceCurationPageFindings(rows.value));
const curationReferences=computed(()=>rows.value
 .map(reference=>({
  referenceId:reference.id,
  title:reference.title,
  findings:curationFindings.value.filter(f=>f.referenceId===reference.id)
 }))
 .filter(group=>group.findings.length>0)
);
function curationFor(referenceId:number){
 return curationFindings.value.filter(f=>f.referenceId===referenceId);
}
async function openCurationReference(id:number):Promise<void>{
 if(loading.value||error.value||!rows.value.some(reference=>reference.id===id))return;
 if(!expandedRows.value.includes(id))expandedRows.value=[...expandedRows.value,id];
 await nextTick();
 const trigger=document.querySelector<HTMLElement>('#nfq-evidence-title-'+id+' button');
 trigger?.focus({preventScroll:true});
 trigger?.scrollIntoView({block:'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
}
async function copyEvidenceView():Promise<void>{
 const url=portableEvidenceLink(shareableView.value,window.location.href);
 if(!url||!navigator.clipboard?.writeText){shareStatus.value='Cannot copy this view link. Check search filters or browser permissions.';return;}
 try{await navigator.clipboard.writeText(url);shareStatus.value='View link copied. It points to search filters, not verified evidence.';}
 catch{shareStatus.value='View link could not be copied. Clipboard access was denied.';}
}
watch([query,page,focusId,invalidVariantScope],()=>{shareStatus.value='';});
let abort:AbortController|null=null;
let sequence=0;
let debounce:ReturnType<typeof setTimeout>|undefined;
async function refresh(){
 abort?.abort();
 const run=++sequence;
 const controller=new AbortController();abort=controller;
 rows.value=[];hasMore.value=false;error.value='';
 if(invalidVariantScope.value){error.value='Invalid variant reference. No evidence was retrieved.';loading.value=false;return;}
 if(!source){error.value='Live evidence access is not configured.';loading.value=false;return;}
 loading.value=true;
 try{
  if(focusId.value){
   const data=await source.forVariantPage(focusId.value,page.value,controller.signal);
   if(run===sequence){rows.value=data.records;hasMore.value=data.hasMore;}
  }else{
   const data=await source.list({query:query.value,page:page.value,signal:controller.signal});
   if(run===sequence){rows.value=data.records;hasMore.value=data.hasMore;}
  }
 }catch{
  if(!controller.signal.aborted&&run===sequence)error.value='Live references could not be retrieved.';
 }finally{if(run===sequence)loading.value=false;}
}
// Hash-route navigation can reuse this mounted view. Restore the actual
// linked query and page instead of retaining a previous in-memory search.
watch(()=>[route.query.q,route.query.page],()=>{
 const raw=route.query.q;
 const nextQuery=typeof raw==='string'&&/^[a-zA-Z0-9 _-]{0,70}$/.test(raw)?raw:'';
 const rawPage=route.query.page;
 const nextPage=typeof rawPage==='string'&&/^[0-9]{1,4}$/.test(rawPage)?Math.min(Number(rawPage),10000):0;
 if(query.value!==nextQuery)query.value=nextQuery;
 if(page.value!==nextPage)page.value=nextPage;
});
// A disclosure belongs to the currently visible result set. Never carry an
// expanded reference into a new query, variant scope, or page, even when
// numeric reference IDs happen to overlap across responses.
watch([query,focusId,page,invalidVariantScope],()=>{expandedRows.value=[];});
watch([query,focusId,page,invalidVariantScope],()=>{pubmedAbort?.abort();pubmedCheck.value=null;});
watch([query,page,focusId,invalidVariantScope],()=>{
 // Invalidate the prior result context before the search debounce runs.
 // Otherwise a previous page remains actionable (including CSV export)
 // while the user is already looking at a new query or variant scope.
 clearTimeout(debounce);
 abort?.abort();
 ++sequence;
 rows.value=[];hasMore.value=false;error.value='';
 loading.value=Boolean(source);
 debounce=setTimeout(()=>{void refresh();},query.value?250:0);
},{immediate:true});
onUnmounted(()=>{abort?.abort();pubmedAbort?.abort();clearTimeout(debounce);});
const exportNotice=ref('');
function downloadEvidencePage():void{
 if(loading.value||error.value||!rows.value.length)return;
 const csv=evidencePageCsv(rows.value);
 if(csv===null){exportNotice.value='This reference page could not be exported safely.';return;}
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob);
 try{
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download='neumuacFQ-evidence-page-'+String(page.value+1)+'.csv';
  document.body.appendChild(anchor);anchor.click();anchor.remove();
  exportNotice.value='Current page exported. Recorded citations have not been independently validated.';
 }finally{window.setTimeout(()=>URL.revokeObjectURL(url),5000);}
}
watch([query,page,focusId,invalidVariantScope],()=>{exportNotice.value='';});
</script>
<template>
 <div class="page evidence-page nfq-science-ui">
  <header class="nfq-evidence-heading">
   <div class="nfq-evidence-heading-copy"><h1>Evidence &amp; provenance</h1></div>
   <div class="nfq-evidence-heading-actions">
    <button type="button" data-testid="evidence-copy-view" @click="copyEvidenceView">Copy view link</button>
    <ContextHelp label="About recorded references" title="Research evidence register">
     <p>Explore catalogued references, inspect source identifiers and review recorded research metadata. Catalog entries are not independent scientific verification.</p>
     <p>Links, source categories and publication types reflect stored research records; they do not independently establish study quality, pathogenicity or clinical relevance.</p>
     <p>Identifier agreement compares recorded DOI/PMID information with the linked URL, without verifying research claims. PubMed indexing information is retrieved separately on request.</p>
    </ContextHelp>
   </div>
  </header>
  <p v-if="shareStatus" role="status" class="nfq-evidence-share-status">{{shareStatus}}</p>
  <nav v-if="returnToResearch" class="nfq-research-trail" aria-label="Research return path">
   <RouterLink :to="returnToResearch" data-testid="evidence-context-return">← {{returnLabel}}</RouterLink>
   <span class="nfq-research-trail-current" aria-current="page">Evidence &amp; provenance</span>
  </nav>
  <div v-if="focusId" class="nfq-variant-scope"><span>References for variant record #{{focusId}}</span><RouterLink to="/evidence">All records</RouterLink></div>
  <div v-if="!focusId" class="evidence-search-head" role="search" aria-label="Find recorded scientific sources">
   <label for="evidence-search">Find a source or reference</label>
   <div class="nfq-science-search-line"><input id="evidence-search" v-model="query" type="search" placeholder="Title, source or PMID" @input="page=0"/><button v-if="query" type="button" class="nfq-science-clear" @click="query='';page=0">Clear search</button></div>
  </div>
  <p v-if="loading" role="status">Loading current references…</p>
  <p v-else-if="error" role="alert" class="empty-result">{{error}}</p>
  <p v-else role="status" class="evidence-results-count">{{rows.length}} recorded {{rows.length===1?'reference':'references'}} on page {{page+1}}</p>
  <p v-if="!loading&&!error&&!rows.length" class="empty-result">{{page>0?'No references on this page. Return to the previous page.':focusId?'No reference links recorded for this variant in the accessible catalog.':'No recorded source links match this search.'}}</p>
  <div v-if="!loading&&!error&&rows.length" class="nfq-evidence-page-tools">
   <button type="button" data-testid="evidence-export-page" @click="downloadEvidencePage">Export page · CSV</button>
   <ContextHelp label="About evidence export and ordering" title="Catalog ordering and export">
    <p>Entries are grouped into pages of ten and ordered by recorded publication year, newest first. The ordering is not a scientific quality ranking.</p>
    <p>CSV export contains the current displayed page of recorded references.</p>
   </ContextHelp>
  </div>
  <p v-if="exportNotice" role="status" class="nfq-evidence-export-notice">{{exportNotice}}</p>
  <details v-if="!loading&&!error&&curationReferences.length" class="nfq-evidence-curation" data-testid="evidence-curation-worklist">
   <summary>Source curation · {{curationFindings.length}} {{curationFindings.length===1?'observation':'observations'}} across {{curationReferences.length}} {{curationReferences.length===1?'reference':'references'}}</summary>
   <p class="nfq-evidence-curation-note">Current page only · Recorded metadata and identifier consistency. These are research review prompts, not evidence-quality grades, scientific contradictions or completed clinical validations.</p>
   <div class="nfq-evidence-curation-items">
    <div v-for="group in curationReferences" :key="group.referenceId" class="nfq-evidence-curation-item">
     <button type="button" @click="openCurationReference(group.referenceId)">Inspect reference #{{group.referenceId}}</button>
     <span>{{group.findings.map(f=>f.label).join(' · ')}}</span>
    </div>
   </div>
  </details>
  <section v-if="rows.length" class="evidence-register" aria-label="Recorded citations">
   <article v-for="item in rows" :key="item.id" class="evidence-row" :aria-labelledby="'nfq-evidence-title-'+item.id">
    <div class="evidence-row-meta"><span class="nfq-evidence-recorded-meta">{{referenceMetadata(item).join(" · ")}}</span></div>
    <h2 :id="'nfq-evidence-title-'+item.id"><button type="button" class="evidence-row-disclosure" :aria-expanded="expandedRows.includes(item.id)" :aria-controls="'evidence-details-'+item.id" @click="toggleRow(item.id)"><span>{{item.title}}</span><span aria-hidden="true">{{expandedRows.includes(item.id)?'−':'+'}}</span></button></h2>
    <div v-if="expandedRows.includes(item.id)" :id="'evidence-details-'+item.id" class="evidence-row-foot">
     <section v-if="curationFor(item.id).length" class="nfq-reference-curation" aria-label="Recorded source curation observations">
      <h3>Source review observations</h3>
      <ul>
       <li v-for="finding in curationFor(item.id)" :key="finding.kind"><strong>{{finding.label}}</strong> · {{finding.context}}</li>
      </ul>
     </section>
     <div class="nfq-evidence-detail-grid">
      <section class="nfq-evidence-detail-section" aria-label="Recorded citation metadata">
       <h3>Source identity</h3>
       <dl class="nfq-evidence-facts">
        <div><dt>Recorded source</dt><dd>{{item.source}}</dd></div>
        <div><dt>Journal</dt><dd>{{item.journal||'Not recorded'}}</dd></div>
        <div><dt>Year</dt><dd>{{item.year??'Not recorded'}}</dd></div>
        <div><dt>Publication type</dt><dd>{{item.type||'Not recorded'}}</dd></div>
        <div><dt>Category</dt><dd>{{item.category||'Not recorded'}}</dd></div>
        <div><dt>DOI</dt><dd>{{item.doi||'Not recorded'}}</dd></div>
        <div><dt>PMID</dt><dd>{{item.pmid||'Not recorded'}}</dd></div>
       </dl>
      </section>
      <section class="nfq-evidence-detail-section" aria-label="Recorded research metadata">
       <div class="nfq-evidence-section-heading">
        <h3>Catalogued metadata</h3>
        <ContextHelp label="About catalogued research metadata" title="Recorded research values">
         <p>Recorded quality score, source weight and citation count are stored catalog fields. They are not an independent appraisal of study design or scientific quality.</p>
        </ContextHelp>
       </div>
       <dl class="nfq-evidence-facts">
        <div><dt>Recorded quality score</dt><dd>{{item.recordedQualityScore??'Not recorded'}}</dd></div>
        <div><dt>Recorded source weight</dt><dd>{{item.recordedSourceWeight??'Not recorded'}}</dd></div>
        <div><dt>Recorded citation count</dt><dd>{{item.recordedCitationCount??'Not recorded'}}</dd></div>
       </dl>
       <div class="nfq-evidence-link-check" :data-link-consistency="referenceLinkConsistency(item).kind">
        <div class="nfq-evidence-section-heading">
         <strong>Identifier consistency</strong>
         <ContextHelp label="About identifier consistency" title="Identifier and source-link check">
          <p>The comparison uses recorded identifiers and the stored URL only. Agreement does not validate a scientific claim; discrepancies should be checked in the original publication.</p>
         </ContextHelp>
        </div>
        <span>{{referenceLinkConsistency(item).label}}</span>
       </div>
      </section>
     </div>
     <div class="nfq-evidence-source-actions" aria-label="Reference research links">
      <a :href="item.url" target="_blank" rel="noopener noreferrer">Open original source ↗</a>
      <RouterLink :to="{path:'/variants/'+encodeURIComponent(item.variantId),query:savedWorkspace?{from:savedWorkspace}:{}}">Open variant record #{{item.variantId}}</RouterLink>
     </div>
     <section class="nfq-evidence-pubmed" aria-label="Publication indexing">
      <div class="nfq-evidence-section-heading">
       <h3>Publication indexing</h3>
       <ContextHelp label="About PubMed publication indexing" title="Scope of NCBI indexing">
        <p>A PubMed publication-type lookup is performed only on request for a recorded PMID. Indexing terms are not an independently appraised study-design or quality assessment.</p>
       </ContextHelp>
      </div>
      <button v-if="supportedPubMedId(item.pmid)" type="button" :disabled="pubmedCheck?.phase==='loading'" @click="inspectPubMed(item)">{{pubmedCheck?.refId===item.id&&pubmedCheck.phase==='ready'?'Refresh PubMed types':'Check PubMed publication types'}}</button>
      <p v-else class="nfq-evidence-caution">No supported recorded PMID is available for this reference.</p>
      <p v-if="pubmedCheck?.refId===item.id&&pubmedCheck.phase==='loading'" role="status">Checking the recorded PMID with NCBI…</p>
      <p v-else-if="pubmedCheck?.refId===item.id&&pubmedCheck.phase==='error'" role="alert">PubMed metadata unavailable. No study classification was inferred.</p>
      <div v-else-if="pubmedCheck?.refId===item.id&&pubmedCheck.phase==='ready'" class="nfq-pubmed-metadata" role="status">
       <strong>PubMed publication types · NCBI</strong>
       <p v-if="pubmedCheck.metadata.publicationTypes.length">{{pubmedCheck.metadata.publicationTypes.join(' · ')}}</p>
       <p v-else>No publication types returned for this identifier.</p>
       <small>Retrieved {{pubmedCheck.metadata.retrievedAt}}</small>
       <a :href="pubmedCheck.metadata.sourceUrl" target="_blank" rel="noopener noreferrer">Open PubMed record ↗</a>
      </div>
     </section>
     <section class="nfq-evidence-contribution" aria-label="Research contribution">
      <h3>Research contribution</h3>
      <EvidenceProposalDraft :reference="item" />
     </section>
    </div>
   </article>
  </section>
  <nav class="pagination-controls" aria-label="Evidence pages">
   <button type="button" :disabled="loading||page===0" @click="page--">Previous</button>
   <span>Page {{page+1}} · {{EVIDENCE_PAGE_SIZE}} per page</span>
   <button type="button" :disabled="loading||!hasMore" @click="page++">Next</button>
  </nav>

 </div>
</template>
<style scoped>
/* 14H136 — calm, page-scoped research curation signals; no extra server calls. */
.nfq-evidence-curation{margin:0 0 13px;border:1px solid var(--border,#dce1de);border-radius:6px;padding:9px 13px;color:inherit;background:var(--surface,#fff)}
.nfq-evidence-curation summary{cursor:pointer;font-size:12px;font-weight:620;line-height:1.45;max-width:max-content}
.nfq-evidence-curation summary:focus-visible,.nfq-evidence-curation button:focus-visible{outline:2px solid currentColor;outline-offset:3px}
.nfq-evidence-curation-note{font-size:11px;color:var(--text-muted,#687381);line-height:1.5;margin:8px 0}
.nfq-evidence-curation-items{display:grid;gap:6px}
.nfq-evidence-curation-item{display:flex;align-items:baseline;flex-wrap:wrap;gap:7px 12px;min-width:0;padding:4px 0}
.nfq-evidence-curation-item button{border:1px solid var(--border,#dce1de);border-radius:5px;background:transparent;color:inherit;padding:5px 9px;font:inherit;font-size:11px;font-weight:600;cursor:pointer;flex-shrink:0}
.nfq-evidence-curation-item span{font-size:11px;color:var(--text-muted,#687381);min-width:0;overflow-wrap:anywhere}
.nfq-reference-curation{padding:0 0 9px;margin-bottom:11px;border-bottom:1px solid var(--border,#dce1de)}
.nfq-reference-curation h3{margin:0 0 6px;font-size:11px}
.nfq-reference-curation ul{margin:0;padding-left:17px;color:var(--text-muted,#687381);font-size:11px;line-height:1.55}
.nfq-reference-curation li+li{margin-top:3px}
.nfq-reference-curation strong{font-weight:670;color:inherit}
.nfq-evidence-heading-actions{display:inline-flex;align-items:center;gap:10px;flex:0 0 auto}
.nfq-evidence-heading-actions button{border:1px solid #c8dbce;border-radius:6px;background:transparent;color:#2b6348;padding:8px 12px;font:inherit;font-size:12px;font-weight:600;min-height:40px;cursor:pointer}
.nfq-evidence-heading-actions button:disabled{opacity:.45;cursor:not-allowed}
.nfq-evidence-heading-actions button:focus-visible{outline:2px solid #218466;outline-offset:3px}
.nfq-evidence-share-status{font-size:12px;color:#557463;margin:0 0 12px}

/* 14H94 — Evidence register: editorial hierarchy and clinical-mineral research facts. */
.nfq-evidence-heading-copy{display:grid;gap:0;min-width:0;max-width:76ch}
.nfq-evidence-heading-actions button{color:#245f66;border-color:#ccd7d8;border-radius:4px}
.evidence-register{display:grid;gap:12px;border:0}
.evidence-register .evidence-row{background:#fff;border:1px solid #dce1de;border-radius:5px;padding:16px 18px 15px;min-width:0}
.evidence-register .evidence-row-meta{display:flex;align-items:baseline;gap:8px 16px;flex-wrap:wrap}
.nfq-evidence-recorded-meta{font-size:11px;color:#65717a;font-weight:520!important;line-height:1.5;overflow-wrap:anywhere}
.evidence-register .evidence-row h2{font-size:clamp(16px,1.45vw,20px);line-height:1.35;letter-spacing:-.017em;margin:7px 0 0;color:#292f33}
.evidence-register .evidence-row-disclosure{color:#292f33;font-weight:710;text-align:left;min-width:0;line-height:1.35}
.evidence-register .evidence-row-disclosure>span:first-child{min-width:0;overflow-wrap:anywhere}
.evidence-register .evidence-row-disclosure>span:last-child{border-color:#cbd6d7;color:#245f66}
.evidence-register .evidence-row-foot{display:block;padding:15px 0 4px;border-top:1px solid #dce1de;margin-top:11px;color:#39464e;font-size:12px}
.nfq-evidence-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}
.nfq-evidence-detail-section{min-width:0}
.evidence-row-foot h3{font-size:12px;font-weight:780;letter-spacing:.015em;color:#343f45;margin:0 0 12px}
.nfq-evidence-section-heading{display:flex;align-items:center;justify-content:space-between;gap:9px;min-width:0;margin-bottom:8px}
.nfq-evidence-section-heading h3,.nfq-evidence-section-heading strong{margin:0}
.nfq-evidence-section-heading :deep(.nfq-context-help summary){width:30px;height:30px}
.nfq-evidence-page-tools :deep(.nfq-context-help summary){width:30px;height:30px}
.nfq-evidence-facts{display:grid;gap:0;margin:0}
.nfq-evidence-facts>div{display:flex;justify-content:space-between;align-items:start;gap:12px;padding:6px 0;border-bottom:0;min-width:0}
.nfq-evidence-facts dt{color:#65717a;font-size:11px;flex:0 1 42%}
.nfq-evidence-facts dd{font-size:12px;color:#292f33;font-weight:620;flex:1;min-width:0;text-align:right;margin:0;overflow-wrap:anywhere}
.nfq-evidence-caution{font-size:11px;color:#65717a;line-height:1.5;margin:0 0 12px;max-width:60ch}
.nfq-evidence-link-check{display:grid;gap:5px;margin-top:13px;border-left:2px solid #919fa3;background:transparent;padding:5px 0 5px 11px;border-radius:0}
.nfq-evidence-link-check strong{font-size:11px;color:#323f47}
.nfq-evidence-link-check span{font-size:12px;overflow-wrap:anywhere}
.nfq-evidence-link-check[data-link-consistency="consistent"]{border-left-color:#287052}
.nfq-evidence-link-check[data-link-consistency="mismatch"]{border-left-color:#ae7753}
.nfq-evidence-source-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:13px;padding-top:7px;border-top:0}
.nfq-evidence-source-actions a{display:inline-flex;align-items:center;min-height:40px;padding:9px 13px;color:#245f66;text-decoration:none;border:1px solid #cbd8d8;border-radius:4px;background:#fff;font-size:12px;font-weight:700;overflow-wrap:anywhere}
.nfq-evidence-source-actions a:hover{background:#edf3f3}
.nfq-evidence-pubmed{padding-top:14px;margin-top:17px;border-top:1px solid #e2e6e4}
.nfq-evidence-contribution{padding-top:7px;margin-top:16px;border-top:0}
.nfq-evidence-pubmed button{font:inherit;font-size:12px;font-weight:670;min-height:40px;color:#245f66;border:1px solid #cbd8d8;border-radius:4px;background:#fff;padding:8px 12px}
.nfq-evidence-pubmed button:disabled{opacity:.6;cursor:wait}
.nfq-evidence-contribution{min-width:0}
@media(max-width:900px){.nfq-evidence-detail-grid{grid-template-columns:minmax(0,1fr);gap:21px}}
@media(max-width:600px){
 .nfq-evidence-heading-copy{gap:5px}
 .evidence-register{gap:9px}
 .evidence-register .evidence-row{padding:13px 14px}
 .evidence-register .evidence-row h2{font-size:16px}
 .nfq-evidence-facts>div{gap:8px}
 .nfq-evidence-facts dt{flex-basis:44%}
 .nfq-evidence-source-actions a{width:100%;justify-content:center}
}
@media(max-width:600px){.nfq-evidence-heading{flex-wrap:wrap;min-width:0}.nfq-evidence-heading h1{min-width:0}.nfq-evidence-heading-actions{gap:6px;flex-wrap:wrap;margin-left:auto;min-width:0}.nfq-evidence-heading-actions button{font-size:11px;padding:7px 9px}}
</style>

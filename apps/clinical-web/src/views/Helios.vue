<script setup lang="ts">
import {computed,ref,onMounted,onUnmounted,watch} from 'vue';
import ContextHelp from '../components/ContextHelp.vue';
import {authController} from '../services/authSession';
import {configuredHeliosQueueSource,HeliosQueueError,type HeliosQueuePage} from '../services/heliosQueue';
import {describeHeliosReadState} from '../domain/heliosStatusPresentation';
import type {HeliosReadState} from '../domain/heliosPublishedReview';
// No authorized endpoint has been attached. Never infer access from a browser session.
const reviewReadState=ref<HeliosReadState>({kind:'not-connected'});
const reviewPresentation=computed(()=>describeHeliosReadState(reviewReadState.value));
const selectedReviewId=ref<string|null>(null);
function openReview(id:string){selectedReviewId.value=id;assessmentStep.value='record';selectedArea.value='evidence';}
function closeReview(){selectedReviewId.value=null;selectedArea.value='queue';}
// No records are supplied until a server-authorized, provenance-reviewed endpoint exists.
const queueSource=configuredHeliosQueueSource(authController);
const queuePage=ref<HeliosQueuePage|null>(null);
const queuePhase=ref<'not-connected'|'sign-in-required'|'loading'|'access-denied'|'empty'|'ready'|'unavailable'>(
 queueSource?'loading':'not-connected'
);
const queueOffset=ref(0);
const availableReviews=computed(()=>queuePage.value?.items??[]);
const selectedReview=computed(()=>availableReviews.value.find(item=>item.decisionId===selectedReviewId.value)??null);
const queueStatus=computed(()=>{
 switch(queuePhase.value){
  case 'not-connected':return {label:'Not connected',detail:'An authorized review queue has not been connected.'};
  case 'loading':return {label:'Loading',detail:'Checking authorized review records…'};
  case 'sign-in-required':return {label:'Sign-in required',detail:'Sign in with an authorized research account to access the review queue.'};
  case 'access-denied':return {label:'Access restricted',detail:'This account does not have verified reviewer access.'};
  case 'empty':return {label:'No pending reviews',detail:'No authorized pending review records were returned.'};
  case 'ready':return {label:'Review queue · read only',detail:'Authorized decision metadata only. No scientific assessment or approval is implied.'};
  case 'unavailable':return {label:'Unavailable',detail:'The authorized review queue could not be verified. No cached review data is shown.'};
 }
});
let activeRequest:AbortController|null=null;
let requestVersion=0;
async function loadQueue(offset=0):Promise<void>{
 if(!queueSource)return;
 activeRequest?.abort();
 const run=++requestVersion;
 const controller=new AbortController();activeRequest=controller;
 queuePage.value=null;
 selectedReviewId.value=null;
 queuePhase.value='loading';
 try{
  const page=await queueSource.list(offset,controller.signal);
  if(controller.signal.aborted||run!==requestVersion)return;
  queuePage.value=page;
  queueOffset.value=offset;
  queuePhase.value=page.items.length?'ready':'empty';
 }catch(error){
  if(controller.signal.aborted||run!==requestVersion)return;
  queuePage.value=null;
  queuePhase.value=error instanceof HeliosQueueError?error.kind:'unavailable';
 }
}
onMounted(()=>{if(queueSource)void loadQueue();});
onUnmounted(()=>{++requestVersion;activeRequest?.abort();});
watch(()=>authController?.state.phase,()=>{
 if(!queueSource)return;
 ++requestVersion;activeRequest?.abort();queuePage.value=null;
 selectedReviewId.value=null;queueOffset.value=0;
 if(authController?.state.phase==='signed-in')void loadQueue();
 else queuePhase.value='sign-in-required';
});
const assessmentStep=ref<'record'|'sources'|'uncertainty'>('record');
const selectedArea=ref<'queue'|'evidence'|'signals'|'history'>('queue');
const areas=[
 {id:'queue',title:'Review queue',detail:'Recorded review decisions and stages'},
 {id:'evidence',title:'Evidence assessment',detail:'Proposed change and recorded supporting sources'},
 {id:'signals',title:'Signals',detail:'Source scans, scientific drift and monitor targets'},
 {id:'history',title:'History',detail:'Review chronology, validation and feedback'}
] as const;
</script>

<template>
 <div clas  <header class="helios-head">
   <h1>Helios</h1>
   <ContextHelp label="About Helios and current access limitations" title="Scientific review workspace">
    <p>Helios provides read-only preparation for scientific review. Reviewer decisions, claims and audit actions remain unavailable until server-side authorization and source provenance have been verified.</p>
    <p>No synthetic review records are shown. A research sign-in does not imply reviewer permission.</p>
   </ContextHelp>
  </header>
c review records.
  </div>
  <div class="helios-current" role="status" data-testid="helios-status-banner">
   <span class="helios-status-dot" aria-hidden="true"></span>
   <span>Read-only preparation</span>
   <span class="helios-status-sep" aria-hidden="true">·</span>
   <span>{{queueSource?queueStatus.label:reviewPresentation.label}}</span>
  </div>
  <section class="helios-panel" aria-label="Helios scientific workspaces">
   <div class="helios-area-nav" role="group" aria-label="Helios review areas">
    <button v-for="area in areas" :key="area.id" type="button" :data-testid="'helios-tab-'+area.id"
     :class="{ 'helios-area-selected': selectedArea===area.id }"
     :aria-pressed="selectedArea===area.id" :aria-controls="'helios-area-'+area.id"
     @click="selectedArea=area.id">{{area.title}}</button>
   </div>
   <div v-for="area in areas" v-show="selectedArea===area.id" :key="area.id" :id="'helios-area-'+area.id"
    class="helios-area-detail" role="region" :aria-label="area.title" :data-testid="'helios-panel-'+area.id">
    <header class="helios-area-intro">
     <h2>{{area.title}}</h2>
     <ContextHelp :label="'About '+area.title" :title="area.title">
      <p>{{area.detail}}</p>
      <p v-if="area.id==='evidence'">Evidence assessment requires authorized review records and traceable sources. No scientific decision is implied by these preparation fields.</p>
      <p v-if="area.id==='signals'">Opening the recorded evidence catalog does not perform or authorize a Helios scan.</p>
      <p v-if="area.id==='history'">Review chronology requires verified reviewer permissions and traceable source records.</p>
     </ContextHelp>
    </header>
    <div v-if="area.id==='queue'" class="helios-read-state" role="status" data-testid="helios-review-read-state">{{queueSource?queueStatus.detail:reviewPresentation.detail}}</div>
    <template v-if="area.id==='queue' && availableReviews.length">
     <div class="helios-proposal-list">
      <button v-for="review in availableReviews" :key="review.decisionId" type="button"
       @click="openReview(review.decisionId)">
       <span><strong>{{review.decisionId}}</strong> · {{review.kind==='alias-equivalence'?'Nomenclature':'Search disposition'}}</span>
       <span>{{review.phase==='ready-for-release'?'Awaiting release':'Under review'}} <span aria-hidden="true">→</span></span>
      </button>
     </div>
    </template>
    <div v-if="area.id==='queue'&&queueSource&&queuePage" class="helios-queue-pages" role="group" aria-label="Review queue pagination">
     <button type="button" :disabled="queueOffset===0||queuePhase==='loading'" @click="loadQueue(queueOffset-20)">Previous</button>
     <span>Page {{Math.floor(queueOffset/20)+1}}</span>
     <button type="button" :disabled="!queuePage.hasMore||queueOffset>=1000||queuePhase==='loading'" @click="loadQueue(queueOffset+20)">Next</button>
    </div>
    <p v-if="area.id==='queue'&&queueSource&&queuePhase==='sign-in-required'" class="helios-queue-access">
     <RouterLink to="/admin">Staff sign-in</RouterLink>
    </p>
    <template v-if="area.id==='signals'">
     <div class="helios-recovery-sections" aria-label="Scientific signal capabilities">
      <div><strong>Source assessment</strong><span class="helios-restricted" data-testid="helios-locked-capability" title="Unavailable in this build; authorization is not yet connected"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>Internal and external evidence scans · Not connected</span></div>
      <div><strong>Consistency</strong><span class="helios-restricted" data-testid="helios-locked-capability" title="Unavailable in this build; authorization is not yet connected"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>Contradictions and drift · Not connected</span></div>
      <div><strong>Monitoring</strong><span class="helios-restricted" data-testid="helios-locked-capability" title="Unavailable in this build; authorization is not yet connected"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>Watch targets and scheduled checks · Not connected</span></div>
     </div>
     <p class="helios-source-continuity"><RouterLink to="/evidence" data-testid="helios-recorded-evidence-link">Evidence &amp; Curation</RouterLink></p>
    </template>
    <template v-if="area.id==='history'">
     <div class="helios-recovery-sections" aria-label="Review history capabilities">
      <div><strong>Decisions</strong><span class="helios-restricted" data-testid="helios-locked-capability" title="Unavailable in this build; authorization is not yet connected"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>Reviewer audit trail · Access restricted</span></div>
      <div><strong>Validation</strong><span class="helios-restricted" data-testid="helios-locked-capability" title="Unavailable in this build; authorization is not yet connected"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>Scientific validation chronology · Not connected</span></div>
      <div><strong>Feedback</strong><span class="helios-restricted" data-testid="helios-locked-capability" title="Unavailable in this build; authorization is not yet connected"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>Source feedback and review calibration · Not connected</span></div>
     </div>
    </template>
    <template v-if="area.id==='evidence'">
     <div v-if="selectedReviewId" class="helios-selected-review">
      <button type="button" @click="closeReview">Back to review queue</button>
      <span>Decision {{selectedReviewId}} · Read-only metadata</span>
     </div>
     <div class="helios-review-steps" role="group" aria-label="Evidence examination sequence">
      <button type="button" data-testid="helios-step-record" :aria-pressed="assessmentStep==='record'" @click="assessmentStep='record'">Comparison</button>
      <button type="button" data-testid="helios-step-sources" :aria-pressed="assessmentStep==='sources'" @click="assessmentStep='sources'">Sources</button>
      <button type="button" data-testid="helios-step-uncertainty" :aria-pressed="assessmentStep==='uncertainty'" @click="assessmentStep='uncertainty'">Uncertainty</button>
     </div>
     <div class="helios-assessment-grid" aria-label="Evidence assessment structure">
      <section :hidden="assessmentStep!=='record'" class="helios-assessment-cell" aria-label="Recorded value">
       <span class="helios-assessment-label">Recorded value</span>
       <p>{{selectedReview?'Selected '+selectedReview.kind.replace('-', ' ')+' record · No scientific values released.':'Awaiting an authorized review record'}}</p>
      </section>
      <section :hidden="assessmentStep!=='record'" class="helios-assessment-cell" aria-label="Proposed change">
       <span class="helios-assessment-label">Proposed change</span>
       <p>{{selectedReview?'Decision '+selectedReview.decisionId+' · Revision '+selectedReview.revision+'. Proposal details not yet authorized.':'No proposal selected'}}</p>
      </section>
      <section :hidden="assessmentStep!=='sources'" class="helios-assessment-cell" aria-label="Supporting evidence">
       <span class="helios-assessment-label">Supporting evidence</span>
       <p>No verified references loaded</p>
      </section>
      <section :hidden="assessmentStep!=='uncertainty'" class="helios-assessment-cell" aria-label="Uncertainty">
       <span class="helios-assessment-label">Uncertainty</span>
       <p>Cannot be assessed without source records</p>
      </section>
     </div>
    </template>
   </div>
  </section>
 </div>
</template>


<style scoped>
/* Clinical Mineral · restrained scientific review. Read-only behavior is defined in the source layer. */
.helios-workspace{max-width:1180px;min-width:0;margin:0 auto;padding-bottom:44px}
.helios-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:11px;margin-bottom:13px}
.helios-head h1{margin:0;font-size:clamp(27px,2.8vw,37px);font-weight:740;letter-spacing:-.04em;line-height:1.15;color:#292f33}
.helios-head :deep(.nfq-context-help summary){width:34px;height:34px}
.helios-current{display:flex;align-items:center;flex-wrap:wrap;gap:8px;min-height:35px;margin:0 0 14px;padding:3px 0 9px;border-bottom:1px solid #dce1de;font-size:12px;font-weight:570;color:#50616a;overflow-wrap:anywhere}
.helios-status-dot{width:7px;height:7px;flex:none;background:#89949b;border-radius:50%}
.helios-status-sep{opacity:.5}
.helios-panel{display:grid;grid-template-columns:minmax(190px,236px) minmax(0,1fr);background:#fff;border:1px solid #dce1de;border-radius:5px;min-width:0;overflow:visible;box-shadow:none}
.helios-area-nav{grid-column:1;grid-row:1;display:flex;flex-direction:column;align-items:stretch;gap:3px;padding:13px 10px;background:#f7f8f6;border-right:1px solid #dce1de;min-width:0}
.helios-area-nav button{display:flex;align-items:center;justify-content:flex-start;min-width:0;min-height:43px;padding:9px 13px;border:1px solid transparent;border-radius:3px;background:transparent;color:#47565e;font:inherit;font-size:12px;font-weight:640;line-height:1.4;text-align:left;cursor:pointer}
.helios-area-nav button:hover{background:#eef2f0;border-color:#dce1de}
.helios-area-nav button.helios-area-selected{background:#e6eeee;border-color:#ccdadb;box-shadow:inset 3px 0 #197b82;color:#253940}
.helios-area-nav button:focus-visible,.helios-review-steps button:focus-visible,.helios-proposal-list button:focus-visible,.helios-queue-pages button:focus-visible,.helios-selected-review button:focus-visible,.helios-source-continuity a:focus-visible{outline:2px solid #197b82;outline-offset:3px}
.helios-area-detail{grid-column:2;grid-row:1;min-width:0;padding:clamp(17px,2.25vw,27px);min-height:220px}
.helios-area-intro{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0;margin:0 0 15px}
.helios-area-intro h2{margin:0;color:#292f33;font-size:clamp(19px,1.8vw,24px);font-weight:730;letter-spacing:-.03em;line-height:1.2}
.helios-area-intro :deep(.nfq-context-help summary){width:30px;height:30px}
.helios-read-state{padding:6px 0;color:#50616a;font-size:12px;line-height:1.55;overflow-wrap:anywhere}
.helios-proposal-list{display:grid;gap:7px;margin:12px 0 0}
.helios-proposal-list button{display:flex;align-items:center;justify-content:space-between;gap:8px 18px;min-width:0;padding:13px 14px;background:#fff;border:1px solid #dce1de;border-radius:4px;font:inherit;font-size:12px;color:#35444b;text-align:left;cursor:pointer}
.helios-proposal-list button strong{font-weight:690;letter-spacing:-.01em}
.helios-proposal-list button:hover{background:#f5f7f6}
.helios-selected-review{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;margin-bottom:14px;color:#65717a;font-size:12px}
.helios-selected-review button{padding:6px 0;background:transparent;border:0;color:#245f66;font:inherit;font-weight:670;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.helios-review-steps{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px;padding:0}
.helios-review-steps button{min-height:40px;padding:8px 12px;background:transparent;border:1px solid transparent;border-radius:4px;color:#56656d;font:inherit;font-size:12px;font-weight:640;cursor:pointer}
.helios-review-steps button:hover{background:#f5f7f6}
.helios-review-steps button[aria-pressed="true"]{color:#245f66;border-color:#c7d8d9;background:#e9f1f1}
.helios-assessment-grid{display:flex;flex-wrap:wrap;align-items:stretch;gap:0 22px;min-width:0;margin:0;padding:0}
.helios-assessment-cell:not([hidden]){display:block;flex:1 1 220px;min-width:0;padding:9px 0 11px}
.helios-assessment-cell[hidden]{display:none}
.helios-assessment-label{display:block;margin:0 0 6px;color:#485962;font-size:11px;font-weight:720}
.helios-assessment-cell p{margin:0;color:#5e6b73;font-size:12px;line-height:1.6;overflow-wrap:anywhere}
.helios-recovery-sections{display:grid;gap:11px;margin:1px 0 0}
.helios-recovery-sections>div{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:5px 20px;min-width:0;padding:7px 0;border:0}
.helios-recovery-sections strong{color:#343f46;font-size:12px;font-weight:730}
.helios-recovery-sections span{color:#65717a;font-size:11px;line-height:1.55;overflow-wrap:anywhere}
.helios-restricted{display:inline-flex;align-items:center;gap:7px;min-width:0}
.helios-restricted svg{flex:none;color:#65717a;opacity:.75}
.helios-source-continuity{margin:18px 0 0;font-size:12px;line-height:1.5}
.helios-source-continuity a,.helios-queue-access a{color:#245f66;font-weight:670;text-decoration:underline;text-underline-offset:3px}
.helios-queue-pages{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:15px 0 0;font-size:12px;color:#65717a}
.helios-queue-pages button{min-height:40px;padding:8px 12px;border:1px solid #dce1de;border-radius:4px;background:#fff;color:#245f66;font:inherit;font-weight:650;cursor:pointer}
.helios-queue-pages button:disabled{opacity:.45;cursor:not-allowed}
.helios-queue-access{margin:13px 0 0}
@media(max-width:900px){
 .helios-panel{grid-template-columns:minmax(0,1fr)}
 .helios-area-nav{grid-column:1;grid-row:1;flex-direction:row;flex-wrap:wrap;gap:5px;padding:10px;background:#f7f8f6;border-right:0;border-bottom:1px solid #dce1de}
 .helios-area-nav button{flex:1 1 145px;justify-content:center;text-align:center;min-height:40px;padding:8px 10px}
 .helios-area-detail{grid-column:1;grid-row:2;min-height:170px}
}
@media(max-width:460px){
 .helios-workspace{padding-bottom:28px}
 .helios-head{margin-bottom:9px;padding-bottom:8px}
 .helios-current{margin-bottom:10px;padding-bottom:8px;font-size:11px}
 .helios-area-nav{gap:5px;padding:8px}
 .helios-area-nav button{flex:1 1 calc(50% - 5px);min-width:0;min-height:40px;padding:7px 5px;font-size:11px}
 .helios-area-detail{padding:17px 14px}
 .helios-area-intro{margin-bottom:11px}
 .helios-assessment-cell:not([hidden]){flex-basis:100%}
 .helios-recovery-sections>div{gap:4px}
 .helios-recovery-sections span{display:flex;align-items:center}
 .helios-proposal-list button{flex-direction:column;align-items:flex-start}
}
@media(prefers-reduced-motion:reduce){.helios-area-nav button,.helios-review-steps button{transition:none}}
</style>

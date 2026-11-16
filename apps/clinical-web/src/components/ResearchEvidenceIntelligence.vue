<script setup lang="ts">
import {computed,ref,watch,onUnmounted} from 'vue';
import {RouterLink} from 'vue-router';
import {THERAPIES,type CoreModulatorId,type RecordedResponse} from '../domain/therapyRegistry';
import {buildMultiTherapyResearchReport,type MultiTherapyResearchReport,type ResearchAssessmentState} from '../domain/multiTherapyResearch';
import {createResearchSourceSnapshotReader} from '../services/researchSourceSnapshot';
import {createVariantTherapySource} from '../services/variantTherapySource';
import {createLiveEvidenceSource} from '../services/liveEvidence';
import {authController,authSessionProvider} from '../services/authSession';
import {researcherRole} from '../services/researchRole';
import {readConfigFromEnvironment} from '../services/liveVariants';

const props=defineProps<{variantId:string;variantName:string}>();
const open=ref(false);
const report=ref<MultiTherapyResearchReport|null>(null);
const state=ref<'closed'|'checking'|'restricted'|'loading'|'ready'|'unavailable'>('closed');
const focusTherapy=ref<CoreModulatorId|null>(null);
const config=readConfigFromEnvironment();
const signedIn=computed(()=>authController?.state.phase==='signed-in');
const verified=computed(()=>signedIn.value&&researcherRole.phase==='verified'&&
 ['contributor','reviewer','administrator'].includes(researcherRole.role??''));
const loadingRole=computed(()=>authController?.state.phase==='checking'||
 researcherRole.phase==='checking');
const count=(n:number)=>n.toLocaleString('en-GB');
const therapyLabel=(id:CoreModulatorId)=>THERAPIES.find(x=>x.id===id)?.label??id;
const responseLabel=(r:RecordedResponse):string=>r===null?'Not recorded':r==='responsive'?
 'Responsive · database':r==='non_responsive'?'Non-responsive · database':'Unknown · database';
const stateLabel=(s:ResearchAssessmentState):string=>({
 'reviewed-response-report':'Reviewed reports: response',
 'reviewed-no-response-report':'Reviewed reports: no response',
 'review-conflict':'Source disagreement',
 'review-scope-uncertain':'Source context differs',
 'archived-records-only':'Recorded history only',
 'insufficient-evidence':'No verified evidence'
})[s];
function close():void{open.value=false;focusTherapy.value=null;}
let request:AbortController|null=null;
watch([
 open,()=>props.variantId,()=>authController?.state.phase,
 ()=>authController?.state.userId,()=>researcherRole.phase
],()=>{
 request?.abort();request=null;report.value=null;focusTherapy.value=null;
 if(!open.value){state.value='closed';return;}
 if(loadingRole.value){state.value='checking';return;}
 if(!verified.value){state.value='restricted';return;}
 if(!config||!authSessionProvider){state.value='unavailable';return;}
 state.value='loading';
 const id=props.variantId,controller=new AbortController();request=controller;
 const archiveReader=createResearchSourceSnapshotReader(config,authSessionProvider,fetch);
 const therapyReader=createVariantTherapySource(config,fetch,authSessionProvider);
 const bibliographyReader=createLiveEvidenceSource(config,fetch);
 void Promise.all([
  archiveReader.get(id,controller.signal),
  therapyReader.get(id,controller.signal),
  bibliographyReader.forVariant(id,controller.signal)
 ]).then(([archive,profile,references])=>{
  if(controller.signal.aborted||request!==controller||props.variantId!==id||!verified.value)return;
  if(!profile){state.value='unavailable';return;}
  report.value=buildMultiTherapyResearchReport({
   variantId:id,therapyProfile:profile,references,
   history:archive.history,archivedEvidence:archive.archivedEvidence
  });
  state.value='ready';
 }).catch(()=>{
  if(!controller.signal.aborted&&request===controller)state.value='unavailable';
 }).finally(()=>{if(request===controller)request=null;});
},{immediate:true});
onUnmounted(()=>request?.abort());
</script>

<template>
 <section class="nfq-research-engines" aria-label="Multi-therapy response and evidence conflict research"
  data-testid="nfq-research-engines">
  <header class="nfq-research-engines-head">
   <div class="nfq-research-engines-title">
    <strong>Response &amp; evidence intelligence</strong>
    <span>Five therapies · recorded evidence and unresolved scientific questions</span>
   </div>
   <button class="nfq-research-engines-toggle" type="button" :aria-expanded="open"
    aria-controls="nfq-research-engines-content" data-testid="nfq-research-engines-toggle"
    @click="open?close():open=true">{{open?'Close':'Examine evidence'}}</button>
  </header>
  <div v-if="open" id="nfq-research-engines-content" class="nfq-research-engines-content"
   data-testid="nfq-research-engines-content">
   <p v-if="state==='checking'||state==='loading'" class="nfq-research-engines-status" role="status">
    {{state==='checking'?'Verifying research access…':'Loading the recorded research sources…'}}
   </p>
   <p v-else-if="state==='restricted'" class="nfq-research-engines-status" role="status">
    Active research membership required to examine source-level records.
    <RouterLink v-if="!signedIn" to="/sign-in">Sign in</RouterLink>
   </p>
   <p v-else-if="state==='unavailable'" class="nfq-research-engines-status" role="status">
    The complete research-source snapshot could not be verified. No assessment has been produced.
   </p>
   <template v-else-if="state==='ready'&&report">
    <p class="nfq-research-engines-scope" data-testid="nfq-research-engines-scope">
     {{variantName}} · database variant #{{report.variantId}} · research comparison only
    </p>
    <div class="nfq-research-engines-metrics" aria-label="Source inventory">
     <span><strong>5</strong> regimens</span>
     <span><strong>{{count(report.bibliographicLinks)}}</strong> linked references</span>
     <span><strong>{{count(report.independentlyReviewedClaims)}}</strong> independently reviewed study families</span>
     <span v-if="report.unresolvedStudyConflicts"><strong>{{report.unresolvedStudyConflicts}}</strong> source review flags</span>
    </div>
    <p class="nfq-research-engines-guide">
     Recorded response is separate from a reviewed experimental finding. A linked reference alone is not a verified therapeutic claim.
    </p>
    <div class="nfq-research-engines-table" role="list" data-testid="nfq-research-engines-therapies">
     <article v-for="item in report.assessedTherapies" :key="item.therapy" role="listitem"
      class="nfq-research-engines-line" :data-therapy="item.therapy">
      <button type="button" class="nfq-research-engines-row"
       :aria-expanded="focusTherapy===item.therapy"
       :aria-controls="'nfq-engine-'+item.therapy"
       @click="focusTherapy=focusTherapy===item.therapy?null:item.therapy">
       <span class="nfq-research-engines-name">{{therapyLabel(item.therapy)}}</span>
       <span class="nfq-research-engines-recorded">{{responseLabel(item.recordedResponse)}}</span>
       <span class="nfq-research-engines-state" :class="{'has-review':item.state==='review-conflict'||item.archiveDisagreesWithRecorded}">
        {{stateLabel(item.state)}}</span>
       <span class="nfq-research-engines-chevron" aria-hidden="true">{{focusTherapy===item.therapy?'−':'+'}}</span>
      </button>
      <div v-if="focusTherapy===item.therapy" :id="'nfq-engine-'+item.therapy"
       class="nfq-research-engines-detail">
       <p>{{item.evidenceNote}}</p>
       <dl>
        <div><dt>Independently reviewed source families</dt><dd>{{item.sourceAssessment.verifiedStudyFamilies}}</dd></div>
        <div><dt>Archival flags · responsive / non-responsive</dt>
         <dd>{{item.archivalResponsive}} / {{item.archivalNonresponsive}}</dd></div>
        <div><dt>Historic contradiction events</dt><dd>{{item.historicalContradictionEvents}} · metadata, not adjudicated findings</dd></div>
        <div><dt>Source observations needing review</dt><dd>{{item.sourceAssessment.pendingObservations}}</dd></div>
       </dl>
       <p v-if="item.archiveDisagreesWithRecorded" class="nfq-research-engines-warning">
        Historical response labels differ. This is a reconciliation question, not proof of clinical disagreement.
       </p>
       <ul v-if="item.conflicts.length" class="nfq-research-engines-conflicts">
        <li v-for="conflict in item.conflicts" :key="conflict.id">
         {{conflict.message}} <span>· {{conflict.kind}}</span>
        </li>
       </ul>
       <RouterLink :to="{path:'/evidence',query:{variant:report.variantId,from:'/variants/'+report.variantId}}">
        Inspect linked sources</RouterLink>
      </div>
     </article>
    </div>
    <details class="nfq-research-engines-limits">
     <summary>Source coverage and interpretation</summary>
     <ul><li v-for="line in report.dataLimitations" :key="line">{{line}}</li></ul>
    </details>
    <p class="nfq-research-engines-footer">No response probability, individual treatment recommendation or clinical eligibility is calculated.</p>
   </template>
  </div>
 </section>
</template>

<style scoped>
.nfq-research-engines{margin:14px 0 4px;padding:0;border-top:1px solid var(--border,#dfe6ee);min-width:0;color:var(--text,#1f3553)}
.nfq-research-engines-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 0 9px}
.nfq-research-engines-title{display:grid;gap:3px;min-width:0}
.nfq-research-engines-title strong{font-size:13px;letter-spacing:-.012em;line-height:1.3}
.nfq-research-engines-title span{font-size:11px;color:var(--text-muted,#6d8097);line-height:1.45}
.nfq-research-engines-toggle{flex:0 0 auto;min-height:34px;padding:5px 10px;border:1px solid #bbcde0;border-radius:6px;background:transparent;color:#2867a5;cursor:pointer;font:inherit;font-weight:610;font-size:11px}
.nfq-research-engines-toggle:hover{background:rgba(47,119,215,.045);border-color:#8db3df}
.nfq-research-engines-toggle:focus-visible,.nfq-research-engines-row:focus-visible,.nfq-research-engines-detail a:focus-visible{outline:2px solid #2877dc;outline-offset:2px}
.nfq-research-engines-content{padding:5px 0 12px;min-width:0}
.nfq-research-engines-status{font-size:12px;color:var(--text-muted,#55708d);line-height:1.55}
.nfq-research-engines-status a,.nfq-research-engines-detail a{color:#2867a5;text-decoration:underline;text-underline-offset:3px}
.nfq-research-engines-scope{font-size:11px;color:var(--text-muted,#71859b);margin:0 0 9px}
.nfq-research-engines-metrics{display:flex;gap:6px 18px;flex-wrap:wrap;align-items:baseline;margin:7px 0 10px;font-size:11px;color:var(--text-muted,#647991)}
.nfq-research-engines-metrics strong{font-size:12px;color:var(--text,#17375b);font-weight:700}
.nfq-research-engines-guide,.nfq-research-engines-footer{font-size:11px;color:var(--text-muted,#6e849b);line-height:1.55;margin:5px 0 10px}
.nfq-research-engines-table{border-top:1px solid var(--border,#e1e8f0)}
.nfq-research-engines-line{border-bottom:1px solid var(--border,#e1e8f0);min-width:0}
.nfq-research-engines-row{display:grid;grid-template-columns:minmax(116px,1.1fr) minmax(150px,1.15fr) minmax(125px,1fr) 16px;gap:10px;align-items:center;width:100%;min-height:44px;padding:7px 0;border:0;background:transparent;color:inherit;text-align:left;font:inherit;cursor:pointer}
.nfq-research-engines-row:hover .nfq-research-engines-name{color:#2867a5}
.nfq-research-engines-name{font-size:12px;font-weight:670}
.nfq-research-engines-recorded{font-size:11px;color:var(--text-muted,#657e96)}
.nfq-research-engines-state{font-size:11px;color:#3d638e}
.nfq-research-engines-state.has-review{color:#946033}
.nfq-research-engines-chevron{font-size:15px;font-weight:400;color:#7891ae;text-align:right}
.nfq-research-engines-detail{padding:3px 0 14px;max-width:760px;font-size:11px;line-height:1.6;color:var(--text-muted,#4e6a88)}
.nfq-research-engines-detail>p{margin:3px 0 7px}
.nfq-research-engines-detail dl{display:grid;gap:5px;max-width:650px;margin:7px 0 9px}
.nfq-research-engines-detail dl>div{display:flex;justify-content:space-between;align-items:baseline;gap:15px}
.nfq-research-engines-detail dt{min-width:0}
.nfq-research-engines-detail dd{margin:0;font-weight:620;text-align:right;color:var(--text,#254565)}
.nfq-research-engines-warning{color:#95673e}
.nfq-research-engines-conflicts{padding-left:18px;margin:7px 0}
.nfq-research-engines-limits{margin:11px 0 4px;color:var(--text-muted,#56728f);font-size:11px}
.nfq-research-engines-limits summary{cursor:pointer;width:max-content;max-width:100%;font-weight:580}
.nfq-research-engines-limits ul{padding-left:19px;line-height:1.55}
.nfq-research-engines-footer{margin:9px 0 0}
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-research-engines-toggle{border-color:#4c6990;color:#a7cafa}
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-research-engines-title strong,
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-research-engines-metrics strong,
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-research-engines-detail dd{color:#e1ecff}
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-research-engines-state{color:#b7d3f5}
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-research-engines-state.has-review{color:#efc38a}
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-research-engines-detail a{color:#b2d6ff}
@media(max-width:680px){
 .nfq-research-engines-head{align-items:flex-start}
 .nfq-research-engines-toggle{font-size:10.5px;min-height:34px}
 .nfq-research-engines-row{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 16px;gap:3px 9px}
 .nfq-research-engines-name{grid-column:1}
 .nfq-research-engines-state{grid-column:2}
 .nfq-research-engines-chevron{grid-column:3;grid-row:1/3}
 .nfq-research-engines-recorded{grid-column:1/3;grid-row:2}
 .nfq-research-engines-detail dl>div{display:grid;gap:1px}
 .nfq-research-engines-detail dd{text-align:left}
}
</style>

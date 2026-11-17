<script setup lang="ts">
import {computed,ref,watch,onUnmounted} from 'vue';
import {RouterLink} from 'vue-router';
import type {MultiTherapyResearchReport} from '../domain/multiTherapyResearch';
import {compareCrossVariantEvidence} from '../domain/crossVariantEvidence';
import {buildPairedEvidenceQuestions} from '../domain/pairedEvidenceQuestions';
import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import {buildMultiTherapyResearchReport} from '../domain/multiTherapyResearch';
import {THERAPIES,type CoreModulatorId} from '../domain/therapyRegistry';
import {createResearchSourceSnapshotReader} from '../services/researchSourceSnapshot';
import {createVariantTherapySource} from '../services/variantTherapySource';
import {createLiveEvidenceSource} from '../services/liveEvidence';
import {createCuratedSourceClaimService,reviewedSourceObservations} from '../services/curatedSourceClaims';
import {authController,authSessionProvider} from '../services/authSession';
import {researcherRole} from '../services/researchRole';
import {readConfigFromEnvironment} from '../services/liveVariants';

const props=defineProps<{
 first:MultiTherapyResearchReport;firstName:string;firstClass:string|null;
 active:boolean;
 firstClaims:readonly CuratedSourceClaim[];
 firstReferences:readonly LiveEvidenceReference[];
}>();
const config=readConfigFromEnvironment();
const open=ref(false);
const peerId=ref('');
const state=ref<'idle'|'loading'|'ready'|'unavailable'>('idle');
const second=ref<MultiTherapyResearchReport|null>(null);
const secondClass=ref<string|null>(null);
const secondClaims=ref<readonly CuratedSourceClaim[]>([]);
const secondReferences=ref<readonly LiveEvidenceReference[]>([]);
const researchQuestionsOpen=ref(false);
let controller:AbortController|null=null;
const verified=computed(()=>props.active&&authController?.state.phase==='signed-in'&&
 researcherRole.phase==='verified'&&
 ['contributor','reviewer','administrator'].includes(researcherRole.role??''));
const compare=computed(()=>second.value&&state.value==='ready'?
 compareCrossVariantEvidence(props.first,second.value,props.firstClass,secondClass.value):null);
const paired=computed(()=>compare.value?buildPairedEvidenceQuestions({
 firstId:props.first.variantId,secondId:compare.value.secondId,
 firstClass:props.firstClass,secondClass:secondClass.value,
 firstClaims:props.firstClaims,secondClaims:secondClaims.value,
 firstReferences:props.firstReferences,secondReferences:secondReferences.value
}):null);
const therapyName=(id:CoreModulatorId)=>THERAPIES.find(x=>x.id===id)?.label??id;
function clear():void{
 controller?.abort();controller=null;second.value=null;secondClass.value=null;
 secondClaims.value=[];secondReferences.value=[];researchQuestionsOpen.value=false;state.value='idle';
}
function reset():void{clear();open.value=false;peerId.value='';}
function toggleOpen():void{if(open.value)reset();else open.value=true;}
watch([()=>props.first.variantId,()=>props.active,verified],reset);
watch(peerId,clear);
onUnmounted(clear);
async function loadPeer():Promise<void>{
 const id=peerId.value.trim();
 if(!open.value||!verified.value||!config||!authSessionProvider||
  !/^[1-9][0-9]{0,17}$/.test(id)||id===props.first.variantId||controller)return;
 clear();state.value='loading';
 const request=new AbortController();controller=request;
 const firstId=props.first.variantId;
 try{
  const [archive,profile,references,claims]=await Promise.all([
   createResearchSourceSnapshotReader(config,authSessionProvider,fetch).get(id,request.signal),
   createVariantTherapySource(config,fetch,authSessionProvider).get(id,request.signal),
   createLiveEvidenceSource(config,fetch).forVariant(id,request.signal),
   createCuratedSourceClaimService(config,authSessionProvider,fetch).list(id,request.signal)
  ]);
  if(request.signal.aborted||controller!==request||!verified.value||
   props.first.variantId!==firstId||peerId.value.trim()!==id)return;
  if(!profile)throw new Error('Missing variant profile');
  const observations=reviewedSourceObservations(claims,id,references.map(x=>x.id));
  const report=buildMultiTherapyResearchReport({
   variantId:id,therapyProfile:profile,references,
   history:archive.history,archivedEvidence:archive.archivedEvidence,
   reviewedObservations:observations
  });
  secondClass.value=profile.functionalClass;
  secondClaims.value=claims;secondReferences.value=references;
  second.value=report;state.value='ready';
 }catch{
  if(!request.signal.aborted&&controller===request){
   second.value=null;secondClass.value=null;state.value='unavailable';
  }
 }finally{if(controller===request)controller=null;}
}
</script>

<template>
 <section class="nfq-cross" data-testid="nfq-cross-variant">
  <header class="nfq-cross-head">
   <div><strong>Cross-variant research comparison</strong>
    <p>Two separately verified variant records · research scope only</p></div>
   <button type="button" class="nfq-cross-button" :aria-expanded="open"
    @click="toggleOpen">
    {{open?'Close comparison':'Compare another variant'}}
   </button>
  </header>
  <div v-if="open">
   <p class="nfq-cross-note">Enter the exact catalogue identifier of a second variant.
    Its complete authenticated research record is read independently; no similar name or
    functional class is treated as an identity match.</p>
   <form class="nfq-cross-input" @submit.prevent="loadPeer">
    <label for="nfq-peer-id">Second variant ID</label>
    <input id="nfq-peer-id" v-model.trim="peerId" inputmode="numeric"
     autocomplete="off" maxlength="18" placeholder="Exact recorded ID"
     :disabled="state==='loading'" />
    <button type="submit" class="nfq-cross-button"
     :disabled="!verified||state==='loading'||!(/^[1-9][0-9]{0,17}$/.test(peerId))||peerId===first.variantId">
     {{state==='loading'?'Verifying sources…':'Examine comparison'}}
    </button>
   </form>
   <p v-if="state==='unavailable'" role="status" class="nfq-cross-note">
    A complete second-variant research snapshot could not be verified.
    No partial comparison is shown.</p>
   <div v-if="compare" data-testid="nfq-cross-results">
    <p class="nfq-cross-note">{{compare.interpretation}}</p>
    <div class="nfq-cross-context">
     <span><b>{{firstName}}</b> · variant #{{compare.firstId}} · Class {{firstClass||'not recorded'}}</span>
     <span><b>Comparison variant</b> · #{{compare.secondId}} · Class {{secondClass||'not recorded'}}</span>
    </div>
    <p class="nfq-cross-note">
     {{compare.sharedClass===true?'Both records have the same recorded class. This is not evidence of shared drug response.':
      compare.sharedClass===false?'Recorded functional classes differ.':'Functional class comparison is unavailable.'}}
    </p>
    <div class="nfq-cross-lines" role="list">
     <article v-for="row in compare.rows" :key="row.therapy" role="listitem">
      <strong>{{therapyName(row.therapy)}}</strong>
      <div class="nfq-cross-two">
       <div><span>Variant #{{compare.firstId}}</span>
        <p>{{row.firstRecorded}} · {{row.firstState}}</p>
        <p>{{row.firstReviewedFamilies}} reviewed study families · {{row.firstConflicts}} conflict flags</p>
       </div>
       <div><span>Variant #{{compare.secondId}}</span>
        <p>{{row.secondRecorded}} · {{row.secondState}}</p>
        <p>{{row.secondReviewedFamilies}} reviewed study families · {{row.secondConflicts}} conflict flags</p>
       </div>
      </div>
      <p v-if="row.recordedLabelsDiffer||row.findingsDiffer" class="nfq-cross-note">
       Descriptive difference in {{row.recordedLabelsDiffer?'recorded database category':''}}
       {{row.recordedLabelsDiffer&&row.findingsDiffer?'and':''}}
       {{row.findingsDiffer?'reviewed source direction':''}}. Requires separate source appraisal.</p>
     </article>
    </div>
    <details class="nfq-cross-questions">
     <summary>Source-specific research questions ({{compare.hypotheses.length}})</summary>
     <p>Generated investigation prompts, not validated hypotheses or experimental conclusions.</p>
     <ol><li v-for="question in compare.hypotheses" :key="question">{{question}}</li></ol>
    </details>
    <section v-if="paired" class="nfq-cross-mechanisms" data-testid="nfq-cross-source-pairs">
     <header class="nfq-cross-head">
      <div><strong>Mechanism &amp; study-source investigation</strong>
       <p>{{paired.firstApprovedSources}} / {{paired.secondApprovedSources}} approved source claims ·
        {{paired.questions.length}} paired research prompts</p></div>
      <button type="button" class="nfq-cross-button" :aria-expanded="researchQuestionsOpen"
       @click="researchQuestionsOpen=!researchQuestionsOpen">
       {{researchQuestionsOpen?'Hide evidence pairs':'Examine evidence pairs'}}
      </button>
     </header>
     <p class="nfq-cross-note">{{paired.note}}</p>
     <p v-if="researchQuestionsOpen&&paired.questions.length===0" class="nfq-cross-note">
      No independently reviewed source observations are available on both sides for the same therapy.
      A matching class or missing study is not evidence of a common molecular mechanism.</p>
     <div v-if="researchQuestionsOpen&&paired.questions.length" class="nfq-cross-source-list">
      <article v-for="question in paired.questions" :key="question.id">
       <strong>{{therapyName(question.therapy)}}</strong>
       <span> · {{question.relation==='comparable-assay-context'?
        'Matching reported assay context':'Non-equivalent or unreported assay context'}}</span>
       <p>{{question.researchQuestion}}</p>
       <div class="nfq-cross-two">
        <div><span>Variant #{{question.left.variantId}} · {{question.left.finding}}</span>
         <p>{{question.left.sourceTitle}}</p>
         <p>{{question.left.method}} · {{question.left.endpointCode}} · {{question.left.sourceLocator}}</p>
         <p>Study {{question.left.studyFamilyId}} · claim {{question.left.claimId}}</p>
         <a :href="question.left.sourceUrl" target="_blank" rel="noopener noreferrer">Inspect original source</a>
        </div>
        <div><span>Variant #{{question.right.variantId}} · {{question.right.finding}}</span>
         <p>{{question.right.sourceTitle}}</p>
         <p>{{question.right.method}} · {{question.right.endpointCode}} · {{question.right.sourceLocator}}</p>
         <p>Study {{question.right.studyFamilyId}} · claim {{question.right.claimId}}</p>
         <a :href="question.right.sourceUrl" target="_blank" rel="noopener noreferrer">Inspect original source</a>
        </div>
       </div>
      </article>
     </div>
    </section>
    <RouterLink :to="{path:'/variants/'+compare.secondId,query:{from:'/variants/'+compare.firstId}}">
     Open second variant dossier</RouterLink>
   </div>
  </div>
 </section>
</template>
<style scoped>
.nfq-cross{border-top:1px solid var(--border,#dde7ef);padding:13px 0;margin:8px 0;color:var(--text,#243d5b)}
.nfq-cross-head{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px}
.nfq-cross-head strong{font-size:12px;font-weight:680}
.nfq-cross-head p,.nfq-cross-note{font-size:11px;color:var(--text-muted,#6b839b);line-height:1.55;margin:5px 0}
.nfq-cross-button{font:inherit;font-size:11px;font-weight:600;background:transparent;border:1px solid var(--border,#c7d8e7);border-radius:5px;padding:6px 9px;min-height:31px;color:inherit;cursor:pointer}
.nfq-cross-button:disabled{opacity:.5;cursor:default}
.nfq-cross-input{display:flex;flex-wrap:wrap;align-items:center;gap:7px 12px;margin:12px 0}
.nfq-cross-input label{font-size:11px}
.nfq-cross-input input{border:1px solid var(--border,#c7d8e7);border-radius:5px;background:transparent;color:inherit;padding:6px 9px;font:inherit;font-size:11px;width:160px;max-width:100%;min-height:31px}
.nfq-cross-context{display:flex;flex-wrap:wrap;gap:8px 25px;font-size:11px;margin:12px 0}
.nfq-cross-lines article{padding:11px 0;border-top:1px solid var(--border,#e0e9f0);font-size:11px}
.nfq-cross-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 20px;margin:7px 0}
.nfq-cross-two span{font-size:10px;color:var(--text-muted,#6b839b)}
.nfq-cross-two p{font-size:11px;margin:4px 0;line-height:1.5}
.nfq-cross-mechanisms{border-top:1px solid var(--border,#dde7ef);margin:14px 0;padding-top:12px}
.nfq-cross-source-list article{border-top:1px solid var(--border,#dde7ef);padding:10px 0;overflow-wrap:anywhere}
.nfq-cross-source-list article>strong{font-size:11px}
.nfq-cross-source-list article>span{font-size:10px;color:var(--text-muted,#6b839b)}
.nfq-cross-source-list article>p{font-size:11px;line-height:1.5}
.nfq-cross-questions{font-size:11px;margin:12px 0}
.nfq-cross-questions li{line-height:1.5;margin:7px 0}
.nfq-cross a{font-size:11px;color:var(--link,#2869a9);text-underline-offset:3px}
.nfq-cross button:focus-visible,.nfq-cross a:focus-visible,.nfq-cross input:focus-visible{outline:2px solid #3876c5;outline-offset:2px}
@media(max-width:520px){.nfq-cross-two{grid-template-columns:1fr}}
</style>

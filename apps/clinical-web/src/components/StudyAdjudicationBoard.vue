<script setup lang="ts">
import {computed,ref,watch} from 'vue';
import {researcherRole} from '../services/researchRole';
import {authSessionProvider} from '../services/authSession';
import {readConfigFromEnvironment} from '../services/liveVariants';
import {createStudyAdjudicationsService,validProposal,validReviewNote} from '../services/studyAdjudications';
import {
 evaluateStudyAdjudications,pairKey,type StudyAdjudication,
 type PairAdjudicationCandidate,type AdjudicationDisposition
} from '../domain/studyAdjudication';
import type {ApprovedDatasetSnapshot} from '../services/approvedResearchDataset';

const props=defineProps<{
 snapshot:ApprovedDatasetSnapshot;
 adjudications:readonly StudyAdjudication[]|null;
 state:'loading'|'ready'|'failed';
}>();
const emit=defineEmits<{changed:[]}>();
const config=readConfigFromEnvironment();
const service=config&&authSessionProvider?createStudyAdjudicationsService(config,authSessionProvider):null;
const open=ref(false);
const editingPair=ref('');
const disposition=ref<AdjudicationDisposition>('same-study');
const rationale=ref('');
const locator=ref('');
const reviewingId=ref('');
const reviewNote=ref('');
const busy=ref(false);
const notice=ref('');
const canContribute=computed(()=>researcherRole.phase==='verified'&&
 ['contributor','reviewer','administrator'].includes(researcherRole.role??''));
const canReview=computed(()=>researcherRole.phase==='verified'&&
 ['reviewer','administrator'].includes(researcherRole.role??''));
const audit=computed(()=>props.adjudications===null?null:
 evaluateStudyAdjudications(props.snapshot,props.adjudications));
const candidateRows=computed(()=>audit.value?.candidates.slice(0,40)??[]);
const pendingDecisions=computed(()=>props.adjudications?.filter(x=>x.status==='pending')??[]);
const selected=computed(()=>audit.value?.candidates.find(x=>
 pairKey(x.claimA,x.claimB)===editingPair.value)??null);
const submitEnabled=computed(()=>!!service&&canContribute.value&&!busy.value&&
 props.state==='ready'&&selected.value!==null&&
 selected.value.status!=='pending'&&
 validProposal(selected.value.claimA,selected.value.claimB,disposition.value,
  rationale.value,locator.value));
const liveClaim=(id:string)=>props.snapshot.records.find(x=>x.claimId===id);
function cancel():void{
 editingPair.value='';rationale.value='';locator.value='';reviewingId.value='';reviewNote.value='';
}
function choose(pair:PairAdjudicationCandidate):void{
 if(pair.status==='pending'||busy.value)return;
 editingPair.value=pairKey(pair.claimA,pair.claimB);
 disposition.value='same-study';rationale.value='';locator.value='';notice.value='';
 reviewingId.value='';reviewNote.value='';
}
async function submit():Promise<void>{
 const pair=selected.value;
 if(!service||!pair||!submitEnabled.value)return;
 busy.value=true;notice.value='';
 try{
  await service.propose(pair.claimA,pair.claimB,disposition.value,
   rationale.value,locator.value,pair.revision);
  cancel();
  notice.value='Proposed only. The study decision remains unaccepted until two independent scientific reviews.';
  emit('changed');
 }catch(e){notice.value=e instanceof Error?e.message:'Adjudication proposal could not be submitted';}
 finally{busy.value=false;}
}
async function review(entry:StudyAdjudication,decision:'approve'|'reject'):Promise<void>{
 if(!service||!entry.canReview||!canReview.value||!validReviewNote(reviewNote.value)||
  busy.value||props.state!=='ready')return;
 busy.value=true;notice.value='';
 try{
  await service.review(entry.id,decision,reviewNote.value,entry.revision);
  cancel();
  notice.value='Independent scientific review recorded. Acceptance requires two distinct reviewer approvals.';
  emit('changed');
 }catch(e){notice.value=e instanceof Error?e.message:'Independent review could not be recorded';}
 finally{busy.value=false;}
}
watch(()=>[props.snapshot.snapshotSha256,props.adjudications] as const,()=>cancel());
</script>
<template>
 <section class="nfq-adj" data-testid="nfq-study-adjudication">
  <header class="nfq-adj-head">
   <div>
    <h3>Study identity adjudication</h3>
    <p>Publication overlap · original sources · two independent scientific reviews</p>
   </div>
   <button type="button" :aria-expanded="open" data-testid="nfq-adj-toggle"
    @click="open=!open">{{open?'Close review':'Inspect study overlap'}}</button>
  </header>
  <div v-if="open" class="nfq-adj-body">
   <p v-if="state==='loading'" role="status">Checking the current approved study-adjudication register…</p>
   <div v-else-if="state==='failed'||adjudications===null" role="status">
    <strong>Adjudication verification unavailable.</strong>
    <p>The analysis protocol must not interpret these sources as independently adjudicated.</p>
    <button type="button" @click="emit('changed')">Retry verification</button>
   </div>
   <template v-else-if="audit">
    <div class="nfq-adj-stats">
     <span><strong>{{audit.candidateCount}}</strong> potential overlap pairs</span>
     <span><strong>{{audit.approvedSameStudy}}</strong> reviewed same-study links</span>
     <span><strong>{{audit.unresolvedCount}}</strong> unresolved links</span>
     <span><strong>{{audit.pendingCount}}</strong> pending review</span>
     <span v-if="audit.sourceRegistrationConflicts">
      <strong>{{audit.sourceRegistrationConflicts}}</strong> registration conflict groups</span>
    </div>
    <p v-if="!audit.candidateCount&&!pendingDecisions.length" data-testid="nfq-adj-empty">
     No source-pair overlap candidates or pending adjudications exist in the
     currently approved research dataset. This does not establish study independence.
    </p>
    <p v-if="audit.truncated" class="nfq-adj-warning" role="status">
     Candidate inventory is truncated. No analysis split may be certified from this incomplete view.
    </p>
    <div v-if="audit.candidateCount" data-testid="nfq-adj-candidates">
     <div v-for="candidate in candidateRows" :key="pairKey(candidate.claimA,candidate.claimB)"
      class="nfq-adj-item">
      <div class="nfq-adj-item-head">
       <strong>Reference #{{candidate.claimAReference}} · Reference #{{candidate.claimBReference}}</strong>
       <span>{{candidate.status.replaceAll('-',' ')}}</span>
      </div>
      <p>{{liveClaim(candidate.claimA)?.referenceTitle}} · {{liveClaim(candidate.claimB)?.referenceTitle}}</p>
      <p class="nfq-adj-meta">
       {{candidate.claimAStudyFamily}} / {{candidate.claimBStudyFamily}}
       <template v-if="candidate.registeredConflict"> · Conflicting registry accessions</template>
      </p>
      <p v-if="candidate.approvedDisposition" class="nfq-adj-meta">
       Reviewed decision: {{candidate.approvedDisposition.replaceAll('-',' ')}}.
       <template v-if="candidate.needsFurtherReview">
        Further source reconciliation is required before treating these reports as separate studies.
       </template>
      </p>
      <button v-if="canContribute&&candidate.status!=='pending'" type="button"
       :disabled="busy" data-testid="nfq-adj-propose-trigger" @click="choose(candidate)">
       {{candidate.revision?'Propose new revision':'Propose evidence-based decision'}}
      </button>
     </div>
     <p v-if="audit.candidateCount>candidateRows.length" class="nfq-adj-meta">
      Showing {{candidateRows.length}} of {{audit.candidateCount}} candidate pairs.
      No truncated candidate view is treated as complete.
     </p>
    </div>
    <form v-if="selected&&canContribute" class="nfq-adj-form"
     data-testid="nfq-adj-proposal" @submit.prevent="submit">
     <strong>Propose source-based relationship · revision {{selected.revision+1}}</strong>
     <label>Scientific decision
      <select v-model="disposition" data-testid="nfq-adj-disposition">
       <option value="same-study">Same underlying study or cohort</option>
       <option value="distinct-studies">Separate underlying studies (must reconcile labels)</option>
       <option value="insufficient-evidence">Insufficient evidence to decide</option>
      </select>
     </label>
     <label>Exact source location
      <input v-model.trim="locator" maxlength="240" data-testid="nfq-adj-locator"
       placeholder="Both papers · methods, trial registration or supplement"/>
     </label>
     <label>Rationale for the relationship
      <textarea v-model.trim="rationale" maxlength="900" rows="3"
       data-testid="nfq-adj-rationale"
       placeholder="Explain which published study identifiers and cohort descriptions support this decision."/>
     </label>
     <div class="nfq-adj-actions">
      <button type="submit" data-testid="nfq-adj-submit" :disabled="!submitEnabled">
       Submit for two reviews</button>
      <button type="button" @click="cancel">Cancel</button>
     </div>
     <p class="nfq-adj-meta">Proposing cannot approve your own decision. Evidence and accepted source records remain unchanged.</p>
    </form>
    <section v-if="pendingDecisions.length" class="nfq-adj-pending" data-testid="nfq-adj-pending">
     <h4>Independent scientific review</h4>
     <div v-for="record in pendingDecisions" :key="record.id" class="nfq-adj-item">
      <div class="nfq-adj-item-head">
       <strong>{{record.disposition.replaceAll('-',' ')}}</strong>
       <span>{{record.reviewCount}} / 2 approvals</span>
      </div>
      <p>Reference #{{liveClaim(record.claimA)?.referenceId}} ·
       Reference #{{liveClaim(record.claimB)?.referenceId}} · revision {{record.revision}}</p>
      <p>{{record.rationale}}</p>
      <p class="nfq-adj-meta">{{record.evidenceLocator}}</p>
      <button v-if="canReview&&record.canReview&&reviewingId!==record.id"
       type="button" data-testid="nfq-adj-review-trigger"
       @click="reviewingId=record.id;reviewNote='';editingPair=''">Review this relationship</button>
      <p v-else-if="record.submittedByMe" class="nfq-adj-meta">Your own proposal requires two other reviewers.</p>
      <div v-else-if="!record.canReview" class="nfq-adj-meta">Independent review is already recorded or not permitted for this account.</div>
      <div v-if="canReview&&record.canReview&&reviewingId===record.id"
       class="nfq-adj-review" data-testid="nfq-adj-review-form">
       <label>Independent reviewer note
        <textarea v-model.trim="reviewNote" maxlength="500" rows="2"
         data-testid="nfq-adj-review-note"
         placeholder="Record the source evidence supporting your independent decision."/>
       </label>
       <div class="nfq-adj-actions">
        <button type="button" data-testid="nfq-adj-review-approve"
         :disabled="busy||!validReviewNote(reviewNote)"
         @click="review(record,'approve')">Approve</button>
        <button type="button" :disabled="busy||!validReviewNote(reviewNote)"
         @click="review(record,'reject')">Reject</button>
        <button type="button" @click="cancel">Cancel</button>
       </div>
      </div>
     </div>
    </section>
    <p v-if="notice" role="status" class="nfq-adj-note">{{notice}}</p>
    <p class="nfq-adj-note">
     Accepted same-study decisions confirm a source-linked relationship only.
     Distinct-study and unresolved decisions require curator reconciliation; no
     outcome model, treatment advice or independent validation is inferred.
    </p>
   </template>
  </div>
 </section>
</template>
<style scoped>
.nfq-adj{border-top:1px solid var(--border,#dfe8ef);padding:12px 0;margin:5px 0 13px;color:var(--text,#233f5d);min-width:0}
.nfq-adj-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
.nfq-adj-head h3{margin:0;font-size:12px;letter-spacing:-.01em;font-weight:670}
.nfq-adj-head p,.nfq-adj-note,.nfq-adj-meta{font-size:11px;line-height:1.55;color:var(--text-muted,#687f97);margin:4px 0}
.nfq-adj button{border:1px solid var(--border,#cbd9e8);color:inherit;background:transparent;border-radius:5px;font-size:11px;padding:6px 9px;min-height:31px;cursor:pointer}
.nfq-adj button:disabled{opacity:.45;cursor:not-allowed}
.nfq-adj button:focus-visible,.nfq-adj input:focus-visible,.nfq-adj select:focus-visible,.nfq-adj textarea:focus-visible{outline:2px solid #3475cc;outline-offset:2px}
.nfq-adj-body{font-size:11px;line-height:1.5;padding-top:9px}
.nfq-adj-stats{display:flex;gap:6px 15px;flex-wrap:wrap;margin:4px 0 10px;color:var(--text-muted,#647f98)}
.nfq-adj-stats strong{color:var(--text,#274967);font-size:12px}
.nfq-adj-item{border-top:1px solid var(--border,#dde7ef);padding:9px 0}
.nfq-adj-item p{margin:4px 0;overflow-wrap:anywhere}
.nfq-adj-item-head{display:flex;justify-content:space-between;flex-wrap:wrap;gap:7px}
.nfq-adj-item-head span{font-size:11px;color:var(--text-muted,#617f99)}
.nfq-adj-form,.nfq-adj-review{padding:10px 0;display:grid;gap:8px;max-width:700px}
.nfq-adj-form{margin-top:8px;border-top:1px solid var(--border,#dce7f0)}
.nfq-adj label{font-size:11px;color:var(--text-muted,#657d93);display:grid;gap:5px}
.nfq-adj select,.nfq-adj textarea,.nfq-adj input{box-sizing:border-box;width:100%;font:inherit;font-size:12px;border:1px solid var(--border,#cbd9e8);border-radius:5px;background:var(--surface,#fff);color:var(--text,#23415e);padding:8px;min-width:0}
.nfq-adj textarea{resize:vertical}
.nfq-adj-actions{display:flex;gap:7px;flex-wrap:wrap}
.nfq-adj-pending{margin:11px 0}
.nfq-adj-pending h4{margin:6px 0;font-size:12px}
.nfq-adj-warning{color:#986a39}
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-adj select,
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-adj textarea,
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-adj input{background:#12243a;color:#e8f0ff;border-color:#476281}
</style>

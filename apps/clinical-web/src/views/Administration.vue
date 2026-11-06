<script setup lang="ts">
import {computed,ref,watch,onUnmounted} from 'vue';
import {RouterLink,useRoute} from 'vue-router';
import ContextHelp from '../components/ContextHelp.vue';
import {authController} from '../services/authSession';
import {researcherRole,refreshResearcherRole} from '../services/researchRole';
import {safeResearchReturnPath} from '../domain/researchJourney';
import {readConfigFromEnvironment} from '../services/liveVariants';
import {canReadSourceReviewQueue,createSourceReviewQueue,type SourceCorrectionReviewItem} from '../services/sourceCorrectionReviewQueue';
import {canDecideSourceCorrection,createSourceCorrectionDecisionClient,type SourceCorrectionDecision} from '../services/sourceCorrectionDecision';

const route=useRoute();
const signedIn=computed(()=>authController?.state.phase==='signed-in');
const phase=computed(()=>authController?.state.phase||'unavailable');
const identity=computed(()=>signedIn.value?authController?.state.email||'Authenticated account':'No research account signed in');
const returnToVariant=computed(()=>safeResearchReturnPath(route.query.from,'variant'));
const roleAssignment=computed(()=>signedIn.value&&researcherRole.phase==='verified'?researcherRole.role:null);
const roleLabel=computed(()=>{
 if(!signedIn.value||researcherRole.phase==='unavailable')return 'Not verifiable';
 if(researcherRole.phase==='checking')return 'Checking…';
 if(researcherRole.phase==='unassigned')return 'No assignment';
 if(roleAssignment.value==='administrator')return 'Administrator';
 if(roleAssignment.value==='reviewer')return 'Scientific reviewer';
 if(roleAssignment.value==='contributor')return 'Research contributor';
 return 'Not verifiable';
});
const queueEnabled=import.meta.env.VITE_NFQ_SOURCE_REVIEW_QUEUE_ENABLED==='true';
const queueConfig=readConfigFromEnvironment();
const queueSource=queueEnabled&&queueConfig&&authController?createSourceReviewQueue(queueConfig,authController):null;
const queueAllowed=computed(()=>Boolean(queueSource)&&canReadSourceReviewQueue(
 queueEnabled,authController?.state.phase??'signed-out',researcherRole
));
const decisionEnabled=import.meta.env.VITE_NFQ_SOURCE_REVIEW_DECISIONS_ENABLED==='true';
const decisionClient=decisionEnabled&&queueEnabled&&queueConfig&&authController
 ?createSourceCorrectionDecisionClient(queueConfig,authController):null;
const decisionAllowed=computed(()=>Boolean(decisionClient)&&queueAllowed.value&&
 canDecideSourceCorrection(decisionEnabled,authController?.state.phase??'signed-out',researcherRole));
const decisionNotes=ref<Record<string,string>>({});
const decisionTypes=ref<Record<string,SourceCorrectionDecision>>({});
const pendingDecision=ref<string|null>(null);
const decisionNotice=ref('');
const uncertainDecision=ref(false);
let decisionSequence=0;
function canReviewItem(item:SourceCorrectionReviewItem):boolean{
 const account=authController?.state.userId;
 return decisionAllowed.value&&!pendingDecision.value&&!uncertainDecision.value&&Boolean(account)
  &&item.createdBy.toLowerCase()!==account?.toLowerCase();
}
async function decideSourceCorrection(item:SourceCorrectionReviewItem):Promise<void>{
 if(!decisionClient||!canReviewItem(item))return;
 const choice=decisionTypes.value[item.id];
 const note=decisionNotes.value[item.id]??'';
 if((choice!=='accepted'&&choice!=='rejected')||note.trim().length<15||note.trim().length>900){
  decisionNotice.value='Select a decision and enter a rationale of 15–900 characters.';
  return;
 }
 const run=++decisionSequence;
 pendingDecision.value=item.id;decisionNotice.value='';
 try{
  await decisionClient.decide(item,choice,note);
  if(run!==decisionSequence)return;
  // A successful RPC records a review only: evidence_links remains unchanged.
  decisionNotice.value='Decision recorded. The published reference has not changed.';
  decisionNotes.value={};decisionTypes.value={};
  clearReviewQueue();
 }catch(error){
  if(run!==decisionSequence)return;
  // No automatic retry after a possibly committed POST.
  uncertainDecision.value=true;
  decisionNotice.value=error instanceof Error?error.message:'Review was not confirmed. Reload the queue.';
 }finally{
  if(run===decisionSequence)pendingDecision.value=null;
 }
}
function refreshSourceReviewQueue():void{
 if(pendingDecision.value)return;
 uncertainDecision.value=false;decisionNotice.value='';
 void loadSourceReviews();
}

const reviewItems=ref<readonly SourceCorrectionReviewItem[]>([]);
const queuePhase=ref<'idle'|'loading'|'ready'|'error'>('idle');
const queueNotice=ref('');
let queueGeneration=0;
let queueAbort:AbortController|null=null;
function clearReviewQueue():void{
 ++queueGeneration;queueAbort?.abort();queueAbort=null;
 reviewItems.value=[];queuePhase.value='idle';queueNotice.value='';
}
async function loadSourceReviews():Promise<void>{
 clearReviewQueue();
 if(!queueSource||!queueAllowed.value)return;
 const run=queueGeneration;
 const abort=new AbortController();queueAbort=abort;queuePhase.value='loading';
 try{
  const records=await queueSource.list(abort.signal);
  if(run!==queueGeneration||abort.signal.aborted||!queueAllowed.value)return;
  reviewItems.value=records;queuePhase.value='ready';
 }catch{
  if(run!==queueGeneration||abort.signal.aborted)return;
  reviewItems.value=[];queuePhase.value='error';
  queueNotice.value='Review data could not be verified. No records are displayed.';
 }
}
watch(()=>[authController?.state.phase,authController?.state.userId,researcherRole.phase,researcherRole.role],()=>{
 ++decisionSequence;pendingDecision.value=null;uncertainDecision.value=false;
 decisionNotes.value={};decisionTypes.value={};decisionNotice.value='';
 clearReviewQueue();
});
onUnmounted(clearReviewQueue);
const reviewerStatus=computed(()=>roleAssignment.value==='reviewer'?'Verified assignment':'Not verified');
const adminStatus=computed(()=>roleAssignment.value==='administrator'?'Verified assignment':'Not verified');

</script>
<template>
 <div class="page research-admin">
  <header class="admin-head">
   <h1>Research administration</h1>
   <ContextHelp label="About research administration" title="Research administration">
    <p>This workspace reports authenticated research-session state and the permissions that can be verified. Signing in does not grant scientific or administrative authority.</p>
    <p>Contribution, review and administrative actions require independently verified assignments and an attributable audit trail. No management writes are enabled by default. Research actions require explicit activation and independent server authorization.</p>
   </ContextHelp>
  </header>
  <nav v-if="returnToVariant" class="nfq-research-trail admin-trail" aria-label="Research return path">
   <RouterLink :to="returnToVariant" data-testid="admin-context-return">← Return to variant dossier</RouterLink>
  </nav>
  <section class="research-entry" aria-labelledby="admin-access-heading">
   <div class="research-entry-main">
    <div class="admin-section-heading">
     <h2 id="admin-access-heading">{{signedIn?'Research account signed in':'Research staff access'}}</h2>
    </div>
    <p class="admin-identity">{{identity}}</p>
    <details v-if="signedIn&&authController?.state.userId" class="admin-account-disclosure" data-testid="admin-account-disclosure">
     <summary>Research account ID</summary>
     <div class="admin-account-detail">
      <code data-testid="admin-account-id">{{authController.state.userId}}</code>
      <ContextHelp label="About account ID" title="Account identity">
       <p>This is the signed-in account identifier, not an administrator assignment or proof of ownership. Initial administrator setup requires independent identity verification and a recorded privileged procedure.</p>
      </ContextHelp>
     </div>
    </details>
    <p v-if="phase==='checking'" role="status" class="admin-session-state">Checking the existing session…</p>
    <p v-else-if="phase==='error'" role="alert" class="admin-session-state">Authentication could not be confirmed. Editing remains unavailable.</p>
    <p v-else-if="!signedIn&&authController" class="admin-session-state">Sign in to identify your research account.</p>
    <p v-else-if="!signedIn" class="admin-session-state">Staff authentication is not configured here. No management operations are available.</p>
    <p v-else class="admin-session-state">Account identity confirmed. Editing and approvals remain separate server-authorized operations.</p>
    <div class="admin-session-actions">
     <RouterLink v-if="!signedIn&&authController" class="research-entry-link" to="/sign-in">Sign in <span aria-hidden="true">→</span></RouterLink>
     <RouterLink v-else class="research-entry-link" to="/variants">Explore public variants <span aria-hidden="true">→</span></RouterLink>
    </div>
   </div>
   <aside class="research-entry-aside" aria-label="Administration availability">
    <div class="admin-section-heading">
     <h2>Access verification</h2>
     <ContextHelp label="About role verification" title="Research permissions">
      <p>A valid session identifies an account. A recorded researcher role is shown only when the research role service verifies it.</p>
      <p>Contributor, reviewer and administrator assignments are displayed only after database verification against the signed-in account. A role alone cannot enable editing without protected write endpoints.</p>
     </ContextHelp>
    </div>
    <dl class="research-capabilities">
     <div><dt>Identity</dt><dd>{{signedIn?'Session present':'Not authenticated'}}</dd></div>
     <div><dt>Research membership</dt><dd data-testid="admin-membership-status">{{roleLabel}}</dd></div>
     <div><dt>Scientific reviewer role</dt><dd>{{reviewerStatus}}</dd></div>
     <div><dt>Administrator role</dt><dd data-testid="admin-role-status">{{adminStatus}}</dd></div>
     <div><dt>Database editing</dt><dd>Not connected</dd></div>
    </dl>
    <div class="admin-role-actions">
     <p v-if="signedIn&&researcherRole.phase==='unavailable'" role="alert">{{researcherRole.message||'Role verification unavailable. No operations will be enabled.'}}</p>
     <button v-if="signedIn" type="button" class="admin-role-refresh" :disabled="researcherRole.phase==='checking'" @click="refreshResearcherRole">Recheck role</button>
    </div>
   </aside>
  </section>
  <section class="admin-readiness" aria-label="Research operations readiness">
   <div class="admin-section-heading">
    <h2>Scientific operations</h2>
    <ContextHelp label="About scientific operations availability" title="Scientific operations">
     <p>The capabilities below are reserved until the corresponding server-enforced role, provenance and audit requirements have been verified.</p>
     <p>No client-side login or displayed status activates an operation.</p>
    </ContextHelp>
   </div>
   <ul class="admin-operations-list">
    <li>
     <div class="admin-operation-name"><h3>Propose evidence</h3><ContextHelp label="About evidence proposals" title="Evidence contributions"><p>Contribution submission requires a verified contributor assignment and an attributable, auditable draft.</p></ContextHelp></div>
     <span class="admin-operation-status">Not enabled</span>
    </li>
    <li>
     <div class="admin-operation-name"><h3>Review and validate</h3><ContextHelp label="About scientific review" title="Scientific review"><p>Scientific review requires independently verified reviewer authority, traceable evidence and controlled decisions.</p></ContextHelp></div>
     <span class="admin-operation-status">{{decisionAllowed?'Review decisions available':'Not enabled'}}</span>
    </li>
    <li>
     <div class="admin-operation-name"><h3>Research governance</h3><ContextHelp label="About research governance" title="Research governance"><p>Role assignment and audit administration require verified administrator authority and server-side enforcement.</p></ContextHelp></div>
     <span class="admin-operation-status">Not enabled</span>
    </li>
   </ul>
  </section>
  <section v-if="queueEnabled" class="admin-readiness source-review-readiness" aria-label="Source correction review">
   <div class="admin-section-heading">
    <h2>Source correction review</h2>
    <ContextHelp label="About source correction review" title="Source correction review">
     <p>Submitted changes are separate from published references. A recorded decision does not automatically change evidence or clinical classifications.</p>
     <p>The queue requires verified reviewer or administrator membership. Review decisions require a separate server-authorized operation and cannot be made by the proposal author.</p>
    </ContextHelp>
   </div>
   <p v-if="!queueAllowed" class="admin-session-state">Reviewer access and the authorised review connection must be verified.</p>
   <template v-else>
    <button type="button" class="admin-role-refresh" :disabled="queuePhase==='loading'||Boolean(pendingDecision)" @click="refreshSourceReviewQueue">{{queuePhase==='loading'?'Checking…':'Load pending proposals'}}</button>
    <p v-if="decisionNotice" role="status" class="admin-session-state">{{decisionNotice}}</p>
    <p v-if="queueNotice" role="status" class="admin-session-state">{{queueNotice}}</p>
    <p v-else-if="queuePhase==='ready'&&!reviewItems.length" role="status" class="admin-session-state">No submitted source corrections were returned.</p>
    <div v-if="queuePhase==='ready'&&reviewItems.length" class="source-review-list" aria-label="Pending source corrections">
     <article v-for="item in reviewItems" :key="item.id" class="source-review-item">
      <div><strong>Proposal {{item.id}}</strong><span> · Evidence #{{item.referenceId}}</span></div>
      <p>Field: {{item.field}} · Variant #{{item.variantId}}</p>
      <p>Recorded: {{item.recordedValue??'Not recorded'}}</p>
      <p>Proposed: {{item.proposedValue}}</p>
      <p>Rationale: {{item.rationale}}</p>
      <template v-if="decisionAllowed">
       <p v-if="item.createdBy.toLowerCase()===authController?.state.userId?.toLowerCase()" class="admin-session-state">A different scientific reviewer must assess this proposal.</p>
       <div v-else class="source-review-decision" :aria-label="'Decision for proposal '+item.id">
        <label :for="'nfq-source-decision-'+item.id">Review decision</label>
        <select :id="'nfq-source-decision-'+item.id" v-model="decisionTypes[item.id]" :disabled="!canReviewItem(item)">
         <option disabled value="">Choose a decision</option>
         <option value="accepted">Accept proposal for review record</option>
         <option value="rejected">Reject proposal</option>
        </select>
        <label :for="'nfq-source-rationale-'+item.id">Independent review rationale</label>
        <textarea :id="'nfq-source-rationale-'+item.id" v-model="decisionNotes[item.id]"
         rows="3" maxlength="900" :disabled="!canReviewItem(item)" placeholder="Document the underlying scientific evidence; do not include patient details." />
        <button type="button" class="admin-role-refresh"
         :disabled="!canReviewItem(item)" @click="decideSourceCorrection(item)">
         {{pendingDecision===item.id?'Recording…':'Record review decision'}}
        </button>
       </div>
      </template>
      <p v-else class="admin-session-state">Awaiting independent scientific review. Review decisions are not enabled.</p>
     </article>
    </div>
   </template>
  </section>
 </div>
</template>
<style scoped>
.research-admin{max-width:1160px;min-width:0;margin:0 auto;padding-bottom:36px;color:#292f33}
.admin-head{display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid #dce1de;padding:0 0 13px;margin:0 0 17px}
.admin-head h1{margin:0;font-size:clamp(26px,2.8vw,36px);font-weight:740;line-height:1.15;letter-spacing:-.035em;color:#292f33}
.admin-head :deep(.nfq-context-help summary){width:34px;height:34px}
.admin-trail{margin-top:-6px;margin-bottom:14px;padding:3px 0 9px}
.research-entry{display:grid;grid-template-columns:minmax(0,1fr) minmax(310px,.92fr);gap:clamp(25px,3.8vw,54px);align-items:start;margin:0;padding:6px 0 21px;border:0;border-bottom:1px solid #dce1de}
.research-entry-main{min-width:0}
.admin-section-heading{display:flex;align-items:center;justify-content:space-between;gap:10px 17px;min-width:0;margin:0 0 13px}
.admin-section-heading h2{margin:0;font-size:clamp(17px,1.6vw,21px);font-weight:710;line-height:1.3;letter-spacing:-.025em;color:#292f33}
.admin-section-heading :deep(.nfq-context-help summary){width:30px;height:30px}
.research-entry-main .admin-identity{font-size:14px;font-weight:600;color:#3b515c;line-height:1.5;max-width:none;overflow-wrap:anywhere;margin:0 0 8px}
.research-entry-main .admin-session-state{font-size:12px;color:#607078;line-height:1.6;max-width:52ch;margin:0}
.admin-session-actions{margin:17px 0 0}
.research-entry-link{min-height:40px;display:inline-flex;align-items:center;gap:9px;border:1px solid #cdd9d9;border-radius:4px;background:#fff;padding:8px 13px;color:#245f66;font-weight:680;font-size:12px;line-height:1.4;text-decoration:none;margin:0}
.research-entry-link:hover{background:#edf3f3;color:#19575d}
.research-entry-link:focus-visible,.admin-role-refresh:focus-visible{outline:2px solid #197b82;outline-offset:3px}
.research-entry-aside{border:0;padding:0;min-width:0}
.research-capabilities{margin:1px 0 0;display:grid;gap:0}
.research-capabilities>div{display:flex;justify-content:space-between;align-items:baseline;gap:12px 16px;padding:8px 0;border:0;min-width:0}
.research-capabilities dt{font-size:12px;line-height:1.4;color:#65717a}
.research-capabilities dd{font-size:12px;font-weight:670;line-height:1.4;color:#35444d;text-align:right;margin:0;overflow-wrap:anywhere}
.admin-role-actions{margin:8px 0 0;display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.admin-role-actions p{font-size:12px;line-height:1.5;color:#9b523d;margin:0}
.admin-role-refresh{min-height:40px;border:1px solid #ccd9d9;border-radius:4px;background:#fff;color:#245f66;font:inherit;font-size:12px;font-weight:680;padding:8px 13px;cursor:pointer}
.admin-role-refresh:hover{background:#edf3f3}
.admin-role-refresh:disabled{opacity:.55;cursor:wait}
.admin-readiness{margin:0;padding:20px 0 0;border:0}
.admin-readiness .admin-section-heading{margin-bottom:8px}
.admin-operations-list{display:grid;list-style:none;gap:0;margin:0;padding:0}
.admin-operations-list li{display:flex;align-items:center;justify-content:space-between;gap:10px 18px;min-width:0;padding:10px 0;border:0}
.admin-operation-name{display:flex;align-items:center;gap:10px;min-width:0}
.admin-operation-name h3{font-size:13px;font-weight:680;line-height:1.4;letter-spacing:-.01em;color:#35444d;margin:0}
.admin-operation-name :deep(.nfq-context-help summary){width:28px;height:28px}
.admin-operation-status{flex:none;color:#65717a;font-size:11px;font-weight:670;line-height:1.4;white-space:nowrap}
@media(max-width:800px){
 .research-entry{grid-template-columns:minmax(0,1fr);gap:18px;padding-bottom:20px}
 .research-entry-aside{padding:17px 0 0;border-top:1px solid #dce1de}
 .admin-readiness{padding-top:17px}
}
@media(max-width:460px){
 .research-admin{padding-bottom:24px}
 .admin-head{padding-bottom:11px;margin-bottom:13px}
 .research-entry{padding-top:3px}
 .admin-section-heading{margin-bottom:10px}
 .research-capabilities>div{gap:8px}
 .research-capabilities dt{flex:0 1 53%}
 .research-capabilities dd{flex:1}
 .admin-operations-list li{gap:6px 12px;padding:10px 0}
 .admin-operation-name{gap:6px}
}
.source-review-list{margin-top:12px}
.source-review-item{padding:13px 0;border-bottom:1px solid #dce1de;font-size:12px;line-height:1.5;overflow-wrap:anywhere}
.source-review-item p{margin:5px 0;color:#53636c}
.source-review-item strong{font-size:13px;color:#2c3a43}
.source-review-decision{display:grid;gap:7px;max-width:570px;margin:11px 0 3px}
.source-review-decision label{font-size:12px;font-weight:650;color:#35444d}
.source-review-decision select,.source-review-decision textarea{width:100%;min-width:0;padding:9px;border:1px solid #cdd9d9;border-radius:4px;background:#fff;color:#35444d;font:inherit;font-size:12px}
.source-review-decision button{justify-self:start}
.source-review-decision :focus-visible{outline:2px solid #197b82;outline-offset:2px}
.admin-account-disclosure{margin:5px 0 9px;max-width:100%;font-size:12px;color:#53636c}
.admin-account-disclosure summary{display:list-item;width:max-content;max-width:100%;cursor:pointer;font-size:12px;font-weight:620;color:#245f66}
.admin-account-detail{display:flex;align-items:center;gap:6px 10px;flex-wrap:wrap;padding:6px 0 2px}
.admin-account-detail code{font:inherit;font-size:11px;overflow-wrap:anywhere;user-select:text}
.admin-account-detail :deep(.nfq-context-help summary){width:27px;height:27px}
</style>

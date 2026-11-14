<script setup lang="ts">
import {computed,onUnmounted,ref,watch} from 'vue';
import {RouterLink} from 'vue-router';
import ContextHelp from '../components/ContextHelp.vue';
import {authController} from '../services/authSession';
import {researcherRole,refreshResearcherRole} from '../services/researchRole';
import {readConfigFromEnvironment} from '../services/liveVariants';
import {canReadSourceReviewQueue,createSourceReviewQueue,
 type SourceCorrectionReviewItem} from '../services/sourceCorrectionReviewQueue';
import {deriveGovernanceReadiness} from '../domain/governanceReadiness';

const config=readConfigFromEnvironment();
const signedIn=computed(()=>authController?.state.phase==='signed-in');
const readiness=computed(()=>deriveGovernanceReadiness(signedIn.value,researcherRole,Boolean(config)));
const roleStatus=computed(()=>{
 if(!signedIn.value)return 'Public research · Sign-in required';
 if(researcherRole.phase==='checking')return 'Verifying membership';
 if(researcherRole.phase==='unavailable')return 'Membership unavailable';
 if(researcherRole.phase==='unassigned')return 'No active research role assigned';
 return readiness.value.verified?'Active assignment · '+readiness.value.verifiedRole:'No verified assignment';
});
const accessModes=[
 {key:'researchContribution',name:'Research contribution',description:'Record-backed investigation and permitted scientific submissions',path:'/evidence',link:'Evidence workspace'},
 {key:'sourceReview',name:'Source correction review',description:'Independently authorized review of submitted source corrections',path:'/admin',link:'Review controls'},
 {key:'membership',name:'Membership governance',description:'Account roles and invitations, protected by server-side authorization',path:'/admin',link:'Access administration'}
] as const;
const proposals=ref<readonly SourceCorrectionReviewItem[]>([]);
const reviewPhase=ref<'not-verified'|'loading'|'ready'|'empty'|'unavailable'>('not-verified');
const reviewMessage=ref('');
const pendingCount=computed(()=>proposals.value.length);
const sourceReviewClient=config&&authController?createSourceReviewQueue(config,authController):null;
let active:AbortController|null=null;
let epoch=0;
function invalidate(){
 ++epoch;active?.abort();active=null;
 proposals.value=[];reviewPhase.value='not-verified';reviewMessage.value='';
}
async function loadSubmitted():Promise<void>{
 invalidate();
 if(!sourceReviewClient||!authController||!canReadSourceReviewQueue(Boolean(config),
  authController.state.phase,researcherRole))return;
 const run=epoch,subject=authController.state.userId;
 const controller=new AbortController();active=controller;reviewPhase.value='loading';
 try{
  const list=await sourceReviewClient.list(controller.signal);
  if(controller.signal.aborted||run!==epoch||subject!==authController.state.userId||
     readiness.value.sourceReview!=='eligible')return;
  proposals.value=list;reviewPhase.value=list.length?'ready':'empty';
 }catch{
  if(controller.signal.aborted||run!==epoch)return;
  proposals.value=[];reviewPhase.value='unavailable';
  reviewMessage.value='The server did not confirm access to a complete review page. No submitted records are displayed.';
 }
}
watch(()=>[authController?.state.phase,authController?.state.userId,researcherRole.phase,researcherRole.role],
 ()=>{void loadSubmitted();},{immediate:true});
onUnmounted(invalidate);
function refreshMembership():void{
 if(authController?.state.phase==='signed-in')void refreshResearcherRole();
}
</script>

<template>
 <div class="page nfq-governance-page nfq-science-ui">
  <header class="nfq-gov-header">
   <div>
    <span class="nfq-gov-kicker">RESEARCH OPERATIONS · GOVERNED ACCESS</span>
    <h1>Governance</h1>
    <p>Research membership, review authority and traceable oversight—without bypassing the existing scientific workflows.</p>
   </div>
   <ContextHelp label="About governance" title="Scope of verified governance">
    <p>Membership must come from a verified database assignment, not a browser badge or a logged-in session alone.</p>
    <p>Eligible means the interface can offer a protected workflow. Only the server can grant actual access to source review or membership changes.</p>
    <p>Submitted source-correction proposals are visible only after a successful, individually authorized read. This is not a global audit or an approval history.</p>
   </ContextHelp>
  </header>
  <section class="nfq-gov-identity" aria-labelledby="nfq-gov-access-title">
   <div>
    <span class="nfq-gov-label">RESEARCH ACCESS</span>
    <h2 id="nfq-gov-access-title">Verified scope</h2>
    <p role="status" data-testid="governance-role-status">{{roleStatus}}</p>
   </div>
   <div class="nfq-gov-identity-actions">
    <button v-if="signedIn" type="button" @click="refreshMembership">Verify again</button>
    <RouterLink :to="signedIn?'/admin':'/sign-in'">{{signedIn?'My research account':'Research sign-in'}} <span aria-hidden="true">→</span></RouterLink>
   </div>
  </section>

  <section class="nfq-gov-access" aria-labelledby="nfq-gov-capabilities-title">
   <div class="nfq-gov-section-heading">
    <div><span class="nfq-gov-label">ACCESS FRAMEWORK</span><h2 id="nfq-gov-capabilities-title">Research authority</h2></div>
    <p>Role checks and server permissions remain separate.</p>
   </div>
   <div class="nfq-gov-capability-list">
    <article v-for="item in accessModes" :key="item.key" class="nfq-gov-capability">
     <div class="nfq-gov-capability-copy"><strong>{{item.name}}</strong><p>{{item.description}}</p></div>
     <div class="nfq-gov-capability-status">
      <span :class="readiness[item.key]==='eligible'?'nfq-gov-eligible':'nfq-gov-locked'">
       {{readiness[item.key]==='eligible'?'Role eligible':'Not verified'}}
      </span>
      <RouterLink :to="item.path">{{item.link}} <span aria-hidden="true">→</span></RouterLink>
     </div>
    </article>
   </div>
   <p class="nfq-gov-quiet-note">Eligibility is not a successful server authorization. Any editing, approval or invitation operation remains independently verified by its own protected endpoint.</p>
  </section>

  <section class="nfq-gov-review" aria-labelledby="nfq-gov-review-title">
   <div class="nfq-gov-section-heading">
    <div><span class="nfq-gov-label">LIVE SOURCE OVERSIGHT</span><h2 id="nfq-gov-review-title">Submitted source corrections</h2></div>
    <button v-if="readiness.sourceReview==='eligible'" type="button" :disabled="reviewPhase==='loading'" @click="loadSubmitted">Refresh records</button>
   </div>
   <p v-if="readiness.sourceReview!=='eligible'" class="nfq-gov-empty" data-testid="governance-review-restricted">
    An active, verified reviewer or administrator assignment is required to request source-review records.
   </p>
   <p v-else-if="reviewPhase==='loading'" class="nfq-gov-empty" role="status">Checking the authorized source-review register…</p>
   <p v-else-if="reviewPhase==='unavailable'" class="nfq-gov-empty" role="alert">{{reviewMessage}}</p>
   <p v-else-if="reviewPhase==='empty'" class="nfq-gov-empty" role="status">The accessible submitted-proposal page returned no pending records.</p>
   <template v-else-if="reviewPhase==='ready'">
    <p class="nfq-gov-summary" role="status">{{pendingCount}} submitted {{pendingCount===1?'record':'records'}} in the retrieved page · read only</p>
    <div class="nfq-gov-proposals">
     <article v-for="item in proposals" :key="item.id" class="nfq-gov-proposal">
      <div><span class="nfq-gov-proposal-ref">PROPOSAL {{item.id}}</span><h3>Source field · {{item.field}}</h3>
       <p>Variant {{item.variantId}} · Reference {{item.referenceId}}</p></div>
      <RouterLink :to="'/variants/'+item.variantId">Open variant <span aria-hidden="true">→</span></RouterLink>
     </article>
    </div>
    <p class="nfq-gov-quiet-note">This lists at most 20 accessible submitted proposals, not necessarily the entire institutional queue. Reviewer identities, notes and proposed free text are not reproduced here.</p>
   </template>
   <div class="nfq-gov-links">
    <RouterLink to="/admin">Open permitted review actions <span aria-hidden="true">→</span></RouterLink>
    <RouterLink to="/helios">Helios scientific review <span aria-hidden="true">→</span></RouterLink>
    <RouterLink to="/reports">Recorded chronology reports <span aria-hidden="true">→</span></RouterLink>
   </div>
  </section>
  <p class="nfq-gov-footer-note">Research governance surface only. This workspace does not publish clinical decisions, assign permissions or produce a signed institutional audit.</p>
 </div>
</template>

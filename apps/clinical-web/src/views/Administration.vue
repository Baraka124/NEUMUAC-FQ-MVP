<script setup lang="ts">
import {computed,ref,watch,onUnmounted} from 'vue';
import {RouterLink,useRoute} from 'vue-router';
import ContextHelp from '../components/ContextHelp.vue';
import ResearchIdentityCard from '../components/ResearchIdentityCard.vue';
import AdminInvitationPanel from '../components/AdminInvitationPanel.vue';
import {authController} from '../services/authSession';
import {researcherRole,refreshResearcherRole} from '../services/researchRole';
import {guestDesignation} from '../services/guestDesignation';
import {resolveWorkspacePersona,workspaceTitle} from '../domain/workspacePersona';
import {safeResearchReturnPath} from '../domain/researchJourney';
import {readConfigFromEnvironment} from '../services/liveVariants';
import {canReadSourceReviewQueue,createSourceReviewQueue,type SourceCorrectionReviewItem} from '../services/sourceCorrectionReviewQueue';
import {canDecideSourceCorrection,createSourceCorrectionDecisionClient,type SourceCorrectionDecision} from '../services/sourceCorrectionDecision';
import {createResearchAccessDiagnostic,type ResearchAccessDiagnostic} from '../services/researchAccessDiagnostic';
import {canManageResearchRoles,createRoleAdministrationClient,type AssignableRole} from '../services/roleAdministration';
import {createResearchAccountDirectory,type ResearchAccountRow} from '../services/researchAccountDirectory';
import {createAdminInvitationClient} from '../services/adminInvitations';
import {createProfessionalProfileClient,type ProfessionalProfile} from '../services/professionalProfile';

const route=useRoute();
const signedIn=computed(()=>authController?.state.phase==='signed-in');
const phase=computed(()=>authController?.state.phase||'unavailable');
const identity=computed(()=>signedIn.value?authController?.state.email||'Authenticated account':'No research account signed in');
const returnToVariant=computed(()=>safeResearchReturnPath(route.query.from,'variant'));
const roleAssignment=computed(()=>signedIn.value&&researcherRole.phase==='verified'?researcherRole.role:null);
const persona=computed(()=>resolveWorkspacePersona(phase.value,researcherRole.phase,researcherRole.role,guestDesignation.phase));
const currentTitle=computed(()=>workspaceTitle(persona.value));
const isAdministrator=computed(()=>roleAssignment.value==='administrator');
const isReviewer=computed(()=>roleAssignment.value==='reviewer');
const isContributor=computed(()=>roleAssignment.value==='contributor');
const accessSectionLabel=computed(()=>isAdministrator.value?'Administration availability':persona.value==='guest'?'Guest access':'Research access');
function openPeopleAccess():void{document.getElementById('nfq-people-access')?.scrollIntoView({behavior:'auto',block:'start'});}

const accessConfig=readConfigFromEnvironment();
const professionalClient=accessConfig&&authController?createProfessionalProfileClient(accessConfig,authController):null;
const professionalProfile=ref<ProfessionalProfile|null>(null);
const professionalPhase=ref<'idle'|'checking'|'ready'|'unlinked'|'unavailable'>('idle');
let professionalEpoch=0;
let professionalAbort:AbortController|null=null;
async function refreshProfessionalProfile(){
 const epoch=++professionalEpoch;
 professionalAbort?.abort();professionalAbort=null;
 professionalProfile.value=null;
 professionalPhase.value='idle';
 if(!professionalClient||authController?.state.phase!=='signed-in'||!authController?.state.userId)return;
 const abort=new AbortController();professionalAbort=abort;professionalPhase.value='checking';
 try{
  const profile=await professionalClient.readOwn(abort.signal);
  if(epoch!==professionalEpoch||abort.signal.aborted)return;
  professionalProfile.value=profile;
  professionalPhase.value=profile?'ready':'unlinked';
 }catch{
  if(epoch!==professionalEpoch||abort.signal.aborted)return;
  professionalPhase.value='unavailable';
 }
}
watch(()=>[authController?.state.phase,authController?.state.userId],()=>{void refreshProfessionalProfile();},{immediate:true});
onUnmounted(()=>{++professionalEpoch;professionalAbort?.abort();professionalProfile.value=null;});

const accessProbe=accessConfig&&authController?createResearchAccessDiagnostic(accessConfig,authController):null;
const probePhase=ref<'idle'|'checking'|'verified'|'unavailable'>('idle');
const probeResult=ref<ResearchAccessDiagnostic|null>(null);
const probeMessage=ref('');
let probeGeneration=0;
let probeController:AbortController|null=null;
function clearAccessProbe():void{
 ++probeGeneration;probeController?.abort();probeController=null;
 probeResult.value=null;probeMessage.value='';probePhase.value='idle';
}
async function runAccessProbe():Promise<void>{
 clearAccessProbe();
 if(!accessProbe||authController?.state.phase!=='signed-in')return;
 const run=probeGeneration;
 const abort=new AbortController();probeController=abort;probePhase.value='checking';
 try{
  const result=await accessProbe.check(abort.signal);
  if(run!==probeGeneration||abort.signal.aborted)return;
  probeResult.value=result;probePhase.value='verified';
  probeMessage.value='Server identity, membership and proposal-read access verified. This does not grant permissions.';
 }catch{
  if(run!==probeGeneration||abort.signal.aborted)return;
  probeResult.value=null;probePhase.value='unavailable';
  probeMessage.value='Server-access verification was not completed. No permissions were changed.';
 }
}
watch(()=>[authController?.state.phase,authController?.state.userId,researcherRole.phase,researcherRole.role],clearAccessProbe);
onUnmounted(clearAccessProbe);

const permissionClient=accessConfig&&authController?createRoleAdministrationClient(accessConfig,authController):null;
const manageRolesAllowed=computed(()=>Boolean(permissionClient)&&canManageResearchRoles(
 authController?.state.phase??'signed-out',researcherRole
));
const rosterClient=accessConfig&&authController?createResearchAccountDirectory(accessConfig,authController):null;
const invitationClient=accessConfig&&authController?createAdminInvitationClient(accessConfig,authController):null;
const accountSearch=ref('');
const rosterRows=ref<ResearchAccountRow[]>([]);
const rosterPhase=ref<'idle'|'loading'|'ready'|'error'>('idle');
const rosterMessage=ref('');
let rosterGeneration=0;
let rosterAbort:AbortController|null=null;
function clearRoster(){
 ++rosterGeneration;rosterAbort?.abort();rosterAbort=null;
 rosterRows.value=[];rosterPhase.value='idle';rosterMessage.value='';
}
async function loadRoster(){
 clearRoster();
 if(!rosterClient||!manageRolesAllowed.value)return;
 const run=rosterGeneration,abort=new AbortController();
 rosterAbort=abort;rosterPhase.value='loading';
 try{
  const rows=await rosterClient.list(accountSearch.value,abort.signal);
  if(run!==rosterGeneration||abort.signal.aborted||!manageRolesAllowed.value)return;
  rosterRows.value=rows;rosterPhase.value='ready';
 }catch{
  if(run!==rosterGeneration||abort.signal.aborted)return;
  rosterPhase.value='error';rosterMessage.value='Account directory is unavailable or not authorised. No account data was displayed.';
 }
}
function selectRosterAccount(item:ResearchAccountRow){
 if(permissionPhase.value!=='idle')return;
 roleEditorOpen.value=true;
 targetAccount.value=item.userId;
 targetRole.value=item.role??'contributor';
 permissionAction.value='assign';permissionConfirmation.value=false;permissionStatus.value='';
}
let rosterSearchTimer:ReturnType<typeof setTimeout>|null=null;
watch(()=>[authController?.state.phase,authController?.state.userId,researcherRole.phase,researcherRole.role],()=>{
 if(rosterSearchTimer!==null){clearTimeout(rosterSearchTimer);rosterSearchTimer=null;}
 clearRoster();
 if(manageRolesAllowed.value)void loadRoster();
},{immediate:true});
watch(accountSearch,()=>{
 if(!manageRolesAllowed.value)return;
 if(rosterSearchTimer!==null)clearTimeout(rosterSearchTimer);
 rosterSearchTimer=setTimeout(()=>{rosterSearchTimer=null;void loadRoster();},320);
});
onUnmounted(()=>{if(rosterSearchTimer!==null)clearTimeout(rosterSearchTimer);clearRoster();});
const roleEditorOpen=ref(false);
const targetAccount=ref('');
const selectedRosterAccount=computed(()=>rosterRows.value.find(x=>x.userId===targetAccount.value)??null);
const targetRole=ref<AssignableRole>('contributor');
const permissionAction=ref<'assign'|'revoke'>('assign');
const permissionConfirmation=ref(false);
const permissionStatus=ref('');
const permissionPhase=ref<'idle'|'saving'|'uncertain'>('idle');
let permissionGeneration=0;
function clearPermissionForm():void{
 ++permissionGeneration;permissionConfirmation.value=false;
 permissionPhase.value='idle';permissionStatus.value='';
 roleEditorOpen.value=false;
 targetAccount.value='';targetRole.value='contributor';permissionAction.value='assign';
}
async function submitPermissionChange():Promise<void>{
 if(!permissionClient||!manageRolesAllowed.value||!permissionConfirmation.value||
  permissionPhase.value!=='idle')return;
 const action=permissionAction.value,target=targetAccount.value.trim();
 const role=targetRole.value,run=++permissionGeneration;
 permissionPhase.value='saving';permissionStatus.value='';
 try{
  await permissionClient.setRole(target,role,action==='revoke');
  if(run!==permissionGeneration)return;
  permissionStatus.value=action==='revoke'?
   'Access revoked. The server recorded the membership change.':
   'Research permission assigned. The server recorded the membership change.';
  permissionConfirmation.value=false;targetAccount.value='';
  roleEditorOpen.value=false;
  permissionPhase.value='idle';
  // Changing another account must not clear the visible confirmation
  // by needlessly restarting the current administrator's role lookup.
  if(target.toLowerCase()===authController?.state.userId?.toLowerCase())void refreshResearcherRole();
  void loadRoster();
 }catch(error){
  if(run!==permissionGeneration)return;
  permissionPhase.value='uncertain';
  permissionStatus.value=error instanceof Error?error.message:'The server could not confirm this change.';
 }
}
function resetPermissionRetry():void{
 permissionPhase.value='idle';permissionConfirmation.value=false;
 permissionStatus.value='Verify the account state in the refreshed directory before submitting another request.';
 void loadRoster();
}
watch(()=>[authController?.state.phase,authController?.state.userId,researcherRole.phase,researcherRole.role],clearPermissionForm);
onUnmounted(clearPermissionForm);

const roleLabel=computed(()=>{
 if(!signedIn.value||researcherRole.phase==='unavailable')return 'Not verifiable';
 if(researcherRole.phase==='checking')return 'Checking…';
 if(researcherRole.phase==='unassigned')return 'No assignment';
 if(roleAssignment.value==='administrator')return 'Administrator';
 if(roleAssignment.value==='reviewer')return 'Scientific reviewer';
 if(roleAssignment.value==='contributor')return 'Research contributor';
 return 'Not verifiable';
});
// This FQ backend was verified against active reviewer RLS and protected review RPCs.
// A literal 'false' remains an emergency presentation-only UI kill switch.
const queueEnabled=import.meta.env.VITE_NFQ_SOURCE_REVIEW_QUEUE_ENABLED!=='false';
const queueConfig=readConfigFromEnvironment();
const queueSource=queueEnabled&&queueConfig&&authController?createSourceReviewQueue(queueConfig,authController):null;
const queueAllowed=computed(()=>Boolean(queueSource)&&canReadSourceReviewQueue(
 queueEnabled,authController?.state.phase??'signed-out',researcherRole
));
const decisionEnabled=import.meta.env.VITE_NFQ_SOURCE_REVIEW_DECISIONS_ENABLED!=='false';
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
watch(queueAllowed,canRead=>{
 if(canRead)void loadSourceReviews();
 else clearReviewQueue();
},{immediate:true});
onUnmounted(clearReviewQueue);
const reviewerStatus=computed(()=>roleAssignment.value==='reviewer'?'Verified assignment':'Not verified');
const adminStatus=computed(()=>roleAssignment.value==='administrator'?'Verified assignment':'Not verified');

</script>
<template>
 <div class="page research-admin">
  <header class="admin-head">
   <h1 data-testid="account-workspace-heading">{{currentTitle}}</h1>
   <ContextHelp :label="isAdministrator?'About research administration':'About account workspace'" :title="currentTitle">
    <p>This workspace reflects the account's verified FQ research membership and independent professional affiliation. Signing in does not grant scientific or administrative authority.</p>
    <p v-if="isAdministrator">Contribution, review and administrative actions require verified assignments and audit history. Research actions require independent server authorisation.</p><p v-else>Scientific access is assigned by an administrator; a displayed profile or account designation is not a permission grant.</p>
   </ContextHelp>
  </header>
  <nav v-if="returnToVariant" class="nfq-research-trail admin-trail" aria-label="Research return path">
   <RouterLink :to="returnToVariant" data-testid="admin-context-return">← Return to variant dossier</RouterLink>
  </nav>
  <section class="research-entry" aria-labelledby="admin-access-heading">
   <div class="research-entry-main">
    <h2 id="admin-access-heading" class="nfq-sr-only">My account profile</h2>
    <div v-if="signedIn" data-testid="professional-profile" aria-label="Professional profile">
     <ResearchIdentityCard :email="identity" :persona="persona" :role-label="roleLabel"
      :professional-profile="professionalProfile" :professional-phase="professionalPhase" @open-people="openPeopleAccess" />
    </div>
    <div v-else class="nfq-account-welcome">
     <div class="nfq-welcome-mark" aria-hidden="true">FQ</div>
     <div>
      <h2>Research account</h2>
      <p v-if="phase==='checking'" role="status">Checking your research session…</p>
      <p v-else-if="phase==='error'" role="alert">The research session could not be verified. Scientific operations remain unavailable.</p>
      <p v-else>Sign in to see your verified professional profile and assigned research capabilities.</p>
      <div class="admin-session-actions">
       <RouterLink v-if="authController" class="research-entry-link" to="/sign-in">Sign in <span aria-hidden="true">→</span></RouterLink>
       <RouterLink class="research-entry-link" to="/variants">Public research <span aria-hidden="true">↗</span></RouterLink>
      </div>
     </div>
    </div>
    <details v-if="signedIn&&authController?.state.userId" class="admin-account-disclosure" data-testid="admin-account-disclosure">
     <summary>Account identifier</summary>
     <div class="admin-account-detail">
      <code data-testid="admin-account-id">{{authController.state.userId}}</code>
      <ContextHelp label="About account ID" title="Account identity">
       <p>This is the signed-in FQ identity identifier, not an administrator assignment. Access is independently verified by the server.</p>
      </ContextHelp>
     </div>
    </details>
   </div>
   <aside class="research-entry-aside" :aria-label="accessSectionLabel">
    <div class="nfq-access-head">
     <h2>Access</h2>
     <ContextHelp label="About role verification" title="Research permissions">
      <p>A verified FQ research membership establishes your assigned role. A signed-in session or professional affiliation does not independently grant scientific or administrative permissions.</p>
      <p>Protected research actions are authorized by the server. An account badge never grants access.</p>
     </ContextHelp>
    </div>
    <dl class="research-capabilities">
     <div><dt>Session</dt><dd>{{signedIn?'Authenticated':'Not signed in'}}</dd></div>
     <div>
      <dt>{{persona==='guest'?'Designation':'Research membership'}}</dt>
      <dd data-testid="admin-membership-status">{{persona==='guest'?'Guest · verified':roleLabel}}
       <small v-if="isAdministrator" data-testid="admin-role-status" class="nfq-access-verified">Verified</small>
      </dd>
     </div>
     <div v-if="isAdministrator||isReviewer||isContributor"><dt>Research operations</dt><dd>{{isContributor?'Submit curation proposals':'Curate and independently review'}}</dd></div>
    </dl>
    <p v-if="signedIn&&researcherRole.phase==='unavailable'" role="alert" class="nfq-access-warning">{{researcherRole.message||'Access could not be verified.'}}</p>
    <details v-if="signedIn" class="nfq-access-diagnostics" data-testid="admin-access-diagnostics">
     <summary>Access diagnostics</summary>
     <div class="nfq-diagnostics-panel">
      <button type="button" :disabled="researcherRole.phase==='checking'" @click="refreshResearcherRole">{{researcherRole.phase==='checking'?'Verifying…':'Recheck membership'}}</button>
      <button v-if="isAdministrator&&accessProbe" type="button" :disabled="probePhase==='checking'" data-testid="admin-access-check" @click="runAccessProbe">{{probePhase==='checking'?'Checking…':'Verify server access'}}</button>
      <p v-if="probeMessage" role="status" data-testid="admin-access-check-status">{{probeMessage}}</p>
      <p v-if="probeResult">Membership: {{probeResult.membership==='verified'?probeResult.role:'Unassigned'}} · Private proposals: {{probeResult.privateProposalCount}}</p>
     </div>
    </details>
   </aside>
  </section>
  <section v-if="manageRolesAllowed" id="nfq-people-access" class="nfq-people-section" aria-label="People and access" data-testid="admin-people-access">
   <header class="nfq-people-heading">
    <div class="nfq-people-heading-title">
     <h2>People &amp; access</h2>
     <span v-if="rosterPhase==='ready'" class="nfq-people-count">{{rosterRows.length}} {{rosterRows.length===1?'account':'accounts'}}</span>
    </div>
    <ContextHelp label="About research accounts" title="People & access">
     <p>Searches FQ accounts only. This is not the neumDESK staff directory. Professional profiles and research permissions are verified independently.</p>
     <p>Every role assignment or revocation requires explicit confirmation and is enforced and audited by the FQ database. Guest accounts receive a separate designation, never a research role automatically.</p>
    </ContextHelp>
   </header>
   <AdminInvitationPanel :client="invitationClient" :allowed="manageRolesAllowed" :known-accounts="rosterRows" />
   <div class="nfq-people-layout" :class="{'nfq-people-layout-editing':roleEditorOpen}">
    <div class="nfq-people-directory">
     <form class="nfq-roster-search" role="search" @submit.prevent="loadRoster">
      <label for="nfq-account-search" class="nfq-sr-only">Find an FQ account by email</label>
      <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>
      <input id="nfq-account-search" v-model="accountSearch" type="search" maxlength="120"
       autocomplete="off" placeholder="Find account by email" />
      <button v-if="accountSearch" type="button" class="nfq-roster-clear" aria-label="Clear account search" @click="accountSearch=''">×</button>
      <button type="button" class="nfq-roster-reload" :disabled="rosterPhase==='loading'" aria-label="Refresh accounts" title="Refresh accounts" @click="loadRoster">
       <span aria-hidden="true">↻</span>
      </button>
     </form>
     <p v-if="rosterPhase==='loading'" role="status" class="nfq-directory-feedback">Checking registered accounts…</p>
     <p v-else-if="rosterPhase==='error'" role="alert" class="nfq-directory-feedback">{{rosterMessage}}</p>
     <p v-else-if="rosterPhase==='ready'&&!rosterRows.length" role="status" class="nfq-directory-feedback">No accounts match this search.</p>
     <div v-if="rosterPhase==='ready'&&rosterRows.length" class="nfq-people-results" role="list" aria-label="FQ registered accounts">
      <div v-for="account in rosterRows" :key="account.userId" role="listitem" class="nfq-person-item">
       <button type="button" class="nfq-person-select"
        :class="{'nfq-person-selected':roleEditorOpen&&targetAccount===account.userId}"
        :disabled="permissionPhase!=='idle'" :aria-pressed="roleEditorOpen&&targetAccount===account.userId"
        :aria-label="'Manage research permissions for '+account.email" @click="selectRosterAccount(account)">
        <span class="nfq-person-avatar" aria-hidden="true">{{account.email.charAt(0).toLocaleUpperCase()}}</span>
        <span class="nfq-person-label"><strong>{{account.email}}</strong>
         <small>{{account.emailConfirmed?'Email verified':'Email pending'}}<span v-if="account.revoked"> · Access revoked</span></small>
        </span>
        <span class="nfq-person-role" :class="{'nfq-person-role-unassigned':!account.role||account.revoked}">{{account.revoked?'Revoked':account.role||'Unassigned'}}</span>
        <span class="nfq-person-arrow" aria-hidden="true">›</span>
       </button>
      </div>
     </div>
     <p v-if="rosterPhase==='ready'&&rosterRows.length>=50" class="nfq-directory-feedback">Showing up to 50 accounts. Narrow your search to find another account.</p>
     <div class="nfq-directory-footer">
      <span>Account changes require an independent identity check.</span>
      <button v-if="!roleEditorOpen" type="button" class="nfq-inline-action" @click="roleEditorOpen=true;permissionStatus='';targetAccount='';permissionConfirmation=false">Use verified account ID</button>
     </div>
     <p v-if="permissionStatus&&!roleEditorOpen" role="status" class="nfq-role-result">{{permissionStatus}}</p>
    </div>
    <aside v-if="roleEditorOpen" id="nfq-role-management" class="nfq-account-inspector" aria-label="Research permission management" data-testid="admin-role-management">
     <div class="nfq-account-inspector-head">
      <div><span>Research permissions</span><h3>{{selectedRosterAccount?.email||'Verified account ID'}}</h3></div>
      <button type="button" class="nfq-inspector-close" aria-label="Close permission editor" :disabled="permissionPhase==='saving'" @click="roleEditorOpen=false;permissionConfirmation=false">×</button>
     </div>
     <p class="nfq-inspector-context">{{selectedRosterAccount?(selectedRosterAccount.revoked?'Research membership revoked':selectedRosterAccount.role?'Current role: '+selectedRosterAccount.role:'No research membership assigned'):'Enter an independently confirmed account identifier.'}}</p>
     <form id="nfq-role-management-form" class="nfq-role-management-form" @submit.prevent="submitPermissionChange">
      <div class="nfq-form-field nfq-form-full">
       <label for="nfq-target-account">Account ID</label>
       <input id="nfq-target-account" v-model.trim="targetAccount" type="text" required
        :readonly="Boolean(selectedRosterAccount)" spellcheck="false" autocomplete="off"
        pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
        placeholder="Verified account UUID" :disabled="permissionPhase!=='idle'" />
      </div>
      <div class="nfq-form-field nfq-form-full">
       <label for="nfq-permission-action">Change type</label>
       <select id="nfq-permission-action" v-model="permissionAction" :disabled="permissionPhase!=='idle'">
        <option value="assign">Assign or update role</option>
        <option value="revoke">Revoke research access</option>
       </select>
      </div>
      <div v-if="permissionAction==='assign'" class="nfq-form-field nfq-form-full">
       <label for="nfq-target-role">Research role</label>
       <select id="nfq-target-role" v-model="targetRole" :disabled="permissionPhase!=='idle'">
        <option value="contributor">Contributor</option>
        <option value="reviewer">Scientific reviewer</option>
        <option value="administrator">Administrator</option>
       </select>
      </div>
      <label class="nfq-role-confirm nfq-form-full">
       <input v-model="permissionConfirmation" type="checkbox" :disabled="permissionPhase!=='idle'"/>
       <span>I verified this identity and authorize the recorded change.</span>
      </label>
      <button type="submit" class="nfq-save-role nfq-form-full"
       :disabled="permissionPhase!=='idle'||!permissionConfirmation">
       {{permissionPhase==='saving'?'Saving…':permissionAction==='revoke'?'Confirm revocation':'Save permission'}}
      </button>
      <button v-if="permissionPhase==='uncertain'" type="button" class="nfq-inline-action nfq-form-full" @click="resetPermissionRetry">Check membership before retrying</button>
      <p v-if="permissionStatus" role="status" class="nfq-role-result nfq-form-full">{{permissionStatus}}</p>
     </form>
    </aside>
   </div>
  </section>
  <section v-if="isAdministrator" class="admin-readiness" aria-label="Research operations readiness">
   <div class="admin-section-heading">
    <h2>Scientific operations</h2>
    <ContextHelp label="About scientific operations availability" title="Scientific operations">
     <p>The capabilities below are reserved until the corresponding server-enforced role, provenance and audit requirements have been verified.</p>
     <p>No client-side login or displayed status activates an operation.</p>
    </ContextHelp>
   </div>
   <ul class="admin-operations-list">
    <li>
     <div class="admin-operation-name"><h3>Variant nomenclature curation</h3><ContextHelp label="About variant curation" title="Research curation"><p>Authorized researchers can submit source-supported nomenclature corrections in a variant dossier. Independent review is required before publication.</p></ContextHelp></div>
     <span class="admin-operation-status">In variant dossiers</span>
    </li>
    <li>
     <div class="admin-operation-name"><h3>Source correction review</h3><ContextHelp label="About scientific review" title="Scientific review"><p>Scientific review requires independently verified reviewer authority, traceable evidence and controlled decisions.</p></ContextHelp></div>
     <span class="admin-operation-status">{{decisionAllowed?'Review decisions available':'Not enabled'}}</span>
    </li>
    <li>
     <div class="admin-operation-name"><h3>Research governance</h3><ContextHelp label="About research governance" title="Research governance"><p>Role assignment and audit administration require verified administrator authority and server-side enforcement.</p></ContextHelp></div>
     <span class="admin-operation-status">{{manageRolesAllowed?'Permission management available':'Not enabled'}}</span>
    </li>
   </ul>
  </section>

  <section v-else-if="isContributor||isReviewer" class="admin-readiness" aria-label="Research capabilities">
   <div class="admin-section-heading">
    <h2>Research capabilities</h2>
    <ContextHelp label="About research capabilities" title="Research permissions">
     <p>Research permissions are assigned in FQ independently of the neumDESK professional profile. Scientific operations require separate server-side activation.</p>
    </ContextHelp>
   </div>
   <ul class="admin-operations-list">
    <li v-if="isContributor||isReviewer"><div class="admin-operation-name"><h3>Propose variant corrections</h3></div><span class="admin-operation-status">In variant dossiers</span></li>
    <li v-if="isReviewer"><div class="admin-operation-name"><h3>Source review queue</h3></div><span class="admin-operation-status">{{queueAllowed?queuePhase==='ready'?reviewItems.length+' pending':queuePhase==='loading'?'Checking…':queuePhase==='error'?'Unable to verify':'Available':'Unavailable'}}</span></li>
   </ul>
  </section>
  <section v-else-if="persona==='guest'" class="admin-readiness" aria-label="Guest research resources">
   <div class="admin-section-heading"><h2>Available to guests</h2></div>
   <p class="admin-session-state">You can explore public CFTR research. Any additional scientific permissions must be assigned separately by an FQ administrator.</p>
   <RouterLink class="research-entry-link" to="/variants">Explore public variants <span aria-hidden="true">→</span></RouterLink>
  </section>
  <section v-if="queueEnabled&&(isAdministrator||isReviewer)" id="nfq-scientific-review" class="admin-readiness source-review-readiness" aria-label="Source correction review" data-testid="source-review-workspace">
   <div class="admin-section-heading">
    <h2>Source correction review</h2>
    <ContextHelp label="About source correction review" title="Source correction review">
     <p>Submitted changes are separate from published references. A recorded decision does not automatically change evidence or clinical classifications.</p>
     <p>The queue requires verified reviewer or administrator membership. Review decisions require a separate server-authorized operation and cannot be made by the proposal author.</p>
    </ContextHelp>
   </div>
   <p v-if="!queueAllowed" class="admin-session-state">Reviewer access and the authorised review connection must be verified.</p>
   <template v-else>
    <button type="button" class="admin-role-refresh" :disabled="queuePhase==='loading'||Boolean(pendingDecision)" @click="refreshSourceReviewQueue">{{queuePhase==='loading'?'Checking…':'Refresh reviews'}}</button>
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

.nfq-role-management-form{display:grid;grid-template-columns:minmax(0,1fr);gap:9px;max-width:510px}
.nfq-role-management-form>label:not(.nfq-role-confirm){font-weight:650;font-size:12px;color:#344650}
.nfq-role-management-form>input,.nfq-role-management-form>select{width:100%;min-height:38px;border:1px solid #becbd0;border-radius:4px;padding:7px 11px;background:#fff;color:#293941;font-size:13px}
.nfq-role-confirm{display:flex;align-items:flex-start;gap:10px;font-size:12px;line-height:1.5;color:#344650;margin:8px 0 3px}
.nfq-role-confirm input{width:16px;height:16px;flex-shrink:0}
.nfq-role-actions{display:flex;gap:10px;flex-wrap:wrap}

.nfq-roster-controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.nfq-roster-controls label{font-size:12px;font-weight:650}
.nfq-roster-controls input{min-width:220px;max-width:340px;min-height:38px;flex:1;border:1px solid #becbd0;border-radius:4px;padding:7px 11px;background:#fff;color:#293941;font-size:13px}
.nfq-roster{border-top:1px solid #dce1de}
.nfq-roster-row{display:flex;gap:14px;align-items:center;justify-content:space-between;border-bottom:1px solid #e1e6e5;padding:12px 0;flex-wrap:wrap}
.nfq-roster-identity{display:grid;gap:4px;min-width:0;overflow-wrap:anywhere}
.nfq-roster-identity strong{font-size:13px}
.nfq-roster-identity span{font-size:12px;color:#607078}

.nfq-professional-details{margin:10px 0 14px;padding:12px 15px;border-left:2px solid #769a98;background:#f7f9f8;max-width:620px}
.nfq-professional-name{font-size:16px;font-weight:700;margin:0 0 4px;color:#173949}
.nfq-professional-meta{font-size:13px;margin:0 0 4px;color:#345566}
.nfq-professional-note{font-size:11px;line-height:1.55;margin:7px 0 0;color:#64787f}

/* 14H122 Users & Profiles: compact bright clinical surface, no decorative scaffolding. */
.research-admin{max-width:1160px;color:#213b56;padding-bottom:30px}
.admin-head{border:0;padding:0;margin:0 0 12px;align-items:center}
.admin-head h1{font-size:clamp(23px,2.45vw,31px);color:#18344f;font-weight:730;letter-spacing:-.04em}
.admin-trail{margin:-3px 0 12px;padding:0}
.research-entry{grid-template-columns:minmax(0,1.24fr) minmax(285px,.76fr);gap:14px;padding:0;margin:0;border:0;align-items:stretch}
.research-entry-main{display:grid;align-content:start;min-width:0;gap:6px}
.nfq-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.research-entry-aside{border:1px solid #dfe7f0;background:#fff;border-radius:14px;padding:17px 17px 14px;min-width:0;align-self:stretch}
.research-entry-aside .admin-section-heading{margin-bottom:8px}
.research-entry-aside .admin-section-heading h2{font-size:16px;font-weight:720;color:#213c58}
.research-capabilities>div{padding:7px 0;gap:10px}
.research-capabilities dt{font-size:11.5px;color:#677b90}
.research-capabilities dd{font-size:11.5px;color:#243e58;font-weight:690}
.admin-role-actions{gap:6px;margin-top:12px}
.admin-role-actions p{color:#6a7380;line-height:1.45}
.admin-role-refresh{min-height:36px;border-color:#d5e1ed;background:#fff;color:#285b87;border-radius:8px;padding:7px 12px;font-size:11.5px;font-weight:680}
.admin-role-refresh:hover{background:#f2f7fd;border-color:#b4c9df}
.admin-role-refresh:focus-visible,.research-entry-link:focus-visible{outline:2px solid #2d76ad;outline-offset:2px}
.admin-readiness{padding:16px 19px;margin-top:13px;border:1px solid #e1e8f0;border-radius:13px;background:#fff;box-shadow:0 4px 17px rgba(26,59,89,.025)}
.admin-readiness .admin-section-heading{margin:0 0 12px}
.admin-section-heading h2{color:#213c58;font-size:17px;font-weight:720;letter-spacing:-.025em}
.admin-readiness .admin-section-heading :deep(.nfq-context-help summary),
.research-entry-aside :deep(.nfq-context-help summary){width:28px;height:28px;border-color:#dce6f0;color:#4d6b86}
.research-entry-link{min-height:36px;border-color:#d6e2ee;background:#fff;color:#285b87;border-radius:8px;font-size:11.5px}
.research-entry-link:hover{background:#f1f6fc;color:#19496f}
.nfq-account-welcome{display:flex;gap:15px;align-items:flex-start;min-height:165px;padding:18px 20px;border:1px solid #dfe7f0;border-radius:14px;background:#fff}
.nfq-welcome-mark{display:grid;place-items:center;flex:none;width:52px;height:52px;border-radius:14px;background:#204a72;color:#fff;font-size:15px;font-weight:750;letter-spacing:-.04em}
.nfq-account-welcome h2{margin:0 0 5px;color:#1b3a57;font-size:21px;letter-spacing:-.035em}
.nfq-account-welcome p{margin:0;color:#60768a;font-size:12.5px;line-height:1.5}
.nfq-account-welcome .admin-session-actions{margin:13px 0 0;display:flex;flex-wrap:wrap;gap:8px}
.admin-account-disclosure{margin:0;padding:0 3px}
.admin-account-disclosure summary{color:#698098;font-size:10.5px}
.admin-account-detail{padding:5px 3px 1px}
.admin-account-detail code{color:#53687d;font-size:10.5px}
.nfq-roster-controls{gap:8px;margin-bottom:10px}
.nfq-roster-controls label{width:100%;font-weight:650;color:#5f7286;font-size:11px}
.nfq-roster-controls input{max-width:450px;min-height:38px;border:1px solid #d3dfeb;border-radius:8px;padding:8px 11px;font-size:12px}
.nfq-roster{display:grid;gap:7px;border:0}
.nfq-roster-row{border:1px solid #e2e9f1;border-radius:9px;padding:10px 12px;gap:10px 14px;background:#fcfdff}
.nfq-roster-row.nfq-roster-selected{background:#f0f6fc;border-color:#abc6df}
.nfq-roster-identity strong{color:#203e5b;font-size:12.5px;font-weight:690}
.nfq-roster-identity span{font-size:11px;color:#677c90}
.nfq-role-editor-head{display:flex;align-items:center;justify-content:space-between;gap:10px 18px;flex-wrap:wrap}
.nfq-role-editor-head p{font-size:11.5px;line-height:1.5;color:#6a7b8d;margin:0}
.nfq-role-management-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px 13px;max-width:700px;margin-top:14px;padding:16px;border:1px solid #e2e9f1;border-radius:10px;background:#f9fbfe}
.nfq-form-field{display:grid;gap:6px;min-width:0}
.nfq-form-field label{font-size:11.5px;font-weight:680;color:#425d75}
.nfq-form-field input,.nfq-form-field select{min-height:39px;min-width:0;width:100%;border:1px solid #d3dfeb;border-radius:7px;padding:8px 10px;background:#fff;color:#233f59;font-size:12px}
.nfq-form-full{grid-column:1/-1}
.nfq-role-confirm{font-size:11.5px;line-height:1.4;color:#445d74;margin:2px 0}
.nfq-role-actions{gap:8px}
.nfq-role-management-form :focus-visible,.nfq-roster-controls input:focus-visible{outline:2px solid #2d76ad;outline-offset:2px}
.admin-operations-list{gap:6px}
.admin-operations-list li{background:#fbfdff;border:1px solid #edf1f6;border-radius:9px;padding:10px 12px}
.admin-operation-name h3{font-size:12.5px;color:#2b4561}
.admin-operation-status{font-size:11px;color:#587089}
.source-review-item{border-color:#e7edf4}
@media(max-width:900px){
 .research-entry{grid-template-columns:minmax(0,1fr);gap:11px}
 .research-entry-aside{padding:15px 17px;border:1px solid #dfe7f0}
}
@media(max-width:520px){
 .research-admin{padding-bottom:22px}
 .admin-head{margin:0 0 10px;padding:0}
 .research-entry{gap:10px}
 .research-entry-aside{padding:13px 14px}
 .admin-readiness{padding:14px;margin-top:10px}
 .nfq-roster-row{align-items:flex-start}
 .nfq-roster-controls input{min-width:0;width:100%;max-width:none}
 .nfq-role-management-form{grid-template-columns:minmax(0,1fr);padding:12px}
 .nfq-form-full{grid-column:1}
 .admin-operations-list li{flex-wrap:wrap;align-items:flex-start}
 .admin-operation-status{white-space:normal}
 .nfq-account-welcome{padding:14px;gap:11px}
 .nfq-welcome-mark{width:44px;height:44px}
}


/* Phase 14H123 — an account directory, not three separate dashboard cards. */
.research-admin{max-width:1190px}
.research-admin .admin-head{margin-bottom:8px}
.research-admin .admin-head h1{font-size:clamp(22px,2.1vw,28px);letter-spacing:-.035em!important}
.research-admin .admin-trail{border:0;margin:0 0 10px;padding:0;font-size:11px}
.research-admin .research-entry{grid-template-columns:minmax(0,1.15fr) minmax(260px,.85fr);gap:12px}
.research-admin .research-entry-aside{padding:13px 17px;border-radius:11px;box-shadow:none}
.nfq-access-head{display:flex;align-items:center;justify-content:space-between;gap:9px;margin:0}
.nfq-access-head h2{font-size:14px!important;line-height:1.25;margin:0!important;color:#243f5a;font-weight:720}
.nfq-access-head :deep(.nfq-context-help summary){width:24px;height:24px}
.research-admin .research-capabilities{margin:3px 0 0}
.research-admin .research-capabilities>div{padding:5px 0}
.research-admin .research-capabilities dt{font-size:11px}
.research-admin .research-capabilities dd{font-size:11.5px}
.nfq-access-verified{display:inline-block;margin-left:8px;color:#6a8095;font-size:10px;font-weight:550}
.nfq-access-diagnostics{font-size:11px;color:#607890;margin-top:7px;border-top:1px solid #edf1f6;padding-top:7px}
.nfq-access-diagnostics summary{cursor:pointer;width:max-content;max-width:100%;font-size:10.5px;color:#54708a;line-height:1.6}
.nfq-diagnostics-panel{display:flex;align-items:center;gap:8px 14px;flex-wrap:wrap;padding:9px 0 3px}
.nfq-diagnostics-panel button{padding:3px 0;border:0;background:none;color:#2a608e;cursor:pointer;font-size:10.5px;font-weight:650}
.nfq-diagnostics-panel button:hover{text-decoration:underline;text-underline-offset:3px}
.nfq-diagnostics-panel button:disabled{opacity:.55;cursor:wait}
.nfq-diagnostics-panel p{width:100%;margin:0;color:#58738b;font-size:10.5px;line-height:1.4}
.nfq-access-warning{margin:7px 0 0;color:#915c42;font-size:11px}
.nfq-people-section{border:1px solid #e0e8f0;border-radius:12px;background:#fff;margin-top:13px;padding:16px 17px;min-width:0}
.nfq-people-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:13px}
.nfq-people-heading-title{display:flex;gap:12px;align-items:baseline;min-width:0}
.nfq-people-heading h2{margin:0!important;font-size:17px!important;line-height:1.25;color:#253f59;font-weight:730;letter-spacing:-.02em}
.nfq-people-count{font-size:10.5px;color:#7690a8;font-weight:600;white-space:nowrap}
.nfq-people-heading :deep(.nfq-context-help summary){width:26px;height:26px}
.nfq-people-layout{display:grid;grid-template-columns:minmax(0,1fr);gap:17px;align-items:start}
.nfq-people-layout-editing{grid-template-columns:minmax(0,1fr) minmax(290px,.85fr)}
.nfq-people-directory{min-width:0}
.nfq-roster-search{display:flex;align-items:center;gap:8px;width:min(100%,570px);height:40px;padding:0 7px 0 12px;border:1px solid #d8e3ed;border-radius:8px;color:#7890a6;background:#fff}
.nfq-roster-search:focus-within{border-color:#6396bd;outline:2px solid #e8f1fa}
.nfq-roster-search input{border:0;outline:0!important;box-shadow:none!important;padding:0;min-width:0;flex:1;font:inherit;font-size:12px;height:100%;background:transparent;color:#233e57}
.nfq-roster-search input::-webkit-search-cancel-button{display:none}
.nfq-roster-search button{border:0;background:transparent;color:#66839c;padding:0;display:grid;place-items:center;cursor:pointer;line-height:1}
.nfq-roster-search .nfq-roster-clear{font-size:18px;width:22px;height:26px}
.nfq-roster-search .nfq-roster-reload{font-size:21px;width:28px;height:28px;border-radius:6px}
.nfq-roster-reload:hover{background:#eff5fa;color:#31628d}
.nfq-roster-reload:disabled{opacity:.4;cursor:wait}
.nfq-directory-feedback{font-size:11.5px;line-height:1.5;color:#637d91;margin:12px 0}
.nfq-people-results{display:grid;gap:0;margin-top:12px;max-height:380px;overflow:auto;scrollbar-width:thin;overscroll-behavior:contain}
.nfq-person-item{min-width:0;border-top:1px solid #edf1f5}
.nfq-person-item:first-child{border-top:0}
.nfq-person-select{display:flex;gap:10px;align-items:center;width:100%;border:0;background:transparent;padding:10px 7px;min-height:54px;text-align:left;color:#25415b;cursor:pointer;border-radius:6px}
.nfq-person-select:hover{background:#f6f9fc}
.nfq-person-select.nfq-person-selected{background:#eef5fc}
.nfq-person-select:disabled{cursor:wait;opacity:.6}
.nfq-person-avatar{height:29px;width:29px;display:grid;place-items:center;border-radius:8px;flex:none;background:#eef3f9;color:#345f82;font-size:12px;font-weight:760}
.nfq-person-label{min-width:0;flex:1;display:grid;gap:3px}
.nfq-person-label strong{font-size:11.75px;line-height:1.3;font-weight:690;color:#2c4861;overflow-wrap:anywhere}
.nfq-person-label small{font-size:10px;line-height:1.3;color:#8192a2;overflow-wrap:anywhere}
.nfq-person-role{color:#416987;background:#f0f5fa;border-radius:5px;font-size:10px;font-weight:620;padding:4px 8px;white-space:nowrap;max-width:100%;text-overflow:ellipsis;overflow:hidden}
.nfq-person-role-unassigned{background:#f4f6f8;color:#7a8794}
.nfq-person-arrow{font-size:19px;color:#9aacbb;line-height:1}
.nfq-directory-footer{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:9px 15px;margin:12px 2px 0;font-size:10px;color:#8a9aaa;line-height:1.5}
.nfq-inline-action{padding:0;border:0;background:transparent;color:#326795;font:inherit;font-size:10.5px;cursor:pointer;font-weight:650}
.nfq-inline-action:hover{text-decoration:underline;text-underline-offset:3px}
.nfq-account-inspector{min-width:0;border-left:1px solid #e6edf3;padding:3px 0 2px 17px}
.nfq-account-inspector-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.nfq-account-inspector-head span{color:#7b8fa1;font-size:10px;font-weight:600}
.nfq-account-inspector-head h3{font-size:13px;letter-spacing:-.012em;line-height:1.45;margin:4px 0 0;color:#29445e;overflow-wrap:anywhere}
.nfq-inspector-close{display:grid;place-items:center;width:28px;height:28px;flex:none;background:transparent;border:0;border-radius:7px;color:#617a91;font-size:22px;cursor:pointer}
.nfq-inspector-close:hover{background:#edf3f9}
.nfq-inspector-context{font-size:10.5px;color:#718499;line-height:1.5;margin:7px 0}
.research-admin .nfq-account-inspector .nfq-role-management-form{display:grid;grid-template-columns:minmax(0,1fr);padding:0;margin:10px 0 0;background:transparent;border:0;gap:11px;max-width:none}
.research-admin .nfq-account-inspector .nfq-form-full{grid-column:auto}
.research-admin .nfq-account-inspector .nfq-form-field{gap:5px}
.research-admin .nfq-account-inspector .nfq-form-field label{font-size:10.5px;color:#5f7389}
.research-admin .nfq-account-inspector input,
.research-admin .nfq-account-inspector select{font-size:11.5px;border:1px solid #d6e1eb;border-radius:7px;min-height:36px;color:#24435e;background:#fff;padding:7px 9px;width:100%}
.research-admin .nfq-account-inspector input[readonly]{background:#f8fafc;color:#526b81}
.research-admin .nfq-account-inspector .nfq-role-confirm{display:flex;gap:8px;align-items:flex-start;margin:0;font-size:10.5px;line-height:1.5;color:#597189}
.research-admin .nfq-account-inspector .nfq-role-confirm input{width:14px;height:14px;min-height:14px;margin:2px 0 0;padding:0;flex:none}
.nfq-save-role{min-height:37px;padding:8px 13px;border:1px solid #1c527e;border-radius:7px;background:#1c527e;color:#fff;font-size:11.5px;font-weight:690;cursor:pointer}
.nfq-save-role:hover{background:#143d61}
.nfq-save-role:disabled{opacity:.47;cursor:not-allowed}
.nfq-role-result{margin:9px 0 0;color:#395f7c;font-size:11px;line-height:1.5}
.research-admin .nfq-people-section :focus-visible{outline:2px solid #327eac;outline-offset:2px}
.research-admin .admin-readiness{padding:13px 16px;margin-top:11px;box-shadow:none;border-color:#e7edf3}
.research-admin .admin-readiness .admin-section-heading{margin-bottom:5px}
.research-admin .admin-readiness .admin-section-heading h2{font-size:15px!important}
.research-admin .admin-operations-list li{padding:7px 10px;border:0;background:transparent;border-bottom:1px solid #edf1f5;border-radius:0}
.research-admin .admin-operations-list li:last-child{border-bottom:0}
.research-admin .admin-operations-list h3{font-size:11.5px}
@media(max-width:970px){
 .nfq-people-layout-editing{grid-template-columns:minmax(0,1fr)}
 .nfq-account-inspector{border-left:0;border-top:1px solid #e5edf4;padding:14px 0 0}
}
@media(max-width:700px){
 .research-admin .research-entry{grid-template-columns:minmax(0,1fr);gap:10px}
 .research-admin .research-entry-aside{padding:12px 14px}
 .nfq-people-section{padding:14px;margin-top:10px}
 .nfq-people-heading{margin-bottom:10px}
 .nfq-person-select{gap:7px;padding:8px 2px}
 .nfq-person-avatar{width:27px;height:27px}
 .nfq-person-role{font-size:9.5px}
}
@media(max-width:410px){
 .nfq-person-arrow{display:none}
 .nfq-people-heading-title{gap:6px;flex-wrap:wrap}
 .nfq-person-select{flex-wrap:wrap}
 .nfq-person-role{margin-left:auto}
}

</style>

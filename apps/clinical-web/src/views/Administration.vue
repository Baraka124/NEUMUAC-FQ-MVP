<script setup lang="ts">
import {computed,ref,watch,onUnmounted} from 'vue';
import {RouterLink,useRoute} from 'vue-router';
import ContextHelp from '../components/ContextHelp.vue';
import ResearchIdentityCard from '../components/ResearchIdentityCard.vue';
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
 permissionAction.value='assign';permissionConfirmation.value=false;
}
watch(()=>[authController?.state.phase,authController?.state.userId,researcherRole.phase,researcherRole.role],clearRoster);
onUnmounted(clearRoster);
const roleEditorOpen=ref(false);
const targetAccount=ref('');
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
  permissionPhase.value='idle';
  void refreshResearcherRole();
  clearRoster();
 }catch(error){
  if(run!==permissionGeneration)return;
  permissionPhase.value='uncertain';
  permissionStatus.value=error instanceof Error?error.message:'The server could not confirm this change.';
 }
}
function resetPermissionRetry():void{
 permissionPhase.value='idle';permissionConfirmation.value=false;permissionStatus.value='';
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
      :professional-profile="professionalProfile" :professional-phase="professionalPhase" />
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
    <div class="admin-section-heading">
     <h2>{{isAdministrator?'Access &amp; permissions':persona==='guest'?'Guest access':'Research access'}}</h2>
     <ContextHelp label="About role verification" title="Research permissions">
      <p>A verified FQ research membership establishes your assigned role. A signed-in session or professional affiliation does not independently grant scientific or administrative permissions.</p>
      <p>Editing, decisions and account management remain authorized by protected database functions and access policies.</p>
     </ContextHelp>
    </div>
    <dl class="research-capabilities">
     <div><dt>Session</dt><dd>{{signedIn?'Authenticated':'Not signed in'}}</dd></div>
     <div><dt>{{persona==='guest'?'Guest designation':'Research role'}}</dt><dd data-testid="admin-membership-status">{{persona==='guest'?'Verified external guest':roleLabel}}</dd></div>
     <div v-if="isAdministrator"><dt>Administrator</dt><dd data-testid="admin-role-status">{{adminStatus}}</dd></div>
     <div v-if="isReviewer"><dt>Scientific reviewer</dt><dd>{{reviewerStatus}}</dd></div>
     <div v-if="isAdministrator||isReviewer"><dt>Independent review</dt><dd>Role eligible</dd></div>
     <div v-if="isAdministrator||isReviewer||isContributor"><dt>Variant nomenclature</dt><dd>Curate in dossier</dd></div>
    </dl>
    <div class="admin-role-actions">
     <p v-if="signedIn&&researcherRole.phase==='unavailable'" role="alert">{{researcherRole.message||'Membership verification is unavailable. Protected operations remain disabled.'}}</p>
     <button v-if="signedIn" type="button" class="admin-role-refresh" :disabled="researcherRole.phase==='checking'" @click="refreshResearcherRole">{{researcherRole.phase==='checking'?'Verifying…':'Recheck access'}}</button>
     <button v-if="isAdministrator&&accessProbe" type="button" class="admin-role-refresh"
      :disabled="probePhase==='checking'" data-testid="admin-access-check"
      @click="runAccessProbe">{{probePhase==='checking'?'Checking…':'Verify server access'}}</button>
     <p v-if="probeMessage" role="status" data-testid="admin-access-check-status">{{probeMessage}}</p>
     <p v-if="probeResult" class="admin-session-state">Membership: {{probeResult.membership==='verified'?probeResult.role:'Unassigned'}} · Private proposals: {{probeResult.privateProposalCount}}</p>
    </div>
   </aside>
  </section>
  <section v-if="manageRolesAllowed" id="nfq-people-access" class="admin-readiness" aria-label="People and access" data-testid="admin-people-access">
   <div class="admin-section-heading">
    <h2>People &amp; access</h2>
    <ContextHelp label="About research accounts" title="Research account directory">
     <p>These are verified FQ authentication accounts and their current FQ research permissions. This is not the neumDESK professional directory; member and guest affiliations will appear only after independently verified identity linkage.</p>
     <p>No passwords, recovery tokens, staff contact numbers or clinical data are exposed here.</p>
    </ContextHelp>
   </div>
   <div class="nfq-roster-controls">
    <label for="nfq-account-search">Find an FQ account by email</label>
    <input id="nfq-account-search" v-model.trim="accountSearch" type="search"
      maxlength="120" autocomplete="off" placeholder="Search registered accounts"
      @keydown.enter.prevent="loadRoster"/>
    <button class="admin-role-refresh" type="button" :disabled="rosterPhase==='loading'"
      @click="loadRoster">{{rosterPhase==='loading'?'Loading…':'Load accounts'}}</button>
   </div>
   <p v-if="rosterMessage" role="alert" class="admin-session-state">{{rosterMessage}}</p>
   <p v-if="rosterPhase==='ready'&&!rosterRows.length" class="admin-session-state">No registered FQ accounts matched this search.</p>
   <div v-if="rosterPhase==='ready'&&rosterRows.length" class="nfq-roster" role="list" aria-label="FQ registered accounts">
    <div v-for="account in rosterRows" :key="account.userId" class="nfq-roster-row" :class="{'nfq-roster-selected':targetAccount===account.userId}" role="listitem">
     <div class="nfq-roster-identity">
      <strong>{{account.email}}</strong>
      <span>{{account.role|| (account.revoked?'Access revoked':'No FQ role assigned')}} · {{account.emailConfirmed?'Email confirmed':'Email pending'}}</span>
     </div>
     <button class="admin-role-refresh" type="button" @click="selectRosterAccount(account)"
       :disabled="permissionPhase!=='idle'" :aria-pressed="targetAccount===account.userId&&roleEditorOpen" :aria-label="'Manage research permissions for '+account.email">{{targetAccount===account.userId&&roleEditorOpen?'Selected · Manage access':'Manage access'}}</button>
    </div>
   </div>
  </section>
  <section v-if="manageRolesAllowed" id="nfq-role-management" class="admin-readiness" aria-label="Research permission management" data-testid="admin-role-management">
   <div class="admin-section-heading">
    <h2>Research permissions</h2>
    <ContextHelp label="About research permission changes" title="Administrator permissions">
     <p>Membership in neumACt is distinct from authorisation to change CFTR evidence. Assign contributor, reviewer or administrator access only after confirming the intended research account UUID with its owner. Each change is authorised and audited by the database.</p>
     <p>Revocation prevents future research operations, including private proposal reads. A scientific review decision does not publish evidence automatically.</p>
    </ContextHelp>
   </div>
   <div class="nfq-role-editor-head">
    <p>Select an account above or enter an independently verified account identifier.</p>
    <button type="button" class="admin-role-refresh" :aria-expanded="roleEditorOpen" aria-controls="nfq-role-management-form" @click="roleEditorOpen=!roleEditorOpen">{{roleEditorOpen?'Close permission editor':'Open permission editor'}}</button>
   </div>
   <form v-if="roleEditorOpen" id="nfq-role-management-form" class="nfq-role-management-form" @submit.prevent="submitPermissionChange">
    <div class="nfq-form-field nfq-form-full">
     <label for="nfq-target-account">Research account identifier</label>
     <input id="nfq-target-account" v-model.trim="targetAccount" type="text"
      autocomplete="off" spellcheck="false" required
      pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
      placeholder="Verified account UUID" :disabled="permissionPhase!=='idle'"/>
    </div>
    <div class="nfq-form-field">
     <label for="nfq-permission-action">Action</label>
     <select id="nfq-permission-action" v-model="permissionAction" :disabled="permissionPhase!=='idle'">
      <option value="assign">Assign or change role</option>
      <option value="revoke">Revoke research access</option>
     </select>
    </div>
    <div v-if="permissionAction==='assign'" class="nfq-form-field">
     <label for="nfq-target-role">Research role</label>
     <select id="nfq-target-role" v-model="targetRole" :disabled="permissionPhase!=='idle'">
      <option value="contributor">Contributor</option>
      <option value="reviewer">Scientific reviewer</option>
      <option value="administrator">Administrator</option>
     </select>
    </div>
    <label class="nfq-role-confirm nfq-form-full">
     <input v-model="permissionConfirmation" type="checkbox" :disabled="permissionPhase!=='idle'"/>
     <span>I have verified this account and authorize the recorded access change.</span>
    </label>
    <div class="nfq-role-actions nfq-form-full">
     <button type="submit" class="admin-role-refresh" :disabled="permissionPhase!=='idle'||!permissionConfirmation">
      {{permissionPhase==='saving'?'Recording…':permissionAction==='revoke'?'Revoke access':'Save research role'}}
     </button>
     <button v-if="permissionPhase==='uncertain'" type="button" class="admin-role-refresh"
      @click="resetPermissionRetry">Acknowledge and verify current membership</button>
    </div>
    <p v-if="permissionStatus" role="status" class="admin-session-state nfq-form-full">{{permissionStatus}}</p>
   </form>
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
     <div class="admin-operation-name"><h3>Propose evidence</h3><ContextHelp label="About evidence proposals" title="Evidence contributions"><p>Contribution submission requires a verified contributor assignment and an attributable, auditable draft.</p></ContextHelp></div>
     <span class="admin-operation-status">Not enabled</span>
    </li>
    <li>
     <div class="admin-operation-name"><h3>Review and validate</h3><ContextHelp label="About scientific review" title="Scientific review"><p>Scientific review requires independently verified reviewer authority, traceable evidence and controlled decisions.</p></ContextHelp></div>
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
    <li v-if="isContributor||isReviewer"><div class="admin-operation-name"><h3>Propose evidence</h3></div><span class="admin-operation-status">Not enabled</span></li>
    <li v-if="isReviewer"><div class="admin-operation-name"><h3>Scientific review</h3></div><span class="admin-operation-status">{{decisionAllowed?'Authorised review available':'Not enabled'}}</span></li>
   </ul>
  </section>
  <section v-else-if="persona==='guest'" class="admin-readiness" aria-label="Guest research resources">
   <div class="admin-section-heading"><h2>Available to guests</h2></div>
   <p class="admin-session-state">You can explore public CFTR research. Any additional scientific permissions must be assigned separately by an FQ administrator.</p>
   <RouterLink class="research-entry-link" to="/variants">Explore public variants <span aria-hidden="true">→</span></RouterLink>
  </section>
  <section v-if="queueEnabled&&(isAdministrator||isReviewer)" class="admin-readiness source-review-readiness" aria-label="Source correction review">
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
</style>

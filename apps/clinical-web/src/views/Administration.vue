<script setup lang="ts">
import {computed} from 'vue';
import {RouterLink} from 'vue-router';
import ContextHelp from '../components/ContextHelp.vue';
import {authController} from '../services/authSession';
import {researcherRole,refreshResearcherRole,type ResearchRole} from '../services/researchRole';

const signedIn=computed(()=>authController?.state.phase==='signed-in');
const authPhase=computed(()=>authController?.state.phase??'unavailable');
const identity=computed(()=>signedIn.value?authController?.state.email||'Authenticated account':'No research account signed in');
const assignedRole=computed<ResearchRole|null>(()=>signedIn.value&&researcherRole.phase==='verified'?researcherRole.role:null);
const roleLabel=computed(()=>{
 if(!signedIn.value)return 'Not verifiable';
 if(researcherRole.phase==='checking')return 'Checking…';
 if(researcherRole.phase==='unavailable')return 'Not verifiable';
 if(researcherRole.phase==='unassigned')return 'No assignment';
 if(researcherRole.phase!=='verified'||!assignedRole.value)return 'Not verifiable';
 return {administrator:'Administrator',reviewer:'Scientific reviewer',contributor:'Research contributor'}[assignedRole.value];
});
const adminStatus=computed(()=>assignedRole.value==='administrator'?'Verified membership':'Not verified');
const accessMessage=computed(()=>{
 if(!authController)return 'Staff authentication is not configured here. No management operations are available.';
 if(authPhase.value==='checking')return 'Checking the existing session…';
 if(authPhase.value==='error')return 'Authentication could not be confirmed. Editing remains unavailable.';
 if(!signedIn.value)return 'Sign in to identify your research account. Public CFTR research remains available without a session.';
 if(researcherRole.phase==='checking')return 'Checking your research membership with the configured database.';
 if(researcherRole.phase==='unassigned')return 'The authenticated account has no active research membership assignment.';
 if(researcherRole.phase==='unavailable')return researcherRole.message||'The research membership could not be verified.';
 if(assignedRole.value==='administrator')return 'An administrator membership is recorded for this account. Research editing and administrative operations are not yet connected.';
 return 'Your research membership is verified. Editing and approval capabilities must still be authorized by their server endpoints.';
});
const accessIsError=computed(()=>signedIn.value&&researcherRole.phase==='unavailable'||authPhase.value==='error');
</script>

<template>
 <div class="page research-admin nfq-admin-workspace">
  <header class="nfq-admin-head">
   <h1>Research administration</h1>
   <ContextHelp label="About research administration" title="Identity, membership and permissions">
    <p>Authentication confirms the research account. Membership is independently verified against the configured database and does not automatically grant editing or approval powers.</p>
    <p>Database policies and attributable server-side audit records are required for any scientific or administrative change. A verified role alone cannot bypass those controls.</p>
   </ContextHelp>
  </header>
  <section class="research-entry" aria-labelledby="admin-access-heading">
   <div class="research-entry-main">
    <h2 id="admin-access-heading">Account access</h2>
    <p class="nfq-admin-identity">{{identity}}</p>
    <p class="nfq-admin-access-message" :role="accessIsError?'alert':'status'">{{accessMessage}}</p>
    <div class="nfq-admin-access-actions">
     <RouterLink v-if="!signedIn&&authController" to="/sign-in" class="research-entry-link">Sign in</RouterLink>
     <button v-if="signedIn" type="button" :disabled="researcherRole.phase==='checking'" @click="refreshResearcherRole">Recheck membership</button>
     <RouterLink to="/variants" class="nfq-admin-secondary-link">Explore variants</RouterLink>
    </div>
   </div>
   <aside class="research-entry-aside" aria-label="Administration availability">
    <h2>Verified access</h2>
    <dl class="research-capabilities">
     <div><dt>Authentication</dt><dd>{{signedIn?'Signed in':'Not signed in'}}</dd></div>
     <div><dt>Research membership</dt><dd data-testid="admin-membership-status">{{roleLabel}}</dd></div>
     <div><dt>Administrator role</dt><dd data-testid="admin-role-status">{{adminStatus}}</dd></div>
     <div><dt>Database editing</dt><dd>Not connected</dd></div>
    </dl>
    <ContextHelp label="About administrator access" title="Role assignment versus editing">
     <p>Administrator membership is distinct from Supabase sign-in and from scientific reviewer authority.</p>
     <p>A verified role does not activate writes. Editing requires server-side authorization rules, attributable audit events and a working edit endpoint.</p>
    </ContextHelp>
   </aside>
  </section>

  <section class="admin-readiness" aria-labelledby="admin-operations-heading">
   <div class="nfq-admin-section-title"><h2 id="admin-operations-heading">Research operations</h2>
    <ContextHelp label="About research operations" title="Scientific operations">
     <p>These operations are not yet connected. The states below describe implemented capabilities, not a judgement about the signed-in account's professional authority.</p>
    </ContextHelp>
   </div>
   <div class="admin-readiness-grid">
    <article><h3>Source contributions</h3><p>Recorded-source corrections can be prepared and downloaded from Evidence &amp; Provenance. Submission and audit are not connected.</p><span>Local draft only</span><RouterLink to="/evidence">Open Evidence</RouterLink></article>
    <article><h3>Scientific review</h3><p>Helios exposes read-only connection and review states. Controlled validation and approval remain unavailable.</p><span>Read only</span><RouterLink to="/helios">Open Helios</RouterLink></article>
    <article><h3>Role management</h3><p>Assignment, revocation and administrator actions require an independently authorized and audited backend.</p><span>Not connected</span></article>
   </div>
  </section>
 </div>
</template>
<style scoped>
.nfq-admin-workspace{min-width:0;max-width:1180px;margin:0 auto;padding-bottom:34px}
.nfq-admin-head{display:flex;align-items:center;justify-content:space-between;gap:15px;margin:0 0 18px;padding:0 0 13px;border-bottom:1px solid #dce1de}
.nfq-admin-head h1{margin:0;font-size:clamp(26px,3vw,37px);line-height:1.13;font-weight:730;letter-spacing:-.04em;color:#292f33}
.nfq-admin-head :deep(.nfq-context-help summary),.nfq-admin-section-title :deep(.nfq-context-help summary){width:32px;height:32px}
.nfq-admin-workspace .research-entry{display:grid;grid-template-columns:minmax(0,1.18fr) minmax(255px,.82fr);gap:clamp(20px,3vw,37px);padding:0 0 20px;border:0;align-items:start}
.nfq-admin-workspace .research-entry-main,.nfq-admin-workspace .research-entry-aside{min-width:0}
.nfq-admin-workspace .research-entry-main h2,.nfq-admin-workspace .research-entry-aside h2{margin:0 0 9px;font-size:16px;font-weight:720;letter-spacing:-.015em;color:#343f45}
.nfq-admin-identity{font-size:14px;font-weight:660;color:#292f33;overflow-wrap:anywhere;margin:0 0 11px}
.nfq-admin-access-message{font-size:12px;color:#5a676e;line-height:1.6;max-width:64ch;margin:0}
.nfq-admin-access-actions{display:flex;flex-wrap:wrap;align-items:center;gap:9px 17px;margin-top:16px}
.nfq-admin-access-actions button,.nfq-admin-access-actions .research-entry-link{display:inline-flex;align-items:center;min-height:40px;margin:0;padding:9px 13px;background:#fff;border:1px solid #cbd8d8;border-radius:4px;color:#245f66;text-decoration:none;font:inherit;font-size:12px;font-weight:680;cursor:pointer}
.nfq-admin-access-actions button:disabled{opacity:.55;cursor:wait}
.nfq-admin-secondary-link{font-size:12px;font-weight:670;color:#245f66;min-height:40px;display:inline-flex;align-items:center;text-underline-offset:3px}
.nfq-admin-workspace .research-entry-aside{padding:0 0 0 clamp(18px,2.5vw,30px);border-left:1px solid #dce1de}
.nfq-admin-workspace .research-capabilities{display:grid;gap:0;margin:8px 0 5px}
.nfq-admin-workspace .research-capabilities>div{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:5px 13px;padding:9px 0;border:0}
.nfq-admin-workspace .research-capabilities dt{font-size:12px;color:#65717a}
.nfq-admin-workspace .research-capabilities dd{margin:0;text-align:right;font-size:12px;font-weight:730;color:#343f45;overflow-wrap:anywhere}
.nfq-admin-workspace .research-entry-aside :deep(.nfq-context-help){margin:8px 0 0}
.nfq-admin-workspace .admin-readiness{margin:0;padding:17px 0 0;border-top:1px solid #dce1de}
.nfq-admin-section-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 8px}
.nfq-admin-section-title h2{margin:0;font-size:18px;letter-spacing:-.02em;font-weight:720;color:#292f33}
.nfq-admin-workspace .admin-readiness-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 25px}
.nfq-admin-workspace .admin-readiness-grid article{display:flex;flex-direction:column;align-items:flex-start;gap:8px;min-width:0;padding:14px 0 10px;border:0}
.nfq-admin-workspace .admin-readiness-grid h3{margin:0;font-size:14px;font-weight:720;color:#37454d}
.nfq-admin-workspace .admin-readiness-grid p{margin:0;font-size:12px;line-height:1.6;color:#64717a}
.nfq-admin-workspace .admin-readiness-grid span{font-size:11px;font-weight:720;color:#65717a;letter-spacing:0;text-transform:none}
.nfq-admin-workspace .admin-readiness-grid a{display:inline-flex;min-height:37px;align-items:center;color:#245f66;font-size:12px;font-weight:680;text-underline-offset:3px}
.nfq-admin-workspace a:focus-visible,.nfq-admin-workspace button:focus-visible{outline:2px solid #197b82;outline-offset:3px}
@media(max-width:800px){.nfq-admin-workspace .research-entry{grid-template-columns:minmax(0,1fr);gap:16px}.nfq-admin-workspace .research-entry-aside{padding:16px 0 0;border-left:0;border-top:1px solid #dce1de}}
@media(max-width:600px){.nfq-admin-head{margin-bottom:12px}.nfq-admin-workspace .admin-readiness-grid{grid-template-columns:minmax(0,1fr)}.nfq-admin-workspace .admin-readiness-grid article{padding:12px 0;border-bottom:1px solid #e9edeb}.nfq-admin-workspace .research-capabilities>div{gap:5px 10px}}
</style>

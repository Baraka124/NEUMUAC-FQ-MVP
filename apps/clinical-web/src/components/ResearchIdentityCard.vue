<script setup lang="ts">
import {computed} from 'vue';
import {RouterLink} from 'vue-router';
import ContextHelp from './ContextHelp.vue';
import type {ProfessionalProfile} from '../services/professionalProfile';
import type {WorkspacePersona} from '../domain/workspacePersona';
import {verifiedProfileName,profileMonogram,visibleWorkspaceRole,type ProfessionalPhase} from '../domain/profilePresentation';

const emit=defineEmits<{(e:'open-people'):void}>();
const props=defineProps<{
 email:string;
 persona:WorkspacePersona;
 roleLabel:string;
 professionalProfile:ProfessionalProfile|null;
 professionalPhase:ProfessionalPhase;
}>();
const hasVerifiedProfile=computed(()=>props.professionalPhase==='ready'&&Boolean(props.professionalProfile));
const displayName=computed(()=>verifiedProfileName(props.professionalProfile,props.professionalPhase,props.persona));
const monogram=computed(()=>profileMonogram(props.professionalProfile,props.professionalPhase));
const accessLabel=computed(()=>visibleWorkspaceRole(props.persona,props.roleLabel));
const readableStaffType=computed(()=>props.professionalProfile?.staffType.replaceAll('_',' ')||'');
const sourceDate=computed(()=>{
 const date=props.professionalProfile?.sourceVerifiedAt;
 return date&&Number.isFinite(Date.parse(date))
  ?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(date))
  :'';
});
const profileStatus=computed(()=>{
 if(props.professionalPhase==='checking')return 'Checking professional identity…';
 if(props.professionalPhase==='unavailable')return 'Professional details unavailable. FQ access is independent.';
 if(props.professionalPhase==='unlinked')return props.persona==='guest'
  ? 'This external account has no linked institutional profile.'
  : 'No linked institutional profile';
 return 'Professional information has not been retrieved.';
});
</script>

<template>
 <section class="nfq-profile-card" data-testid="research-identity-card" aria-label="Research account profile">
  <div class="nfq-profile-top">
   <div class="nfq-profile-avatar" aria-hidden="true">{{monogram}}</div>
   <div class="nfq-profile-main">
    <div class="nfq-profile-title-row">
     <h2 class="nfq-profile-display-name">{{displayName}}</h2>
     <span class="nfq-profile-role" data-testid="profile-role-label">{{accessLabel}}</span>
    </div>
    <p class="nfq-profile-email">{{email}}</p>
    <p v-if="hasVerifiedProfile" class="nfq-profile-position">
     {{readableStaffType}}<template v-if="professionalProfile?.department"> · {{professionalProfile.department}}</template>
    </p>
   </div>
  </div>

  <div v-if="hasVerifiedProfile" class="nfq-profile-affiliation">
   <div v-if="professionalProfile?.researchGroup" class="nfq-profile-fact">
    <span class="nfq-profile-fact-label">Research group</span>
    <strong>{{professionalProfile.researchGroup}}</strong>
   </div>
   <div v-if="professionalProfile?.researchLine" class="nfq-profile-fact">
    <span class="nfq-profile-fact-label">Research line</span>
    <strong>{{professionalProfile.researchLine}}</strong>
   </div>
   <div v-if="!professionalProfile?.researchGroup&&!professionalProfile?.researchLine" class="nfq-profile-fact">
    <span class="nfq-profile-fact-label">Professional record</span>
    <strong>Linked and verified</strong>
   </div>
  </div>
  <p v-else class="nfq-profile-empty" role="status">{{profileStatus}}</p>

  <div class="nfq-profile-bottom">
   <div class="nfq-profile-source">
    <span class="nfq-profile-source-dot" :class="{'nfq-profile-source-verified':hasVerifiedProfile}" aria-hidden="true"></span>
    <span>{{hasVerifiedProfile ? 'Verified professional snapshot · '+sourceDate : 'FQ account identity'}}</span>
    <ContextHelp label="About your professional profile" title="Profile provenance">
     <p>Professional fields are read from a restricted, verified snapshot stored within the independent FQ database. This screen never writes to neumDESK.</p>
     <p>Professional affiliation is not permission to curate, review or administer scientific records. Those actions require independently verified FQ roles and server authorization.</p>
    </ContextHelp>
   </div>
   <nav class="nfq-profile-links" aria-label="Account quick links">
    <RouterLink to="/variants">Variant explorer</RouterLink>
    <button v-if="persona==='administrator'" type="button" @click="emit('open-people')">Manage people</button>
   </nav>
  </div>
 </section>
</template>

<style scoped>
.nfq-profile-card{min-width:0;background:#fff;border:1px solid #dfe7f0;border-radius:14px;box-shadow:0 7px 26px rgba(29,64,103,.045);overflow:hidden;color:#1b324b}
.nfq-profile-top{display:flex;align-items:center;gap:16px;padding:19px 21px 15px;min-width:0}
.nfq-profile-avatar{width:58px;height:58px;flex:none;border-radius:15px;display:grid;place-items:center;background:linear-gradient(145deg,#143754 0%,#397cb1 100%);color:#fff;font-size:19px;font-weight:760;letter-spacing:-.04em;box-shadow:0 5px 15px rgba(24,64,102,.14)}
.nfq-profile-main{min-width:0;flex:1;display:grid;gap:4px}
.nfq-profile-title-row{display:flex;align-items:center;flex-wrap:wrap;gap:7px 12px;min-width:0}
.nfq-profile-display-name{font-size:clamp(18px,2vw,23px);line-height:1.18;letter-spacing:-.035em;font-weight:730;color:#18344f;margin:0;overflow-wrap:anywhere}
.nfq-profile-role{display:inline-flex;align-items:center;min-height:24px;border-radius:6px;background:#edf4fc;border:1px solid #dce9f7;color:#315e88;font-size:10.5px;line-height:1.25;font-weight:760;padding:4px 8px;white-space:nowrap}
.nfq-profile-email{margin:0;color:#50677e;font-size:12px;line-height:1.5;overflow-wrap:anywhere}
.nfq-profile-position{margin:0;color:#425a71;font-size:12px;line-height:1.45;text-transform:none}
.nfq-profile-affiliation{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:0 21px 16px}
.nfq-profile-fact{min-width:0;background:#f7faff;border:1px solid #ebf0f8;border-radius:9px;padding:10px 12px;display:grid;gap:4px}
.nfq-profile-fact-label{font-size:10px;font-weight:650;letter-spacing:.025em;color:#66788b}
.nfq-profile-fact strong{font-size:12px;font-weight:680;line-height:1.4;color:#263f59;overflow-wrap:anywhere}
.nfq-profile-empty{margin:0;padding:0 21px 17px;color:#627387;font-size:12px;line-height:1.55}
.nfq-profile-bottom{padding:11px 17px 11px 21px;border-top:1px solid #edf1f6;background:#fcfdff;display:flex;align-items:center;justify-content:space-between;gap:10px 18px;flex-wrap:wrap}
.nfq-profile-source{display:flex;gap:6px;align-items:center;min-width:0;color:#617388;font-size:10.5px;line-height:1.35}
.nfq-profile-source-dot{width:7px;height:7px;flex:none;border-radius:50%;background:#aab5c1}
.nfq-profile-source-verified{background:#3175ac}
.nfq-profile-source :deep(.nfq-context-help summary){width:25px;height:25px;border-color:#e0e8f1;color:#526b81}
.nfq-profile-links{display:flex;align-items:center;gap:7px 14px;flex-wrap:wrap}
.nfq-profile-links a,.nfq-profile-links button{font-size:11px;font-weight:670;color:#276094;text-decoration:none;white-space:nowrap}
.nfq-profile-links button{border:0;padding:0;background:transparent;font-family:inherit;color:#276094;cursor:pointer}
.nfq-profile-links a:hover,.nfq-profile-links button:hover{text-decoration:underline;text-underline-offset:4px}
.nfq-profile-links a:focus-visible,.nfq-profile-links button:focus-visible{outline:2px solid #276094;outline-offset:3px;border-radius:3px}
@media(max-width:600px){
 .nfq-profile-top{gap:11px;align-items:flex-start;padding:15px 15px 13px}
 .nfq-profile-avatar{width:46px;height:46px;border-radius:12px;font-size:15px}
 .nfq-profile-affiliation{padding:0 15px 13px;grid-template-columns:minmax(0,1fr);gap:7px}
 .nfq-profile-bottom{padding:11px 15px;align-items:flex-start}
 .nfq-profile-empty{padding:0 15px 13px}
 .nfq-profile-role{font-size:10px}
}
@media(prefers-reduced-motion:reduce){.nfq-profile-card *{scroll-behavior:auto}}

/* 14H123 compact clinical identity — no inflated hero/padded tool row */
.nfq-profile-card{border-radius:11px;box-shadow:none;border-color:#e3e9f0}
.nfq-profile-top{padding:15px 17px 11px;gap:13px}
.nfq-profile-avatar{width:45px;height:45px;border-radius:11px;font-size:14px;box-shadow:none;background:#214b71}
.nfq-profile-display-name{font-size:clamp(18px,1.75vw,21px)}
.nfq-profile-role{border-radius:5px;border:0;background:#eaf2fb;color:#285b86;padding:3px 8px;font-size:10px;min-height:21px}
.nfq-profile-empty{font-size:11.5px;margin:0;padding:0 17px 12px;color:#688095}
.nfq-profile-affiliation{padding:0 17px 11px;gap:8px}
.nfq-profile-fact{padding:7px 10px;background:#f8fafc;border-color:#edf1f6}
.nfq-profile-bottom{padding:8px 14px 8px 17px;background:#fcfdff}
.nfq-profile-source{font-size:10px;gap:5px}
.nfq-profile-source :deep(.nfq-context-help summary){width:23px;height:23px}
.nfq-profile-links{gap:12px}
.nfq-profile-links a,.nfq-profile-links button{font-size:10.5px;color:#316488;font-weight:680}
@media(max-width:600px){
 .nfq-profile-top{padding:13px;gap:10px}
 .nfq-profile-avatar{width:40px;height:40px}
 .nfq-profile-empty{padding:0 13px 10px}
 .nfq-profile-affiliation{padding:0 13px 10px}
 .nfq-profile-bottom{padding:8px 13px}
}

/* 14H137C5 · Verified identity, not a decorative dashboard badge. */
.nfq-profile-card{
 border-radius:8px;
 border-color:#dce6f1;
 box-shadow:none;
}
.nfq-profile-top{
 gap:11px;
 padding:14px 16px 12px;
 align-items:center;
}
.nfq-profile-avatar{
 width:42px;
 height:42px;
 flex:0 0 42px;
 border:1px solid #bbd0e7;
 border-radius:9px;
 background:transparent;
 color:#345d87;
 font-size:13px;
 font-weight:710;
 box-shadow:none;
}
.nfq-profile-role{
 background:transparent;
 border-color:#d4e0ed;
 color:#466b93;
 font-weight:650;
}
.nfq-profile-affiliation{gap:8px;padding:0 16px 12px}
.nfq-profile-fact{
 border-radius:6px;
 padding:8px 10px;
 background:transparent;
 border-color:#e4ebf3;
}
.nfq-profile-empty{padding:0 16px 13px}
.nfq-profile-bottom{
 background:transparent;
 padding:10px 13px 10px 16px;
 border-color:#e7edf4;
}
.nfq-profile-links :is(button,a){
 min-height:40px;
 display:inline-flex;
 align-items:center;
}
@media(max-width:420px){
 .nfq-profile-top{padding:12px 12px 10px;gap:9px}
 .nfq-profile-avatar{width:38px;height:38px;flex-basis:38px;font-size:12px}
 .nfq-profile-affiliation{padding:0 12px 10px}
 .nfq-profile-fact{min-width:0}
 .nfq-profile-empty{padding:0 12px 12px}
 .nfq-profile-bottom{padding:9px 12px}
}

</style>

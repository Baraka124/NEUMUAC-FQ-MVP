<script setup lang="ts">
import {computed,ref} from 'vue';
import {authController} from '../services/authSession';
import {researchVisitSession} from '../domain/researchVisitSession';
import ContextHelp from './ContextHelp.vue';

const emit=defineEmits<{close:[];open:[id:string]}>();
const session=researchVisitSession.state;
const signedIn=computed(()=>authController?.state.phase==='signed-in'&&Boolean(authController.state.userId));
const notice=ref('');
const status=computed(()=>session.phase==='active'?'Recording verified dossier opens':
 session.phase==='paused'?session.pauseReason==='idle'?'Paused after inactivity':
 session.pauseReason==='hidden'?'Paused when browser was hidden':'Paused manually':
 session.phase==='ended'?'Session ended — export available':'No working session started');
const stamp=(value:string|null)=>value?value.replace('T',' ').slice(0,16)+' UTC':'Not recorded';
function start():void{
 if(!signedIn.value||!researchVisitSession.start(authController?.state.userId??null,!document.hidden)){
  notice.value='Sign in and return to an active browser tab to start a research session.';return;
 }
 notice.value='Session started. Only confirmed variant dossiers opened while active will be recorded.';
}
function pause():void{researchVisitSession.pause('manual');notice.value='Session paused; no visits are being recorded.';}
function resume():void{
 if(!researchVisitSession.resume(authController?.state.userId??null,!document.hidden)){
  notice.value='The research session could not be resumed.';return;
 }
 notice.value='Working session resumed.';
}
function end():void{researchVisitSession.end();notice.value='Session closed for recording. You can export or clear the local ledger.';}
function clear():void{researchVisitSession.clear();notice.value='Local working session cleared.';}
function download():void{
 if(!signedIn.value)return;
 const csv=researchVisitSession.exportCsv();
 if(!csv){notice.value='There are no confirmed variant visits available for export.';return;}
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 try{
  const a=document.createElement('a');a.href=url;a.download='neumuacFQ-research-session.csv';
  document.body.appendChild(a);a.click();a.remove();
  notice.value='Session report exported. It is a local working record, not a signed clinical audit.';
 }finally{window.setTimeout(()=>URL.revokeObjectURL(url),5000);}
}
</script>

<template>
 <section class="nfq-visit-session" data-testid="nfq-visit-session" aria-labelledby="nfq-session-title">
  <header class="nfq-session-head">
   <div>
    <span class="nfq-batch-kicker">RESEARCH WORKING MEMORY · PRIVATE TO THIS PAGE LOAD</span>
    <h2 id="nfq-session-title">My variant session</h2>
    <p>Keep a temporary ledger of verified CFTR dossiers you open during this working session.</p>
   </div>
   <div class="nfq-session-head-actions">
    <ContextHelp label="About local research sessions" title="Clinician-owned working sessions">
     <p>Session recording starts only when you press Start. It records verified variant identity, selected recorded scientific metadata, and the time of the actual dossier opening—not raw queries, patient information, or browser searches.</p>
     <p>Recording pauses after 20 minutes of inactivity, when the tab is hidden, or when you pause it. You must resume explicitly. Signing out or changing accounts clears the working session; reloading the application also clears it.</p>
     <p>No information is uploaded to Supabase, shared with the research group, or retained in local storage. CSV export is an optional personal working note, not a verified scientific review or institutional audit trail.</p>
    </ContextHelp>
    <button type="button" aria-label="Close research session panel" @click="emit('close')">Close</button>
   </div>
  </header>
  <p class="nfq-session-status" role="status" data-testid="nfq-session-status">
   <span class="nfq-session-state" :class="'nfq-session-state-'+session.phase">{{status}}</span>
   <span>{{session.visits.length}} unique variants · {{session.totalOpens}} confirmed opens</span>
  </p>
  <p v-if="!signedIn" class="nfq-session-note" role="status">Sign in with a research account to start a local working session. No activity is recorded for public browsing.</p>
  <div v-else class="nfq-session-actions">
   <button v-if="session.phase==='off'||session.phase==='ended'" type="button" data-testid="nfq-session-start" @click="start">{{session.phase==='ended'?'Start new session':'Start session'}}</button>
   <button v-if="session.phase==='active'" type="button" data-testid="nfq-session-pause" @click="pause">Pause</button>
   <button v-if="session.phase==='paused'" type="button" data-testid="nfq-session-resume" @click="resume">Resume</button>
   <button v-if="session.phase==='active'||session.phase==='paused'" type="button" data-testid="nfq-session-end" @click="end">End session</button>
   <button type="button" data-testid="nfq-session-export" :disabled="!session.visits.length" @click="download">Export session · CSV</button>
   <button v-if="session.phase!=='off'" type="button" data-testid="nfq-session-clear" @click="clear">Clear</button>
  </div>
  <p v-if="notice" class="nfq-session-note" role="status">{{notice}}</p>
  <dl v-if="session.startedAt" class="nfq-session-meta">
   <div><dt>Started</dt><dd>{{stamp(session.startedAt)}}</dd></div>
   <div><dt>Last interaction</dt><dd>{{stamp(session.lastActivityAt)}}</dd></div>
   <div v-if="session.endedAt"><dt>Ended</dt><dd>{{stamp(session.endedAt)}}</dd></div>
  </dl>
  <div v-if="session.visits.length" class="nfq-session-ledger" aria-label="Confirmed variant visits this session">
   <article v-for="item in session.visits" :key="item.id" class="nfq-session-entry" data-testid="nfq-session-entry">
    <div class="nfq-session-entry-main">
     <strong>{{item.name}} <small>· #{{item.id}}</small></strong>
     <span>{{item.protein||item.cdna||'Additional nomenclature not recorded'}}</span>
     <div class="nfq-session-facts">
      <span v-if="item.recordedClass">Class {{item.recordedClass}}</span>
      <span v-if="item.subtype">{{item.subtype}} subtype</span>
      <span v-if="item.eti">ETI · {{item.eti}}</span>
      <span v-if="item.alyftrek">Alyftrek · {{item.alyftrek}}</span>
      <span v-if="item.validations!==null">{{item.validations}} recorded validations</span>
     </div>
     <small>First {{stamp(item.firstViewedAt)}} · latest {{stamp(item.lastViewedAt)}} · {{item.views}} {{item.views===1?'view':'views'}}</small>
    </div>
    <button type="button" :aria-label="'Reopen viewed variant '+item.id" @click="emit('open',item.id)">Open</button>
   </article>
  </div>
  <p v-else class="nfq-session-note">No confirmed variant dossier has been opened while this session was active.</p>
  <p class="nfq-session-disclaimer">Local and temporary · No background analytics, institution-wide activity inference, clinical approval, or automatic therapeutic recommendations.</p>
 </section>
</template>

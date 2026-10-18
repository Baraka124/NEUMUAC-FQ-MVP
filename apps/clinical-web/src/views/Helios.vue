<script setup lang="ts">
import {ref} from 'vue';
const showContext=ref(false);
const selectedReviewId=ref<string|null>(null);
function openReview(id:string){selectedReviewId.value=id;assessmentStep.value='record';selectedArea.value='evidence';}
function closeReview(){selectedReviewId.value=null;selectedArea.value='queue';}
// No records are supplied until a server-authorized, provenance-reviewed endpoint exists.
const availableReviews:readonly {id:string;label:string}[]=[];
const assessmentStep=ref<'record'|'sources'|'uncertainty'>('record');
const selectedArea=ref<'queue'|'evidence'|'signals'|'history'>('queue');
const areas=[
 {id:'queue',title:'Review queue',detail:'Proposals, priority and ownership',state:'Awaiting authorized connection'},
 {id:'evidence',title:'Evidence assessment',detail:'Proposed change and recorded supporting sources',state:'Scientific review pending'},
 {id:'signals',title:'Signals',detail:'Source scans, scientific drift and monitor targets',state:'Scans and monitoring not connected'},
 {id:'history',title:'History',detail:'Review chronology, validation and feedback',state:'Restricted until access review'}
] as const;
</script>

<template>
 <div class="page helios-workspace">
  <div class="helios-head">
   <div>
    <div class="eyebrow">SCIENTIFIC CURATION</div>
    <h1>Helios</h1>
    <p class="helios-subtitle">Research review</p>
   </div>
   <button type="button" class="helios-info" aria-label="About Helios and current access limitations"
    aria-controls="helios-context" :aria-expanded="showContext" @click="showContext=!showContext">i</button>
  </div>
  <div v-if="showContext" id="helios-context" class="helios-context">
   Helios is being rebuilt from the original review workflows. Proposals, approval, claims and audit
   history remain unavailable here until server-side reviewer authorization and scientific governance
   have been verified. This view does not display synthetic review records.
  </div>
  <div class="helios-current" role="status">
   <span class="helios-status-dot" aria-hidden="true"></span>
   <span>Read-only preparation</span>
   <span class="helios-status-sep" aria-hidden="true">·</span>
   <span>Review records not connected</span>
  </div>
  <section class="helios-panel" aria-labelledby="helios-panel-title">
   <div class="helios-panel-heading">
    <h2 id="helios-panel-title">Review workspace</h2>
    <span class="helios-caption">No live decisions available</span>
   </div>
   <div class="helios-area-nav" role="group" aria-label="Helios review areas">
    <button v-for="area in areas" :key="area.id" type="button"
     :class="{ 'helios-area-selected': selectedArea===area.id }"
     :aria-pressed="selectedArea===area.id" @click="selectedArea=area.id">{{area.title}}</button>
   </div>
   <div v-for="area in areas" v-show="selectedArea===area.id" :key="area.id"
    class="helios-area-detail" role="region" :aria-label="area.title">
    <h3>{{area.title}}</h3>
    <p>{{area.detail}}</p>
    <template v-if="area.id==='queue' && availableReviews.length">
     <div class="helios-proposal-list">
      <button v-for="review in availableReviews" :key="review.id" type="button"
       @click="openReview(review.id)">{{review.label}} <span aria-hidden="true">→</span></button>
     </div>
    </template>
    <template v-if="area.id==='signals'">
     <div class="helios-recovery-sections" aria-label="Scientific signal capabilities">
      <div><strong>Source assessment</strong><span class="helios-restricted"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>Internal and external evidence scans · Not connected</span></div>
      <div><strong>Consistency</strong><span class="helios-restricted"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>Contradictions and drift · Not connected</span></div>
      <div><strong>Monitoring</strong><span class="helios-restricted"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>Watch targets and scheduled checks · Not connected</span></div>
     </div>
    </template>
    <template v-if="area.id==='history'">
     <div class="helios-recovery-sections" aria-label="Review history capabilities">
      <div><strong>Decisions</strong><span class="helios-restricted"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>Reviewer audit trail · Access restricted</span></div>
      <div><strong>Validation</strong><span class="helios-restricted"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>Scientific validation chronology · Not connected</span></div>
      <div><strong>Feedback</strong><span class="helios-restricted"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>Source feedback and review calibration · Not connected</span></div>
     </div>
    </template>
    <template v-if="area.id==='evidence'">
     <div v-if="selectedReviewId" class="helios-selected-review">
      <button type="button" @click="closeReview">Back to review queue</button>
      <span>Review {{selectedReviewId}}</span>
     </div>
     <div class="helios-review-steps" role="group" aria-label="Evidence examination sequence">
      <button type="button" :aria-pressed="assessmentStep==='record'" @click="assessmentStep='record'">1. Comparison</button>
      <button type="button" :aria-pressed="assessmentStep==='sources'" @click="assessmentStep='sources'">2. Sources</button>
      <button type="button" :aria-pressed="assessmentStep==='uncertainty'" @click="assessmentStep='uncertainty'">3. Uncertainty</button>
     </div>
     <div class="helios-assessment-grid" aria-label="Evidence assessment structure">
      <section :hidden="assessmentStep!=='record'" class="helios-assessment-cell" aria-label="Recorded value">
       <span class="helios-assessment-label">Recorded value</span>
       <p>Awaiting an authorized review record</p>
      </section>
      <section :hidden="assessmentStep!=='record'" class="helios-assessment-cell" aria-label="Proposed change">
       <span class="helios-assessment-label">Proposed change</span>
       <p>No proposal selected</p>
      </section>
      <section :hidden="assessmentStep!=='sources'" class="helios-assessment-cell" aria-label="Supporting evidence">
       <span class="helios-assessment-label">Supporting evidence</span>
       <p>No verified references loaded</p>
      </section>
      <section :hidden="assessmentStep!=='uncertainty'" class="helios-assessment-cell" aria-label="Uncertainty">
       <span class="helios-assessment-label">Uncertainty</span>
       <p>Cannot be assessed without source records</p>
      </section>
     </div>
     <div class="helios-empty-state" role="status">Evidence assessment is unavailable until authorized records and traceable sources are connected. No scientific decision is implied.</div>
    </template>
    <div v-else class="helios-empty-state" role="status">{{area.state}}. No live records or review actions are shown.</div>
   </div>
  </section>
  <p class="helios-footnote">The existing research catalog remains available through <RouterLink to="/variants">Variants</RouterLink> and <RouterLink to="/evidence">Evidence</RouterLink>.</p>
 </div>
</template>

<style scoped>
.helios-workspace{max-width:1060px;margin:0 auto;padding-bottom:4rem}
.helios-head{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1.35rem}
.helios-head h1{margin:.26rem 0 .15rem;font-size:clamp(1.65rem,2.8vw,2.2rem);font-weight:600;letter-spacing:-.035em;line-height:1.2}
.helios-subtitle{margin:0;color:var(--text-muted,#687381);font-size:.92rem}
.helios-info{width:31px;height:31px;flex:none;border:1px solid var(--border,#dce2e7);background:transparent;border-radius:50%;color:inherit;font-size:.8rem;font-weight:600;cursor:pointer}
.helios-info:focus-visible{outline:2px solid currentColor;outline-offset:3px}
.helios-context{border:1px solid var(--border,#dce2e7);border-radius:12px;padding:1rem 1.1rem;font-size:.85rem;line-height:1.65;max-width:74ch;margin-bottom:1rem}
.helios-current{display:flex;align-items:center;flex-wrap:wrap;gap:.5rem;color:var(--text-muted,#687381);font-size:.81rem;margin-bottom:1.35rem}
.helios-status-dot{width:7px;height:7px;border-radius:50%;background:#8996a3;flex:none}
.helios-status-sep{opacity:.6}
.helios-panel{background:var(--surface,#fff);border:1px solid var(--border,#dce2e7);border-radius:14px;overflow:hidden}
.helios-panel-heading{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:.5rem;padding:1.1rem 1.25rem;border-bottom:1px solid var(--border,#dce2e7)}
.helios-panel-heading h2{font-size:1rem;font-weight:600;letter-spacing:-.015em;margin:0}
.helios-caption{font-size:.75rem;color:var(--text-muted,#687381)}
.helios-workitem{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1.1rem 1.25rem}
.helios-workitem+.helios-workitem{border-top:1px solid var(--border,#dce2e7)}
.helios-workitem h3{font-size:.9rem;font-weight:600;margin:0 0 .24rem}
.helios-workitem p{font-size:.78rem;color:var(--text-muted,#687381);margin:0;line-height:1.55}
.helios-workitem-state{color:var(--text-muted,#687381);font-size:.75rem;text-align:right;max-width:190px}
.helios-footnote{margin:1.2rem 0 0;font-size:.8rem;line-height:1.6;color:var(--text-muted,#687381)}
.helios-footnote a{color:inherit;text-underline-offset:3px}
@media(max-width:620px){.helios-panel-heading,.helios-workitem{padding:1rem}.helios-workitem{align-items:flex-start;flex-direction:column;gap:.4rem}.helios-workitem-state{text-align:left;max-width:none}.helios-workspace{max-width:100%}}
</style>
<style scoped>
.helios-area-nav{display:flex;flex-wrap:wrap;gap:.25rem;padding:.75rem 1rem;border-bottom:1px solid var(--border,#dce2e7)}
.helios-area-nav button{border:1px solid transparent;background:transparent;color:var(--text-muted,#687381);font-size:.81rem;font-weight:550;padding:.52rem .75rem;border-radius:8px;cursor:pointer}
.helios-area-nav button.helios-area-selected{background:var(--surface-secondary,#f4f6f8);border-color:var(--border,#dce2e7);color:inherit}
.helios-area-nav button:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.helios-area-detail{padding:1.25rem;min-height:170px}
.helios-area-detail h3{font-size:.98rem;font-weight:600;margin:0 0 .4rem}
.helios-area-detail p{font-size:.84rem;line-height:1.6;color:var(--text-muted,#687381);margin:0 0 1.2rem}
.helios-empty-state{border-top:1px solid var(--border,#dce2e7);padding-top:1rem;font-size:.8rem;color:var(--text-muted,#687381)}
@media(max-width:620px){.helios-area-nav{padding:.5rem;gap:.15rem}.helios-area-nav button{padding:.52rem .6rem;font-size:.76rem}.helios-area-detail{padding:1rem}}
</style>

<style scoped>
.helios-assessment-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0;border:1px solid var(--border,#dce2e7);border-radius:10px;overflow:hidden;margin:1rem 0}
.helios-assessment-cell{padding:1rem;min-width:0}
.helios-assessment-cell:nth-child(odd){border-right:1px solid var(--border,#dce2e7)}
.helios-assessment-cell:nth-child(-n+2){border-bottom:1px solid var(--border,#dce2e7)}
.helios-assessment-label{display:block;font-size:.72rem;font-weight:600;letter-spacing:.015em;color:var(--text-muted,#687381)}
.helios-assessment-cell p{margin:.45rem 0 0;font-size:.83rem;line-height:1.5}
@media(max-width:620px){.helios-assessment-grid{grid-template-columns:minmax(0,1fr)}.helios-assessment-cell:nth-child(odd){border-right:0}.helios-assessment-cell:not(:last-child){border-bottom:1px solid var(--border,#dce2e7)}}
</style>

<style scoped>
.helios-review-steps{display:flex;gap:.35rem;flex-wrap:wrap;margin:1rem 0 .55rem}
.helios-review-steps button{background:transparent;border:1px solid transparent;color:var(--text-muted,#687381);padding:.52rem .75rem;border-radius:8px;font-size:.8rem;cursor:pointer}
.helios-review-steps button[aria-pressed="true"]{color:inherit;border-color:var(--border,#dce2e7);background:var(--surface-secondary,#f4f6f8)}
.helios-review-steps button:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.helios-review-steps+.helios-assessment-grid{display:flex;flex-wrap:wrap}
.helios-review-steps+.helios-assessment-grid .helios-assessment-cell:not([hidden]){flex:1 1 230px;border:0}
.helios-review-steps+.helios-assessment-grid .helios-assessment-cell[hidden]{display:none}
@media(max-width:620px){.helios-review-steps+.helios-assessment-grid .helios-assessment-cell:not([hidden]){flex-basis:100%}}
</style>

<style scoped>
.helios-proposal-list{display:grid;gap:.45rem;margin:.7rem 0}
.helios-proposal-list button{display:flex;justify-content:space-between;text-align:left;gap:1rem;padding:1rem;border:1px solid var(--border,#dce2e7);border-radius:10px;background:transparent;font:inherit;cursor:pointer}
.helios-proposal-list button:focus-visible,.helios-selected-review button:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.helios-selected-review{display:flex;flex-wrap:wrap;gap:1rem;align-items:center;font-size:.8rem;color:var(--text-muted,#687381)}
.helios-selected-review button{background:transparent;border:0;padding:.45rem 0;color:inherit;font:inherit;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
</style>

<style scoped>
.helios-recovery-sections{margin:1.1rem 0 0;border-top:1px solid var(--border,#dce2e7)}
.helios-recovery-sections>div{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:.35rem 1rem;padding:.9rem 0;border-bottom:1px solid var(--border,#dce2e7)}
.helios-recovery-sections strong{font-weight:600;font-size:.84rem}
.helios-recovery-sections span{font-size:.78rem;color:var(--text-muted,#687381)}
@media(max-width:620px){.helios-recovery-sections>div{display:block}.helios-recovery-sections span{display:block;margin-top:.35rem}}
</style>

<style scoped>
.helios-restricted{display:inline-flex;align-items:center;gap:.45rem}
.helios-restricted svg{flex:none;opacity:.7}
</style>

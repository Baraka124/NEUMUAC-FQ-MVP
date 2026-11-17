<script setup lang="ts">
import {computed,ref,watch} from 'vue';
import type {VariantEvidencePassport} from '../domain/variantEvidencePassport';
import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import {buildEvidenceResearchPlan,type TriageBand} from '../domain/evidenceResearchPriorities';
import {THERAPIES} from '../domain/therapyRegistry';

const props=defineProps<{passport:VariantEvidencePassport;claims:readonly CuratedSourceClaim[]}>();
const emit=defineEmits<{openReview:[]}>();
const expanded=ref(false);
const band=ref<'all'|TriageBand>('all');
const plan=computed(()=>buildEvidenceResearchPlan(props.passport,props.claims));
const visible=computed(()=>plan.value.tasks.filter(t=>band.value==='all'||t.band===band.value));
const therapyName=(id:string|null)=>id?THERAPIES.find(t=>t.id===id)?.label??id:'Source identity';
watch(()=>props.passport.variantId,()=>{expanded.value=false;band.value='all';});
</script>

<template>
 <section class="nfq-triage" data-testid="nfq-evidence-research-plan"
  aria-label="Evidence discrepancy and research priorities">
  <header class="nfq-triage-header">
   <div>
    <strong>Evidence differences &amp; research priorities</strong>
    <p>Traceable research tasks from the current reviewed variant snapshot</p>
   </div>
   <button type="button" class="nfq-triage-toggle" :aria-expanded="expanded"
    data-testid="nfq-triage-toggle" @click="expanded=!expanded">
    {{expanded?'Hide worklist':'Examine worklist'}}
   </button>
  </header>
  <div v-if="expanded">
   <div class="nfq-triage-summary" aria-label="Research worklist counts">
    <span>{{plan.reviewFirst}} review first</span>
    <span>{{plan.investigate}} investigate</span>
    <span>{{plan.explore}} explore</span>
   </div>
   <p class="nfq-triage-caution">Priorities describe curation work, not clinical urgency,
    pathogenicity, efficacy or treatment eligibility. No status or record is changed.</p>
   <div class="nfq-triage-filters" aria-label="Filter research worklist">
    <button v-for="item in (['all','review-first','investigate','explore'] as const)"
     :key="item" type="button" :aria-pressed="band===item" @click="band=item">
     {{item==='all'?'All tasks':item==='review-first'?'Review first':
      item==='investigate'?'Investigate':'Explore'}}
    </button>
   </div>
   <p v-if="!visible.length" class="nfq-triage-empty">
    No tasks in this category within the accessible verified snapshot.
    This is not proof that the literature is complete.
   </p>
   <div v-else class="nfq-triage-list" data-testid="nfq-triage-items">
    <article v-for="task in visible" :key="task.id" class="nfq-triage-item"
     :data-band="task.band" :data-category="task.category">
     <div class="nfq-triage-top">
      <strong>{{task.title}}</strong>
      <span>{{task.band==='review-first'?'Review first':task.band==='investigate'?'Investigate':'Explore'}}</span>
     </div>
     <p class="nfq-triage-context">{{therapyName(task.therapy)}}
      <span v-if="task.referenceId"> · Reference #{{task.referenceId}}</span></p>
     <p>{{task.reason}}</p>
     <p><b>Next investigation:</b> {{task.nextAction}}</p>
     <p class="nfq-triage-trace">{{task.trace}}
      <span v-if="task.claimIds.length"> · claim IDs {{task.claimIds.join(', ')}}</span></p>
     <button v-if="task.category==='pending-peer-review'" type="button"
      class="nfq-triage-action" @click="emit('openReview')">
      Open existing independent review
     </button>
    </article>
   </div>
   <details class="nfq-triage-questions">
    <summary>Research questions behind this worklist</summary>
    <p v-for="question in plan.researchQuestions" :key="question">{{question}}</p>
   </details>
  </div>
 </section>
</template>

<style scoped>
.nfq-triage{border-top:1px solid var(--border,#dfe7ef);padding:13px 0 9px;color:var(--text,#243d5b)}
.nfq-triage-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
.nfq-triage-header strong{font-size:12px;font-weight:680;letter-spacing:-.01em}
.nfq-triage-header p{font-size:11px;color:var(--text-muted,#728299);margin:3px 0}
.nfq-triage button{font:inherit;font-size:11px;cursor:pointer;color:inherit}
.nfq-triage-toggle{padding:6px 9px;border-radius:5px;border:1px solid var(--border,#c7d8e7);background:transparent}
.nfq-triage-summary{display:flex;gap:6px 16px;flex-wrap:wrap;font-size:11px;margin:12px 0 5px}
.nfq-triage-caution,.nfq-triage-empty{font-size:11px;line-height:1.55;color:var(--text-muted,#70849b)}
.nfq-triage-filters{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0}
.nfq-triage-filters button{padding:5px 8px;border:1px solid var(--border,#d5e0e8);border-radius:4px;background:transparent}
.nfq-triage-filters button[aria-pressed=true]{border-color:var(--text,#243d5b);font-weight:680}
.nfq-triage-item{border-top:1px solid var(--border,#e1e9f0);padding:11px 0}
.nfq-triage-top{display:flex;justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap}
.nfq-triage-top strong{font-size:12px;font-weight:650}
.nfq-triage-top span,.nfq-triage-context,.nfq-triage-trace{font-size:10px;color:var(--text-muted,#728299)}
.nfq-triage-item p{font-size:11px;line-height:1.55;margin:4px 0}
.nfq-triage-item .nfq-triage-trace{font-size:10px;overflow-wrap:anywhere}
.nfq-triage-action{padding:0;border:0;background:none;text-decoration:underline;text-underline-offset:3px;margin-top:5px}
.nfq-triage-questions{font-size:11px;color:var(--text-muted,#728299);padding:10px 0}
.nfq-triage-questions p{line-height:1.55}
.nfq-triage button:focus-visible{outline:2px solid #3876c5;outline-offset:2px}
</style>

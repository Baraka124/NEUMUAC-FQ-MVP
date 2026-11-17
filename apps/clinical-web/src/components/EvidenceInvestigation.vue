<script setup lang="ts">
import {computed} from 'vue';
import type {EvidenceTriageTask} from '../domain/evidenceResearchPriorities';
import type {PassportSource} from '../domain/variantEvidencePassport';
import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import {assembleEvidenceInvestigation} from '../domain/evidenceInvestigation';

const props=defineProps<{
 task:EvidenceTriageTask;variantId:string;
 claims:readonly CuratedSourceClaim[];sources:readonly PassportSource[];
}>();
const emit=defineEmits<{openReview:[]}>();
const briefing=computed(()=>assembleEvidenceInvestigation(
 props.task,props.variantId,props.claims,props.sources
));
const finding=(v:string)=>({
 'reported-response':'Reported response','reported-no-response':'Reported no response',
 mixed:'Mixed results',inconclusive:'Inconclusive'
} as Record<string,string>)[v]??v;
</script>

<template>
 <section class="nfq-investigation" data-testid="nfq-evidence-investigation"
  :aria-label="'Source investigation for '+task.title">
  <header class="nfq-investigation-header">
   <div>
    <strong>Source investigation</strong>
    <p>{{task.title}} · {{briefing.approved}} approved · {{briefing.pending}} pending</p>
   </div>
   <button type="button" @click="emit('openReview')" class="nfq-investigation-action">
    Open scientific review
   </button>
  </header>
  <p class="nfq-investigation-boundary">{{briefing.explicitUncertainty}}</p>
  <div v-if="briefing.observations.length" class="nfq-investigation-observations"
   data-testid="nfq-investigation-observations">
   <article v-for="entry in briefing.observations" :key="entry.id"
    class="nfq-investigation-observation">
    <div class="nfq-investigation-row">
     <strong>{{finding(entry.finding)}}</strong>
     <span>{{entry.status==='approved'?'Independent review complete':
      entry.status==='pending'?'Review pending':entry.status}}</span>
    </div>
    <p><b>{{entry.sourceTitle}}</b> · Reference #{{entry.referenceId}}</p>
    <p>{{entry.model}} · {{entry.scope}}<template v-if="entry.genotypePair">
     · genotype {{entry.genotypePair.join(' / ')}}</template></p>
    <p v-if="entry.endpoint">Endpoint: {{entry.endpoint.code}} ·
     {{entry.endpoint.statistic}} · {{entry.endpoint.value}} {{entry.endpoint.unit}}
     · {{entry.endpoint.model}} · {{entry.endpoint.timepoint}}</p>
    <p v-if="entry.studyStats">Study design: {{entry.studyStats.design}} ·
     {{entry.studyStats.analysisUnit}} · intervention N {{entry.studyStats.interventionN}}</p>
    <p v-if="entry.studyIdentity">Study identity: {{entry.studyIdentity.registryType}}
     · {{entry.studyIdentity.registryId}} · {{entry.studyIdentity.populationModel}}</p>
    <p>Locator: {{entry.locator}} · Study family: {{entry.studyFamilyId}}</p>
    <p class="nfq-investigation-rationale">{{entry.rationale}}</p>
    <p class="nfq-investigation-audit">Claim {{entry.id}} · {{entry.reviewCount}}/2 independent reviews
     <template v-if="entry.reviewedAt"> · reviewed {{new Date(entry.reviewedAt).toLocaleDateString()}}</template>
     <template v-if="entry.audit.length"> · {{entry.audit.length}} audit events</template>
    </p>
    <a :href="entry.citationUrl" target="_blank" rel="noopener noreferrer">
     Inspect original source</a>
   </article>
  </div>
  <p v-else class="nfq-investigation-boundary" data-testid="nfq-investigation-empty">
   No claim may be proposed as verified without the original publication, exact study
   scope and independently reviewed source observation.
  </p>
  <div class="nfq-investigation-bottom">
   <p><b>Next investigation:</b> {{briefing.nextAction}}</p>
   <button type="button" @click="emit('openReview')" class="nfq-investigation-action">
    Propose or review in existing source workflow
   </button>
  </div>
 </section>
</template>

<style scoped>
.nfq-investigation{border-left:2px solid var(--border,#c6d7e6);padding:11px 0 8px 13px;margin:11px 0 5px;min-width:0}
.nfq-investigation-header,.nfq-investigation-row{display:flex;align-items:baseline;justify-content:space-between;gap:9px;flex-wrap:wrap}
.nfq-investigation-header strong{font-size:12px;font-weight:660}
.nfq-investigation-header p,.nfq-investigation-row span,.nfq-investigation-audit{font-size:10px;color:var(--text-muted,#687f95)}
.nfq-investigation-header p{margin:3px 0}
.nfq-investigation p{font-size:11px;line-height:1.55}
.nfq-investigation-boundary{color:var(--text-muted,#687f95);max-width:690px}
.nfq-investigation-observation{padding:11px 0;border-top:1px solid var(--border,#e1e9f0)}
.nfq-investigation-observation strong{font-size:11px}
.nfq-investigation-observation p{margin:4px 0;overflow-wrap:anywhere}
.nfq-investigation-observation .nfq-investigation-audit{font-size:10px}
.nfq-investigation-observation a{font-size:11px;text-underline-offset:3px;color:var(--link,#2869a9)}
.nfq-investigation-action{background:none;border:0;border-bottom:1px solid currentColor;padding:2px 0;color:var(--link,#2869a9);font:inherit;font-size:11px;cursor:pointer;text-align:left}
.nfq-investigation-bottom{border-top:1px solid var(--border,#e1e9f0);padding-top:7px}
.nfq-investigation button:focus-visible,.nfq-investigation a:focus-visible{outline:2px solid #3876c5;outline-offset:2px}
</style>

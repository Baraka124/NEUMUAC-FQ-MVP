<script setup lang="ts">
import {computed,ref} from 'vue';
import {THERAPIES,type CoreModulatorId} from '../domain/therapyRegistry';
import {ENDPOINTS,type EndpointCode} from '../domain/researchEndpointNormalization';
import {
 ANALYSIS_PROTOCOL_ID,buildStudyFamilyAnalysisProtocol,analysisProtocolJson,
 type ProtocolSelection
} from '../domain/studyFamilyAnalysisProtocol';
import type {ApprovedDatasetSnapshot} from '../services/approvedResearchDataset';
import type {StudyAdjudication} from '../domain/studyAdjudication';
const props=defineProps<{snapshot:ApprovedDatasetSnapshot;adjudications:readonly StudyAdjudication[]|null}>();
const expanded=ref(false);
const therapy=ref<ProtocolSelection['therapy']>('all');
const endpoint=ref<ProtocolSelection['endpoint']>('all');
const notice=ref('');
const protocol=computed(()=>buildStudyFamilyAnalysisProtocol(props.snapshot,{
 therapy:therapy.value,endpoint:endpoint.value
},props.adjudications));
const seen=computed(()=>protocol.value.cohorts.slice(0,12));
const gateLabels={
 'no-approved-source-data':'No approved observations',
 'no-selected-records':'No approved observations match these filters',
 'no-eligible-numeric-outcomes':'No eligible numeric observations',
 'descriptive-research-only':'Descriptive research only',
 'internal-split-plan-only':'Internal holdout can be planned — not validated',
 'identity-review-unavailable':'Study adjudication unavailable — internal split not certified',
 'identity-adjudication-required':'Unresolved study identities — internal split blocked'
} as const;
function exportPlan():void{
 const result=protocol.value;
 if(result.protocol!==ANALYSIS_PROTOCOL_ID)return;
 const url=URL.createObjectURL(new Blob([analysisProtocolJson(result)],{
  type:'application/json;charset=utf-8'
 }));
 try{
  const link=document.createElement('a');
  link.href=url;
  link.download='neumuacFQ-analysis-protocol-v1-'+result.sourceSnapshotSha256.slice(0,12)+'.json';
  document.body.appendChild(link);link.click();link.remove();
  notice.value='Analysis planning manifest exported. No model was trained or statistically validated.';
 }finally{window.setTimeout(()=>URL.revokeObjectURL(url),5000);}
}
</script>
<template>
 <section class="nfq-analysis-protocol" data-testid="nfq-analysis-protocol">
  <header class="nfq-analysis-heading">
   <div>
    <h3>Quantitative analysis protocol</h3>
    <p>Exact experimental context · source-family separation · no inferred effects</p>
   </div>
   <button type="button" :aria-expanded="expanded" @click="expanded=!expanded"
    data-testid="nfq-analysis-toggle">
    {{expanded?'Close protocol':'Inspect protocol'}}
   </button>
  </header>
  <div v-if="expanded" class="nfq-analysis-body" data-testid="nfq-analysis-content">
   <p class="nfq-analysis-note">
    This is an auditable pre-analysis cohort plan, not an executable or validated
    treatment-response model. Distinct study labels cannot prove independent replication.
   </p>
   <div class="nfq-analysis-controls">
    <label>
     <span>Therapy</span>
     <select v-model="therapy" data-testid="nfq-analysis-therapy">
      <option value="all">All therapies · separate cohorts</option>
      <option v-for="item in THERAPIES" :key="item.id" :value="item.id">{{item.label}}</option>
     </select>
    </label>
    <label>
     <span>Reported outcome</span>
     <select v-model="endpoint" data-testid="nfq-analysis-endpoint">
      <option value="all">All outcomes · separate contexts</option>
      <option v-for="item in ENDPOINTS" :key="item.code" :value="item.code">{{item.label}}</option>
     </select>
    </label>
    <button type="button" data-testid="nfq-analysis-export" @click="exportPlan">
     Export analysis manifest
    </button>
   </div>
   <div class="nfq-analysis-stats" aria-label="Source-level analysis eligibility">
    <span><strong>{{protocol.reviewedRowsInScope}}</strong> reviewed records</span>
    <span><strong>{{protocol.eligibleNumericObservations}}</strong> context-eligible values</span>
    <span><strong>{{protocol.reportedSampleN}}</strong> reviewed rows with source n</span>
    <span><strong>{{protocol.reportedUncertainty}}</strong> reviewed rows with dispersion</span>
    <span><strong>{{protocol.registeredStudyRows}}</strong> registered-study rows</span>
    <span><strong>{{protocol.populationCharacterizedRows}}</strong> population-characterized rows</span>
    <span v-if="protocol.identityConflictRows"><strong>{{protocol.identityConflictRows}}</strong> identity conflicts</span>
    <span><strong>{{protocol.excludedObservations}}</strong> excluded values</span>
    <span><strong>{{protocol.cohorts.length}}</strong> exact-context cohorts</span>
    <span><strong>{{protocol.adjudicationCandidates}}</strong> overlap pairs</span>
    <span><strong>{{protocol.unresolvedStudyLinks}}</strong> unresolved pairs</span>
    <span><strong>{{protocol.acceptedSameStudyLinks}}</strong> accepted same-study links</span>
    <span><strong>{{protocol.internalSplitCandidateCohorts}}</strong> internal split candidates</span>
   </div>
   <p class="nfq-analysis-gate" role="status" data-testid="nfq-analysis-gate">
    {{gateLabels[protocol.gate]}}
   </p>
   <p v-if="!protocol.cohorts.length" class="nfq-analysis-note">
    No comparable, independently approved numerical observations satisfy these
    selection criteria. No placeholder cohorts, split allocations or model metrics
    have been generated.
   </p>
   <div v-else class="nfq-analysis-cohorts" data-testid="nfq-analysis-cohorts">
    <article v-for="cohort in seen" :key="cohort.key" class="nfq-analysis-cohort">
     <div class="nfq-analysis-cohort-head">
      <strong>{{cohort.therapy}} · variant #{{cohort.variantId}}</strong>
      <span>{{cohort.labelledStudyFamilies}} linked study group{{cohort.labelledStudyFamilies===1?'':'s'}}</span>
     </div>
     <p>{{cohort.endpoint}} · {{cohort.statistic}} · {{cohort.unit}} ·
      {{cohort.model}} · {{cohort.comparator}} · {{cohort.timepoint}}</p>
     <p v-if="cohort.unresolvedIdentityGroups&&protocol.adjudicationInventoryVerified" class="nfq-analysis-status">
       {{cohort.unresolvedIdentityGroups}} study group{{cohort.unresolvedIdentityGroups===1?'':'s'}}
       require{{cohort.unresolvedIdentityGroups===1?'s':''}} further identity adjudication
      </p>
     <p v-if="cohort.identityConflictGroups" class="nfq-analysis-status">
       Conflicting registered study identities · independent holdout not permitted
      </p>
     <p>{{cohort.observationCount}} source values ·
      {{cohort.developmentFamilies}} development families ·
      {{cohort.internalHoldoutFamilies}} internal-holdout families</p>
     <p class="nfq-analysis-status">
      {{cohort.internalSplitPossible?'Provisional internal split plan only — external validation still required':
      'Internal holdout not certified: study review or independent source families are insufficient'}}
     </p>
    </article>
    <p v-if="protocol.cohorts.length>seen.length" class="nfq-analysis-note">
     {{protocol.cohorts.length-seen.length}} additional cohorts are included in the complete JSON manifest.
    </p>
   </div>
   <details v-if="protocol.excluded.length" class="nfq-analysis-exclusions">
    <summary>{{protocol.excludedObservations}} excluded observations · inspect reasons</summary>
    <p v-for="row in protocol.excluded.slice(0,20)" :key="row.claimId">
     #{{row.variantId}} · {{row.therapy}} · {{row.reason.replaceAll('-',' ')}}
    </p>
    <p v-if="protocol.excluded.length>20">
     Additional excluded observations are included in the complete JSON manifest.
    </p>
   </details>
   <p class="nfq-analysis-note">
    Snapshot {{protocol.sourceSnapshotSha256.slice(0,16)}}… ·
    Protocol v{{protocol.protocolVersion}} ·
    Source counts and linked study labels do not establish sampling independence, statistical power,
    external cohort independence or clinical validation.
   </p>
   <p v-if="notice" role="status" class="nfq-analysis-note">{{notice}}</p>
  </div>
 </section>
</template>
<style scoped>
.nfq-analysis-protocol{border-top:1px solid var(--border,#e1e7ef);margin:11px 0 17px;padding-top:10px;color:var(--text,#223e5c)}
.nfq-analysis-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.nfq-analysis-heading h3{margin:0;font-size:12px;font-weight:670;letter-spacing:-.015em}
.nfq-analysis-heading p,.nfq-analysis-note{margin:4px 0 9px;font-size:11px;line-height:1.55;color:var(--text-muted,#667e96)}
.nfq-analysis-protocol button{border:1px solid var(--border,#cbd9e8);border-radius:5px;background:transparent;color:inherit;font-size:11px;font-weight:600;padding:6px 9px;min-height:31px;cursor:pointer}
.nfq-analysis-protocol button:focus-visible,.nfq-analysis-protocol select:focus-visible{outline:2px solid #3475cc;outline-offset:2px}
.nfq-analysis-body{padding-top:9px}
.nfq-analysis-controls{display:flex;flex-wrap:wrap;align-items:end;gap:8px 13px}
.nfq-analysis-controls label{min-width:170px;display:grid;gap:5px;font-size:10px;color:var(--text-muted,#607c96);flex:1}
.nfq-analysis-controls select{box-sizing:border-box;width:100%;font:inherit;font-size:11px;padding:8px;color:var(--text,#223e5c);border:1px solid var(--border,#cedce9);background:var(--surface,#fff);border-radius:5px;min-height:33px}
.nfq-analysis-stats{display:flex;gap:6px 15px;flex-wrap:wrap;margin:13px 0 8px;font-size:11px;color:var(--text-muted,#647e97)}
.nfq-analysis-stats strong{color:var(--text,#284963);font-weight:700;font-size:12px}
.nfq-analysis-gate{margin:9px 0 6px;font-size:12px;font-weight:650}
.nfq-analysis-cohorts{margin:8px 0 14px}
.nfq-analysis-cohort{border-top:1px solid var(--border,#e1e9f0);padding:8px 0}
.nfq-analysis-cohort-head{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:11px}
.nfq-analysis-cohort-head>span,.nfq-analysis-cohort p{font-size:11px;color:var(--text-muted,#667e97)}
.nfq-analysis-cohort p{margin:4px 0;line-height:1.5}
.nfq-analysis-cohort p.nfq-analysis-status{font-size:10.5px}
.nfq-analysis-exclusions{font-size:11px;color:var(--text-muted,#607b94);margin:10px 0}
.nfq-analysis-exclusions summary{cursor:pointer}
.nfq-analysis-exclusions p{margin:3px 0}
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-analysis-controls select{background:#12243a;color:#e8f0ff;border-color:#466281}
@media(max-width:650px){.nfq-analysis-heading{flex-wrap:wrap}.nfq-analysis-controls>button{width:100%}}
</style>

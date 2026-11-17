<script setup lang="ts">
import {computed,ref,watch,onUnmounted} from 'vue';
import {RouterLink} from 'vue-router';
import {THERAPIES,type CoreModulatorId} from '../domain/therapyRegistry';
import {
 evaluateVariantEvidencePassport,type PassportIdentity,type PassportSource
} from '../domain/variantEvidencePassport';
import type {MultiTherapyResearchReport} from '../domain/multiTherapyResearch';
import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import type {ClinVarAuthoritySummary} from '../services/liveClinVar';
import {retrievePubMedMetadata,type PubMedPublicationMetadata} from '../services/livePubMed';
import EvidenceResearchPlan from './EvidenceResearchPlan.vue';

const props=defineProps<{
 variantId:string;
 variantName:string;
 identity:PassportIdentity;
 report:MultiTherapyResearchReport;
 references:readonly LiveEvidenceReference[];
 claims:readonly CuratedSourceClaim[];
 clinVarSummary:ClinVarAuthoritySummary|null;
 clinVarLoading:boolean;
 clinVarError:string;
}>();
const emit=defineEmits<{checkClinvar:[]}>();
const expanded=ref(false);
const focusedSource=ref<number|null>(null);
const pubmed=ref<{referenceId:number;phase:'checking'|'ready'|'unavailable';
 publication?:PubMedPublicationMetadata}|null>(null);
let pubmedAbort:AbortController|null=null;
const passport=computed(()=>evaluateVariantEvidencePassport({
 variantId:props.variantId,variantName:props.variantName,
 identity:props.identity,report:props.report,
 references:props.references,claims:props.claims,
 clinVarSummary:props.clinVarSummary,
 authorityAttempt:props.clinVarError?'failed':props.clinVarSummary?'checked':'unchecked'
}));
const count=(x:number)=>x.toLocaleString('en-GB');
const therapyLabel=(id:CoreModulatorId)=>THERAPIES.find(t=>t.id===id)?.label??id;
const recordLabel=(v:string|null)=>v==='responsive'?'Responsive · database':
 v==='non_responsive'?'Non-responsive · database':
 v==='unknown'?'Unknown · database':'No variant-level response recorded';
const stateLabel=(v:string)=>({
 'reviewed-response-report':'Reviewed reports: response',
 'reviewed-no-response-report':'Reviewed reports: no response',
 'reviewed-conflict':'Reviewed evidence disagreement',
 'scope-not-reconciled':'Experimental scope not reconciled',
 'recorded-history-only':'Recorded history only',
 'no-reviewed-observation-in-register':'No reviewed study claim in register'
} as Record<string,string>)[v]??'Not verified';
const citationStatus=(value:PassportSource['catalogueCheck'])=>({
 'recorded-pmid-aligned':'Catalogued PMID matches publication URL',
 'catalogue-pmid-missing':'PMID absent from local record',
 'catalogue-pmid-conflict':'PMID differs from publication URL',
 'not-pubmed-indexed':'No directly indexed PubMed reference'
})[value];
function clearPubmed():void{
 pubmedAbort?.abort();pubmedAbort=null;
 focusedSource.value=null;pubmed.value=null;
}
function setExpanded():void{
 expanded.value=!expanded.value;
 if(!expanded.value)clearPubmed();
}
async function checkPubMed(source:PassportSource):Promise<void>{
 if(!expanded.value||!source.indexingPmid||pubmedAbort)return;
 clearPubmed();
 const abort=new AbortController();pubmedAbort=abort;
 focusedSource.value=source.id;pubmed.value={referenceId:source.id,phase:'checking'};
 try{
  const response=await retrievePubMedMetadata(source.indexingPmid,fetch,abort.signal);
  if(!abort.signal.aborted&&focusedSource.value===source.id&&expanded.value)
   pubmed.value={referenceId:source.id,phase:'ready',publication:response};
 }catch{
  if(!abort.signal.aborted&&focusedSource.value===source.id&&expanded.value)
   pubmed.value={referenceId:source.id,phase:'unavailable'};
 }finally{if(pubmedAbort===abort)pubmedAbort=null;}
}
function focusReviewIntake():void{
 const section=document.getElementById('nfq-reviewed-source-claims');
 section?.scrollIntoView({block:'start',behavior:'smooth'});
 section?.querySelector('button')?.focus({preventScroll:true});
}
function titleAligned(source:PassportSource,publication:PubMedPublicationMetadata):boolean{
 if(!publication.title)return false;
 const standard=(value:string)=>value.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
 return standard(source.title)===standard(publication.title);
}
watch(()=>[props.variantId,props.report,props.references,props.claims],()=>clearPubmed());
onUnmounted(clearPubmed);
</script>

<template>
 <section class="nfq-passport" data-testid="nfq-variant-evidence-passport"
  aria-label="Evidence verification passport">
  <header class="nfq-passport-head">
   <div class="nfq-passport-intro">
    <strong>Evidence verification passport</strong>
    <span>Variant identity · independent source review · five-therapy interpretation</span>
   </div>
   <button type="button" class="nfq-passport-button" data-testid="nfq-passport-toggle"
    :aria-expanded="expanded" @click="setExpanded">
    {{expanded?'Close passport':'Verify evidence'}}
   </button>
  </header>
  <div v-if="expanded" class="nfq-passport-body" data-testid="nfq-passport-content">
   <div class="nfq-passport-metrics">
    <span><strong>{{count(passport.approvedClaims)}}</strong> approved source claims</span>
    <span><strong>{{count(passport.pendingClaims)}}</strong> awaiting source review</span>
    <span><strong>{{count(passport.sources.length)}}</strong> linked references</span>
    <span v-if="passport.responseRecordConflictCount">
     <strong>{{passport.responseRecordConflictCount}}</strong> research conflict flags</span>
   </div>
   <p class="nfq-passport-disclaimer">
    This view compares recorded fields with independently reviewed source observations.
    It does not automatically revise CFTR class, pathogenicity or drug-response records.
   </p>

   <section aria-label="Variant identity verification" class="nfq-passport-area">
    <div class="nfq-passport-section-head">
     <h4>Identity &amp; nomenclature</h4>
     <span>Exact recorded fields, never guessed aliases</span>
    </div>
    <dl class="nfq-passport-identity">
     <div><dt>Variant</dt><dd>{{variantName}}</dd></div>
     <div><dt>Legacy notation</dt><dd>{{identity.legacyName||'Not recorded'}}</dd></div>
     <div><dt>cDNA</dt><dd>{{identity.cdnaName||'Not recorded'}}</dd></div>
     <div><dt>Protein</dt><dd>{{identity.proteinName||'Not recorded'}}</dd></div>
     <div><dt>Recorded functional class</dt>
      <dd>{{identity.functionalClass||'Not recorded'}}
       <span v-if="identity.classSubtype"> · {{identity.classSubtype}}</span></dd></div>
     <div><dt>Recorded aliases</dt>
      <dd>{{identity.aliases.length?identity.aliases.join(', '):'Not recorded'}}</dd></div>
    </dl>
    <p class="nfq-passport-micro">
     Names with small differences in splice position or nucleotide notation must not be
     treated as synonyms without independent identifier reconciliation.
    </p>
   </section>

   <section aria-label="Independent external ClinVar verification" class="nfq-passport-area">
    <div class="nfq-passport-section-head">
     <h4>External authority · ClinVar</h4>
     <span>Germline interpretation is not a protein mechanism or drug-response class</span>
    </div>
    <div class="nfq-passport-authority">
     <p data-testid="nfq-passport-authority">
      <strong>{{passport.authority.state==='verified-identity'?'Variation identifier verified':
       passport.authority.state==='not-linked'?'No linked variation identifier':
       passport.authority.state==='identity-disagreement'?'Identifier disagreement':
       passport.authority.state==='unavailable'?'Verification unavailable':'Not yet checked'}}</strong>
      <span v-if="identity.clinVarId"> · Recorded ID: {{identity.clinVarId}}</span>
     </p>
     <p>{{passport.authority.note}}</p>
     <div v-if="passport.authority.state==='verified-identity'" class="nfq-passport-authority-detail">
      <p><strong>Current external classification:</strong>
       {{passport.authority.classification||'Not returned'}}</p>
      <p><strong>Authority review status:</strong>
       {{passport.authority.reviewStatus||'Not returned'}}</p>
      <p><strong>Last evaluated:</strong>
       {{passport.authority.lastEvaluated||'Not returned'}}</p>
      <p><strong>Recorded HGVS / authority title:</strong>
       {{passport.authority.alignment==='recorded-notation-aligned'?
        'At least one recorded notation appears exactly in the external title':
        'Exact nomenclature alignment not established; review the source title manually'}}
      </p>
      <p class="nfq-passport-micro">
       Retrieved {{passport.authority.retrievedAt?
       new Date(passport.authority.retrievedAt).toLocaleString():'unknown'}}
       · Source title: {{passport.authority.title}}
      </p>
     </div>
     <div class="nfq-passport-inline">
      <button v-if="passport.authority.state!=='not-linked'" class="nfq-passport-button"
       type="button" data-testid="nfq-passport-check-clinvar"
       :disabled="clinVarLoading" @click="emit('checkClinvar')">
       {{clinVarLoading?'Checking ClinVar…':
        clinVarSummary?'Recheck official ClinVar':'Check official ClinVar'}}
      </button>
      <a v-if="passport.authority.citationUrl" :href="passport.authority.citationUrl"
       target="_blank" rel="noopener noreferrer">Open official record</a>
     </div>
     <p v-if="clinVarError" class="nfq-passport-note" role="status">{{clinVarError}}</p>
    </div>
   </section>

   <section aria-label="Therapeutic evidence verification" class="nfq-passport-area">
    <div class="nfq-passport-section-head">
     <h4>Recorded response vs independently reviewed observations</h4>
     <span>Five established regimens · no eligibility inference</span>
    </div>
    <div class="nfq-passport-therapy-list" role="list" data-testid="nfq-passport-therapy-list">
     <article v-for="item in passport.therapies" :key="item.therapy"
      role="listitem" :data-therapy="item.therapy" class="nfq-passport-therapy">
      <div class="nfq-passport-therapy-head">
       <strong>{{therapyLabel(item.therapy)}}</strong>
       <span>{{stateLabel(item.verificationState)}}</span>
      </div>
      <div class="nfq-passport-therapy-data">
       <span>{{recordLabel(item.databaseLabel)}}</span>
       <span>{{item.reviewedStudyFamilies}} reviewed study famil{{item.reviewedStudyFamilies===1?'y':'ies'}}
        · {{item.pendingClaims}} pending</span>
       <span v-if="item.coverage==='genotype-context-only'">Genotype-rule context only</span>
      </div>
      <p>{{item.provenanceNote}}</p>
      <p v-if="item.reviewedSourceReferences.length" class="nfq-passport-micro">
       Independently reviewed source reference IDs:
       {{item.reviewedSourceReferences.join(', ')}}
      </p>
      <p v-if="item.flaggedConflicts" class="nfq-passport-warning">
       {{item.flaggedConflicts}} scientific discrepancy flag{{item.flaggedConflicts===1?'':'s'}}
       · specialist review required
      </p>
     </article>
    </div>
   </section>

   <EvidenceResearchPlan :passport="passport" :claims="claims" @open-review="focusReviewIntake" />

   <section aria-label="Linked publication verification" class="nfq-passport-area">
    <div class="nfq-passport-section-head">
     <h4>Source provenance</h4>
     <span>Official article indexing on request · not evidence appraisal</span>
    </div>
    <p v-if="!passport.sources.length" class="nfq-passport-note" data-testid="nfq-passport-no-sources">
     No references are linked in the accessible source catalogue. This does not
     establish an absence of published evidence.
    </p>
    <div v-else class="nfq-passport-source-list" data-testid="nfq-passport-sources">
     <article v-for="source in passport.sources.slice(0,8)" :key="source.id"
      class="nfq-passport-source">
      <div>
       <strong>Reference #{{source.id}}</strong>
       <p>{{source.title}}</p>
       <p class="nfq-passport-micro">
        {{citationStatus(source.catalogueCheck)}} ·
        {{source.approvedClaimCount}} approved claims ·
        {{source.pendingClaimCount}} pending claims
       </p>
       <p v-if="source.pmid" class="nfq-passport-micro">Recorded PMID {{source.pmid}}
        <span v-if="source.doi"> · DOI {{source.doi}}</span></p>
      </div>
      <div class="nfq-passport-source-actions">
       <a :href="source.url" target="_blank" rel="noopener noreferrer">Original reference</a>
       <button v-if="source.indexingPmid" type="button" class="nfq-passport-button"
        data-testid="nfq-passport-pubmed-check" :disabled="pubmed?.phase==='checking'"
        @click="checkPubMed(source)">Check PubMed indexing</button>
      </div>
      <div v-if="focusedSource===source.id&&pubmed" class="nfq-passport-index"
       data-testid="nfq-passport-pubmed-result" role="status">
       <template v-if="pubmed.phase==='checking'">Checking the official article identifier…</template>
       <template v-else-if="pubmed.phase==='unavailable'">
        PubMed indexing unavailable. No conclusion about study coverage or variant-specific evidence.
       </template>
       <template v-else-if="pubmed.publication">
        <p>Official PMID {{pubmed.publication.pmid}} ·
         {{titleAligned(source,pubmed.publication)?
          'Catalogued title matches PubMed indexing':
          'Catalogue title alignment not established; verify publication details'}}
        </p>
        <p>{{pubmed.publication.title||'Official title not returned'}}</p>
        <p v-if="pubmed.publication.publicationTypes.length" class="nfq-passport-micro">
         Publication types: {{pubmed.publication.publicationTypes.join(', ')}}
        </p>
        <p class="nfq-passport-micro">
         Retrieved {{new Date(pubmed.publication.retrievedAt).toLocaleString()}}.
         Indexed article identity does not validate a variant-specific response claim.
        </p>
       </template>
      </div>
     </article>
     <p v-if="passport.sources.length>8" class="nfq-passport-micro">
      Showing 8 of {{passport.sources.length}} linked references. The complete
      catalogue remains available in Evidence &amp; provenance.
     </p>
    </div>
   </section>
   <div class="nfq-passport-tail">
    <RouterLink :to="{path:'/evidence',
      query:{variant:variantId,from:'/variants/'+variantId}}">
     Inspect complete source record and provenance</RouterLink>
    <button type="button" class="nfq-passport-text-action" @click="focusReviewIntake">
     Propose or review a source observation below</button>
   </div>
   <details class="nfq-passport-limitations">
    <summary>Interpretation boundaries</summary>
    <p v-for="entry in passport.limitations" :key="entry">{{entry}}</p>
   </details>
  </div>
 </section>
</template>
<style scoped>
.nfq-passport{border-top:1px solid var(--border,#dde7ef);margin:8px 0 16px;color:var(--text,#243d5b)}
.nfq-passport-head{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:12px 0}
.nfq-passport-intro{display:grid;gap:3px}
.nfq-passport-intro strong{font-size:13px;font-weight:680;letter-spacing:-.012em}
.nfq-passport-intro span,.nfq-passport-section-head span{font-size:11px;color:var(--text-muted,#657f99)}
.nfq-passport-button{font:inherit;font-size:11px;font-weight:600;background:transparent;border:1px solid var(--border,#c7d8e7);border-radius:5px;padding:6px 9px;min-height:31px;color:inherit;cursor:pointer}
.nfq-passport-button:disabled{opacity:.5;cursor:default}
.nfq-passport button:focus-visible,.nfq-passport a:focus-visible{outline:2px solid #3876c5;outline-offset:2px}
.nfq-passport-body{min-width:0;padding-bottom:13px}
.nfq-passport-metrics{display:flex;flex-wrap:wrap;gap:7px 17px;font-size:11px;color:var(--text-muted,#627d97)}
.nfq-passport-metrics strong{font-size:12px;color:var(--text,#243f60)}
.nfq-passport-disclaimer{font-size:11px;color:var(--text-muted,#637e96);line-height:1.55;max-width:750px;margin:9px 0}
.nfq-passport-area{padding:13px 0 8px;border-top:1px solid var(--border,#e0e8ef)}
.nfq-passport-section-head{display:flex;justify-content:space-between;gap:7px 15px;align-items:baseline;flex-wrap:wrap;margin-bottom:10px}
.nfq-passport-section-head h4{font-size:12px;font-weight:680;margin:0;letter-spacing:-.01em}
.nfq-passport-identity{margin:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px 19px}
.nfq-passport-identity>div{min-width:0}
.nfq-passport-identity dt{font-size:10px;line-height:1.45;color:var(--text-muted,#70849b)}
.nfq-passport-identity dd{font-size:11px;line-height:1.5;margin:2px 0 0;overflow-wrap:anywhere}
.nfq-passport-micro,.nfq-passport-note{color:var(--text-muted,#6b839b);font-size:10.5px;line-height:1.6;overflow-wrap:anywhere}
.nfq-passport-micro{margin:7px 0 0}
.nfq-passport-note{margin:7px 0 9px}
.nfq-passport-authority p{font-size:11px;line-height:1.6;margin:4px 0}
.nfq-passport-authority>p:first-child strong{font-weight:660}
.nfq-passport-authority-detail{margin:10px 0}
.nfq-passport-inline{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:11px}
.nfq-passport a{color:var(--link,#2869a9);font-size:11px;text-underline-offset:3px}
.nfq-passport-therapy{padding:11px 0;border-top:1px solid var(--border,#e1e9f0)}
.nfq-passport-therapy:first-child{border-top:0;padding-top:0}
.nfq-passport-therapy-head{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px 10px;font-size:11px}
.nfq-passport-therapy-head strong{font-size:12px;font-weight:670}
.nfq-passport-therapy-head span{color:var(--text-muted,#647f97)}
.nfq-passport-therapy-data{display:flex;flex-wrap:wrap;gap:4px 15px;color:var(--text-muted,#687f95);font-size:11px;margin:4px 0}
.nfq-passport-therapy>p{font-size:11px;line-height:1.55;margin:5px 0;max-width:750px}
.nfq-passport-therapy>p.nfq-passport-warning{color:#996a3c}
.nfq-passport-source{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 14px;align-items:start;border-top:1px solid var(--border,#e1e9ef);padding:10px 0}
.nfq-passport-source:first-child{border-top:0}
.nfq-passport-source strong{font-size:11px;font-weight:650}
.nfq-passport-source p{font-size:11px;line-height:1.55;margin:3px 0;overflow-wrap:anywhere}
.nfq-passport-source-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;justify-content:flex-end}
.nfq-passport-index{grid-column:1/-1;font-size:11px;margin-top:3px;padding:5px 0;border-top:1px solid var(--border,#e1e9ef)}
.nfq-passport-tail .nfq-passport-text-action{font:inherit;font-size:11px;background:transparent;border:0;padding:0;text-align:left;text-decoration:underline;text-underline-offset:3px;color:var(--link,#2869a9);cursor:pointer}
.nfq-passport-tail{display:flex;flex-wrap:wrap;gap:8px 18px;padding:13px 0}
.nfq-passport-limitations{font-size:11px;color:var(--text-muted,#627e97)}
.nfq-passport-limitations summary{cursor:pointer}
.nfq-passport-limitations p{line-height:1.55}
@media(max-width:700px){.nfq-passport-identity{grid-template-columns:repeat(2,minmax(0,1fr))}.nfq-passport-source{grid-template-columns:1fr}.nfq-passport-source-actions{justify-content:flex-start}}
@media(max-width:440px){.nfq-passport-identity{grid-template-columns:1fr 1fr;gap:10px}.nfq-passport-section-head{display:grid}}
</style>

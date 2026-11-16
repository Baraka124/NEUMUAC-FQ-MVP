<script setup lang="ts">
import {computed,ref,watch} from 'vue';
import {
 ENDPOINTS,ENDPOINT_STATISTICS,ENDPOINT_MODELS,ENDPOINT_COMPARATORS,
 UNEXTRACTED_ENDPOINT,endpointDisplayValue,endpointReadiness,type ResearchEndpoint,
 type EndpointCode,type EndpointStatistic,type EndpointUnit,type EndpointModel,type EndpointComparator
} from '../domain/researchEndpointNormalization';
import {THERAPIES,type CoreModulatorId} from '../domain/therapyRegistry';
import {researcherRole} from '../services/researchRole';
import {authSessionProvider} from '../services/authSession';
import {readConfigFromEnvironment} from '../services/liveVariants';
import {createCuratedSourceClaimService,validSourceClaimPayload,
 type CuratedSourceClaim,type CuratedClaimPayload} from '../services/curatedSourceClaims';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import type {ResearchObservationMethod,ResearchObservationFinding} from '../domain/sourceConflictReconciliation';

const props=defineProps<{
 variantId:string;
 claims:readonly CuratedSourceClaim[];
 references:readonly LiveEvidenceReference[];
}>();
const emit=defineEmits<{updated:[]}>();
const config=readConfigFromEnvironment();
const service=config&&authSessionProvider?
 createCuratedSourceClaimService(config,authSessionProvider):null;
const canContribute=computed(()=>researcherRole.phase==='verified'&&
 ['contributor','reviewer','administrator'].includes(researcherRole.role??''));
const canReview=computed(()=>researcherRole.phase==='verified'&&
 ['reviewer','administrator'].includes(researcherRole.role??''));
const formOpen=ref(false);
const formTherapy=ref<CoreModulatorId>('ETI');
const formReference=ref('');
const formScope=ref<'single-variant'|'genotype-specific'>('single-variant');
const genotypeOther=ref('');
const formMethod=ref<ResearchObservationMethod>('in-vitro-study');
const formFinding=ref<ResearchObservationFinding>('inconclusive');
const formFamily=ref('');
const formLocator=ref('');
const formRationale=ref('');
const endpointCode=ref<EndpointCode>('not-reported');
const endpointStatistic=ref<EndpointStatistic>('not-reported');
const endpointUnit=ref<EndpointUnit>('not-reported');
const endpointValue=ref('');
const endpointModel=ref<EndpointModel>('not-reported');
const endpointComparator=ref<EndpointComparator>('not-reported');
const endpointTimepoint=ref('not-reported');
const endpointNumber=computed(()=>{
 const source=String(endpointValue.value).trim();
 return source===''?null:Number(source);
});
const endpoint=computed<ResearchEndpoint>(()=>({
 code:endpointCode.value,
 statistic:endpointStatistic.value,
 unit:endpointUnit.value,
 value:endpointNumber.value,
 model:endpointModel.value,
 comparator:endpointComparator.value,
 timepoint:endpointTimepoint.value
}));
const endpointUnits:readonly EndpointUnit[]=['mmol/L','pp','%','uA/cm2','ratio','study-specific','not-reported'];
function resetEndpoint():void{
 endpointCode.value='not-reported';endpointStatistic.value='not-reported';
 endpointUnit.value='not-reported';endpointValue.value='';
 endpointModel.value='not-reported';endpointComparator.value='not-reported';
 endpointTimepoint.value='not-reported';
}
const revisionOf=ref<CuratedSourceClaim|null>(null);
const confirmedReview=ref<string|null>(null);
const reviewNotes=ref<Record<string,string>>({});
const busy=ref(false);
const notice=ref('');
const methods=[
 {value:'in-vitro-study',label:'In-vitro study'},
 {value:'clinical-study',label:'Clinical study'},
 {value:'curated-literature',label:'Curated literature'}
] as const;
const findings=[
 {value:'reported-response',label:'Reported response'},
 {value:'reported-no-response',label:'Reported no response'},
 {value:'mixed',label:'Mixed results'},
 {value:'inconclusive',label:'Inconclusive'}
] as const;
const referenceIds=computed(()=>props.references.map(x=>x.id));
const selectedReference=computed(()=>props.references.find(x=>String(x.id)===formReference.value));
const submittedCount=computed(()=>props.claims.filter(x=>x.status==='pending').length);
const approvedCount=computed(()=>props.claims.filter(x=>x.status==='approved').length);
const formData=computed<CuratedClaimPayload>(()=>({
 therapy:formTherapy.value,referenceId:Number(formReference.value),
 scope:formScope.value,
 genotypePair:formScope.value==='genotype-specific'?
 [props.variantId,genotypeOther.value] as const:null,
 method:formMethod.value,finding:formFinding.value,
 studyFamilyId:formFamily.value,locator:formLocator.value,rationale:formRationale.value,
 endpoint:endpoint.value
}));
const canSubmit=computed(()=>!busy.value&&canContribute.value&&Boolean(service)&&
 validSourceClaimPayload(props.variantId,formData.value,referenceIds.value));
const writableClaims=computed(()=>props.claims.filter(x=>x.status!=='superseded'));
function resetForm():void{
 revisionOf.value=null;formTherapy.value='ETI';formReference.value='';
 formScope.value='single-variant';genotypeOther.value='';
 formMethod.value='in-vitro-study';formFinding.value='inconclusive';
 formFamily.value='';formLocator.value='';formRationale.value='';resetEndpoint();
}
function startRevision(entry:CuratedSourceClaim):void{
 resetForm();revisionOf.value=entry;
 formTherapy.value=entry.therapy;formReference.value=String(entry.referenceId);
 formScope.value=entry.scope;genotypeOther.value=entry.genotypePair?
 (entry.genotypePair[0]===props.variantId?entry.genotypePair[1]:entry.genotypePair[0]):'';
 formMethod.value=entry.method;formFinding.value=entry.finding;
 formFamily.value=entry.studyFamilyId;formLocator.value=entry.locator;
 formRationale.value=entry.rationale;
 const observation=entry.endpoint??UNEXTRACTED_ENDPOINT;
 endpointCode.value=observation.code;endpointStatistic.value=observation.statistic;
 endpointUnit.value=observation.unit;endpointValue.value=observation.value===null?'':String(observation.value);
 endpointModel.value=observation.model;endpointComparator.value=observation.comparator;
 endpointTimepoint.value=observation.timepoint;
 formOpen.value=true;notice.value='';
}
async function submit():Promise<void>{
 if(!service||!canSubmit.value)return;
 busy.value=true;notice.value='';
 try{
  if(revisionOf.value){
   await service.revise(props.variantId,revisionOf.value.id,revisionOf.value.revision,
    formData.value,referenceIds.value);
   notice.value='New revision submitted; previous approved evidence remains active until two independent approvals.';
  }else{
   await service.submit(props.variantId,formData.value,referenceIds.value);
   notice.value='Scientific source claim submitted; it has no effect until two independent reviews approve it.';
  }
  resetForm();formOpen.value=false;emit('updated');
 }catch{
  notice.value='Submission not confirmed. Refresh the review list before retrying; no treatment category changed.';
 }finally{busy.value=false;}
}
async function decide(item:CuratedSourceClaim,decision:'approve'|'reject'):Promise<void>{
 if(!service||!canReview.value||!item.canReview||busy.value||
  confirmedReview.value!==item.id)return;
 const note=reviewNotes.value[item.id]??'';
 if(note.trim().length<20)return;
 busy.value=true;notice.value='';
 try{
  const result=await service.review(props.variantId,item.id,item.revision,decision,note);
  notice.value=result.status==='approved'?'Two independent reviews recorded; this source revision is now approved.':
   result.status==='rejected'?'Source claim rejected with a retained audit record.':
   'Independent approval recorded; a second reviewer is still required.';
  confirmedReview.value=null;reviewNotes.value={};emit('updated');
 }catch{
  notice.value='Review was not confirmed. Refresh before taking another decision.';
 }finally{busy.value=false;}
}
async function withdraw(item:CuratedSourceClaim):Promise<void>{
 if(!service||busy.value||item.status!=='pending'||!item.submittedByMe)return;
 busy.value=true;notice.value='';
 try{
  await service.withdraw(props.variantId,item.id,item.revision);
  notice.value='Pending claim withdrawn; the audit record remains.';
  emit('updated');
 }catch{notice.value='Withdrawal was not confirmed. Refresh the queue.';}
 finally{busy.value=false;}
}
watch(()=>props.variantId,()=>{
 resetForm();formOpen.value=false;confirmedReview.value=null;
 reviewNotes.value={};notice.value='';busy.value=false;
});
function resetEndpointSelection():void{
 endpointStatistic.value='not-reported';endpointUnit.value='not-reported';
 endpointValue.value='';endpointModel.value='not-reported';
 endpointComparator.value='not-reported';endpointTimepoint.value='not-reported';
}
const shortId=(value:string)=>value.slice(0,8);
</script>

<template>
 <section class="nfq-reviewed-intake" data-testid="nfq-reviewed-claims">
  <header class="nfq-reviewed-intake-head">
   <div>
    <h3>Independently reviewed source claims</h3>
    <p>Source-by-source provenance · immutable revisions · two independent attestations</p>
   </div>
   <button v-if="canContribute" type="button" :aria-expanded="formOpen"
    data-testid="nfq-source-claim-new" @click="formOpen=!formOpen">
    {{formOpen?'Close form':'Propose source claim'}}
   </button>
  </header>
  <div class="nfq-review-counts">
   <span>{{approvedCount}} active approved</span>
   <span>{{submittedCount}} pending</span>
   <span>{{claims.length}} historical revisions</span>
  </div>
  <p v-if="notice" class="nfq-review-message" role="status">{{notice}}</p>
  <form v-if="formOpen&&canContribute" class="nfq-reviewed-form" data-testid="nfq-source-claim-form"
   @submit.prevent="submit">
   <p>{{revisionOf?'New revision of #'+shortId(revisionOf.id):
     'An observation must be tied to a real bibliographic record and located in the original source.'}}</p>
   <div class="nfq-reviewed-grid">
    <label>Therapy
     <select v-model="formTherapy" :disabled="busy">
      <option v-for="therapy in THERAPIES" :key="therapy.id" :value="therapy.id">{{therapy.label}}</option>
     </select>
    </label>
    <label>Recorded source
     <select v-model="formReference" :disabled="busy" required data-testid="nfq-source-claim-reference">
      <option value="" disabled>Choose a linked reference</option>
      <option v-for="entry in references" :key="entry.id" :value="String(entry.id)">
       #{{entry.id}} · {{entry.title.slice(0,80)}}
      </option>
     </select>
    </label>
    <label>Biological scope
     <select v-model="formScope" :disabled="busy">
      <option value="single-variant">Single variant</option>
      <option value="genotype-specific">Specified genotype pair</option>
     </select>
    </label>
    <label v-if="formScope==='genotype-specific'">Second variant database ID
     <input v-model.trim="genotypeOther" inputmode="numeric" autocomplete="off"
      maxlength="18" placeholder="Exact catalogue identifier" :disabled="busy" required/>
    </label>
    <label>Study method
     <select v-model="formMethod" :disabled="busy">
      <option v-for="method in methods" :key="method.value" :value="method.value">{{method.label}}</option>
     </select>
    </label>
    <label>Recorded experimental finding
     <select v-model="formFinding" :disabled="busy">
      <option v-for="finding in findings" :key="finding.value" :value="finding.value">{{finding.label}}</option>
     </select>
    </label>
    <label>Independent study-family identifier
     <input v-model.trim="formFamily" maxlength="120" :disabled="busy"
      placeholder="PMID-12345678 or trial accession" required/>
    </label>
    <label>Source locator
     <input v-model.trim="formLocator" maxlength="240" :disabled="busy"
      placeholder="Original paper · Table 2 · outcome" required/>
    </label>
   </div>
   <p v-if="selectedReference" class="nfq-review-reference">
    <a :href="selectedReference.url" target="_blank" rel="noopener noreferrer">
     Inspect original: {{selectedReference.title}}</a>
   </p>
   <details class="nfq-endpoint-intake" data-testid="nfq-endpoint-intake">
    <summary>Experimental endpoint <span>{{endpointCode==='not-reported'?'Not extracted':endpointCode}}</span></summary>
    <p>Enter only source-reported measurements. An unextracted endpoint is valid and does not create an assumed value.</p>
    <div class="nfq-reviewed-grid">
     <label>Measured outcome
      <select v-model="endpointCode" :disabled="busy" data-testid="nfq-endpoint-code"
       @change="resetEndpointSelection">
       <option v-for="e in ENDPOINTS" :key="e.code" :value="e.code">{{e.label}}</option>
      </select>
     </label>
     <template v-if="endpointCode!=='not-reported'">
      <label>Reporting statistic
       <select v-model="endpointStatistic" :disabled="busy">
        <option v-for="e in ENDPOINT_STATISTICS" :key="e.code" :value="e.code">{{e.label}}</option>
       </select>
      </label>
      <label>Source-reported value (optional)
       <input v-model.trim="endpointValue" inputmode="decimal" type="number" step="any"
        placeholder="Leave empty when not reported" :disabled="busy" data-testid="nfq-endpoint-value"/>
      </label>
      <label>Reported unit
       <select v-model="endpointUnit" :disabled="busy" data-testid="nfq-endpoint-unit">
        <option v-for="unit in endpointUnits" :key="unit" :value="unit">{{unit}}</option>
       </select>
      </label>
      <label>Biological or clinical model
       <select v-model="endpointModel" :disabled="busy">
        <option v-for="model in ENDPOINT_MODELS" :key="model.code" :value="model.code">{{model.label}}</option>
       </select>
      </label>
      <label>Source comparator
       <select v-model="endpointComparator" :disabled="busy">
        <option v-for="item in ENDPOINT_COMPARATORS" :key="item.code" :value="item.code">{{item.label}}</option>
       </select>
      </label>
      <label>Source timepoint
       <input v-model.trim="endpointTimepoint" maxlength="80" :disabled="busy"
        placeholder="e.g. Day 28, 24 h, not-reported" data-testid="nfq-endpoint-timepoint"/>
      </label>
     </template>
    </div>
    <p class="nfq-review-reference">No statistical pooling or conversion between assays is performed.</p>
   </details>
   <label>Scientific rationale and endpoint context
    <textarea v-model.trim="formRationale" maxlength="900" minlength="20" rows="3"
     placeholder="State the measured endpoint, experimental conditions, and why this finding is applicable."
     :disabled="busy" required></textarea>
   </label>
   <footer>
    <span>Neither submission nor one reviewer changes the published therapeutic record.</span>
    <button type="submit" :disabled="!canSubmit" data-testid="nfq-source-claim-submit">
     {{busy?'Submitting…':revisionOf?'Submit new revision':'Submit for two independent reviews'}}
    </button>
   </footer>
  </form>

  <p v-if="!claims.length" class="nfq-review-empty">
   No source claims have been submitted. Linked references are not yet independently reviewed treatment-response evidence.
  </p>
  <div v-else class="nfq-reviewed-list" data-testid="nfq-reviewed-claim-list">
   <article v-for="entry in writableClaims" :key="entry.id" class="nfq-reviewed-record"
    :data-status="entry.status">
    <div class="nfq-reviewed-record-head">
     <div>
      <strong>{{THERAPIES.find(x=>x.id===entry.therapy)?.label}} · {{entry.finding.replaceAll('-',' ')}}</strong>
      <p>Reference #{{entry.referenceId}} · {{entry.method}} · {{entry.scope}}</p>
     </div>
     <span class="nfq-reviewed-status">{{entry.status==='approved'?'Approved · 2 reviews':
      entry.status==='pending'?'Pending · '+entry.reviewCount+'/2':entry.status}}</span>
    </div>
    <p class="nfq-reviewed-attribution">Study family {{entry.studyFamilyId}} · {{entry.locator}} · revision {{entry.revision}}</p>
    <p class="nfq-reviewed-attribution" data-testid="nfq-claim-endpoint">
     Endpoint: {{entry.endpoint?ENDPOINTS.find(x=>x.code===entry.endpoint!.code)?.label:'Legacy claim · not recorded'}}
     · {{entry.endpoint?endpointDisplayValue(entry.endpoint):'No measurement attached'}}
     <template v-if="entry.endpoint&&endpointReadiness(entry.endpoint)==='numeric'">
      · {{entry.endpoint.model}} · {{entry.endpoint.comparator}} · {{entry.endpoint.timepoint}}
     </template>
    </p>
    <p class="nfq-reviewed-rationale">{{entry.rationale}}</p>
    <details class="nfq-review-audit">
     <summary>Recorded review history · {{entry.audit.length}} events</summary>
     <ul><li v-for="(ev,i) in entry.audit" :key="i">{{ev.action}} · {{new Date(ev.at).toLocaleString()}}</li></ul>
    </details>
    <div v-if="!busy" class="nfq-review-actions">
     <button v-if="canContribute&&['approved','rejected','withdrawn'].includes(entry.status)"
      type="button" @click="startRevision(entry)">Propose new revision</button>
     <button v-if="entry.status==='pending'&&entry.submittedByMe" type="button"
      @click="withdraw(entry)">Withdraw my proposal</button>
     <button v-if="canReview&&entry.canReview&&entry.status==='pending'" type="button"
      :aria-expanded="confirmedReview===entry.id"
      @click="confirmedReview=confirmedReview===entry.id?null:entry.id">Independent review</button>
    </div>
    <div v-if="confirmedReview===entry.id&&entry.canReview&&entry.status==='pending'"
     class="nfq-review-decision">
     <label>Independent review justification
      <textarea v-model.trim="reviewNotes[entry.id]" maxlength="900" minlength="20" rows="3"
       placeholder="Confirm the original source, endpoint, variant, method, scope and interpretation."
       :disabled="busy"></textarea>
     </label>
     <div class="nfq-review-actions">
      <button type="button" :disabled="busy||(reviewNotes[entry.id]??'').trim().length<20"
       @click="decide(entry,'approve')">Approve source claim</button>
      <button type="button" :disabled="busy||(reviewNotes[entry.id]??'').trim().length<20"
       @click="decide(entry,'reject')">Reject with reason</button>
     </div>
    </div>
   </article>
  </div>
 </section>
</template>

<style scoped>
.nfq-reviewed-intake{padding:15px 0 2px;margin-top:12px;border-top:1px solid var(--border,#e1e8f0);min-width:0;color:var(--text,#223c59)}
.nfq-reviewed-intake-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.nfq-reviewed-intake-head h3{margin:0;font-size:12px;font-weight:660;letter-spacing:-.01em}
.nfq-reviewed-intake-head p,.nfq-review-counts,.nfq-review-empty{font-size:11px;line-height:1.5;color:var(--text-muted,#667e95);margin:4px 0 9px}
.nfq-reviewed-intake button{font:inherit;font-weight:590;font-size:11px;cursor:pointer;min-height:30px;padding:5px 8px;color:inherit;border:1px solid var(--border,#c9d8e9);background:transparent;border-radius:5px}
.nfq-reviewed-intake button:disabled{opacity:.48;cursor:not-allowed}
.nfq-reviewed-intake button:focus-visible,.nfq-reviewed-intake a:focus-visible{outline:2px solid #4285e3;outline-offset:2px}
.nfq-review-counts{display:flex;gap:4px 14px;flex-wrap:wrap}
.nfq-review-message{font-size:11px;color:var(--text-muted,#567997);line-height:1.5}
.nfq-reviewed-form{display:grid;gap:12px;padding:13px 0}
.nfq-reviewed-form>p{font-size:11px;line-height:1.5;margin:0;color:var(--text-muted,#657c92)}
.nfq-reviewed-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px 16px}
.nfq-reviewed-intake label{display:grid;gap:5px;font-size:11px;font-weight:580}
.nfq-reviewed-intake input,.nfq-reviewed-intake select,.nfq-reviewed-intake textarea{width:100%;min-width:0;box-sizing:border-box;font:inherit;font-size:12px;color:var(--text,#284460);background:var(--surface,#fff);padding:8px;border:1px solid var(--border,#ccd9e7);border-radius:6px}
.nfq-reviewed-form>footer{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
.nfq-reviewed-form>footer span,.nfq-reviewed-attribution,.nfq-reviewed-rationale{font-size:11px;line-height:1.55;color:var(--text-muted,#698098)}
.nfq-review-reference a{color:#3474ae}
.nfq-reviewed-record{padding:12px 0;border-top:1px solid var(--border,#e1e8f0)}
.nfq-reviewed-record-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}
.nfq-reviewed-record-head strong{font-size:12px}
.nfq-reviewed-record-head p{margin:3px 0;font-size:11px;color:var(--text-muted,#657d95)}
.nfq-reviewed-status{font-size:11px;white-space:nowrap;color:#466d91}
.nfq-reviewed-attribution,.nfq-reviewed-rationale{margin:6px 0}
.nfq-review-audit{font-size:11px;color:var(--text-muted,#6d839a);margin:7px 0}
.nfq-review-audit summary{cursor:pointer;width:max-content;max-width:100%}
.nfq-review-audit ul{padding-left:18px;line-height:1.55}
.nfq-review-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}
.nfq-review-decision{display:grid;gap:9px;margin-top:12px}
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-reviewed-intake input,
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-reviewed-intake select,
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-reviewed-intake textarea{background:#12243a;color:#e1edff;border-color:#415c7d}
@media(max-width:650px){.nfq-reviewed-grid{grid-template-columns:minmax(0,1fr)}.nfq-reviewed-intake-head{flex-wrap:wrap}.nfq-reviewed-record-head{flex-wrap:wrap}}
.nfq-endpoint-intake{margin:0;border:0;padding:2px 0 0;min-width:0}
.nfq-endpoint-intake summary{display:flex;justify-content:space-between;align-items:center;gap:12px;cursor:pointer;
 font-weight:650;font-size:12px;padding:8px 0;border-top:1px solid var(--border,#e1e8f0)}
.nfq-endpoint-intake summary span{font-weight:450;color:var(--text-muted,#657d95);font-size:11px}
.nfq-endpoint-intake>p{font-size:11px;line-height:1.5;color:var(--text-muted,#657d95);margin:7px 0 10px}
</style>

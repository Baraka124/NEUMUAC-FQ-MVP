<script setup lang="ts">
import {computed,ref,watch,onUnmounted,nextTick} from 'vue';
import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import {
 MECHANISM_CATEGORIES,prepareMechanismAnnotationDraft,
 type MechanismCategory,type MechanismInterpretation
} from '../domain/mechanismAnnotationDraft';
import {researchReviewHandoff,makeVerifiedScientificExport,portableScientificExport} from '../domain/scientificReviewReadiness';
import {filterReviewQueue,reviewQueueItems,molecularProvenancePath,
 type ReviewQueueScope} from '../domain/researchReviewQueue';
import {createMolecularReviewService,type MolecularReviewRecord} from '../services/molecularReviewService';
import {readConfigFromEnvironment} from '../services/liveVariants';
import {authSessionProvider} from '../services/authSession';

const props=defineProps<{
 active:boolean;variantId:string;variantName:string;
 claims:readonly CuratedSourceClaim[];references:readonly LiveEvidenceReference[];
}>();
const config=readConfigFromEnvironment();
const service=config&&authSessionProvider?createMolecularReviewService(config,authSessionProvider):null;
const expanded=ref(false);
const loading=ref<'closed'|'loading'|'ready'|'unavailable'>('closed');
const records=ref<readonly MolecularReviewRecord[]>([]);
const scope=ref<ReviewQueueScope>('all');
const editor=ref(false);
const busy=ref(false);
const notice=ref('');
const selectedReview=ref<string|null>(null);
const reviewNotes=ref<Record<string,string>>({});
const revisionOf=ref<MolecularReviewRecord|null>(null);
const sourceClaimId=ref('');
const categories=ref<MechanismCategory[]>([]);
const interpretation=ref<MechanismInterpretation>('reported-observation');
const statement=ref('');
const exactLocator=ref('');
const context=ref('');
const limitations=ref('');
const approvedSources=computed(()=>props.claims.filter(c=>c.status==='approved'&&
 c.reviewCount===2&&c.reviewSeals.length===2&&c.reviewSeals[0]!==c.reviewSeals[1]&&
 !!c.reviewedAt&&props.references.some(r=>r.variantId===props.variantId&&r.id===c.referenceId)));
const selectedSource=computed(()=>approvedSources.value.find(c=>c.id===sourceClaimId.value));
const selectedPublication=computed(()=>props.references.find(r=>r.id===selectedSource.value?.referenceId));
const summary=computed(()=>researchReviewHandoff({
 variantId:props.variantId,sourceClaims:props.claims,
 molecularClaims:loading.value==='ready'?records.value:[]
}));
const queue=computed(()=>reviewQueueItems({
 variantId:props.variantId,claims:props.claims,
 mechanisms:loading.value==='ready'?records.value:[]
}).filter(r=>r.kind==='molecular'));
const visible=computed(()=>loading.value==='ready'?
 records.value.filter(r=>filterReviewQueue(queue.value,scope.value).some(q=>q.id===r.id)):[]);
const provenance=(entry:MolecularReviewRecord)=>molecularProvenancePath({
 mechanism:entry,claims:props.claims,references:props.references
});
function clearForm():void{
 sourceClaimId.value='';categories.value=[];
 interpretation.value='reported-observation';statement.value='';
 exactLocator.value='';context.value='';limitations.value='';
 revisionOf.value=null;
}
let request:AbortController|null=null;
async function refresh():Promise<void>{
 request?.abort();request=new AbortController();
 const current=request;
 records.value=[];loading.value='loading';
 if(!props.active||!service){loading.value='unavailable';return;}
 try{
  const result=await service.list(props.variantId,current.signal);
  if(current.signal.aborted||request!==current||!props.active)return;
  records.value=result;loading.value='ready';
 }catch{
  if(!current.signal.aborted&&request===current)loading.value='unavailable';
 }finally{if(request===current)request=null;}
}
function close():void{
 request?.abort();request=null;records.value=[];loading.value='closed';
 expanded.value=false;editor.value=false;busy.value=false;
 scope.value='all';selectedReview.value=null;reviewNotes.value={};
 clearForm();notice.value='';
}
function toggle():void{if(expanded.value)close();else{expanded.value=true;void refresh();}}
function toggleCategory(id:MechanismCategory):void{
 categories.value=categories.value.includes(id)?categories.value.filter(x=>x!==id):
 categories.value.length<5?[...categories.value,id]:categories.value;
}
async function prepareRevision(record:MolecularReviewRecord):Promise<void>{
 if(!record.submittedByMe||!['approved','rejected'].includes(record.status))return;
 if(!approvedSources.value.some(c=>c.id===record.sourceClaimId)){
  notice.value='The underlying original claim is not currently approved. A corrected source review is required first.';
  return;
 }
 clearForm();editor.value=true;
 await nextTick();
 sourceClaimId.value=record.sourceClaimId;categories.value=[...record.categories];
 interpretation.value=record.interpretation;statement.value=record.statement;
 exactLocator.value=record.exactLocator;context.value=record.experimentalContext;
 limitations.value=record.limitations;revisionOf.value=record;
 notice.value='A corrected revision will be pending until two independent new molecular reviews.';
}
async function submit():Promise<void>{
 if(!service||!props.active||loading.value!=='ready'||busy.value)return;
 busy.value=true;notice.value='';
 try{
  const draft=prepareMechanismAnnotationDraft({
   variantId:props.variantId,claimId:sourceClaimId.value,categories:categories.value,
   interpretation:interpretation.value,statement:statement.value.trim(),
   exactLocator:exactLocator.value.trim(),experimentalContext:context.value.trim(),
   limitations:limitations.value.trim()
  },props.claims,props.references);
  if(revisionOf.value)await service.revise(revisionOf.value,draft);
  else await service.submit(draft);
  clearForm();editor.value=false;
  notice.value='Research interpretation submitted. Neither source approval nor a first molecular review is sufficient to approve it.';
  await refresh();
 }catch{
  notice.value='Submission not verified. Check the original source, exact locator, scientific context and review permissions before retrying.';
 }finally{busy.value=false;}
}
async function decide(record:MolecularReviewRecord,decision:'approve'|'reject'):Promise<void>{
 if(!service||busy.value||!record.canReview||record.status!=='pending'||
  selectedReview.value!==record.id||!props.active)return;
 const note=(reviewNotes.value[record.id]??'').trim();
 if(note.length<20)return;
 busy.value=true;notice.value='';
 try{
  const result=await service.review(record,decision,note);
  selectedReview.value=null;reviewNotes.value={};
  notice.value=result.status==='approved'?'Two independent molecular attestations recorded.':
   result.status==='rejected'?'Molecular interpretation rejected with preserved audit.':
   'One independent molecular attestation recorded. A different reviewer is required.';
  await refresh();
 }catch{notice.value='Scientific decision was not confirmed. Refresh the review register before retrying.';}
 finally{busy.value=false;}
}
function exportApproved():void{
 if(loading.value!=='ready'||!props.active||busy.value)return;
 try{
  const audit=makeVerifiedScientificExport({
   variantId:props.variantId,claims:props.claims,molecular:records.value,
   references:props.references,generatedAt:new Date().toISOString()
  });
  const url=URL.createObjectURL(new Blob([portableScientificExport(audit)],{
   type:'application/json;charset=utf-8'
  }));
  try{
   const anchor=document.createElement('a');anchor.href=url;
   anchor.download='neumuacfq-scientific-audit-'+props.variantId+'.json';
   document.body.appendChild(anchor);anchor.click();anchor.remove();
  }finally{window.setTimeout(()=>URL.revokeObjectURL(url),5000);}
  notice.value='Verified research audit exported. Drafts, pending and unapproved interpretations are excluded.';
 }catch{notice.value='Verified sources were incomplete, so no research audit was exported.';}
}
watch([()=>props.variantId,()=>props.active],()=>close());
onUnmounted(()=>request?.abort());
</script>

<template>
 <section class="nfq-one-variant-workbench" data-testid="nfq-single-molecular-workbench">
  <header class="nfq-one-variant-heading">
   <div>
    <strong>Molecular evidence workbench</strong>
    <p>Exact variant · scientific source interpretation · independently reviewed revisions</p>
   </div>
   <button type="button" :aria-expanded="expanded" @click="toggle">
    {{expanded?'Close workbench':'Open molecular workbench'}}
   </button>
  </header>
  <div v-if="expanded" class="nfq-one-variant-body">
   <p class="nfq-one-variant-note">{{variantName}} · database variant #{{variantId}}.
    Research interpretation only; no individual treatment recommendation or prediction.</p>
   <p v-if="loading==='loading'" class="nfq-one-variant-note" role="status">Verifying molecular records…</p>
   <p v-else-if="loading==='unavailable'" class="nfq-one-variant-note" role="status">
    Authenticated molecular review records could not be verified. No records or approvals are inferred.
   </p>
   <template v-else-if="loading==='ready'">
    <div class="nfq-one-variant-line" data-testid="nfq-single-molecular-status">
     <span>{{summary.approvedSourceClaims}} approved source claims</span>
     <span>{{summary.pendingMolecularClaims}} molecular proposals pending</span>
     <span>{{summary.approvedMolecularClaims}} independently approved molecular records</span>
    </div>
    <div class="nfq-one-variant-operations">
     <button type="button" :disabled="busy" @click="refresh">Refresh register</button>
     <button type="button" :disabled="busy||!approvedSources.length"
      :aria-expanded="editor" @click="editor=!editor">
      {{editor?'Close interpretation editor':'Propose source interpretation'}}
     </button>
     <button type="button" :disabled="busy" @click="exportApproved">Export verified research audit</button>
    </div>
    <p v-if="!approvedSources.length" class="nfq-one-variant-note">
     A source claim must receive two independent scientific approvals before a molecular
     interpretation can be submitted. Review a real linked publication in the source-claim section below.
    </p>
    <form v-if="editor&&approvedSources.length" class="nfq-one-variant-form"
     data-testid="nfq-single-molecular-editor" @submit.prevent="submit">
     <p class="nfq-one-variant-note">{{revisionOf?'Corrected molecular revision':'New source-specific molecular interpretation'}}.
      Scientific review of the underlying claim does not approve this molecular interpretation.</p>
     <label>Independently approved source claim
      <select v-model="sourceClaimId" required :disabled="!!revisionOf">
       <option value="" disabled>Choose the exact reviewed claim</option>
       <option v-for="claim in approvedSources" :key="claim.id" :value="claim.id">
        {{claim.studyFamilyId}} · {{claim.therapy}} · {{claim.id.slice(0,8)}}
       </option>
      </select>
     </label>
     <p v-if="selectedPublication" class="nfq-one-variant-note">
      Original source:
      <a :href="selectedPublication.url" target="_blank" rel="noopener noreferrer">
       {{selectedPublication.title}}</a> · source locator {{selectedSource?.locator}}
     </p>
     <fieldset>
      <legend>Explicitly source-supported molecular categories · select up to five</legend>
      <label v-for="category in MECHANISM_CATEGORIES" :key="category.id" class="nfq-one-variant-category">
       <input type="checkbox" :checked="categories.includes(category.id)"
        :disabled="!categories.includes(category.id)&&categories.length>=5"
        @change="toggleCategory(category.id)" />{{category.label}}
      </label>
     </fieldset>
     <label>Nature of scientific interpretation
      <select v-model="interpretation">
       <option value="reported-observation">Reported experimental observation</option>
       <option value="mechanistic-hypothesis">Hypothesis (not demonstrated)</option>
       <option value="contradictory-or-uncertain">Contradictory or unresolved</option>
      </select>
     </label>
     <label>Precisely what the source reports
      <textarea v-model="statement" rows="3" maxlength="850" minlength="25" required />
     </label>
     <label>Original figure, page, table or assay locator
      <input v-model="exactLocator" maxlength="240" minlength="8" required />
     </label>
     <label>Experimental model and exact variant context
      <textarea v-model="context" rows="2" maxlength="350" minlength="15" required />
     </label>
     <label>Limitations and uncertainty
      <textarea v-model="limitations" rows="2" maxlength="500" minlength="20" required />
     </label>
     <button type="submit" :disabled="busy||!sourceClaimId||!categories.length">
      {{busy?'Submitting…':revisionOf?'Submit corrected revision':'Submit for independent review'}}
     </button>
    </form>
    <div class="nfq-one-variant-queue">
     <label>Review queue
      <select v-model="scope" aria-label="Filter single-variant molecular review queue">
       <option value="all">All recorded revisions</option>
       <option value="actionable">Eligible for my independent review</option>
       <option value="pending">Awaiting review</option>
       <option value="approved">Independently approved</option>
       <option value="history">Rejected, withdrawn or superseded</option>
      </select>
     </label>
     <span>{{visible.length}} matching records</span>
    </div>
    <p v-if="!records.length" class="nfq-one-variant-note" role="status">
     No molecular interpretation has yet been submitted for this exact variant.
     Missing entries do not establish biological absence.
    </p>
    <p v-else-if="!visible.length" class="nfq-one-variant-note" role="status">
     No records match the selected review filter.
    </p>
    <article v-for="item in visible" :key="item.id" class="nfq-one-variant-record">
     <div class="nfq-one-variant-heading">
      <strong>{{item.categories.join(' · ')}}</strong>
      <span>{{item.status}} · revision {{item.revision}} · {{item.reviewCount}}/2 independent approvals</span>
     </div>
     <p>{{item.statement}}</p>
     <p class="nfq-one-variant-note">{{item.interpretation}} · {{item.experimentalContext}}</p>
     <details>
      <summary>Original publication, source approval and audit trail</summary>
      <p>Exact source claim {{item.sourceClaimId}} · molecular revision {{item.revision}}</p>
      <p>Source status: {{provenance(item).sourceStatus}} ·
       {{provenance(item).mechanismApprovedAndLinked?'Complete independent-review chain':
       'Not a completely approved source-to-mechanism chain'}}</p>
      <a v-if="provenance(item).originalUrl" :href="provenance(item).originalUrl!"
       target="_blank" rel="noopener noreferrer">{{provenance(item).originalTitle}}</a>
      <p v-if="provenance(item).studyFamilyId">Study family {{provenance(item).studyFamilyId}}
       · {{provenance(item).sourceLocator}}</p>
      <p>Mechanism locator: {{item.exactLocator}} · limitations: {{item.limitations}}</p>
      <ul v-if="provenance(item).limitations.length">
       <li v-for="limitation in provenance(item).limitations" :key="limitation">{{limitation}}</li>
      </ul>
      <p v-for="(audit,index) in item.reviewAudit" :key="'r'+index">
       {{audit.decision}} · {{audit.at}} · {{audit.note}}</p>
      <p v-for="(event,index) in item.events" :key="'e'+index">
       {{event.action}} · {{event.at}}</p>
     </details>
     <button v-if="item.submittedByMe&&['approved','rejected'].includes(item.status)"
      type="button" :disabled="busy" @click="prepareRevision(item)">Prepare corrected revision</button>
     <div v-if="item.canReview&&item.status==='pending'" class="nfq-one-variant-decision">
      <button type="button" :disabled="busy" :aria-expanded="selectedReview===item.id"
       @click="selectedReview=selectedReview===item.id?null:item.id">
       {{selectedReview===item.id?'Close independent review':'Review molecular interpretation'}}
      </button>
      <div v-if="selectedReview===item.id">
       <label>Independent scientific review rationale (minimum 20 characters)
        <textarea :value="reviewNotes[item.id]??''" rows="2" maxlength="900"
         @input="reviewNotes={...reviewNotes,[item.id]:($event.target as HTMLTextAreaElement).value}" />
       </label>
       <button type="button" :disabled="busy||(reviewNotes[item.id]??'').trim().length<20"
        @click="decide(item,'approve')">Approve independently</button>
       <button type="button" :disabled="busy||(reviewNotes[item.id]??'').trim().length<20"
        @click="decide(item,'reject')">Reject with rationale</button>
      </div>
     </div>
     <p v-else-if="item.status==='pending'" class="nfq-one-variant-note">
      {{item.submittedByMe?'Submitted by you; independent reviewers must attest':
       'No independent reviewer action authorized for this session'}}
     </p>
    </article>
   </template>
   <p v-if="notice" role="status" class="nfq-one-variant-note">{{notice}}</p>
  </div>
 </section>
</template>

<style scoped>
.nfq-one-variant-workbench{margin:13px 0 4px;border-top:1px solid var(--border,#dee7ef);color:var(--text,#243d5b);font-size:11px}
.nfq-one-variant-heading{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:8px 15px}
.nfq-one-variant-heading>div{min-width:0}
.nfq-one-variant-heading strong{font-size:12px;font-weight:660}
.nfq-one-variant-heading p,.nfq-one-variant-note{font-size:11px;line-height:1.55;color:var(--text-muted,#6b8298);margin:5px 0}
.nfq-one-variant-heading>span{font-size:10px;color:var(--text-muted,#6b8298)}
.nfq-one-variant-heading:first-child{padding:13px 0 10px}
.nfq-one-variant-workbench button{border:1px solid var(--border,#c5d4e3);border-radius:5px;padding:6px 9px;background:transparent;color:inherit;font:inherit;font-size:11px;cursor:pointer}
.nfq-one-variant-workbench button:disabled{opacity:.5;cursor:not-allowed}
.nfq-one-variant-body{padding:1px 0 13px}
.nfq-one-variant-line,.nfq-one-variant-operations,.nfq-one-variant-queue{display:flex;flex-wrap:wrap;gap:8px 17px;align-items:center;margin:10px 0}
.nfq-one-variant-line span,.nfq-one-variant-queue span{font-size:11px;color:var(--text-muted,#6b8298)}
.nfq-one-variant-form{display:grid;gap:11px;max-width:780px;padding:11px 0}
.nfq-one-variant-form label,.nfq-one-variant-decision label,.nfq-one-variant-queue label{display:grid;gap:5px;font-size:11px}
.nfq-one-variant-form input:not([type=checkbox]),.nfq-one-variant-form textarea,.nfq-one-variant-form select,
.nfq-one-variant-decision textarea,.nfq-one-variant-queue select{font:inherit;font-size:12px;padding:7px;border:1px solid var(--border,#c5d4e3);border-radius:5px;box-sizing:border-box;min-width:0;max-width:100%;background:var(--surface,#fff);color:inherit}
.nfq-one-variant-form fieldset{border:0;padding:0;margin:0;display:grid;gap:6px}
.nfq-one-variant-form legend{font-size:11px;font-weight:650;margin-bottom:8px}
.nfq-one-variant-category{display:flex!important;align-items:center;gap:8px}
.nfq-one-variant-record{padding:13px 0;border-top:1px solid var(--border,#dee7ef)}
.nfq-one-variant-record>p{line-height:1.55}
.nfq-one-variant-record details{margin:10px 0}
.nfq-one-variant-record details p{margin:6px 0;line-height:1.5}
.nfq-one-variant-record a{color:var(--link,#2869a9)}
.nfq-one-variant-decision{display:grid;gap:8px;justify-items:start}
.nfq-one-variant-decision>div{display:grid;gap:8px;justify-items:start;max-width:670px;width:100%}
.nfq-one-variant-queue label{max-width:270px}
.nfq-one-variant-workbench button:focus-visible,.nfq-one-variant-workbench a:focus-visible,
.nfq-one-variant-workbench select:focus-visible{outline:2px solid #3876c5;outline-offset:2px}
</style>

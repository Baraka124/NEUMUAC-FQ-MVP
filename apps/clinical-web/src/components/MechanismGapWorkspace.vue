<script setup lang="ts">
import {computed,nextTick,ref,watch,onUnmounted} from 'vue';
import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import {MECHANISM_CATEGORIES,prepareMechanismAnnotationDraft,portableMechanismDraft,
 type MechanismAnnotationDraft,type MechanismCategory,type MechanismInterpretation} from '../domain/mechanismAnnotationDraft';
import {buildCrossVariantGapMap} from '../domain/crossVariantGapMap';
import {THERAPIES,type CoreModulatorId} from '../domain/therapyRegistry';
import {createMolecularReviewService,type MolecularReviewRecord} from '../services/molecularReviewService';
import {authSessionProvider} from '../services/authSession';
import {readConfigFromEnvironment} from '../services/liveVariants';

const props=defineProps<{
 firstId:string;secondId:string;
 firstClaims:readonly CuratedSourceClaim[];secondClaims:readonly CuratedSourceClaim[];
 firstReferences:readonly LiveEvidenceReference[];secondReferences:readonly LiveEvidenceReference[];
}>();
const expanded=ref(false);
const editor=ref(false);
const draftVariant=ref('');
const draftClaim=ref('');
const categories=ref<MechanismCategory[]>([]);
const interpretation=ref<MechanismInterpretation>('reported-observation');
const statement=ref('');
const locator=ref('');
const experimentalContext=ref('');
const limitations=ref('');
const savedDrafts=ref<readonly MechanismAnnotationDraft[]>([]);
const notice=ref('');
const config=readConfigFromEnvironment();
const service=config&&authSessionProvider?createMolecularReviewService(config,authSessionProvider,fetch):null;
const molecularRecords=ref<readonly MolecularReviewRecord[]>([]);
const molecularState=ref<'closed'|'loading'|'ready'|'unavailable'>('closed');
const molecularBusy=ref(false);
const reviewSelection=ref<string|null>(null);
const reviewNotes=ref<Record<string,string>>({});
const reviseOf=ref<MolecularReviewRecord|null>(null);
const reviewed=(variantId:string)=>(
 variantId===props.firstId?props.firstClaims:props.secondClaims
).filter(c=>c.status==='approved');
const choices=computed(()=>reviewed(draftVariant.value).map(c=>({
 id:c.id,therapy:c.therapy,referenceId:c.referenceId,studyFamilyId:c.studyFamilyId
})));
const availableSources=computed(()=>draftVariant.value===props.firstId?
 props.firstReferences:props.secondReferences);
const selectedSource=computed(()=>availableSources.value.find(r=>r.id===
 choices.value.find(c=>c.id===draftClaim.value)?.referenceId));
const map=computed(()=>buildCrossVariantGapMap({
 firstId:props.firstId,secondId:props.secondId,
 firstClaims:props.firstClaims,secondClaims:props.secondClaims,
 firstReferences:props.firstReferences,secondReferences:props.secondReferences,
 drafts:savedDrafts.value
}));
const therapy=(id:CoreModulatorId)=>THERAPIES.find(t=>t.id===id)?.label??id;
const gapLabel=(gap:string)=>({
 'no-reviewed-source-claim':'No approved claim in loaded register',
 'endpoint-not-extracted':'No extracted experimental endpoint',
 'study-context-not-extracted':'Population/model context not extracted',
 'mechanism-not-adjudicated':'Mechanism-specific independent review not recorded'
} as Record<string,string>)[gap]??gap;
function clearForm():void{
 draftVariant.value=props.firstId;draftClaim.value='';categories.value=[];
 interpretation.value='reported-observation';statement.value='';locator.value='';
 experimentalContext.value='';limitations.value='';notice.value='';
}
let molecularAbort:AbortController|null=null;
async function loadMolecularRecords():Promise<void>{
 molecularAbort?.abort();molecularAbort=new AbortController();
 const controller=molecularAbort;
 molecularRecords.value=[];
 if(!service){molecularState.value='unavailable';return;}
 molecularState.value='loading';
 try{
  const [first,second]=await Promise.all([
   service.list(props.firstId,controller.signal),service.list(props.secondId,controller.signal)
  ]);
  if(controller.signal.aborted||molecularAbort!==controller)return;
  molecularRecords.value=[...first,...second];molecularState.value='ready';
 }catch{
  if(!controller.signal.aborted&&molecularAbort===controller)molecularState.value='unavailable';
 }
}
function reset():void{
 molecularAbort?.abort();molecularAbort=null;
 molecularRecords.value=[];molecularState.value='closed';molecularBusy.value=false;
 reviewSelection.value=null;reviewNotes.value={};reviseOf.value=null;
 clearForm();savedDrafts.value=[];expanded.value=false;editor.value=false;
}
function toggleExpanded():void{
 expanded.value=!expanded.value;
 if(expanded.value)void loadMolecularRecords();
 else {molecularAbort?.abort();molecularRecords.value=[];molecularState.value='closed';}
}
async function startRevision(item:MolecularReviewRecord):Promise<void>{
 if(!item.submittedByMe||!['approved','rejected'].includes(item.status))return;
 draftVariant.value=item.variantId;
 await nextTick();
 draftClaim.value=item.sourceClaimId;
 categories.value=[...item.categories];interpretation.value=item.interpretation;
 statement.value=item.statement;locator.value=item.exactLocator;
 experimentalContext.value=item.experimentalContext;limitations.value=item.limitations;
 reviseOf.value=item;editor.value=true;
 notice.value='Preparing an amended revision. Existing approved evidence remains active until two new independent approvals.';
}
async function persistDraft(draft:MechanismAnnotationDraft):Promise<void>{
 if(!service||molecularBusy.value)return;
 molecularBusy.value=true;notice.value='';
 try{
  if(reviseOf.value){
   if(reviseOf.value.variantId!==draft.variantId||reviseOf.value.sourceClaimId!==draft.claimId)
    throw new Error('Revision source mismatch');
   await service.revise(reviseOf.value,draft);
  }else await service.submit(draft);
  reviseOf.value=null;
  notice.value='Submitted to the independent molecular review queue. No mechanism is approved until two distinct scientific reviewers attest.';
  savedDrafts.value=savedDrafts.value.filter(item=>item!==draft);
  await loadMolecularRecords();
 }catch{
  notice.value='Server confirmation unavailable. No persisted mechanism approval is assumed; refresh the review queue before retrying.';
 }finally{molecularBusy.value=false;}
}
async function decide(item:MolecularReviewRecord,decision:'approve'|'reject'):Promise<void>{
 if(!service||molecularBusy.value||!item.canReview||reviewSelection.value!==item.id)return;
 const note=(reviewNotes.value[item.id]??'').trim();
 if(note.length<20)return;
 molecularBusy.value=true;notice.value='';
 try{
  const result=await service.review(item,decision,note);
  reviewSelection.value=null;reviewNotes.value={};
  notice.value=result.status==='approved'?'Two independent mechanism reviews completed; the server approved this revision.':
   result.status==='rejected'?'Mechanism interpretation rejected with retained revision history.':
   'One independent approval recorded; the second scientific reviewer is still required.';
  await loadMolecularRecords();
 }catch{
  notice.value='Review was not confirmed. Refresh the research review queue before retrying.';
 }finally{molecularBusy.value=false;}
}
watch([()=>props.firstId,()=>props.secondId],reset,{immediate:true});
watch(draftVariant,()=>{draftClaim.value='';categories.value=[];notice.value='';});
onUnmounted(()=>molecularAbort?.abort());
function toggleCategory(value:MechanismCategory):void{
 categories.value=categories.value.includes(value)?
 categories.value.filter(c=>c!==value):categories.value.length<5?
 [...categories.value,value]:categories.value;
}
async function addDraft():Promise<void>{
 try{
  const draft=prepareMechanismAnnotationDraft({
   variantId:draftVariant.value,claimId:draftClaim.value,categories:categories.value,
   interpretation:interpretation.value,statement:statement.value.trim(),
   exactLocator:locator.value.trim(),experimentalContext:experimentalContext.value.trim(),
   limitations:limitations.value.trim()
  },draftVariant.value===props.firstId?props.firstClaims:props.secondClaims,
    availableSources.value);
  savedDrafts.value=[...savedDrafts.value,draft];
  clearForm();editor.value=false;
  notice.value='Added to this comparison only. Not saved to the clinical database or independently approved.';
 }catch{
  notice.value='The mechanism draft needs an approved linked source, selected mechanism, exact locator and complete interpretation/context/limitations.';
 }
}
async function copyDraft(draft:MechanismAnnotationDraft):Promise<void>{
 try{
  if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
  await navigator.clipboard.writeText(portableMechanismDraft(draft));
  notice.value='Unreviewed, source-linked draft copied. No persistent record or review was created.';
 }catch{notice.value='Clipboard access failed. No record was saved.';}
}
function removeDraft(index:number):void{
 savedDrafts.value=savedDrafts.value.filter((_,i)=>i!==index);
 notice.value='Local draft removed from this comparison.';
}
</script>
<template>
 <section class="nfq-mechanism" data-testid="nfq-mechanism-gap-map">
  <header class="nfq-mechanism-head">
   <div><strong>Mechanism evidence &amp; research coverage</strong>
    <p>Source-linked annotation drafts · five-therapy evidence inventory</p></div>
   <button type="button" :aria-expanded="expanded" @click="toggleExpanded">
    {{expanded?'Hide gap map':'Examine evidence gaps'}}
   </button>
  </header>
  <div v-if="expanded">
   <p class="nfq-mechanism-note">{{map.interpretation}}</p>
   <section class="nfq-molecular-persist" data-testid="nfq-molecular-review-records">
    <header class="nfq-mechanism-head">
     <div><strong>Independent molecular review register</strong>
      <p>Authenticated revisions · two independent scientific attestations</p></div>
     <button type="button" @click="loadMolecularRecords" :disabled="molecularBusy">Refresh reviews</button>
    </header>
    <p v-if="molecularState==='loading'" role="status" class="nfq-mechanism-note">
     Verifying molecular review records…</p>
    <p v-else-if="molecularState==='unavailable'" role="status" class="nfq-mechanism-note">
     The persistent review service cannot be verified. Drafting remains local; no saved or approved
     molecular record is implied. Database migration may not yet be deployed.</p>
    <p v-else-if="molecularState==='ready'&&!molecularRecords.length" class="nfq-mechanism-note">
     No persisted molecular interpretation revisions are recorded for these variants.</p>
    <article v-for="item in molecularState==='ready'?molecularRecords:[]" :key="item.id"
     class="nfq-molecular-record">
     <div class="nfq-mechanism-head">
      <strong>Variant #{{item.variantId}} · {{item.categories.join(' / ')}}</strong>
      <span>{{item.status}} · revision {{item.revision}} · {{item.reviewCount}}/2 approvals</span>
     </div>
     <p>{{item.statement}}</p>
     <p class="nfq-mechanism-note">{{item.interpretation}} · {{item.experimentalContext}}</p>
     <p class="nfq-mechanism-note">Source claim {{item.sourceClaimId}} · {{item.exactLocator}}</p>
     <p class="nfq-mechanism-note">Limitations: {{item.limitations}}</p>
     <details v-if="item.events.length">
      <summary>Revision audit ({{item.events.length}})</summary>
      <ul><li v-for="(event,i) in item.events" :key="i">{{event.action}} · {{event.at}}</li></ul>
     </details>
     <button v-if="item.submittedByMe&&['approved','rejected'].includes(item.status)"
      type="button" @click="startRevision(item)">Propose corrected revision</button>
     <div v-if="item.canReview">
      <button type="button" :aria-expanded="reviewSelection===item.id"
       @click="reviewSelection=reviewSelection===item.id?null:item.id">
       {{reviewSelection===item.id?'Close independent review':'Review source interpretation'}}
      </button>
      <div v-if="reviewSelection===item.id" class="nfq-molecular-review-form">
       <label>Independent reviewer rationale (minimum 20 characters)
        <textarea :value="reviewNotes[item.id]??''" rows="2" maxlength="900"
         @input="reviewNotes={...reviewNotes,[item.id]:($event.target as HTMLTextAreaElement).value}" />
       </label>
       <button type="button" :disabled="molecularBusy||(reviewNotes[item.id]??'').trim().length<20"
        @click="decide(item,'approve')">Record independent approval</button>
       <button type="button" :disabled="molecularBusy||(reviewNotes[item.id]??'').trim().length<20"
        @click="decide(item,'reject')">Reject with rationale</button>
      </div>
     </div>
    </article>
   </section>
   <div class="nfq-mechanism-matrix" role="table" aria-label="Source coverage by variant and therapy">
    <div class="nfq-mechanism-matrix-head" role="row">
     <span role="columnheader">Therapy</span>
     <span role="columnheader">#{{firstId}}</span>
     <span role="columnheader">#{{secondId}}</span>
    </div>
    <div v-for="therapyRow in THERAPIES" :key="therapyRow.id"
     class="nfq-mechanism-matrix-row" role="row">
     <strong role="rowheader">{{therapyRow.label}}</strong>
     <div v-for="variantId in [firstId,secondId]" :key="variantId" role="cell">
      <template v-for="cell in map.cells.filter(c=>c.variantId===variantId&&c.therapy===therapyRow.id)" :key="cell.variantId">
       <span>{{cell.uniqueStudyFamilies}} reviewed stud{{cell.uniqueStudyFamilies===1?'y':'ies'}}</span>
       <span>{{cell.mechanismProposalCount}} mechanism draft{{cell.mechanismProposalCount===1?'':'s'}}</span>
       <details>
        <summary>{{cell.gaps.length}} register gap{{cell.gaps.length===1?'':'s'}}</summary>
        <ul><li v-for="gap in cell.gaps" :key="gap">{{gapLabel(gap)}}</li></ul>
       </details>
      </template>
     </div>
    </div>
   </div>
   <p class="nfq-mechanism-note">A gap represents only this verified source register.
    Absence of annotations is not evidence of absence of the underlying mechanism.</p>
   <div class="nfq-mechanism-coverage">
    <strong>Mechanism categories · unreviewed draft coverage</strong>
    <div v-for="category in map.mechanismCoverage" :key="category.category"
     class="nfq-mechanism-category">
     <span>{{category.label}}</span>
     <span>{{category.firstDraftCount}} / {{category.secondDraftCount}} drafts</span>
    </div>
   </div>
   <header class="nfq-mechanism-head nfq-mechanism-editor-head">
    <div><strong>Record an explicit source observation</strong>
     <p>Research-only draft. Independent mechanism review is not yet a supported persistence workflow.</p></div>
    <button type="button" :aria-expanded="editor" @click="editor=!editor">
     {{editor?'Close draft':'Prepare mechanism draft'}}
    </button>
   </header>
   <form v-if="editor" class="nfq-mechanism-form" @submit.prevent="addDraft"
    data-testid="nfq-mechanism-annotation-form">
    <label>Variant
     <select v-model="draftVariant">
      <option :value="firstId">Variant #{{firstId}}</option>
      <option :value="secondId">Variant #{{secondId}}</option>
     </select>
    </label>
    <label>Approved source claim
     <select v-model="draftClaim" required>
      <option value="" disabled>Choose an independently reviewed source claim</option>
      <option v-for="entry in choices" :key="entry.id" :value="entry.id">
       {{therapy(entry.therapy)}} · study {{entry.studyFamilyId}} · claim {{entry.id.slice(0,8)}}
      </option>
     </select>
    </label>
    <p v-if="selectedSource" class="nfq-mechanism-note">Source:
     <a :href="selectedSource.url" target="_blank" rel="noopener noreferrer">{{selectedSource.title}}</a></p>
    <fieldset>
     <legend>Mechanism(s) explicitly discussed by the original source · max 5</legend>
     <label v-for="category in MECHANISM_CATEGORIES" :key="category.id" class="nfq-mechanism-check">
      <input type="checkbox" :checked="categories.includes(category.id)"
       :disabled="!categories.includes(category.id)&&categories.length>=5"
       @change="toggleCategory(category.id)" /> {{category.label}}
     </label>
    </fieldset>
    <label>What does the publication actually establish?
     <select v-model="interpretation">
      <option value="reported-observation">Source-reported observation (not independently mechanism-adjudicated)</option>
      <option value="mechanistic-hypothesis">Author hypothesis · not demonstrated</option>
      <option value="contradictory-or-uncertain">Contradictory or uncertain interpretation</option>
     </select>
    </label>
    <label>Exact source-based statement
     <textarea v-model="statement" rows="3" maxlength="850"
      placeholder="Summarize precisely without claiming more than the original study reports" required/>
    </label>
    <label>Original page, figure or assay locator
     <input v-model="locator" maxlength="240" placeholder="Figure 2B · assay description" required/>
    </label>
    <label>Experimental model / genotype context
     <textarea v-model="experimentalContext" rows="2" maxlength="350"
      placeholder="Source-reported model and tested genotype; specify limitations of scope" required/>
    </label>
    <label>Limitations, uncertainty or conflicting observations
     <textarea v-model="limitations" rows="2" maxlength="500"
      placeholder="What remains untested or cannot be concluded?" required/>
    </label>
    <button type="submit">Add local research draft</button>
    <p v-if="reviseOf" class="nfq-mechanism-note">
     Revising stored record {{reviseOf.id}}. Add a local draft, then submit that draft
     as a new independent-review revision using the control below.</p>
   </form>
   <p v-if="notice" role="status" class="nfq-mechanism-note">{{notice}}</p>
   <div v-if="savedDrafts.length" class="nfq-mechanism-drafts">
    <article v-for="(draft,index) in savedDrafts" :key="draft.claimId+':'+index">
     <div class="nfq-mechanism-head">
      <strong>Variant #{{draft.variantId}} · {{draft.categories.join(' / ')}}</strong>
      <span>Unreviewed research draft</span>
     </div>
     <p>{{draft.statement}}</p>
     <p class="nfq-mechanism-note">{{draft.experimentalContext}} · {{draft.exactLocator}}</p>
     <p class="nfq-mechanism-note">Limitations: {{draft.limitations}}</p>
     <a :href="draft.sourceUrl" target="_blank" rel="noopener noreferrer">
      Original source · claim {{draft.claimId.slice(0,8)}}</a>
     <div class="nfq-mechanism-actions">
      <button type="button" @click="copyDraft(draft)">Copy source-linked draft</button>
      <button type="button" :disabled="molecularBusy||molecularState!=='ready'"
       @click="persistDraft(draft)">
       {{reviseOf?'Submit revised interpretation':'Submit for independent review'}}
      </button>
      <button type="button" @click="removeDraft(index)">Discard local draft</button>
     </div>
    </article>
   </div>
  </div>
 </section>
</template>
<style scoped>
.nfq-mechanism{margin:12px 0;padding:12px 0;border-top:1px solid var(--border,#dde7ef);font-size:11px}
.nfq-mechanism-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
.nfq-mechanism-head strong{font-size:12px;font-weight:650}
.nfq-mechanism-head p,.nfq-mechanism-note{font-size:11px;line-height:1.55;color:var(--text-muted,#6b839b);margin:5px 0}
.nfq-mechanism button{background:transparent;color:inherit;border:1px solid var(--border,#c7d8e7);padding:5px 9px;border-radius:5px;font:inherit;font-size:11px;cursor:pointer}
.nfq-mechanism button:focus-visible,.nfq-mechanism a:focus-visible,.nfq-mechanism input:focus-visible,.nfq-mechanism select:focus-visible,.nfq-mechanism textarea:focus-visible{outline:2px solid #3876c5;outline-offset:2px}
.nfq-mechanism-matrix{margin:12px 0;overflow-wrap:anywhere}
.nfq-mechanism-matrix-head,.nfq-mechanism-matrix-row{display:grid;grid-template-columns:minmax(105px,.85fr) minmax(0,1fr) minmax(0,1fr);gap:8px;border-bottom:1px solid var(--border,#dde7ef);padding:8px 0}
.nfq-mechanism-matrix-head{color:var(--text-muted,#6b839b);font-size:10px}
.nfq-mechanism-matrix-row strong{font-size:11px}
.nfq-mechanism-matrix-row span{display:block;margin:2px 0}
.nfq-mechanism details{font-size:10px;margin-top:4px}
.nfq-mechanism summary{cursor:pointer}
.nfq-mechanism li{margin:5px 0}
.nfq-mechanism-coverage{padding:8px 0}
.nfq-mechanism-coverage>strong{display:block;margin-bottom:8px}
.nfq-mechanism-category{display:flex;justify-content:space-between;gap:12px;padding:5px 0;border-bottom:1px solid var(--border,#dde7ef)}
.nfq-mechanism-category span:last-child{color:var(--text-muted,#6b839b)}
.nfq-mechanism-editor-head{margin-top:12px}
.nfq-mechanism-form{display:grid;gap:10px;max-width:690px;padding:12px 0}
.nfq-mechanism-form label{display:grid;gap:5px;font-size:11px}
.nfq-mechanism-form select,.nfq-mechanism-form textarea,.nfq-mechanism-form input:not([type=checkbox]){width:100%;min-width:0;box-sizing:border-box;background:transparent;color:inherit;border:1px solid var(--border,#c7d8e7);border-radius:4px;font:inherit;font-size:11px;padding:7px 9px}
.nfq-mechanism-form fieldset{border:1px solid var(--border,#dde7ef);padding:9px}
.nfq-mechanism-form legend{font-size:11px}
.nfq-mechanism-form .nfq-mechanism-check{display:flex;align-items:center;gap:7px;padding:3px 0}
.nfq-mechanism-form button{justify-self:start}
.nfq-molecular-persist{margin:15px 0;padding:12px 0;border-top:1px solid var(--border,#dde7ef)}
.nfq-molecular-record{padding:11px 0;border-top:1px solid var(--border,#dde7ef)}
.nfq-molecular-record p{line-height:1.5}
.nfq-molecular-review-form{display:grid;gap:7px;max-width:640px;margin:8px 0}
.nfq-molecular-review-form label{display:grid;gap:5px}
.nfq-molecular-review-form textarea{font:inherit;padding:8px;min-width:0;max-width:100%;background:transparent;color:inherit;border:1px solid var(--border,#c7d8e7)}
.nfq-mechanism-drafts article{padding:12px 0;border-top:1px solid var(--border,#dde7ef)}
.nfq-mechanism-drafts p{line-height:1.55}
.nfq-mechanism-actions{display:flex;gap:7px;margin-top:8px}
.nfq-mechanism a{color:var(--link,#2869a9);text-underline-offset:3px}
@media(max-width:460px){.nfq-mechanism-matrix-head,.nfq-mechanism-matrix-row{grid-template-columns:75px minmax(0,1fr) minmax(0,1fr);gap:6px}}
</style>

<script setup lang="ts">
import {computed,ref,watch,onUnmounted,nextTick} from 'vue';
import {useRoute,useRouter,RouterLink} from 'vue-router';
import {createReadOnlyRepository,readConfigFromEnvironment,variantDisplayName,type RealVariant} from '../services/liveVariants';
import {authController,authSessionProvider} from '../services/authSession';
import {createLiveEvidenceSource,type LiveEvidenceReference} from '../services/liveEvidence';
import {pairRecordId,pairSelectionQuery} from '../domain/pairSelection';
import ContextHelp from '../components/ContextHelp.vue';
import PairModulatorReview from '../components/PairModulatorReview.vue';
import DrugReferencePanel from '../components/DrugReferencePanel.vue';
import {portableComparisonLink} from '../domain/portableComparisonLink';
import {pairResearchMarkdown} from '../domain/pairResearchExport';

const route=useRoute(),router=useRouter();
const cfg=readConfigFromEnvironment();
const variants=cfg?createReadOnlyRepository(cfg,fetch,authSessionProvider):null;
const evidence=cfg?createLiveEvidenceSource(cfg):null;
type Slot=0|1;
type ReferenceState='idle'|'loading'|'loaded'|'error'|'unavailable';
const input=[ref(''),ref('')];
const chosen=[ref<RealVariant|null>(null),ref<RealVariant|null>(null)];
const results=[ref<readonly RealVariant[]>([]),ref<readonly RealVariant[]>([])];
const citations=[ref<readonly LiveEvidenceReference[]>([]),ref<readonly LiveEvidenceReference[]>([])];
const pending=[ref(false),ref(false)];
const error=[ref(''),ref('')];
const referenceState=[ref<ReferenceState>('idle'),ref<ReferenceState>('idle')];
const showCitations=[ref(false),ref(false)];
const aborts:[AbortController|null,AbortController|null]=[null,null];
const restoreAborts:[AbortController|null,AbortController|null]=[null,null];
const citationAborts:[AbortController|null,AbortController|null]=[null,null];
const sequence=[0,0],restoreSequence=[0,0];
const debounce:[ReturnType<typeof setTimeout>|undefined,ReturnType<typeof setTimeout>|undefined]=[undefined,undefined];
const sameVariant=computed(()=>Boolean(chosen[0].value&&chosen[1].value&&chosen[0].value.id===chosen[1].value.id));
const hasPair=computed(()=>Boolean(chosen[0].value&&chosen[1].value));
const shareNotice=ref('');
const canShare=computed(()=>Boolean(chosen[0].value&&chosen[1].value));
const canExport=computed(()=>canShare.value&&referenceState[0].value==='loaded'&&referenceState[1].value==='loaded');
const exportNotice=ref('');
function downloadResearchComparison():void{
 if(!canExport.value||!chosen[0].value||!chosen[1].value)return;
 const markdown=pairResearchMarkdown({
  first:chosen[0].value,second:chosen[1].value,
  firstReferences:citations[0].value,secondReferences:citations[1].value
 });
 if(markdown===null){exportNotice.value='The current reference records cannot be exported safely.';return;}
 const blob=new Blob([markdown],{type:'text/markdown;charset=utf-8'});
 const url=URL.createObjectURL(blob);
 try{
  const link=document.createElement('a');link.href=url;
  link.download='neumuacFQ-comparison-'+chosen[0].value.id+'-'+chosen[1].value.id+'.md';
  document.body.appendChild(link);link.click();link.remove();
  exportNotice.value='Research record comparison exported. Sources have not been independently validated.';
 }finally{window.setTimeout(()=>URL.revokeObjectURL(url),5000);}
}
async function copyComparisonLink():Promise<void>{
 const href=portableComparisonLink(chosen[0].value?.id,chosen[1].value?.id,window.location.href);
 if(!href||!navigator.clipboard?.writeText){shareNotice.value='A shareable comparison link is unavailable.';return;}
 try{
  await navigator.clipboard.writeText(href);
  shareNotice.value='Record comparison link copied. Opened records must be verified again.';
 }catch{shareNotice.value='The comparison link could not be copied. Clipboard access may be restricted.';}
}
watch([chosen[0],chosen[1]],()=>{shareNotice.value='';exportNotice.value='';});


function routeId(slot:Slot):string|null{return pairRecordId(route.query[slot===0?'a':'b']);}
function stopReads(slot:Slot){
 aborts[slot]?.abort();restoreAborts[slot]?.abort();citationAborts[slot]?.abort();
 clearTimeout(debounce[slot]);++sequence[slot];++restoreSequence[slot];
 pending[slot].value=false;
}
function resetReferences(slot:Slot){
 citations[slot].value=[];referenceState[slot].value='idle';showCitations[slot].value=false;
}
async function loadCitations(slot:Slot,id:string):Promise<void>{
 citationAborts[slot]?.abort();
 const controller=new AbortController();citationAborts[slot]=controller;
 citations[slot].value=[];
 if(!evidence){referenceState[slot].value='unavailable';return;}
 referenceState[slot].value='loading';
 try{
  const rows=await evidence.forVariant(id,controller.signal);
  if(!controller.signal.aborted&&chosen[slot].value?.id===id){
   citations[slot].value=rows;referenceState[slot].value='loaded';
  }
 }catch{
  if(!controller.signal.aborted&&chosen[slot].value?.id===id)referenceState[slot].value='error';
 }
}
async function restoreSlot(slot:Slot,id:string|null):Promise<void>{
 // Updating one pair member must not replace the other member or refetch its sources.
 if(id&&chosen[slot].value?.id===id)return;
 const wasSelected=Boolean(chosen[slot].value);
 stopReads(slot);resetReferences(slot);
 chosen[slot].value=null;results[slot].value=[];error[slot].value='';
 if(wasSelected)input[slot].value='';
 if(!id)return;
 if(!variants){error[slot].value='Live CFTR access is not configured.';return;}
 const controller=new AbortController();restoreAborts[slot]=controller;
 const run=++restoreSequence[slot];pending[slot].value=true;
 try{
  const record=await variants.get(id,controller.signal);
  if(controller.signal.aborted||run!==restoreSequence[slot])return;
  if(!record){error[slot].value='This recorded variant is not accessible.';return;}
  chosen[slot].value=record;input[slot].value=variantDisplayName(record);
  void loadCitations(slot,record.id);
 }catch{
  if(!controller.signal.aborted&&run===restoreSequence[slot])error[slot].value='Could not restore this variant.';
 }finally{
  if(run===restoreSequence[slot])pending[slot].value=false;
 }
}
async function lookup(slot:Slot):Promise<void>{
 aborts[slot]?.abort();const controller=new AbortController();aborts[slot]=controller;
 const run=++sequence[slot],q=input[slot].value.trim();
 results[slot].value=[];error[slot].value='';
 if(chosen[slot].value||!q){pending[slot].value=false;return;}
 if(!variants){error[slot].value='Live CFTR access is not configured.';return;}
 pending[slot].value=true;
 try{
  const page=await variants.list({query:q,page:0,signal:controller.signal});
  if(!controller.signal.aborted&&run===sequence[slot]&&q===input[slot].value.trim())
   results[slot].value=page.records.slice(0,12);
 }catch{
  if(!controller.signal.aborted&&run===sequence[slot])error[slot].value='Variant search is unavailable.';
 }finally{if(run===sequence[slot])pending[slot].value=false;}
}
function retrySlot(slot:Slot):void{
 const id=routeId(slot);
 if(id)void restoreSlot(slot,id);
 else void lookup(slot);
}
function focusTherapyResults():void{
 const target=document.getElementById('pair-drugs-title');
 if(!target)return;
 const prefersReduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 target.scrollIntoView({behavior:prefersReduced?'auto':'smooth',block:'start'});
 target.focus({preventScroll:true});
}
function changed(slot:Slot){
 const hadRoute=routeId(slot)!==null;
 stopReads(slot);resetReferences(slot);
 chosen[slot].value=null;results[slot].value=[];error[slot].value='';
 if(hadRoute)void router.replace({path:'/genotype',query:pairSelectionQuery(route.query,slot,null)});
 debounce[slot]=setTimeout(()=>void lookup(slot),230);
}
async function select(slot:Slot,record:RealVariant):Promise<void>{
 stopReads(slot);resetReferences(slot);
 chosen[slot].value=record;input[slot].value=variantDisplayName(record);
 results[slot].value=[];error[slot].value='';
 void loadCitations(slot,record.id);
 await router.replace({path:'/genotype',query:pairSelectionQuery(route.query,slot,record.id)});
 if(chosen[0].value&&chosen[1].value){
  await nextTick();
  const target=document.getElementById('pair-drugs-title');
  if(target&&target.getBoundingClientRect().top>window.innerHeight-140)focusTherapyResults();
 }
}
async function clear(slot:Slot):Promise<void>{
 stopReads(slot);resetReferences(slot);
 chosen[slot].value=null;input[slot].value='';results[slot].value=[];error[slot].value='';
 await router.replace({path:'/genotype',query:pairSelectionQuery(route.query,slot,null)});
}
let initialRoute=true;
let previousIds:[string|null,string|null]=[null,null];
watch(()=>[routeId(0),routeId(1)] as const,([first,second])=>{
 // Do not interrupt the other input's in-flight search when its URL ID did not change.
 if(initialRoute||first!==previousIds[0])void restoreSlot(0,first);
 if(initialRoute||second!==previousIds[1])void restoreSlot(1,second);
 previousIds=[first,second];initialRoute=false;
},{immediate:true});
watch(()=>authController?.state.phase,phase=>{
 // A signed-in staff session may arrive after deep-link restoration attempted.
 // Retry only the missing members; never clear already restored research records.
 if(cfg?.accessMode!=='authenticated'||phase!=='signed-in')return;
 for(const slot of [0,1] as const){
  const id=routeId(slot);
  if(id&&!chosen[slot].value)void restoreSlot(slot,id);
 }
});
onUnmounted(()=>{stopReads(0);stopReads(1);});
</script>

<template>
 <div class="page genotype-page nfq-science-ui">
  <header class="nfq-pair-heading">
   <h1>Variant comparison</h1>
   <div class="nfq-pair-heading-actions"><button type="button" data-testid="comparison-copy-link" :disabled="!canShare" @click="copyComparisonLink">Copy comparison link</button><button type="button" data-testid="comparison-download" :disabled="!canExport" @click="downloadResearchComparison">Download .md</button>
   <ContextHelp label="About variant comparison" title="About this research comparison">
    <p>Compare the nomenclature and recorded reference links associated with two accessible CFTR variants. Selected variants are research records, not a patient genotype.</p>
    <p>Pair selection does not establish allelic phase, homozygosity, pathogenicity, clinical severity, modulator responsiveness or treatment eligibility.</p>
    <p>Reference counts describe catalog associations, not independent study quality or clinical certainty.</p>
    <p>The optional Markdown export requires both complete reference reads and contains recorded source metadata only. It is not a clinical report.</p>
   </ContextHelp></div>
  </header>
  <p v-if="shareNotice" role="status" class="nfq-pair-copy-status">{{shareNotice}}</p>
  <p v-if="exportNotice" role="status" class="nfq-pair-copy-status">{{exportNotice}}</p>
  <div class="genotype-comparison">
   <section v-for="slot in [0,1] as const" :key="slot" class="genotype-locus" :aria-label="'Variant '+(slot+1)">
    <div class="genotype-topline">
     <span class="section-label">VARIANT {{slot+1}}</span>
     <button v-if="chosen[slot].value" type="button" @click="clear(slot)">Clear</button>
    </div>
    <label :for="'genotype-search-'+slot">Search variant {{slot+1}}</label>
    <input :id="'genotype-search-'+slot" v-model="input[slot].value" type="search" autocomplete="off" placeholder="Name, HGVS or alias" @input="changed(slot)"/>
    <p v-if="pending[slot].value" role="status" class="nfq-pair-status">Retrieving recorded variants…</p>
    <div v-if="error[slot].value" role="alert" class="nfq-pair-recovery"><span>{{error[slot].value}}</span><button type="button" @click="retrySlot(slot)">Retry</button></div>
    <div v-if="results[slot].value.length&&!chosen[slot].value" class="genotype-suggestions">
     <button v-for="item in results[slot].value" :key="item.id" type="button" @click="select(slot,item)">
      <strong>{{variantDisplayName(item)}}</strong><span>{{item.proteinName||item.cdnaName||'Additional notation not recorded'}}</span>
     </button>
    </div>
    <template v-if="chosen[slot].value">
     <h2>{{variantDisplayName(chosen[slot].value!)}}</h2>
     <dl class="genotype-fields">
      <div><dt>Protein</dt><dd>{{chosen[slot].value!.proteinName||'Not recorded'}}</dd></div>
      <div><dt>cDNA</dt><dd>{{chosen[slot].value!.cdnaName||'Not recorded'}}</dd></div>
      <div><dt>Aliases</dt><dd>{{chosen[slot].value!.aliases.join(', ')||'Not recorded'}}</dd></div>
     </dl>
     <RouterLink :to="'/variants/'+chosen[slot].value!.id">Open variant record →</RouterLink>
     <section class="genotype-references">
      <button type="button" class="disclosure-button" :aria-expanded="showCitations[slot].value" @click="showCitations[slot].value=!showCitations[slot].value">
       <span>Recorded references{{referenceState[slot].value==='loaded'?' · '+citations[slot].value.length:''}}</span>
       <span aria-hidden="true">{{showCitations[slot].value?'−':'+'}}</span>
      </button>
      <div v-if="showCitations[slot].value">
       <p v-if="referenceState[slot].value==='loading'" role="status">Retrieving references…</p>
       <p v-else-if="referenceState[slot].value==='error'" role="alert">References could not be retrieved. <button type="button" class="nfq-pair-retry" @click="loadCitations(slot,chosen[slot].value!.id)">Retry</button></p>
       <p v-else-if="referenceState[slot].value==='unavailable'" role="status">The reference register is not configured.</p>
       <p v-else-if="referenceState[slot].value==='loaded'&&!citations[slot].value.length">No links are recorded for this variant in the accessible register.</p>
       <ul v-else-if="referenceState[slot].value==='loaded'">
        <li v-for="item in citations[slot].value.slice(0,8)" :key="item.id"><a :href="item.url" target="_blank" rel="noopener noreferrer">{{item.title}} ↗</a></li>
       </ul>
       <RouterLink v-if="referenceState[slot].value==='loaded'&&citations[slot].value.length>8" :to="{path:'/evidence',query:{variant:chosen[slot].value!.id}}">View all {{citations[slot].value.length}} recorded references →</RouterLink>
      </div>
     </section>
    </template>
   </section>
  </div>
  <p v-if="sameVariant" role="status" class="nfq-pair-duplicate">Same record selected twice. This does not establish homozygosity.</p>
  <div v-if="hasPair" class="nfq-pair-ready" data-testid="pair-results-navigation">
   <span>Both variants selected <span class="nfq-pair-ready-sep" aria-hidden="true">·</span> Five-regimen comparison available</span>
   <button type="button" aria-controls="pair-drugs-title" @click="focusTherapyResults">View therapy comparison</button>
  </div>
  <PairModulatorReview v-if="chosen[0].value&&chosen[1].value" :key="chosen[0].value.id+'-'+chosen[1].value.id" :first="chosen[0].value" :second="chosen[1].value"/>
  <DrugReferencePanel v-if="chosen[0].value&&chosen[1].value"/>
 </div>
</template>

<style scoped>
.nfq-pair-heading-actions{display:inline-flex;gap:10px;align-items:center;flex:0 0 auto}
.nfq-pair-heading-actions button{font:inherit;font-size:12px;font-weight:600;color:#2b6348;background:transparent;border:1px solid #c8dbce;border-radius:6px;min-height:40px;padding:7px 11px;cursor:pointer}
.nfq-pair-heading-actions button:disabled{opacity:.5;cursor:not-allowed}
.nfq-pair-heading-actions button:focus-visible{outline:2px solid #218466;outline-offset:3px}
.nfq-pair-copy-status{color:#557463;font-size:12px;margin:0 0 12px}
.nfq-pair-ready{display:flex;flex-wrap:wrap;gap:.45rem 1rem;align-items:center;justify-content:space-between;padding:.65rem 0;margin:.5rem 0;border-top:1px solid var(--border,#dce4e5);border-bottom:1px solid var(--border,#dce4e5);font-size:.79rem}
.nfq-pair-ready-sep{margin:0 .15rem;color:var(--text-muted,#687381)}
.nfq-pair-ready button,.nfq-pair-recovery button{font:inherit;font-size:.74rem;border:1px solid var(--border,#dce4e5);border-radius:6px;background:transparent;color:inherit;padding:.35rem .65rem;cursor:pointer}
.nfq-pair-ready button:focus-visible,.nfq-pair-recovery button:focus-visible{outline:2px solid currentColor;outline-offset:3px}
.nfq-pair-recovery{display:flex;align-items:center;flex-wrap:wrap;gap:.4rem .75rem;font-size:.79rem;line-height:1.45;color:var(--text-muted,#687381);margin:.5rem 0}
@media(max-width:560px){.genotype-page .nfq-pair-heading{display:flex;flex-wrap:wrap;min-width:0}.nfq-pair-heading h1{min-width:0}.nfq-pair-heading-actions{flex:1 1 100%;width:100%;max-width:100%;min-width:0;margin-left:0;justify-content:flex-end;flex-wrap:wrap;box-sizing:border-box}.nfq-pair-heading-actions button{max-width:100%;font-size:11px;padding:7px 9px;white-space:normal;overflow-wrap:anywhere}}
</style>

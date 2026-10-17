<script setup lang="ts">
import {computed,ref,watch,onUnmounted} from 'vue';
import {useRoute,useRouter,RouterLink} from 'vue-router';
import {createReadOnlyRepository,readConfigFromEnvironment,variantDisplayName,type RealVariant} from '../services/liveVariants';
import {createLiveEvidenceSource,type LiveEvidenceReference} from '../services/liveEvidence';
import {pairRecordId,pairSelectionQuery} from '../domain/pairSelection';
import ContextHelp from '../components/ContextHelp.vue';

const route=useRoute(),router=useRouter();
const cfg=readConfigFromEnvironment();
const variants=cfg?createReadOnlyRepository(cfg):null;
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
onUnmounted(()=>{stopReads(0);stopReads(1);});
</script>

<template>
 <div class="page genotype-page nfq-science-ui">
  <header class="nfq-pair-heading">
   <h1>Variant comparison</h1>
   <ContextHelp label="About variant comparison" title="About this research comparison">
    <p>Compare the nomenclature and recorded reference links associated with two accessible CFTR variants. Selected variants are research records, not a patient genotype.</p>
    <p>Pair selection does not establish allelic phase, homozygosity, pathogenicity, clinical severity, modulator responsiveness or treatment eligibility.</p>
    <p>Reference counts describe catalog associations, not independent study quality or clinical certainty.</p>
   </ContextHelp>
  </header>
  <div class="genotype-comparison">
   <section v-for="slot in [0,1] as const" :key="slot" class="genotype-locus" :aria-label="'Variant '+(slot+1)">
    <div class="genotype-topline">
     <span class="section-label">VARIANT {{slot+1}}</span>
     <button v-if="chosen[slot].value" type="button" @click="clear(slot)">Clear</button>
    </div>
    <label :for="'genotype-search-'+slot">Search variant {{slot+1}}</label>
    <input :id="'genotype-search-'+slot" v-model="input[slot].value" type="search" autocomplete="off" placeholder="Name, HGVS or alias" @input="changed(slot)"/>
    <p v-if="pending[slot].value" role="status" class="nfq-pair-status">Retrieving recorded variants…</p>
    <p v-if="error[slot].value" role="alert" class="nfq-pair-status">{{error[slot].value}}</p>
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
 </div>
</template>

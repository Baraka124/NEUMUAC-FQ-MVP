<script setup lang="ts">
import {computed,ref,watch,onUnmounted} from 'vue';
import {useRoute,useRouter,RouterLink} from 'vue-router';
import {createReadOnlyRepository,readConfigFromEnvironment,variantDisplayName,type RealVariant} from '../services/liveVariants';
import {createLiveEvidenceSource,type LiveEvidenceReference} from '../services/liveEvidence';
const route=useRoute(),router=useRouter();
const cfg=readConfigFromEnvironment();
const variants=cfg?createReadOnlyRepository(cfg):null;
const evidence=cfg?createLiveEvidenceSource(cfg):null;
const input=[ref(''),ref('')];
const chosen=[ref<RealVariant|null>(null),ref<RealVariant|null>(null)];
const results=[ref<readonly RealVariant[]>([]),ref<readonly RealVariant[]>([])];
const citations=[ref<readonly LiveEvidenceReference[]>([]),ref<readonly LiveEvidenceReference[]>([])];
const pending=[ref(false),ref(false)];
const error=[ref(''),ref('')];
const aborts:[AbortController|null,AbortController|null]=[null,null];
const citationAborts:[AbortController|null,AbortController|null]=[null,null];
const sequence=[0,0];
const sameVariant=computed(()=>Boolean(chosen[0].value&&chosen[1].value&&chosen[0].value.id===chosen[1].value.id));
let syncingRoute=false;
function routeId(slot:number):string|null{const v=route.query[slot===0?'a':'b'];return typeof v==='string'&&/^\d{1,18}$/.test(v)?v:null;}
async function restore(){
 syncingRoute=true;
 for(const slot of [0,1]){
  aborts[slot]?.abort(); citationAborts[slot]?.abort(); chosen[slot].value=null;citations[slot].value=[];results[slot].value=[];
  const id=routeId(slot);
  if(!id||!variants)continue;
  try{const record=await variants.get(id);if(record){chosen[slot].value=record;input[slot].value=variantDisplayName(record);await loadCitations(slot,record.id);}}
  catch{error[slot].value='Could not restore this variant.';}
 }
 syncingRoute=false;
}
async function loadCitations(slot:number,id:string){
 citationAborts[slot]?.abort();
 const controller=new AbortController();citationAborts[slot]=controller;
 if(!evidence)return;
 try{const rows=await evidence.forVariant(id,controller.signal);if(!controller.signal.aborted)citations[slot].value=rows;}
 catch{if(!controller.signal.aborted)error[slot].value='References could not be retrieved.';}
}
async function lookup(slot:number){
 aborts[slot]?.abort();const controller=new AbortController();aborts[slot]=controller;const run=++sequence[slot];
 results[slot].value=[];error[slot].value='';
 if(chosen[slot].value||!input[slot].value.trim())return;
 if(!variants){error[slot].value='Live CFTR access is not configured.';return;}
 pending[slot].value=true;
 try{const page=await variants.list({query:input[slot].value,page:0,signal:controller.signal});
  if(run===sequence[slot])results[slot].value=page.records.slice(0,12);
 }catch{if(!controller.signal.aborted&&run===sequence[slot])error[slot].value='Variant search is unavailable.';}
 finally{if(run===sequence[slot])pending[slot].value=false;}
}
const debounce:[ReturnType<typeof setTimeout>|undefined,ReturnType<typeof setTimeout>|undefined]=[undefined,undefined];
function changed(slot:number){chosen[slot].value=null;citations[slot].value=[];clearTimeout(debounce[slot]);debounce[slot]=setTimeout(()=>void lookup(slot),230);}
async function select(slot:number,record:RealVariant){
 aborts[slot]?.abort();chosen[slot].value=record;results[slot].value=[];input[slot].value=variantDisplayName(record);citations[slot].value=[];error[slot].value='';
 const query={...route.query,[slot===0?'a':'b']:record.id};
 await router.replace({path:'/genotype',query});
 await loadCitations(slot,record.id);
}
async function clear(slot:number){aborts[slot]?.abort();citationAborts[slot]?.abort();chosen[slot].value=null;input[slot].value='';results[slot].value=[];citations[slot].value=[];error[slot].value='';const query={...route.query};delete query[slot===0?'a':'b'];await router.replace({path:'/genotype',query});}
watch(()=>route.query,()=>{if(!syncingRoute)void restore();},{immediate:true});
onUnmounted(()=>{for(const n of [0,1]){aborts[n]?.abort();citationAborts[n]?.abort();clearTimeout(debounce[n]);}});
</script>
<template>
 <div class="page genotype-page">
  <div class="eyebrow">CFTR RESEARCH / VARIANT PAIRS</div>
  <h1>Genotype research</h1>
  <p class="intro">Compare two recorded CFTR variants and their linked literature. This research view does not establish allelic phase, disease severity, treatment eligibility or a clinical genotype interpretation.</p>
  <div class="genotype-comparison">
   <section v-for="slot in [0,1]" :key="slot" class="genotype-locus" :aria-label="'Variant '+(slot+1)">
    <div class="genotype-topline"><span class="section-label">VARIANT {{slot+1}}</span><button v-if="chosen[slot].value" type="button" @click="clear(slot)">Clear</button></div>
    <label :for="'genotype-search-'+slot">Search recorded variant</label>
    <input :id="'genotype-search-'+slot" v-model="input[slot].value" type="search" autocomplete="off" placeholder="Name, HGVS or alias" @input="changed(slot)"/>
    <p v-if="pending[slot].value" role="status">Searching real variant records…</p>
    <p v-else-if="error[slot].value" role="alert">{{error[slot].value}}</p>
    <div v-if="results[slot].value.length&&!chosen[slot].value" class="genotype-suggestions">
     <button v-for="item in results[slot].value" :key="item.id" type="button" @click="select(slot,item)"><strong>{{variantDisplayName(item)}}</strong><span>{{item.proteinName||item.cdnaName||'Additional notation not recorded'}}</span></button>
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
      <h3>Recorded references · {{citations[slot].value.length}}</h3>
      <p v-if="!citations[slot].value.length">No references returned in the linked source register.</p>
      <ul v-else><li v-for="item in citations[slot].value.slice(0,8)" :key="item.id"><a :href="item.url" target="_blank" rel="noopener noreferrer">{{item.title}} ↗</a></li></ul>
     </section>
    </template>
    <p v-else-if="!results[slot].value.length" class="genotype-empty">Choose a verified database variant to inspect its recorded nomenclature and sources.</p>
   </section>
  </div>
  <p v-if="sameVariant" role="status" class="history-disclaimer">The same database variant is selected twice. This view does not establish homozygosity.</p>
  <p class="history-disclaimer">Variant combinations here are user-selected research comparisons, not patient records. Cis/trans configuration, pathogenicity, CFTR functional class and modulator responsiveness must not be inferred from selection alone.</p>
 </div>
</template>
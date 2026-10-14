<script setup lang="ts">
import {computed,onUnmounted,ref,watch} from 'vue';
import {RouterLink,useRoute,useRouter} from 'vue-router';
import {authSessionProvider} from '../services/authSession';
import {createReadOnlyRepository,readConfigFromEnvironment,formatReadStatus,variantDisplayName,type RealVariant,type RealVariantSource} from '../services/liveVariants';
import {evidenceForVariant,EVIDENCE_SNAPSHOT_DATE} from '../services/publicEvidence';

const route=useRoute(),router=useRouter();
let source:RealVariantSource|null=null;
let sourceError='';
try {const cfg=readConfigFromEnvironment();if(cfg)source=createReadOnlyRepository(cfg,fetch,authSessionProvider);}
catch(e){sourceError=formatReadStatus(e);}

const search=ref(['','']);
const choices=ref<[readonly RealVariant[],readonly RealVariant[]]>([[],[]]);
const selected=ref<[RealVariant|null,RealVariant|null]>([null,null]);
const loading=ref([false,false]);
const errors=ref(['','']);
const empty=ref([false,false]);
const requests:[AbortController|null,AbortController|null]=[null,null];
const sequences=[0,0];
const timers:[ReturnType<typeof setTimeout>|null,ReturnType<typeof setTimeout>|null]=[null,null];
const lookupRequests:[AbortController|null,AbortController|null]=[null,null];
const details=[0,0];

function validId(value:unknown):string|null {
 return typeof value==='string' && /^\\d{1,18}$/.test(value) ? value : null;
}
async function restore(slot:0|1,id:unknown):Promise<void> {
 lookupRequests[slot]?.abort();
 const sequence=++details[slot];
 selected.value[slot]=null;
 const parsed=validId(id);
 if(!parsed||!source)return;
 const abort=new AbortController();lookupRequests[slot]=abort;
 try{
  const value=await source.get(parsed,abort.signal);
  if(sequence===details[slot]) {
    selected.value[slot]=value;
    if(value)search.value[slot]=variantDisplayName(value);
    else errors.value[slot]='This variant record is not accessible.';
  }
 }catch(e){if(!abort.signal.aborted&&sequence===details[slot])errors.value[slot]=formatReadStatus(e);}
}
watch(()=>[route.query.a,route.query.b],([a,b])=>{
 void restore(0,a);void restore(1,b);
},{immediate:true});
async function find(slot:0|1):Promise<void>{
 requests[slot]?.abort();
 const sequence=++sequences[slot];
 const q=search.value[slot].trim();
 choices.value[slot]=[];empty.value[slot]=false;
 errors.value[slot]='';
 if(!q)return;
 if(!source){errors.value[slot]=sourceError||'The live variant source has not been configured.';return;}
 const controller=new AbortController();requests[slot]=controller;loading.value[slot]=true;
 try{
  const data=await source.list({query:q,page:0,signal:controller.signal});
  if(sequence===sequences[slot]){
   choices.value[slot]=data.records.slice(0,12);
   empty.value[slot]=!data.records.length;
  }
 }catch(e){if(!controller.signal.aborted&&sequence===sequences[slot])errors.value[slot]=formatReadStatus(e);}
 finally{if(sequence===sequences[slot])loading.value[slot]=false;}
}
function queueSearch(slot:0|1):void{
 const t=timers[slot];if(t)clearTimeout(t);
 timers[slot]=setTimeout(()=>void find(slot),250);
}
function choose(slot:0|1,variant:RealVariant):void{
 const query={...route.query,[slot===0?'a':'b']:variant.id};
 choices.value[slot]=[];
 void router.replace({path:'/genotype',query});
}
function clear(slot:0|1):void{
 search.value[slot]='';choices.value[slot]=[];errors.value[slot]='';empty.value[slot]=false;
 const query={...route.query};
 delete query[slot===0?'a':'b'];
 void router.replace({path:'/genotype',query});
}
const pairReady=computed(()=>Boolean(selected.value[0]&&selected.value[1]));
const sameVariant=computed(()=>pairReady.value&&selected.value[0]?.id===selected.value[1]?.id);
onUnmounted(()=>{for(const c of requests)c?.abort();for(const c of lookupRequests)c?.abort();for(const t of timers)if(t)clearTimeout(t);});
</script>
<template>
 <div class="page genotype-page">
  <div class="eyebrow">CFTR RESEARCH / VARIANT PAIRS</div>
  <h1>Genotype exploration</h1>
  <p class="intro">Examine two recorded CFTR variant identities side by side. This is a research comparison, not a determination of phase, pathogenicity, treatment eligibility or clinical outcome.</p>
  <section class="genotype-pair" aria-label="Variant pair selection">
   <div v-for="slot in [0,1] as const" :key="slot" class="genotype-column">
    <div class="section-label">{{slot===0?'VARIANT A':'VARIANT B'}}</div>
    <label :for="'genotype-search-'+slot">Find a CFTR variant</label>
    <div class="genotype-search-line">
     <input :id="'genotype-search-'+slot" v-model="search[slot]" type="search" autocomplete="off" placeholder="Variant name or HGVS" @input="queueSearch(slot)"/>
     <button v-if="selected[slot]" type="button" :aria-label="'Clear variant '+(slot===0?'A':'B')" @click="clear(slot)">Clear</button>
    </div>
    <p v-if="loading[slot]" role="status" class="rail-caption">Searching live variants…</p>
    <p v-if="errors[slot]" role="alert" class="empty-result">{{errors[slot]}}</p>
    <p v-if="empty[slot]" role="status" class="rail-caption">No matching variant identity returned.</p>
    <div v-if="choices[slot].length" class="genotype-choices" :aria-label="'Search matches for variant '+(slot===0?'A':'B')">
     <button v-for="item in choices[slot]" :key="item.id" type="button" @click="choose(slot as 0|1,item)">
      <strong>{{variantDisplayName(item)}}</strong><span>{{item.proteinName||item.cdnaName||'Additional notation not recorded'}}</span>
     </button>
    </div>
    <article v-if="selected[slot]" class="genotype-record">
     <div class="section-label">RECORDED NOMENCLATURE</div>
     <h2>{{variantDisplayName(selected[slot]!)}}</h2>
     <dl>
      <div><dt>Protein</dt><dd>{{selected[slot]!.proteinName||'Not recorded'}}</dd></div>
      <div><dt>cDNA</dt><dd>{{selected[slot]!.cdnaName||'Not recorded'}}</dd></div>
      <div><dt>Aliases</dt><dd>{{selected[slot]!.aliases.join(', ')||'Not recorded'}}</dd></div>
     </dl>
     <RouterLink :to="'/variants/'+selected[slot]!.id">View variant record →</RouterLink>
     <div class="genotype-reference-summary">
      <strong>{{evidenceForVariant(selected[slot]!.id).length}} recorded source links</strong>
      <span>Reference snapshot · {{EVIDENCE_SNAPSHOT_DATE}}</span>
      <ul v-if="evidenceForVariant(selected[slot]!.id).length">
       <li v-for="link in evidenceForVariant(selected[slot]!.id).slice(0,4)" :key="link.id">
        <a :href="link.url" target="_blank" rel="noopener noreferrer">{{link.title}} ↗</a>
       </li>
      </ul>
      <p v-else>There are no links in the current evidence snapshot; this does not mean no research exists.</p>
     </div>
    </article>
    <p v-else class="genotype-awaiting">Select an existing variant to inspect its recorded identity and source links.</p>
   </div>
  </section>
  <section class="genotype-interpretation" aria-label="Interpretation boundaries">
   <h2>{{pairReady?'Two variant records selected':'Pair comparison'}}</h2>
   <p v-if="sameVariant">Both selections refer to the same database variant. This does not establish homozygosity.</p>
   <p v-else-if="pairReady">Both recorded identities are shown above. Their co-occurrence in this workspace does not establish that they occur in the same person or on separate alleles.</p>
   <p v-else>Choose one or two records to compare available nomenclature and linked sources.</p>
   <p>Phase (cis/trans), zygosity, disease relevance, functional class, modulator response and treatment eligibility require additional verified evidence and clinical review. No prediction is calculated here.</p>
  </section>
 </div>
</template>
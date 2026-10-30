<script setup lang="ts">
import {computed,onUnmounted,ref,watch} from 'vue';
import {RouterLink} from 'vue-router';
import {THERAPIES,type VariantTherapyProfile,type TherapyEntry} from '../domain/therapyRegistry';
import {classIReviewSignals} from '../domain/classIReviewSignals';
import {buildTherapyReviewBrief} from '../domain/therapyReviewBrief';
import {createVariantTherapySource} from '../services/variantTherapySource';
import {readConfigFromEnvironment} from '../services/liveVariants';
import {authSessionProvider} from '../services/authSession';
import {recordedTherapyFlag,type LegacyEtiRecord} from '../services/legacyEtiResponse';
import {describeRecordedEti} from '../domain/responseDisplay';
import ContextHelp from './ContextHelp.vue';
import SourceResponsePanel from './SourceResponsePanel.vue';

const props=defineProps<{
 variantId:string;
 legacyEti:LegacyEtiRecord|null;
 legacyLoading:boolean;
 legacyError:string;
}>();
const emit=defineEmits<{retryLegacy:[];openValidation:[]}>();
const config=readConfigFromEnvironment();
const source=config?createVariantTherapySource(config,fetch,authSessionProvider):null;
const profile=ref<VariantTherapyProfile|null>(null);
const loading=ref(false),error=ref(''),retry=ref(0);
const selectedDrug=ref<string|null>(null);
const reviewOpen=ref(false),reviewStatus=ref('');
const reviewSignals=computed(()=>profile.value?classIReviewSignals(profile.value):[]);
const relevantReviewSignals=computed(()=>reviewSignals.value.filter(x=>x.kind!=='validation-not-recorded'));
function downloadReviewBrief():void{
 if(!profile.value)return;
 try{
  const report=buildTherapyReviewBrief(profile.value,reviewSignals.value);
  const url=URL.createObjectURL(new Blob([report],{type:'text/markdown;charset=utf-8'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download='neumuacFQ-therapy-review-'+profile.value.variantId+'.md';
  document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);
  reviewStatus.value='Review brief prepared for download.';
 }catch{reviewStatus.value='Could not prepare the review brief.';}
}
let active:AbortController|null=null;
const rows=computed(()=>{
 const found=new Map(profile.value?.entries.map(item=>[item.therapy,item])??[]);
 return THERAPIES.map(therapy=>({therapy,entry:found.get(therapy.id)??null}));
});
function resultLabel(entry:TherapyEntry|null):string{
 if(!entry||entry.coverage==='genotype-rule-only')return 'Genotype rules';
 return describeRecordedEti(entry.response).label;
}
function switchDetails(id:string):void{selectedDrug.value=selectedDrug.value===id?null:id;}
watch([()=>props.variantId,retry],async ([id])=>{
 active?.abort();profile.value=null;error.value='';loading.value=false;
 if(!source)return;
 const controller=new AbortController();active=controller;loading.value=true;
 try{
  const result=await source.get(id,controller.signal);
  if(!controller.signal.aborted&&props.variantId===id){
   profile.value=result;
   if(!result)error.value='Therapy profile unavailable for this variant.';
  }
 }catch{
  if(!controller.signal.aborted&&props.variantId===id)error.value='Could not load therapy responses.';
 }finally{if(!controller.signal.aborted&&props.variantId===id)loading.value=false;}
},{immediate:true});
watch(()=>props.variantId,()=>{selectedDrug.value=null;reviewOpen.value=false;reviewStatus.value='';});
onUnmounted(()=>active?.abort());
</script>

<template>
 <section class="nfq-therapy" aria-labelledby="nfq-therapy-heading" data-testid="five-therapy-workspace">
  <div class="nfq-therapy-heading">
   <h3 id="nfq-therapy-heading">Modulator response</h3>
   <ContextHelp label="About modulator results" title="Response and genotype rules">
    <p>ETI and Alyftrek have recorded variant-response fields. The other three modulators are included for their genotype-rule coverage; no variant-response value is inferred from CFTR class.</p>
   </ContextHelp>
  </div>
  <p v-if="loading" role="status" class="nfq-therapy-state">Loading modulator responses…</p>
  <div v-if="error" role="alert" class="nfq-therapy-error"><span>{{error}}</span><button type="button" @click="retry++">Retry</button></div>
  <p v-else-if="!source" role="status" class="nfq-therapy-state">Modulator responses unavailable.</p>
  <div v-if="profile" class="nfq-therapy-profile">
   <div class="nfq-therapy-context">
    <span>CFTR class <strong>{{profile.functionalClass||'Not recorded'}}</strong></span>
    <span v-if="profile.classSubtype">Subtype <strong>{{profile.classSubtype}}</strong></span>
    <button v-if="relevantReviewSignals.length" type="button" class="nfq-review-trigger" :aria-expanded="reviewOpen" aria-controls="nfq-therapy-review" @click="reviewOpen=!reviewOpen">{{reviewOpen?'Hide review':'Review details'}}</button>
   </div>
   <section v-if="reviewOpen&&relevantReviewSignals.length" id="nfq-therapy-review" class="nfq-therapy-review" aria-label="Response review details">
    <h4>Review details</h4>
    <ul><li v-for="item in relevantReviewSignals" :key="item.kind">{{item.message}}</li></ul>
    <div class="nfq-therapy-review-actions"><button type="button" @click="emit('openValidation')">Sources & validation</button><RouterLink :to="{path:'/evidence',query:{variant:variantId,from:'/variants/'+variantId}}">Inspect evidence</RouterLink><button type="button" @click="downloadReviewBrief">Download review brief</button></div>
    <p v-if="reviewStatus" role="status">{{reviewStatus}}</p>
   </section>
   <div class="nfq-therapy-rows">
    <div v-for="{therapy,entry} in rows" :key="therapy.id" class="nfq-therapy-row" :class="{'nfq-therapy-selected':selectedDrug===therapy.id}">
     <div class="nfq-therapy-row-main">
      <div class="nfq-therapy-name">
       <strong>{{therapy.label}}</strong>
       <small v-if="therapy.id==='ETI'">Kaftrio / Trikafta</small>
      </div>
      <span class="nfq-therapy-result" :class="{'nfq-therapy-unknown':entry?.response==='unknown'||entry?.response===null}">{{resultLabel(entry)}}</span>
      <button type="button" class="nfq-therapy-inspect" :aria-expanded="selectedDrug===therapy.id" :aria-controls="'nfq-therapy-details-'+therapy.id" @click="switchDetails(therapy.id)">{{selectedDrug===therapy.id?'Close':'Details'}}</button>
     </div>
     <div v-if="selectedDrug===therapy.id" :id="'nfq-therapy-details-'+therapy.id" class="nfq-therapy-detail">
      <template v-if="entry?.coverage==='variant-response'">
       <dl class="nfq-therapy-meta">
        <div><dt>Evidence level</dt><dd>{{entry.evidenceLevel||'Not recorded'}}</dd></div>
        <div><dt>Evidence tier</dt><dd>{{entry.evidenceTier||'Not recorded'}}</dd></div>
        <div><dt>Source</dt><dd>{{entry.authoritySource||'Not recorded'}}</dd></div>
       </dl>
      </template>
      <p v-else class="nfq-therapy-note">Genotype-level rules exist in the original calculator. Variant-level response is not recorded for this regimen.</p>
      <template v-if="therapy.id==='ETI'">
       <section class="nfq-response-section" aria-labelledby="nfq-eti-response-heading">
        <div class="nfq-eti-heading"><h4 id="nfq-eti-response-heading">ETI response</h4><ContextHelp label="About ETI response" title="ETI response"><p>Variant response, evidence and technical fields are displayed separately. Review actions are available from this dossier.</p></ContextHelp></div>
        <strong class="nfq-eti-inline" data-testid="eti-recorded-category">{{entry?describeRecordedEti(entry.response).label:'Not recorded'}}</strong>
        <p v-if="legacyLoading" role="status" class="nfq-therapy-state">Loading technical fields…</p>
        <div v-else-if="legacyError" role="alert" class="nfq-therapy-error"><span>{{legacyError}}</span><button type="button" @click="emit('retryLegacy')">Retry</button></div>
        <template v-else-if="legacyEti">
         <details class="nfq-therapy-technical">
          <summary>Technical fields</summary>
          <dl class="nfq-therapy-meta">
           <div><dt>Therapy response flag</dt><dd>{{recordedTherapyFlag(legacyEti.legacyTherapyFlag)}}</dd></div>
           <div><dt>CFTR2 response</dt><dd>{{legacyEti.recordedCftr2Response||'Not recorded'}}</dd></div>
           <div><dt>Last evidence update</dt><dd>{{legacyEti.lastEvidenceUpdate||'Not recorded'}}</dd></div>
          </dl>
         </details>
         <SourceResponsePanel :key="variantId" :variant-id="variantId" :legacy="legacyEti"/>
        </template>
       </section>
      </template>
      <div class="nfq-therapy-actions">
       <button type="button" @click="emit('openValidation')">Sources &amp; validation</button>
       <RouterLink :to="{path:'/evidence',query:{variant:variantId,from:'/variants/'+variantId}}">Evidence &amp; curation</RouterLink>
      </div>
     </div>
    </div>
   </div>
  </div>
 </section>
</template>

<style scoped>
.nfq-therapy{min-width:0;margin-top:1rem;border:1px solid var(--border,#dce4e5);border-radius:10px;background:var(--surface,#fff);padding:.9rem 1rem}
.nfq-therapy-heading{display:flex;justify-content:space-between;align-items:center;gap:.7rem;margin-bottom:.55rem}
.nfq-therapy-heading h3{font-size:.94rem;font-weight:690;margin:0;letter-spacing:-.01em}
.nfq-therapy-state{margin:.55rem 0;color:var(--text-muted,#687381);font-size:.77rem}
.nfq-therapy-profile{min-width:0}
.nfq-therapy-context{display:flex;flex-wrap:wrap;gap:.5rem 1rem;color:var(--text-muted,#687381);font-size:.72rem;padding:0 0 .7rem}
.nfq-therapy-context strong{font-weight:640;color:inherit;margin-left:.3rem}
.nfq-review-trigger{font:inherit;font-size:.72rem;font-weight:600;cursor:pointer;border:0;background:transparent;color:inherit;text-decoration:underline;text-underline-offset:3px;padding:.1rem .2rem}
.nfq-review-trigger:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.nfq-therapy-review{border-top:1px solid var(--border,#e1e6e8);padding:.7rem 0;font-size:.76rem;line-height:1.55}
.nfq-therapy-review h4{font-size:.78rem;margin:0 0 .4rem}
.nfq-therapy-review ul{padding-left:1.2rem;margin:.3rem 0 .65rem}
.nfq-therapy-review-actions{display:flex;gap:.6rem 1rem;flex-wrap:wrap;align-items:center}
.nfq-therapy-review-actions button{font:inherit;font-size:.73rem;cursor:pointer;background:transparent;color:inherit;border:1px solid var(--border,#dce4e5);border-radius:6px;padding:.3rem .6rem}
.nfq-therapy-review-actions a{color:inherit;font-size:.73rem}
.nfq-therapy-review-actions button:focus-visible,.nfq-therapy-review-actions a:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.nfq-therapy-rows{border-top:1px solid var(--border,#e1e6e8)}
.nfq-therapy-row{border-bottom:1px solid var(--border,#e1e6e8);min-width:0}
.nfq-therapy-row-main{display:grid;grid-template-columns:minmax(150px,1fr) minmax(135px,1fr) auto;gap:.75rem;align-items:center;min-height:3.4rem}
.nfq-therapy-name{min-width:0;display:flex;align-items:baseline;gap:.35rem .65rem;flex-wrap:wrap}
.nfq-therapy-name strong{font-size:.82rem;font-weight:660}
.nfq-therapy-name small{font-size:.69rem;color:var(--text-muted,#687381)}
.nfq-therapy-result{font-size:.8rem;font-weight:600;overflow-wrap:anywhere}
.nfq-therapy-unknown{color:var(--text-muted,#687381);font-weight:500}
.nfq-therapy-inspect,.nfq-therapy-actions button,.nfq-therapy-error button{font:inherit;border:1px solid var(--border,#dce4e5);border-radius:6px;background:transparent;color:inherit;cursor:pointer;padding:.35rem .65rem;font-size:.73rem}
.nfq-therapy-inspect:focus-visible,.nfq-therapy-actions button:focus-visible,.nfq-therapy-error button:focus-visible{outline:2px solid currentColor;outline-offset:3px}
.nfq-therapy-selected{background:transparent}
.nfq-therapy-detail{padding:.45rem 0 .8rem;max-width:100%;min-width:0}
.nfq-therapy-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.65rem;margin:.3rem 0 .7rem}
.nfq-therapy-meta dt{font-size:.69rem;color:var(--text-muted,#687381)}
.nfq-therapy-meta dd{font-size:.77rem;margin:.18rem 0 0;overflow-wrap:anywhere}
.nfq-therapy-note{font-size:.75rem;line-height:1.55;color:var(--text-muted,#687381);margin:.3rem 0 .65rem}
.nfq-response-section{padding:.4rem 0;margin:.5rem 0;border-top:1px solid var(--border,#e1e6e8)}
.nfq-eti-heading{display:flex;justify-content:space-between;align-items:center;gap:.7rem}
.nfq-response-section h4{font-size:.78rem;margin:.3rem 0 .2rem}
.nfq-eti-inline{display:inline-block;font-size:.8rem;margin:.12rem 0 .4rem}
.nfq-therapy-technical summary{font-size:.74rem;cursor:pointer}
.nfq-therapy-actions{display:flex;gap:.6rem 1rem;align-items:center;flex-wrap:wrap;padding-top:.55rem}
.nfq-therapy-actions a{color:inherit;font-size:.74rem;font-weight:580}
.nfq-therapy-error{display:flex;flex-wrap:wrap;gap:.5rem 1rem;align-items:center;font-size:.77rem}
@media(max-width:650px){.nfq-therapy{padding:.75rem .85rem}.nfq-therapy-row-main{grid-template-columns:minmax(0,1fr) auto;gap:.3rem .65rem;padding:.5rem 0}.nfq-therapy-result{grid-column:1;grid-row:2}.nfq-therapy-inspect{grid-column:2;grid-row:1 / span 2}.nfq-therapy-meta{grid-template-columns:1fr 1fr}}
</style>

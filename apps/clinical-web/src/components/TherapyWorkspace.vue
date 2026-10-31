<script setup lang="ts">
import {computed,nextTick,onUnmounted,ref,watch} from 'vue';
import {RouterLink} from 'vue-router';
import {THERAPIES,type VariantTherapyProfile,type TherapyEntry} from '../domain/therapyRegistry';
import {classIReviewSignals} from '../domain/classIReviewSignals';
import {historicalFlagFindings} from '../domain/historicalModulatorFlags';
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
const historicalFlags=computed(()=>profile.value?historicalFlagFindings(profile.value):[]);
const relevantReviewSignals=computed(()=>reviewSignals.value.filter(x=>x.kind!=='validation-not-recorded'));
function downloadReviewBrief():void{
 if(!profile.value)return;
 try{
  const report=buildTherapyReviewBrief(profile.value,reviewSignals.value);
  const url=URL.createObjectURL(new Blob([report],{type:'text/markdown;charset=utf-8'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download='neumuacFQ-therapy-review-'+profile.value.variantId+'.md';
  document.body.appendChild(anchor);anchor.click();anchor.remove();window.setTimeout(()=>URL.revokeObjectURL(url),5000);
  reviewStatus.value='Review brief download requested.';
 }catch{reviewStatus.value='Could not prepare the review brief.';}
}
let active:AbortController|null=null;
const rows=computed(()=>{
 const found=new Map(profile.value?.entries.map(item=>[item.therapy,item])??[]);
 return THERAPIES.map(therapy=>({therapy,entry:found.get(therapy.id)??null}));
});
function resultLabel(entry:TherapyEntry|null):string{
 if(!entry)return 'Not available';
 if(entry.coverage==='genotype-rule-only')return 'No variant response';
 return describeRecordedEti(entry.response).label;
}
async function switchDetails(id:string):Promise<void>{
 const isClosing=selectedDrug.value===id;
 selectedDrug.value=isClosing?null:id;
 if(isClosing){await nextTick();document.getElementById('nfq-therapy-trigger-'+id)?.focus({preventScroll:true});return;}
 await nextTick();
 const panel=document.getElementById('nfq-therapy-details-'+id);
 if(!panel)return;
 panel.focus({preventScroll:true});
 const rect=panel.getBoundingClientRect();
 if(rect.top<0||rect.top>window.innerHeight-80)
  panel.scrollIntoView({block:'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
}
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
   <div class="nfq-therapy-title-group"><span class="nfq-therapy-kicker">CFTR MODULATOR INTELLIGENCE</span><h3 id="nfq-therapy-heading">Therapeutic profile</h3><span class="nfq-therapy-summary">Five independent therapy records · Variant {{variantId}}</span></div>
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
     <div v-if="therapy.id==='ETI'" class="nfq-therapy-section-label">RECORDED VARIANT RESPONSES <span>Independent scientific categories</span></div>
     <div v-if="therapy.id==='IVACAFTOR'" class="nfq-therapy-section-label">GENOTYPE RESEARCH RULES <span>Assessment not performed</span></div>
     <div class="nfq-therapy-row-main">
      <div class="nfq-therapy-name">
       <strong>{{therapy.label}}</strong>
       <small v-if="therapy.id==='ETI'">Kaftrio / Trikafta</small>
       <small class="nfq-therapy-source-type">{{!entry?'Source unavailable':entry.coverage==='variant-response'?'Recorded variant response':'Genotype assessment not performed'}}</small>
      </div>
      <span :data-testid="therapy.id==='ETI'?'eti-recorded-category':undefined" class="nfq-therapy-result" :class="{'nfq-therapy-unknown':entry?.response==='unknown'||entry?.response===null}">{{resultLabel(entry)}}</span>
      <button type="button" class="nfq-therapy-inspect" :id="'nfq-therapy-trigger-'+therapy.id" :aria-expanded="selectedDrug===therapy.id" :aria-controls="'nfq-therapy-details-'+therapy.id" @click="switchDetails(therapy.id)">{{selectedDrug===therapy.id?'Close evidence':entry?.coverage==='genotype-rule-only'?'Inspect rules':'Inspect evidence'}}</button>
     </div>
     <div v-if="selectedDrug===therapy.id" :id="'nfq-therapy-details-'+therapy.id" class="nfq-therapy-detail" tabindex="-1">
      <template v-if="entry?.coverage==='variant-response'">
       <dl class="nfq-therapy-meta">
        <div><dt>Evidence level</dt><dd>{{entry.evidenceLevel||'Not recorded'}}</dd></div>
        <div><dt>Evidence tier</dt><dd>{{entry.evidenceTier||'Not recorded'}}</dd></div>
        <div><dt>Source</dt><dd>{{entry.authoritySource||'Not recorded'}}</dd></div>
       </dl>
      </template>
      <p v-else class="nfq-therapy-note">The original calculator contains genotype-level research rules for this regimen. No result has been calculated for the current genotype here. This variant does not have a separately recorded therapy-response category.</p>
      <div v-if="therapy.id==='ETI'||therapy.id==='ALYFTREK'" class="nfq-therapy-flag-check">
       <span>Historical drug flag: <strong>{{historicalFlags.find(x=>x.therapy===therapy.id)?.flag===true?'Yes':historicalFlags.find(x=>x.therapy===therapy.id)?.flag===false?'No':'Not recorded'}}</strong></span>
       <p v-if="historicalFlags.find(x=>x.therapy===therapy.id)?.state==='different-recorded-fields'" role="status" data-testid="therapy-historical-flag-disagreement">
        This historical flag differs from the recorded therapy response. Review original source data; the classification has not changed.
       </p>
       <p v-else class="nfq-therapy-note">An archived boolean field, shown for data integrity, not proof of therapy response.</p>
      </div>
      <template v-if="therapy.id==='ETI'">
       <section class="nfq-response-section" aria-label="ETI evidence details">
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
      <template v-if="therapy.id==='ALYFTREK'">
       <SourceResponsePanel :key="variantId+'-alyftrek'" :variant-id="variantId" therapy="ALYFTREK" :recorded-category="entry?.response??null"/>
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
.nfq-therapy-source-type{flex-basis:100%;font-size:.67rem;line-height:1.3;color:var(--text-muted,#687381)}
.nfq-therapy-name strong{font-size:.82rem;font-weight:660}
.nfq-therapy-name small{font-size:.69rem;color:var(--text-muted,#687381)}
.nfq-therapy-result{font-size:.8rem;font-weight:600;overflow-wrap:anywhere}
.nfq-therapy-unknown{color:var(--text-muted,#687381);font-weight:500}
.nfq-therapy-inspect,.nfq-therapy-actions button,.nfq-therapy-error button{font:inherit;border:1px solid var(--border,#dce4e5);border-radius:6px;background:transparent;color:inherit;cursor:pointer;padding:.35rem .65rem;font-size:.73rem}
.nfq-therapy-inspect:focus-visible,.nfq-therapy-actions button:focus-visible,.nfq-therapy-error button:focus-visible{outline:2px solid currentColor;outline-offset:3px}
.nfq-therapy-selected{background:transparent}
.nfq-therapy-detail{padding:.45rem 0 .8rem;max-width:100%;min-width:0;outline-offset:2px;scroll-margin-top:3rem}
.nfq-therapy-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.65rem;margin:.3rem 0 .7rem}
.nfq-therapy-meta dt{font-size:.69rem;color:var(--text-muted,#687381)}
.nfq-therapy-meta dd{font-size:.77rem;margin:.18rem 0 0;overflow-wrap:anywhere}
.nfq-therapy-note{font-size:.75rem;line-height:1.55;color:var(--text-muted,#687381);margin:.3rem 0 .65rem}
.nfq-therapy-flag-check{margin:.6rem 0;padding:.5rem 0;border-top:1px solid var(--border,#e1e6e8);font-size:.74rem;line-height:1.5}
.nfq-therapy-flag-check p{margin:.25rem 0 0;max-width:68ch;color:var(--text-muted,#687381)}
.nfq-therapy-flag-check strong{font-weight:660}
.nfq-response-section{padding:.4rem 0;margin:.5rem 0;border-top:1px solid var(--border,#e1e6e8)}
.nfq-therapy-technical summary{font-size:.74rem;cursor:pointer}
.nfq-therapy-actions{display:flex;gap:.6rem 1rem;align-items:center;flex-wrap:wrap;padding-top:.55rem}
.nfq-therapy-actions a{color:inherit;font-size:.74rem;font-weight:580}
.nfq-therapy-error{display:flex;flex-wrap:wrap;gap:.5rem 1rem;align-items:center;font-size:.77rem}
@media(max-width:650px){.nfq-therapy{padding:.75rem .85rem}.nfq-therapy-row-main{grid-template-columns:minmax(0,1fr) auto;gap:.3rem .65rem;padding:.5rem 0}.nfq-therapy-result{grid-column:1;grid-row:2}.nfq-therapy-inspect{grid-column:2;grid-row:1 / span 2}.nfq-therapy-meta{grid-template-columns:1fr 1fr}}
</style>

<script setup lang="ts">
import {computed,ref,watch,onUnmounted} from 'vue';
import {THERAPIES,type CoreModulatorId,type VariantTherapyProfile} from '../domain/therapyRegistry';
import {compareLegacyFiveRegimens,type NamedVariant,type RegimenRuleResult} from '../domain/legacyFiveRegimenRules';
import {originalPairReviewFindings} from '../domain/originalPairReviewFindings';
import {haplotypeContextFindings} from '../domain/haplotypeContext';
import {createVariantTherapySource} from '../services/variantTherapySource';
import {readConfigFromEnvironment,type RealVariant} from '../services/liveVariants';
import {authSessionProvider} from '../services/authSession';
import ContextHelp from './ContextHelp.vue';
import type {PairReadiness} from '../domain/pairReadiness';

const props=defineProps<{first:RealVariant;second:RealVariant}>();
const emit=defineEmits<{phaseChange:[phase:PairReadiness]}>();
const config=readConfigFromEnvironment();
const source=config?createVariantTherapySource(config,fetch,authSessionProvider):null;
const profiles=ref<readonly [VariantTherapyProfile,VariantTherapyProfile]|null>(null);
const phase=ref<PairReadiness>('loading');
watch(phase,value=>emit('phaseChange',value),{immediate:true});
const attempts=ref(0);
const detail=ref<string|null>(null);
function editSelectedVariants():void{
 const field=document.getElementById('genotype-search-0');
 field?.scrollIntoView({block:'start',behavior:'auto'});
 field?.focus({preventScroll:true});
}
let active:AbortController|null=null;
const haplotypeFindings=computed(()=>haplotypeContextFindings([
 {id:props.first.id,names:[props.first.legacyName,props.first.proteinName,...props.first.aliases]},
 {id:props.second.id,names:[props.second.legacyName,props.second.proteinName,...props.second.aliases]}
]));
const namedPair=computed<readonly [NamedVariant,NamedVariant]|null>(()=>{
 if(!profiles.value)return null;
 return [
  {id:props.first.id,names:[props.first.legacyName,props.first.proteinName,props.first.cdnaName,...props.first.aliases],profile:profiles.value[0]},
  {id:props.second.id,names:[props.second.legacyName,props.second.proteinName,props.second.cdnaName,...props.second.aliases],profile:profiles.value[1]}
 ];
});
const outcomes=computed<readonly RegimenRuleResult[]>(()=>
 namedPair.value?compareLegacyFiveRegimens(namedPair.value[0],namedPair.value[1]):[]
);
const reviewFindings=computed(()=>namedPair.value?
 originalPairReviewFindings(namedPair.value[0],namedPair.value[1],outcomes.value):[]
);
const overallReviewFindings=computed(()=>reviewFindings.value.filter(x=>x.therapy===null));
function regimenReviewFindings(therapy:CoreModulatorId){
 return reviewFindings.value.filter(x=>x.therapy===therapy);
}
const basisLabel=(basis:RegimenRuleResult['basis']):string=>({
 'variant-tier':'Recorded variant evidence tier',
 'legacy-name-list':'Historical exact-name rule',
 'legacy-class-rule':'Historical class-based research rule',
 'missing-evidence':'Evidence not confirmed'
})[basis];
watch([()=>props.first.id,()=>props.second.id,attempts],async ([firstId,secondId])=>{
 active?.abort();profiles.value=null;phase.value=source?'loading':'unavailable';detail.value=null;
 if(!source)return;
 const controller=new AbortController();active=controller;
 try{
  const [a,b]=await Promise.all([source.get(firstId,controller.signal),source.get(secondId,controller.signal)]);
  if(controller.signal.aborted||props.first.id!==firstId||props.second.id!==secondId)return;
  if(!a||!b){phase.value='unavailable';return;}
  profiles.value=[a,b];phase.value='ready';
 }catch{
  if(!controller.signal.aborted&&props.first.id===firstId&&props.second.id===secondId)phase.value='error';
 }
},{immediate:true});
onUnmounted(()=>active?.abort());
</script>
<template>
 <section class="pair-drugs" aria-labelledby="pair-drugs-title" data-testid="pair-five-regimen-research">
  <div class="pair-drugs-head">
   <h2 id="pair-drugs-title" tabindex="-1">Five-modulator research rules</h2>
   <div class="pair-drugs-actions"><button type="button" @click="editSelectedVariants">Edit variants</button>
   <ContextHelp label="About genotype research rules" title="Pair-rule context">
    <p>The results reproduce the original research calculator's candidate-matching rules for two selected variant records. Two selected records do not establish a patient's genotype or allelic phase.</p>
    <p>A rule match is not a current regulatory indication, clinical response prediction or prescription decision.</p>
   </ContextHelp></div>
  </div>
  <p v-if="phase==='loading'" class="pair-drugs-status" role="status">Loading therapy evidence for both variants…</p>
  <div v-else-if="phase==='error'" role="alert" class="pair-drugs-status">Therapy research data could not be loaded. <button type="button" @click="attempts++">Retry</button></div>
  <p v-else-if="phase==='unavailable'" role="status" class="pair-drugs-status">Therapy research data is unavailable for the selected pair.</p>
  <template v-else>
   <p class="pair-drugs-context">Original five-regimen rule comparison · two selected research records</p>
   <div v-if="haplotypeFindings.length" class="pair-haplotype-note" role="note" data-testid="pair-haplotype-context">
    <span>R117H · poly-T/TG context not assessed</span>
    <ContextHelp label="About R117H haplotype context" title="R117H modifier context">
     <p>R117H is present in a selected variant record. The original platform identifies its intron-8 poly-T and TG repeat context as relevant to interpretation.</p>
     <p>This two-record research comparison does not evaluate poly-T/TG modifiers or establish a patient haplotype. The five regimen-rule results and recorded source values remain unchanged.</p>
    </ContextHelp>
   </div>
   <details v-if="overallReviewFindings.length" class="pair-original-review" data-testid="pair-original-review-signals">
    <summary>Original review signals · {{overallReviewFindings.length}}</summary>
    <ul><li v-for="finding in overallReviewFindings" :key="finding.kind">{{finding.message}}</li></ul>
   </details>
   <div class="pair-drugs-rows">
    <div v-for="item in outcomes" :key="item.therapy" class="pair-drugs-row">
     <div class="pair-drugs-main">
      <strong>{{THERAPIES.find(t=>t.id===item.therapy)?.label}}</strong>
      <span class="pair-drugs-result">{{item.outcome==='match'?'Rule matched':item.outcome==='not-matched'?'Rule not matched':'Evidence check needed'}}</span>
      <button type="button" :aria-expanded="detail===item.therapy" :aria-controls="'pair-drugs-'+item.therapy" @click="detail=detail===item.therapy?null:item.therapy">{{detail===item.therapy?'Close':'Details'}}</button>
     </div>
     <div v-if="detail===item.therapy" :id="'pair-drugs-'+item.therapy" class="pair-drugs-explain" role="region" :aria-label="(THERAPIES.find(t=>t.id===item.therapy)?.label??'Regimen')+' research rule details'">
      <p>{{item.rationale}}</p>
      <p class="pair-drugs-basis">Rule basis · {{basisLabel(item.basis)}}</p>
      <ul v-if="regimenReviewFindings(item.therapy).length" class="pair-regimen-review">
       <li v-for="finding in regimenReviewFindings(item.therapy)" :key="finding.kind">{{finding.message}}</li>
      </ul>
     </div>
    </div>
   </div>
  </template>
 </section>
</template>
<style scoped>
.pair-drugs{margin-top:1rem;padding:1rem;border:1px solid var(--border,#dce4e5);border-radius:10px;min-width:0}
.pair-drugs-head{display:flex;align-items:center;justify-content:space-between;gap:1rem}
.pair-drugs-head h2{font-size:1rem;margin:0;letter-spacing:-.01em;scroll-margin-top:4rem;outline-offset:4px}
.pair-drugs-actions{display:flex;align-items:center;gap:.45rem;flex:0 0 auto}
.pair-drugs-actions button{font:inherit;font-size:.73rem;cursor:pointer;border:1px solid var(--border,#dce4e5);color:inherit;background:transparent;border-radius:6px;padding:.35rem .65rem}
.pair-drugs-actions button:focus-visible{outline:2px solid currentColor;outline-offset:3px}
@media(max-width:500px){.pair-drugs-head{align-items:flex-start}.pair-drugs-actions{gap:.25rem}}
.pair-drugs-status,.pair-drugs-context{font-size:.76rem;color:var(--text-muted,#687381);line-height:1.5;margin:.55rem 0}
.pair-haplotype-note{display:flex;align-items:center;flex-wrap:wrap;gap:.25rem .45rem;font-size:.73rem;color:var(--text-muted,#687381);line-height:1.35;padding:0 0 .6rem}
.pair-haplotype-note :deep(.nfq-context-help summary){min-width:24px;min-height:24px}
.pair-drugs-rows{border-top:1px solid var(--border,#dce4e5)}
.pair-drugs-row{border-bottom:1px solid var(--border,#dce4e5)}
.pair-drugs-main{display:grid;grid-template-columns:minmax(140px,1fr) minmax(125px,1fr) auto;gap:.7rem;align-items:center;min-height:3.2rem}
.pair-drugs-main strong{font-size:.79rem}
.pair-drugs-result{font-size:.77rem}
.pair-drugs-main button,.pair-drugs-status button{border:1px solid var(--border,#dce4e5);background:transparent;color:inherit;border-radius:6px;cursor:pointer;font:inherit;font-size:.72rem;padding:.35rem .65rem}
.pair-drugs-main button:focus-visible,.pair-drugs-status button:focus-visible{outline:2px solid currentColor;outline-offset:3px}
.pair-drugs-explain{font-size:.74rem;color:var(--text-muted,#687381);line-height:1.6;margin:0;padding:.25rem 0 .75rem}
.pair-drugs-explain p{margin:0}
.pair-drugs-basis{font-size:.69rem;opacity:.82;padding-top:.2rem}
.pair-regimen-review{margin:.45rem 0 0;padding-left:1.1rem}
.pair-regimen-review li+li{margin-top:.28rem}
.pair-original-review{font-size:.72rem;color:var(--text-muted,#687381);margin:.35rem 0 .7rem}
.pair-original-review summary{cursor:pointer;font-weight:580;padding:.2rem 0;width:max-content;max-width:100%}
.pair-original-review ul{margin:.25rem 0 0;padding-left:1.1rem;line-height:1.5}
.pair-original-review li+li{margin-top:.3rem}
.pair-original-review summary:focus-visible{outline:2px solid currentColor;outline-offset:2px}
@media(max-width:620px){.pair-drugs-main{grid-template-columns:minmax(0,1fr) auto;padding:.5rem 0;gap:.3rem .5rem}.pair-drugs-result{grid-column:1;grid-row:2}.pair-drugs-main button{grid-column:2;grid-row:1/span 2}}
</style>

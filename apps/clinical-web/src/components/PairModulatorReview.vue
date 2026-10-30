<script setup lang="ts">
import {computed,ref,watch,onUnmounted} from 'vue';
import {THERAPIES,type VariantTherapyProfile} from '../domain/therapyRegistry';
import {compareLegacyFiveRegimens} from '../domain/legacyFiveRegimenRules';
import {createVariantTherapySource} from '../services/variantTherapySource';
import {readConfigFromEnvironment,type RealVariant} from '../services/liveVariants';
import {authSessionProvider} from '../services/authSession';
import ContextHelp from './ContextHelp.vue';

const props=defineProps<{first:RealVariant;second:RealVariant}>();
const config=readConfigFromEnvironment();
const source=config?createVariantTherapySource(config,fetch,authSessionProvider):null;
const profiles=ref<readonly [VariantTherapyProfile,VariantTherapyProfile]|null>(null);
const phase=ref<'loading'|'ready'|'unavailable'|'error'>('loading');
const attempts=ref(0);
const detail=ref<string|null>(null);
let active:AbortController|null=null;
const outcomes=computed(()=>{
 if(!profiles.value)return [];
 return compareLegacyFiveRegimens(
  {id:props.first.id,names:[props.first.legacyName,props.first.proteinName,props.first.cdnaName,...props.first.aliases],profile:profiles.value[0]},
  {id:props.second.id,names:[props.second.legacyName,props.second.proteinName,props.second.cdnaName,...props.second.aliases],profile:profiles.value[1]}
 );
});
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
   <h2 id="pair-drugs-title">Five-modulator research rules</h2>
   <ContextHelp label="About genotype research rules" title="Pair-rule context">
    <p>The results reproduce the original research calculator's candidate-matching rules for two selected variant records. Two selected records do not establish a patient's genotype or allelic phase.</p>
    <p>A rule match is not a current regulatory indication, clinical response prediction or prescription decision.</p>
   </ContextHelp>
  </div>
  <p v-if="phase==='loading'" class="pair-drugs-status" role="status">Loading therapy evidence for both variants…</p>
  <div v-else-if="phase==='error'" role="alert" class="pair-drugs-status">Therapy research data could not be loaded. <button type="button" @click="attempts++">Retry</button></div>
  <p v-else-if="phase==='unavailable'" role="status" class="pair-drugs-status">Therapy research data is unavailable for the selected pair.</p>
  <template v-else>
   <p class="pair-drugs-context">Original five-regimen rule comparison · two selected research records</p>
   <div class="pair-drugs-rows">
    <div v-for="item in outcomes" :key="item.therapy" class="pair-drugs-row">
     <div class="pair-drugs-main">
      <strong>{{THERAPIES.find(t=>t.id===item.therapy)?.label}}</strong>
      <span class="pair-drugs-result">{{item.outcome==='match'?'Rule matched':item.outcome==='not-matched'?'Rule not matched':'Evidence check needed'}}</span>
      <button type="button" :aria-expanded="detail===item.therapy" :aria-controls="'pair-drugs-'+item.therapy" @click="detail=detail===item.therapy?null:item.therapy">{{detail===item.therapy?'Close':'Details'}}</button>
     </div>
     <p v-if="detail===item.therapy" :id="'pair-drugs-'+item.therapy" class="pair-drugs-explain">{{item.rationale}}</p>
    </div>
   </div>
  </template>
 </section>
</template>
<style scoped>
.pair-drugs{margin-top:1rem;padding:1rem;border:1px solid var(--border,#dce4e5);border-radius:10px;min-width:0}
.pair-drugs-head{display:flex;align-items:center;justify-content:space-between;gap:1rem}
.pair-drugs-head h2{font-size:1rem;margin:0;letter-spacing:-.01em}
.pair-drugs-status,.pair-drugs-context{font-size:.76rem;color:var(--text-muted,#687381);line-height:1.5;margin:.55rem 0}
.pair-drugs-rows{border-top:1px solid var(--border,#dce4e5)}
.pair-drugs-row{border-bottom:1px solid var(--border,#dce4e5)}
.pair-drugs-main{display:grid;grid-template-columns:minmax(140px,1fr) minmax(125px,1fr) auto;gap:.7rem;align-items:center;min-height:3.2rem}
.pair-drugs-main strong{font-size:.79rem}
.pair-drugs-result{font-size:.77rem}
.pair-drugs-main button,.pair-drugs-status button{border:1px solid var(--border,#dce4e5);background:transparent;color:inherit;border-radius:6px;cursor:pointer;font:inherit;font-size:.72rem;padding:.35rem .65rem}
.pair-drugs-main button:focus-visible,.pair-drugs-status button:focus-visible{outline:2px solid currentColor;outline-offset:3px}
.pair-drugs-explain{font-size:.74rem;color:var(--text-muted,#687381);line-height:1.6;margin:0;padding:.25rem 0 .75rem}
@media(max-width:620px){.pair-drugs-main{grid-template-columns:minmax(0,1fr) auto;padding:.5rem 0;gap:.3rem .5rem}.pair-drugs-result{grid-column:1;grid-row:2}.pair-drugs-main button{grid-column:2;grid-row:1/span 2}}
</style>

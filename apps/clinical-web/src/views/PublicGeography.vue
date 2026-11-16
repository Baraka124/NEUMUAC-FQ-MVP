<script setup lang="ts">
import {computed,onUnmounted,ref,watch} from 'vue';
import {useRoute} from 'vue-router';
import GeographicObservatory from '../components/GeographicObservatory.vue';
import {canonicalGeographyVariantId,geographyVariantEmptyState} from '../domain/variantGeographyContext';
import {authSessionProvider} from '../services/authSession';
import {createReadOnlyRepository,readConfigFromEnvironment,variantDisplayName,type RealVariantSource} from '../services/liveVariants';

const route=useRoute();
const variantId=computed(()=>canonicalGeographyVariantId(route.query.variant));
const variantName=ref('');
const emptyState=computed(()=>geographyVariantEmptyState(variantId.value));
const variantLabel=computed(()=>variantName.value||('Variant #'+variantId.value));
let source:RealVariantSource|null=null;
let pending:AbortController|null=null;
try{
 const config=readConfigFromEnvironment();
 if(config)source=createReadOnlyRepository(config,fetch,authSessionProvider);
}catch{source=null;}
// The atlas itself has no variant-geographic source. The optional GET below
// retrieves only a verified display name, never location or distribution.
watch(variantId,id=>{
 pending?.abort();pending=null;variantName.value='';
 if(!id||!source)return;
 const controller=new AbortController();pending=controller;
 void source.get(id,controller.signal).then(record=>{
  if(!controller.signal.aborted&&variantId.value===id&&record?.id===id)
   variantName.value=variantDisplayName(record);
 }).catch(()=>{
  // Keep the safe, source-ID-only label if the current dossier is inaccessible.
 }).finally(()=>{if(pending===controller)pending=null;});
},{immediate:true});
onUnmounted(()=>pending?.abort());
</script>
<template>
 <div class="page public-geography-page">
  <header class="geo-page-title">
   <div class="geo-page-title-main">
    <h1>Geographic atlas</h1>
    <span>Spain · Regional boundaries</span>
   </div>
   <div v-if="variantId" class="geo-page-variant-context" role="note" data-testid="geo-variant-context">
    <div class="geo-page-variant-identity">
     <strong data-testid="geo-variant-name">{{variantLabel}}</strong>
     <span data-testid="geo-variant-empty">{{emptyState}}</span>
    </div>
    <RouterLink :to="'/variants/'+variantId" data-testid="geo-variant-return">Return to variant</RouterLink>
   </div>
  </header>
  <GeographicObservatory/>
 </div>
</template>
<style scoped>
/* 14H158: remove double top padding from .page, align the header and controls
   tightly, and let the existing atlas (not decorative containers) lead. */
.public-geography-page{padding-top:0!important;min-width:0}
.public-geography-page .geo-page-title{
 display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;
 gap:6px 16px;margin:0 0 8px;min-height:41px;
}
.geo-page-title-main{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 13px;min-width:0}
.public-geography-page .geo-page-title h1{
 font-size:clamp(25px,2.25vw,32px);line-height:1.17;
 letter-spacing:-.037em;margin:0;font-weight:680;
}
.public-geography-page .geo-page-title-main>span{
 font-size:11px;line-height:1.4;color:#4f719c
}
.geo-page-variant-context{
 display:flex;align-items:center;justify-content:flex-end;gap:10px;
 min-width:0;max-width:100%;flex-wrap:wrap;
}
.geo-page-variant-identity{display:flex;align-items:baseline;gap:6px 9px;min-width:0;flex-wrap:wrap}
.geo-page-variant-identity strong{
 color:#285887;font-size:11.5px;line-height:1.4;font-weight:680;
 overflow-wrap:anywhere
}
.geo-page-variant-identity span{color:#526d8f;font-size:10.5px;line-height:1.4}
.geo-page-variant-context a{
 display:inline-flex;align-items:center;min-height:33px;
 padding:4px 0;color:#2867b3;font-size:11px;font-weight:650;
 text-decoration:underline;text-underline-offset:3px;white-space:nowrap
}
.geo-page-variant-context a:focus-visible{outline:2px solid #2979ff;outline-offset:3px}
:global(.app-frame[data-nfq-theme="midnight"]) .geo-page-title-main>span{color:#afc7e7}
:global(.app-frame[data-nfq-theme="midnight"]) .geo-page-variant-identity strong{color:#c5ddff}
:global(.app-frame[data-nfq-theme="midnight"]) .geo-page-variant-identity span{color:#b1c8e8}
:global(.app-frame[data-nfq-theme="midnight"]) .geo-page-variant-context a{color:#a9d0ff}
@media(max-width:760px){
 .public-geography-page .geo-page-title{min-height:0;gap:5px 12px;margin-bottom:8px}
 .public-geography-page .geo-page-title h1{font-size:26px}
 .geo-page-variant-context{justify-content:flex-start;gap:4px 11px}
}
</style>

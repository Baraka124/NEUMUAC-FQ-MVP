<script setup lang="ts">
import {computed,onUnmounted,ref,watch} from 'vue';
import {useRoute,useRouter} from 'vue-router';
import type {PublicationGeography as PublicationResult} from '../domain/publicationGeography';
import {affiliationBoundaryCounts} from '../domain/worldCountryIdentity';
import {WORLD_ATLAS_BOUNDARIES} from '../domain/worldAtlasBoundaries';
import PublicationGeography from '../components/PublicationGeography.vue';
import PopulationEvidence from '../components/PopulationEvidence.vue';
import WorldGeography from '../components/WorldGeography.vue';
import GeographicObservatory from '../components/GeographicObservatory.vue';
import {canonicalGeographyVariantId,geographyVariantEmptyState} from '../domain/variantGeographyContext';
import {canonicalGeographicRegionCode} from '../domain/geographicResearchProvenance';
import {authSessionProvider} from '../services/authSession';
import {createReadOnlyRepository,readConfigFromEnvironment,variantDisplayName,type RealVariantSource} from '../services/liveVariants';

const route=useRoute();
const router=useRouter();
const worldMode=ref(false);
const evidenceLayer=ref<'population'|'publication'>('population');
const publication=ref<PublicationResult|null>(null);
const affiliationCounts=computed(()=>affiliationBoundaryCounts(publication.value?.institutions??[],WORLD_ATLAS_BOUNDARIES));
const regionCode=computed(()=>canonicalGeographicRegionCode(route.query.region));
function onRegionSelected(code:string|null):void{
 const selected=canonicalGeographicRegionCode(code);
 if(selected===regionCode.value)return;
 const query={...route.query};
 if(selected)query.region=selected;
 else delete query.region;
 void router.replace({path:route.path,query});
}
const variantId=computed(()=>canonicalGeographyVariantId(route.query.variant));
const variantName=ref('');
const variantAliases=ref<readonly string[]>([]);
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
 pending?.abort();pending=null;variantName.value='';variantAliases.value=[];publication.value=null;
 if(!id||!source)return;
 const controller=new AbortController();pending=controller;
 void source.get(id,controller.signal).then(record=>{
  if(!controller.signal.aborted&&variantId.value===id&&record?.id===id){
   variantName.value=variantDisplayName(record);variantAliases.value=record.aliases;
  }
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
    <span>{{worldMode?'World · Reference boundaries':'Spain · Regional boundaries'}}</span>
    <button type="button" class="geo-scope-switch" @click="worldMode=!worldMode">{{worldMode?'Spain atlas':'World atlas'}}</button>
   </div>
   <div v-if="variantId" class="geo-page-variant-context" role="note" data-testid="geo-variant-context">
    <div class="geo-page-variant-identity">
     <strong data-testid="geo-variant-name">{{variantLabel}}</strong>
     <span data-testid="geo-variant-empty">{{emptyState}}</span>
    </div>
    <RouterLink :to="'/variants/'+variantId" data-testid="geo-variant-return">Return to variant</RouterLink>
   </div>
  </header>
  <nav v-if="worldMode" class="geo-evidence-nav" aria-label="International evidence layers">
   <button type="button" :aria-pressed="evidenceLayer==='population'" @click="evidenceLayer='population'">Population genetics</button>
   <button type="button" :aria-pressed="evidenceLayer==='publication'" @click="evidenceLayer='publication'">Publication affiliations</button>
   <button type="button" @click="worldMode=false">Regional search activity · Spain</button>
  </nav>
  <div v-if="worldMode" class="geo-integrated-layout">
   <WorldGeography :publication-mode="evidenceLayer==='publication'" :affiliation-counts="affiliationCounts" @open-spain="worldMode=false"/>
   <aside class="geo-integrated-inspector" aria-label="Evidence inspector">
  <PopulationEvidence v-if="variantId&&worldMode&&evidenceLayer==='population'" :aliases="variantAliases"/>
  <p v-if="worldMode&&!variantId&&evidenceLayer==='population'" class="geo-evidence-note">Open the atlas from a variant dossier to retrieve population allele observations.</p>
  <PublicationGeography v-if="worldMode&&evidenceLayer==='publication'" :key="variantId??'unscoped'" @resolved="publication=$event"/>
   </aside>
  </div>
  <GeographicObservatory v-else :variant-id="variantId" :initial-region-code="regionCode" @region-selected="onRegionSelected"/>
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
.geo-scope-switch{border:1px solid #d7e0e9;border-radius:4px;background:transparent;color:inherit;min-height:34px;padding:4px 10px;font:inherit;font-size:12px;cursor:pointer}
.geo-scope-switch:focus-visible{outline:2px solid #2867b3;outline-offset:2px}
.geo-evidence-nav{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.geo-evidence-nav button{min-height:40px;padding:6px 12px;background:transparent;border:1px solid #cdd9e5;color:inherit;border-radius:4px;font:inherit;font-size:12px;cursor:pointer}.geo-evidence-nav button[aria-pressed=true]{border-color:#527da5;font-weight:650}.geo-evidence-note{font-size:12px;line-height:1.55}
.geo-integrated-layout{display:grid;grid-template-columns:minmax(0,2fr) minmax(280px,1fr);align-items:start;gap:14px;margin-top:12px}.geo-integrated-inspector{min-width:0}.geo-integrated-inspector :deep(.pop-register),.geo-integrated-inspector :deep(.publication-geography){margin:0}.geo-evidence-nav{margin-top:4px}@media(max-width:1000px){.geo-integrated-layout{grid-template-columns:minmax(0,1fr)}}
</style>

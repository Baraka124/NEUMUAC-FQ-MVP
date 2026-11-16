<script setup lang="ts">
import {ref,computed,onMounted,onUnmounted,watch,useId} from 'vue';
import {canonicalGeographyVariantId,geographyVariantEmptyState} from '../domain/variantGeographyContext';
import {variantActivityGate} from '../domain/variantGeographicPanel';
import {getRegionalResearchActivity,type RegionalResearchActivity} from '../domain/regionalResearchActivity';
import {SPAIN_REGIONS} from '../domain/spainRegionalBoundaries';
import {authController,authSessionProvider} from '../services/authSession';
import {readConfigFromEnvironment} from '../services/liveVariants';
import {researcherRole} from '../services/researchRole';

const props=defineProps<{variantId:string;variantName:string}>();
const root=ref<HTMLElement|null>(null);
const trigger=ref<HTMLButtonElement|null>(null);
const open=ref(false);
const panelId=useId();
const canonicalId=computed(()=>canonicalGeographyVariantId(props.variantId));
const emptyState=computed(()=>geographyVariantEmptyState(props.variantId));
const activityRows=ref<readonly RegionalResearchActivity[]>([]);
const activityState=ref<'closed'|'checking'|'restricted'|'available'|'empty'|'unavailable'>('closed');
let currentRequest:AbortController|null=null;

const regionName=(code:string)=>SPAIN_REGIONS.find(region=>region.code===code)?.name||code;
const number=(value:number)=>value.toLocaleString('en-GB');
const shortDate=(value:string)=>new Intl.DateTimeFormat('en-GB',{
 day:'numeric',month:'short',year:'numeric',timeZone:'UTC'
}).format(new Date(value));

function close(restoreFocus=false):void{
 open.value=false;
 if(restoreFocus)trigger.value?.focus({preventScroll:true});
}
function toggle():void{open.value=!open.value;}
function outside(event:PointerEvent):void{
 if(open.value&&!root.value?.contains(event.target as Node))close();
}
watch(()=>props.variantId,()=>close());
// Opening the popover is the only read trigger. The same validated,
// researcher-only RPC powers the full atlas. It never reads raw search logs.
watch([
 open,canonicalId,()=>authController?.state.phase,()=>authController?.state.userId,
 ()=>researcherRole.phase
],()=>{
 currentRequest?.abort();currentRequest=null;activityRows.value=[];
 const gate=variantActivityGate(open.value,canonicalId.value,authController?.state.phase,researcherRole.phase);
 if(gate!=='ready'){activityState.value=gate;return;}
 const config=readConfigFromEnvironment();
 if(!config||!authSessionProvider){activityState.value='unavailable';return;}
 const variantId=canonicalId.value;
 if(!variantId){activityState.value='closed';return;}
 activityState.value='checking';
 const request=new AbortController();currentRequest=request;
 void getRegionalResearchActivity(config,authSessionProvider,variantId,fetch,request.signal)
  .then(result=>{
   if(request.signal.aborted||currentRequest!==request)return;
   activityRows.value=result.rows;
   activityState.value=result.status;
  }).catch(()=>{
   if(!request.signal.aborted&&currentRequest===request)activityState.value='unavailable';
  }).finally(()=>{if(currentRequest===request)currentRequest=null;});
},{immediate:true});
onMounted(()=>document.addEventListener('pointerdown',outside));
onUnmounted(()=>{
 document.removeEventListener('pointerdown',outside);
 currentRequest?.abort();
});
</script>

<template>
 <div ref="root" class="nfq-geo-shortcut" data-testid="variant-geography-shortcut" @keydown.esc.stop.prevent="close(true)">
  <button ref="trigger" type="button" class="nfq-geo-shortcut-trigger" :aria-expanded="open"
   :aria-controls="panelId" :aria-label="'Geographic context for '+variantName"
   :disabled="!canonicalId" data-testid="variant-geography-trigger"
   title="Geographic research context" @click="toggle">
   <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-2.9 2.6-4.4 5.6-4.4 9s1.5 6.4 4.4 9M12 3c2.9 2.6 4.4 5.6 4.4 9s-1.5 6.4-4.4 9"/>
   </svg>
  </button>
  <section v-if="open&&canonicalId" :id="panelId" class="nfq-geo-shortcut-panel"
   :aria-label="'Geographic context for '+variantName" data-testid="variant-geography-popover">
   <header class="nfq-geo-shortcut-head">
    <div class="nfq-geo-shortcut-identity">
     <strong>Geographic research</strong>
     <span data-testid="variant-geography-identity">{{variantName}}</span>
    </div>
    <button type="button" class="nfq-geo-shortcut-close" aria-label="Close geographic context" @click="close(true)">×</button>
   </header>
   <div class="nfq-geo-shortcut-data" data-testid="variant-geographic-research-activity">
    <span class="nfq-geo-shortcut-overline">Historical search activity · Spain</span>
    <p v-if="activityState==='checking'" class="nfq-geo-shortcut-state" role="status">Checking authorized research records…</p>
    <p v-else-if="activityState==='restricted'" class="nfq-geo-shortcut-state">
     Verified research membership required. <RouterLink v-if="authController?.state.phase!=='signed-in'" to="/sign-in" @click="close()">Sign in</RouterLink>
    </p>
    <p v-else-if="activityState==='unavailable'" class="nfq-geo-shortcut-state" role="status">
     The geographic research source cannot be verified right now.
    </p>
    <p v-else-if="activityState==='empty'" class="nfq-geo-shortcut-state" role="status">
     No region meets the publication threshold for this variant. This does not mean no searches occurred.
    </p>
    <template v-else-if="activityState==='available'">
     <p class="nfq-geo-shortcut-summary" role="status">{{activityRows.length}} {{activityRows.length===1?'region':'regions'}} with publishable aggregates</p>
     <ul class="nfq-geo-shortcut-rows" data-testid="variant-geographic-research-rows">
      <li v-for="region in activityRows" :key="region.regionCode">
       <strong>{{regionName(region.regionCode)}}</strong>
       <span class="nfq-geo-shortcut-count">{{number(region.searchEvents)}} searches · {{number(region.distinctSessions)}} sessions</span>
       <small>{{shortDate(region.firstObservedAt)}} – {{shortDate(region.lastObservedAt)}}</small>
      </li>
     </ul>
    </template>
    <p class="nfq-geo-shortcut-boundary" data-testid="variant-geography-empty">{{emptyState}}</p>
    <p class="nfq-geo-shortcut-help">The atlas shows boundaries and, for verified researchers, historical aggregated search activity. It does not show patients or variant prevalence.</p>
    <details class="nfq-geo-shortcut-provenance">
     <summary>Source and limits</summary>
     <p>Historical matched research searches estimated from coarse IP regions; may include tests. Regions are shown only with at least 20 events and 10 distinct sessions. They are not patient locations, carrier prevalence, clinical demand or institutional activity.</p>
    </details>
   </div>
   <RouterLink class="nfq-geo-shortcut-link" :to="{path:'/geography',query:{variant:canonicalId}}"
    data-testid="variant-geography-open-atlas" @click="close()">Explore on map <span aria-hidden="true">↗</span></RouterLink>
  </section>
 </div>
</template>

<style scoped>
.nfq-geo-shortcut{position:relative;display:inline-flex;flex:0 0 auto;min-width:0}
.nfq-geo-shortcut-trigger,.nfq-geo-shortcut-close{
 display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;
 width:40px;min-width:40px;height:40px;min-height:40px;padding:0;
 border:1px solid #cbd9ec;border-radius:6px;background:transparent;
 color:#356aaf;box-shadow:none;cursor:pointer;font:inherit;
}
.nfq-geo-shortcut-trigger svg{display:block}
.nfq-geo-shortcut-trigger:hover,.nfq-geo-shortcut-trigger[aria-expanded=true]{
 border-color:#88afde;background:rgba(41,121,255,.055)
}
.nfq-geo-shortcut-trigger:focus-visible,.nfq-geo-shortcut-close:focus-visible,
.nfq-geo-shortcut-link:focus-visible{outline:2px solid #2979ff;outline-offset:2px}
.nfq-geo-shortcut-panel{
 position:absolute;right:0;top:calc(100% + 7px);z-index:70;
 width:min(294px,calc(100vw - 36px));max-width:calc(100vw - 36px);
 padding:13px 14px 12px;border:1px solid #cbd8e9;border-radius:9px;
 background:#fff;color:#213a5d;box-shadow:0 15px 40px rgba(8,33,72,.16);
 text-align:left;
}
.nfq-geo-shortcut-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.nfq-geo-shortcut-identity{display:grid;gap:3px;min-width:0;max-width:100%}
.nfq-geo-shortcut-identity strong{font-size:12.5px;line-height:1.35;color:#183452}
.nfq-geo-shortcut-identity span{font-size:11.5px;line-height:1.4;color:#456992;overflow-wrap:anywhere}
.nfq-geo-shortcut-close{width:29px;min-width:29px;height:29px;min-height:29px;font-size:20px}
.nfq-geo-shortcut-empty{margin:12px 0 5px;font-size:12px;font-weight:570;line-height:1.55;color:#2c4e78}
.nfq-geo-shortcut-help{margin:0 0 10px;color:#647b98;font-size:10.7px;line-height:1.5}
.nfq-geo-shortcut-link{
 display:inline-flex;align-items:center;gap:6px;min-height:36px;
 padding:5px 0;color:#2863a9;text-decoration:underline;text-underline-offset:3px;
 font-size:11.5px;font-weight:620;line-height:1.4;
}
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-geo-shortcut-trigger,
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-geo-shortcut-close{
 background:transparent;color:#a8cdf9;border-color:#385276;
}
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-geo-shortcut-panel{
 background:#12243d;color:#e2edff;border-color:#385276;
 box-shadow:0 16px 48px rgba(0,3,13,.38);
}
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-geo-shortcut-identity strong,
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-geo-shortcut-empty{color:#e4efff}
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-geo-shortcut-identity span,
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-geo-shortcut-help{color:#acc6e8}
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-geo-shortcut-link{color:#a4cbff}
@media(max-width:760px){
 .nfq-geo-shortcut-panel{right:auto;left:0}
}

/* 14H163: in-dossier, source-connected geographic context; no new dashboard. */
.nfq-geo-shortcut-panel{
 width:min(390px,calc(100vw - 28px));max-height:min(72vh,640px);
 overflow-y:auto;overscroll-behavior:contain;padding:13px 15px 12px;
}
.nfq-geo-shortcut-overline{display:block;margin:13px 0 5px;font-size:10px;font-weight:650;letter-spacing:.035em;color:#5f7f9f}
.nfq-geo-shortcut-state{margin:7px 0;font-size:12px;line-height:1.5;color:#305479}
.nfq-geo-shortcut-state a{color:#2867b3;text-decoration:underline;text-underline-offset:3px}
.nfq-geo-shortcut-summary{margin:6px 0 4px;font-size:12px;font-weight:660;color:#315b8b}
.nfq-geo-shortcut-rows{margin:0;padding:0;list-style:none;max-height:35vh;overflow:auto}
.nfq-geo-shortcut-rows li{display:grid;grid-template-columns:1fr auto;gap:1px 9px;padding:8px 0;border-bottom:1px solid #e9eff6}
.nfq-geo-shortcut-rows li:last-child{border:0}
.nfq-geo-shortcut-rows strong{font-size:12px;color:#183452;font-weight:670;overflow-wrap:anywhere}
.nfq-geo-shortcut-count{font-size:10.7px;color:#326598;white-space:nowrap;align-self:baseline}
.nfq-geo-shortcut-rows small{grid-column:1/-1;color:#7890a8;font-size:10px}
.nfq-geo-shortcut-boundary{margin:11px 0 6px;color:#647b98;font-size:10.7px;line-height:1.45}
.nfq-geo-shortcut-provenance summary{cursor:pointer;color:#456c98;font-size:10.6px;line-height:1.5}
.nfq-geo-shortcut-provenance p{margin:4px 0 1px;font-size:10.5px;color:#647b98;line-height:1.5}
.nfq-geo-shortcut-rows::-webkit-scrollbar,.nfq-geo-shortcut-panel::-webkit-scrollbar{width:6px}
.nfq-geo-shortcut-trigger{width:36px;min-width:36px;height:36px;min-height:36px}
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-geo-shortcut-rows li{border-color:#2c4360}
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-geo-shortcut-rows strong{color:#e4efff}
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-geo-shortcut-count,
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-geo-shortcut-summary,
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-geo-shortcut-state{color:#c2dbfa}
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-geo-shortcut-rows small,
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-geo-shortcut-overline,
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-geo-shortcut-boundary,
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-geo-shortcut-provenance p{color:#a9c4e3}
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-geo-shortcut-provenance summary,
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-geo-shortcut-state a{color:#a4cbff}
@media(max-width:760px){
 .nfq-geo-shortcut-panel{position:fixed;left:12px;right:12px;top:auto;bottom:max(12px,env(safe-area-inset-bottom));width:auto;max-height:min(77dvh,660px)}
 .nfq-geo-shortcut-rows{max-height:30dvh}
}
@media(max-width:360px){.nfq-geo-shortcut-count{white-space:normal;text-align:right}}
</style>

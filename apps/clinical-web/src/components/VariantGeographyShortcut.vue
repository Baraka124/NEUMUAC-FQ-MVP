<script setup lang="ts">
import {ref,computed,onMounted,onUnmounted,watch,useId} from 'vue';
import {canonicalGeographyVariantId,geographyVariantEmptyState} from '../domain/variantGeographyContext';
const props=defineProps<{variantId:string;variantName:string}>();
const root=ref<HTMLElement|null>(null);
const trigger=ref<HTMLButtonElement|null>(null);
const open=ref(false);
const panelId=useId();
const canonicalId=computed(()=>canonicalGeographyVariantId(props.variantId));
const emptyState=computed(()=>geographyVariantEmptyState(props.variantId));
function close(restoreFocus=false):void{
 open.value=false;
 if(restoreFocus)trigger.value?.focus({preventScroll:true});
}
function toggle():void{open.value=!open.value;}
function outside(event:PointerEvent):void{
 if(open.value&&!root.value?.contains(event.target as Node))close();
}
watch(()=>props.variantId,()=>close());
onMounted(()=>document.addEventListener('pointerdown',outside));
onUnmounted(()=>document.removeEventListener('pointerdown',outside));
</script>

<template>
 <div ref="root" class="nfq-geo-shortcut" data-testid="variant-geography-shortcut" @keydown.esc.stop.prevent="close(true)">
  <button ref="trigger" type="button" class="nfq-geo-shortcut-trigger" :aria-expanded="open"
   :aria-controls="panelId" :aria-label="'Geographic context for '+variantName"
   :disabled="!canonicalId" data-testid="variant-geography-trigger"
   title="Geographic context" @click="toggle">
   <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-2.9 2.6-4.4 5.6-4.4 9s1.5 6.4 4.4 9M12 3c2.9 2.6 4.4 5.6 4.4 9s-1.5 6.4-4.4 9"/>
   </svg>
  </button>
  <div v-if="open&&canonicalId" :id="panelId" class="nfq-geo-shortcut-panel" role="region"
   :aria-label="'Geographic context for '+variantName" data-testid="variant-geography-popover">
   <div class="nfq-geo-shortcut-head">
    <div class="nfq-geo-shortcut-identity">
     <strong>Geographic context</strong>
     <span data-testid="variant-geography-identity">{{variantName}}</span>
    </div>
    <button type="button" class="nfq-geo-shortcut-close" aria-label="Close geographic context" @click="close(true)">×</button>
   </div>
   <p class="nfq-geo-shortcut-empty" data-testid="variant-geography-empty">{{emptyState}}</p>
   <p class="nfq-geo-shortcut-help">The atlas shows administrative boundaries, not variant prevalence, patients or search locations.</p>
   <RouterLink class="nfq-geo-shortcut-link" :to="{path:'/geography',query:{variant:canonicalId}}"
    data-testid="variant-geography-open-atlas" @click="close()">Open atlas <span aria-hidden="true">↗</span></RouterLink>
  </div>
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
</style>

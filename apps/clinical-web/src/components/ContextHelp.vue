<script setup lang="ts">
import {onMounted,onUnmounted,ref} from 'vue';

defineProps<{label:string;title:string}>();
const root=ref<HTMLDetailsElement|null>(null);
const summary=ref<HTMLElement|null>(null);
function close(restoreFocus=false){
 if(!root.value?.open)return;
 root.value.open=false;
 if(restoreFocus)summary.value?.focus();
}
function onDocumentPointer(event:PointerEvent){
 if(root.value?.open && event.target instanceof Node && !root.value.contains(event.target))close();
}
function onEscape(event:KeyboardEvent){
 if(root.value?.open && event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);}
}
onMounted(()=>{
 document.addEventListener('pointerdown',onDocumentPointer);
 document.addEventListener('keydown',onEscape,true);
});
onUnmounted(()=>{
 document.removeEventListener('pointerdown',onDocumentPointer);
 document.removeEventListener('keydown',onEscape,true);
});
</script>
<template>
 <details ref="root" class="nfq-context-help">
  <summary ref="summary" :aria-label="label" :title="label">
   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.3h.01"/>
   </svg>
  </summary>
  <div class="nfq-context-help-panel" role="note" :aria-label="title">
   <strong class="nfq-context-help-title">{{title}}</strong>
   <div class="nfq-context-help-body"><slot/></div>
  </div>
 </details>
</template>
<style scoped>
.nfq-context-help{position:relative;display:inline-block;vertical-align:middle;flex:none;font-size:12px}
.nfq-context-help summary{list-style:none;width:34px;height:34px;display:grid;place-items:center;border:1px solid #d0dbdc;border-radius:50%;background:#fff;color:#506770;cursor:pointer}
.nfq-context-help summary::-webkit-details-marker{display:none}
.nfq-context-help summary:hover,.nfq-context-help[open] summary{background:#edf3f3;border-color:#94b9bc;color:#197b82}
.nfq-context-help summary:focus-visible{outline:2px solid #197b82;outline-offset:3px}
.nfq-context-help-panel{position:absolute;right:0;top:calc(100% + 8px);z-index:40;width:min(370px,calc(100vw - 40px));max-height:min(70vh,480px);overflow:auto;padding:17px 19px;border:1px solid #cbd8d8;border-radius:5px;background:#fff;box-shadow:0 12px 30px rgba(41,47,51,.12),0 2px 7px rgba(41,47,51,.05);color:#3d4a52}
.nfq-context-help-title{display:block;font-size:14px;font-weight:740;letter-spacing:-.015em;color:#292f33;margin:0 0 9px}
.nfq-context-help-body{display:grid;gap:9px;font-size:12px;line-height:1.6}
.nfq-context-help-body :deep(p){margin:0}
.nfq-context-help-body :deep(dl){display:grid;gap:9px;margin:0}
.nfq-context-help-body :deep(dt){font-weight:680;color:#354952}
.nfq-context-help-body :deep(dd){margin:2px 0 0;color:#65717a}
@media(max-width:600px){
 .nfq-context-help-panel{position:fixed;top:clamp(86px,16vh,150px);left:16px;right:16px;width:auto;max-height:65vh;padding:16px 17px}
}
@media(prefers-reduced-motion:reduce){.nfq-context-help-panel{scroll-behavior:auto}}
</style>

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
.nfq-context-help summary{list-style:none;width:36px;height:36px;display:grid;place-items:center;border:1px solid #d6e4d9;border-radius:50%;background:rgba(248,252,249,.92);color:#416f54;cursor:pointer}
.nfq-context-help summary::-webkit-details-marker{display:none}
.nfq-context-help summary:hover,.nfq-context-help[open] summary{background:#eaf4ed;border-color:#94bca2;color:#255d40}
.nfq-context-help summary:focus-visible{outline:3px solid #218466;outline-offset:3px}
.nfq-context-help-panel{position:absolute;right:0;top:calc(100% + 10px);z-index:25;width:min(370px,calc(100vw - 50px));max-height:min(70vh,480px);overflow:auto;padding:20px 21px;border:1px solid rgba(165,192,173,.66);border-radius:11px;background:rgba(250,253,250,.97);box-shadow:0 18px 48px rgba(25,55,35,.13),0 2px 8px rgba(25,55,35,.06);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);color:#385a44}
.nfq-context-help-title{display:block;font-size:15px;font-weight:700;letter-spacing:-.02em;color:#163d28;margin:0 0 9px}
.nfq-context-help-body{display:grid;gap:9px;font-size:12px;line-height:1.62}
.nfq-context-help-body :deep(p){margin:0}
.nfq-context-help-body :deep(dl){display:grid;gap:9px;margin:0}
.nfq-context-help-body :deep(dt){font-weight:680;color:#234c34}
.nfq-context-help-body :deep(dd){margin:2px 0 0;color:#607568}
@media(max-width:600px){
 .nfq-context-help-panel{position:fixed;top:clamp(88px,17vh,160px);left:16px;right:16px;width:auto;max-height:65vh;padding:18px;box-shadow:0 18px 50px rgba(25,55,35,.16)}
}
@media(prefers-reduced-motion:reduce){.nfq-context-help-panel{scroll-behavior:auto}}
</style>

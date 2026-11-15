<script setup lang="ts">
import {onUnmounted,ref,watch} from 'vue';
import type {RealVariantSource} from '../services/liveVariants';
import {readSavedResearchSnapshot,savedResearchSnapshotCsv} from '../domain/savedResearchSnapshot';
import ContextHelp from './ContextHelp.vue';

const props=defineProps<{ids:readonly string[];source:RealVariantSource|null}>();
const working=ref(false);
const progress=ref(0);
const notice=ref('');
let controller:AbortController|null=null;
let runId=0;
function cancel():void{
 runId++;controller?.abort();controller=null;working.value=false;progress.value=0;
}
watch(()=>props.ids.join('|'),()=>{cancel();notice.value='';});
onUnmounted(cancel);
async function exportLive():Promise<void>{
 if(working.value||!props.source||!props.ids.length)return;
 cancel();
 const serial=runId,abort=new AbortController(),snapshotIds=[...props.ids];
 controller=abort;notice.value='';working.value=true;
 try{
  const rows=await readSavedResearchSnapshot(props.source,snapshotIds,window.location.href,abort.signal,
   n=>{if(serial===runId&&!abort.signal.aborted)progress.value=n;});
  if(serial!==runId||abort.signal.aborted||props.ids.join('|')!==snapshotIds.join('|'))return;
  const csv=savedResearchSnapshotCsv(rows,new Date().toISOString());
  if(!csv)throw new Error('Unable to produce a complete record snapshot.');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  try{
   const a=document.createElement('a');a.href=url;a.download='neumuacFQ-saved-records-current.csv';
   document.body.appendChild(a);a.click();a.remove();
   notice.value=rows.length+' current catalog records exported. Recorded fields are not independently clinically validated.';
  }finally{window.setTimeout(()=>URL.revokeObjectURL(url),5000);}
 }catch{
  if(serial===runId&&!abort.signal.aborted)
   notice.value='The complete saved worklist could not be verified from the current catalog. No partial scientific export was created.';
 }finally{
  if(serial===runId){controller=null;working.value=false;}
 }
}
</script>

<template>
 <div class="nfq-snapshot-export" aria-label="Current saved research metadata export" data-testid="saved-record-snapshot">
  <div class="nfq-snapshot-actions">
   <button type="button" data-testid="saved-snapshot-export" :disabled="working||!source||!ids.length"
    :aria-busy="working" @click="exportLive">
    {{working?'Reading current records…':'Export current records · CSV'}}
   </button>
   <ContextHelp label="About current record export" title="Current recorded research metadata">
    <p>This optional export independently retrieves every saved record from the current read-only catalog. It includes recorded nomenclature, class, subtype, separate ETI/Alyftrek values, and validation-entry counts. No treatment response or biological classification is inferred.</p>
    <p>If even one record cannot be verified, nothing is exported. Existing saved links remain available separately, including when the catalog is unavailable. Exports are local and do not write to the research database.</p>
   </ContextHelp>
  </div>
  <p v-if="working" role="status" class="nfq-snapshot-status" data-testid="saved-snapshot-progress">
   Verified {{progress}} of {{ids.length}} saved records…
  </p>
  <p v-if="notice" role="status" class="nfq-snapshot-status" data-testid="saved-snapshot-status">{{notice}}</p>
  <p v-if="!source" class="nfq-snapshot-status">A live read-only catalog connection is required for current-record export.</p>
 </div>
</template>

<style scoped>
.nfq-snapshot-export{display:flex;flex-direction:column;gap:5px;max-width:100%;min-width:0;margin:6px 0 0}
.nfq-snapshot-actions{display:flex;align-items:center;flex-wrap:wrap;gap:7px}
.nfq-snapshot-actions>button{
 display:inline-flex;align-items:center;justify-content:center;
 min-height:40px;width:auto;max-width:100%;padding:7px 11px;
 border:1px solid #c8d5e8;border-radius:6px;background:transparent;
 color:#2d60a9;box-shadow:none;font-family:inherit;font-size:11.5px;
 font-weight:600;line-height:1.3;cursor:pointer
}
.nfq-snapshot-actions>button:hover:not(:disabled){border-color:#94b7e4;background:rgba(41,121,255,.055)}
.nfq-snapshot-actions>button:disabled{opacity:.55;cursor:default}
.nfq-snapshot-actions>button:focus-visible{outline:2px solid #2979ff;outline-offset:2px}
.nfq-snapshot-status{margin:2px 0 0;font-size:11px;line-height:1.55;color:#657e99}
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-snapshot-actions>button{
 background:transparent!important;border-color:var(--nfq-night-line)!important;
 color:var(--nfq-night-link)!important
}
:global(.app-frame[data-nfq-theme="midnight"]) .nfq-snapshot-status{color:var(--nfq-night-muted)!important}
@media(max-width:760px){.nfq-snapshot-actions>button{min-height:40px;font-size:12px}}
</style>

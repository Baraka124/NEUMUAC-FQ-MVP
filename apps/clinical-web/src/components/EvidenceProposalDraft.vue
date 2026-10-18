<script setup lang="ts">
import {computed,ref,onUnmounted} from 'vue';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import {prepareEvidenceContribution,type SourceCorrectionField} from '../domain/evidenceContributionDraft';
const props=defineProps<{reference:LiveEvidenceReference}>();
const open=ref(false),field=ref<SourceCorrectionField>('title'),suggestedValue=ref(''),rationale=ref(''),notice=ref('');
const fields:readonly {value:SourceCorrectionField;label:string}[]=[
 {value:'title',label:'Reference title'},{value:'year',label:'Publication year'},
 {value:'journal',label:'Journal'},{value:'type',label:'Recorded type'},
 {value:'category',label:'Recorded category'},{value:'doi',label:'DOI'},{value:'pmid',label:'PMID'}
];
const current=computed(()=>String(props.reference[field.value]??'Not recorded'));
function close(){open.value=false;suggestedValue.value='';rationale.value='';notice.value='';}
onUnmounted(close);
function downloadDraft():void{
 const packet=prepareEvidenceContribution({reference:props.reference,field:field.value,suggestedValue:suggestedValue.value,rationale:rationale.value});
 if(!packet){notice.value='Enter a valid proposed value and a research rationale of 15–900 characters. No draft was exported.';return;}
 const url=URL.createObjectURL(new Blob([packet],{type:'text/markdown;charset=utf-8'}));
 try{
  const link=document.createElement('a');link.href=url;
  link.download='neumuacFQ-source-proposal-'+props.reference.id+'.md';
  document.body.appendChild(link);link.click();link.remove();
  notice.value='Unsubmitted proposal downloaded. No record or review status was changed.';
 }finally{window.setTimeout(()=>URL.revokeObjectURL(url),5000);}
}
</script>
<template>
 <div class="nfq-proposal-draft">
  <button type="button" class="nfq-proposal-toggle" :aria-expanded="open" :aria-controls="'source-draft-'+reference.id" @click="open?close():open=true">{{open?'Close proposal':'Prepare source correction'}}</button>
  <div v-if="open" :id="'source-draft-'+reference.id" class="nfq-proposal-content" data-testid="source-proposal-draft">
   <p class="nfq-proposal-note">Local research proposal only. Not submitted or approved. Do not enter patient information.</p>
   <label :for="'draft-field-'+reference.id">Recorded field</label>
   <select :id="'draft-field-'+reference.id" v-model="field" @change="suggestedValue='';notice=''">
    <option v-for="entry in fields" :key="entry.value" :value="entry.value">{{entry.label}}</option>
   </select>
   <p class="nfq-proposal-current">Currently recorded: {{current}}</p>
   <label :for="'draft-proposed-'+reference.id">Suggested value</label>
   <input :id="'draft-proposed-'+reference.id" v-model="suggestedValue" maxlength="200" placeholder="Source-supported correction" autocomplete="off" />
   <label :for="'draft-reason-'+reference.id">Research rationale</label>
   <textarea :id="'draft-reason-'+reference.id" v-model="rationale" rows="3" maxlength="900" placeholder="Explain what the underlying publication actually records." />
   <button type="button" @click="downloadDraft">Download proposal · .md</button>
   <p v-if="notice" role="status" class="nfq-proposal-note">{{notice}}</p>
  </div>
 </div>
</template>
<style scoped>
.nfq-proposal-draft{width:100%;padding-top:.45rem;border-top:1px solid var(--border,#dce2e7)}
.nfq-proposal-toggle{border:0;background:transparent;color:inherit;text-decoration:underline;text-underline-offset:3px;padding:.5rem 0;font:inherit;font-size:.79rem;cursor:pointer}
.nfq-proposal-content{display:grid;gap:.6rem;max-width:570px;margin:.5rem 0 1.1rem;padding:1rem;border:1px solid var(--border,#dce2e7);border-radius:8px}
.nfq-proposal-content label{font-size:.75rem;font-weight:600}
.nfq-proposal-content input,.nfq-proposal-content select,.nfq-proposal-content textarea{width:100%;min-width:0;border:1px solid var(--border,#dce2e7);border-radius:6px;padding:.6rem;font:inherit;background:var(--surface,#fff);color:inherit}
.nfq-proposal-content button{justify-self:start;cursor:pointer;background:transparent;border:1px solid var(--border,#dce2e7);padding:.6rem .85rem;border-radius:6px;font:inherit}
.nfq-proposal-content :focus-visible{outline:2px solid currentColor;outline-offset:2px}
.nfq-proposal-note,.nfq-proposal-current{font-size:.78rem;color:var(--text-muted,#687381);margin:0;line-height:1.45}
</style>

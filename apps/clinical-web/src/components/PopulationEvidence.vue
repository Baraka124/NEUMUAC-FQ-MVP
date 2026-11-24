<script setup lang="ts">
import {ref,computed,watch,onUnmounted} from 'vue';
import {loadPopulationEvidence,recordedRsIds,type PopulationObservation} from '../domain/populationEvidence';
const props=defineProps<{aliases:readonly string[]}>();
const ids=computed(()=>recordedRsIds(props.aliases));
const selected=ref(''),loaded=ref(''),state=ref<'idle'|'loading'|'available'|'empty'|'error'>('idle'),rows=ref<PopulationObservation[]>([]);
let request:AbortController|null=null;
watch(ids,values=>{request?.abort();selected.value=values.length===1?values[0]:'';loaded.value='';rows.value=[];state.value='idle';},{immediate:true});
watch(selected,()=>{request?.abort();loaded.value='';rows.value=[];state.value='idle';});
onUnmounted(()=>request?.abort());
async function lookup(){
 if(!ids.value.includes(selected.value))return;
 request?.abort();const controller=new AbortController();request=controller;
 const id=selected.value;state.value='loading';rows.value=[];loaded.value='';
 try{const result=await loadPopulationEvidence(id,controller.signal);
 if(controller.signal.aborted)return;
 rows.value=result;loaded.value=id;state.value=result.length?'available':'empty';
 }catch{if(!controller.signal.aborted)state.value='error';}
}
</script>
<template>
 <section class="pop-register" aria-label="Population allele evidence">
  <h2>Population allele evidence</h2>
  <p>1000 Genomes Phase 3 · Ensembl variation source. Cohorts are sampling groups, not country prevalence. All reported alleles are shown; the clinical alternate allele is not inferred.</p>
  <p v-if="!ids.length">No exact dbSNP identifier is recorded in this variant's aliases.</p>
  <div v-else class="pop-controls">
   <label>Recorded dbSNP identifier <select v-model="selected"><option value="">Choose identifier</option><option v-for="id in ids" :key="id">{{id}}</option></select></label>
   <button type="button" :disabled="!selected||state==='loading'" @click="lookup">Retrieve public evidence</button>
  </div>
  <p v-if="ids.length" class="pop-note">Retrieval sends only the selected public rs identifier to Ensembl, without account credentials.</p>
  <p v-if="state==='loading'" role="status">Retrieving source observations…</p>
  <p v-else-if="state==='error'" role="alert">The source could not be retrieved or verified. Retry the lookup.</p>
  <p v-else-if="state==='empty'" role="status">No supported Phase 3 observations returned; absence of data is not a zero frequency.</p>
  <div v-else-if="state==='available'" class="pop-table">
   <table><caption>Source observations for {{loaded}}</caption><thead><tr><th scope="col">Cohort code</th><th scope="col">Allele</th><th scope="col">Allele count</th><th scope="col">Frequency</th></tr></thead><tbody><tr v-for="row in rows" :key="row.cohort+'|'+row.allele"><td>{{row.cohort}}</td><td>{{row.allele}}</td><td>{{row.count}}</td><td>{{(row.frequency*100).toLocaleString('en-GB',{maximumSignificantDigits:6})}}%</td></tr></tbody></table>
  </div>
  <a href="https://rest.ensembl.org/documentation/info/variation_id" target="_blank" rel="noopener noreferrer">Source documentation</a>
 </section>
</template>
<style scoped>
.pop-register{margin:18px 0;padding:16px 18px;border:1px solid #dce4ec;border-radius:5px;color:inherit;min-width:0}h2{font-size:17px;margin:0 0 8px}p,a{font-size:12px;line-height:1.55}a{color:inherit}.pop-note{opacity:.75}.pop-controls{display:flex;gap:10px;align-items:end;flex-wrap:wrap}.pop-controls label{display:grid;gap:6px;font-size:12px}select,button{font:inherit;font-size:12px;min-height:40px;padding:6px 10px;border:1px solid #aebdce;border-radius:4px;background:transparent;color:inherit}select option{color:#243c55;background:white}button:disabled{opacity:.5}.pop-table{overflow:auto;max-height:420px;margin:12px 0}table{width:100%;border-collapse:collapse;font-size:12px;text-align:left}caption{text-align:left;padding:6px 0;font-weight:600}th,td{padding:8px;border-bottom:1px solid #dce4ec;overflow-wrap:anywhere}th{font-weight:650}
</style>

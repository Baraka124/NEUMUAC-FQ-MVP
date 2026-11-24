<script setup lang="ts">
import {computed,ref,onUnmounted,watch} from 'vue';
import {canonicalPublicationDoi,lookupPublicationGeography,type PublicationGeography} from '../domain/publicationGeography';
const emit=defineEmits<{resolved:[value:PublicationGeography|null]}>();
const input=ref(''),state=ref<'idle'|'loading'|'available'|'error'>('idle'),result=ref<PublicationGeography|null>(null);
const valid=computed(()=>canonicalPublicationDoi(input.value));
const countryNames=new Intl.DisplayNames(['en'],{type:'region'});
const groups=computed(()=>{
 const map=new Map<string,string[]>();
 for(const i of result.value?.institutions??[]){const list=map.get(i.countryCode)??[];list.push(i.name);map.set(i.countryCode,list);}
 return [...map].map(([code,names])=>({code,name:countryNames.of(code)||code,names}));
});
watch(result,value=>emit('resolved',value));
let request:AbortController|null=null;
watch(input,()=>{request?.abort();result.value=null;state.value='idle';});
onUnmounted(()=>{request?.abort();emit('resolved',null);});
async function retrieve(){
 if(!valid.value)return;
 request?.abort();const controller=new AbortController();request=controller;state.value='loading';result.value=null;
 try{const value=await lookupPublicationGeography(valid.value,controller.signal);if(!controller.signal.aborted){result.value=value;state.value='available';}}
 catch{if(!controller.signal.aborted)state.value='error';}
}
</script>
<template>
 <section class="publication-geography" aria-label="Publication affiliation geography">
  <h2>Publication affiliations</h2>
  <p>Explore resolved author institutions for a public publication DOI. Affiliation is not a study recruitment location, variant distribution, or proof of evidence relevance.</p>
  <form @submit.prevent="retrieve"><label>Publication DOI<input v-model="input" maxlength="200" placeholder="10.…" autocomplete="off"/></label><button :disabled="!valid||state==='loading'">Retrieve affiliations</button></form>
  <p class="source-note">Only the entered public DOI is sent to OpenAlex. No patient or account data is requested.</p>
  <p v-if="state==='loading'" role="status">Retrieving publication metadata…</p>
  <p v-else-if="state==='error'" role="alert">Publication source unavailable or identity could not be verified. Retry or verify the DOI.</p>
  <template v-else-if="result">
   <h3>{{result.title}}</h3><a :href="'https://doi.org/'+result.doi" target="_blank" rel="noopener noreferrer">{{result.doi}}</a>
   <p v-if="!groups.length" role="status">No resolved institutions with country codes returned. This is not proof that affiliations are absent.</p>
   <dl v-else><div v-for="group in groups" :key="group.code"><dt>{{group.name}} <span>{{group.code}}</span></dt><dd><ul><li v-for="(name,index) in group.names" :key="index">{{name}}</li></ul></dd></div></dl>
  </template>
  <a href="https://help.openalex.org/data/authorships/" target="_blank" rel="noopener noreferrer">Source methodology · OpenAlex</a>
 </section>
</template>
<style scoped>
.publication-geography{margin:16px 0;padding:16px 18px;border:1px solid #dce4ec;border-radius:5px;min-width:0}h2{font-size:17px;margin:0}h3{font-size:14px;margin:12px 0 4px}p,a,dt,dd{font-size:12px;line-height:1.55}form{display:flex;gap:10px;flex-wrap:wrap;align-items:end}label{display:grid;gap:5px;font-size:12px;flex:1;min-width:min(100%,220px)}input,button{font:inherit;font-size:12px;min-height:42px;padding:6px 10px;border:1px solid #aebdce;border-radius:4px;background:transparent;color:inherit;min-width:0}button:disabled{opacity:.5}a{color:inherit;overflow-wrap:anywhere}.source-note{opacity:.75}dl>div{display:grid;grid-template-columns:minmax(90px,1fr) 3fr;gap:12px;padding:8px 0;border-bottom:1px solid #dce4ec}dt{font-weight:650}dt span{font-weight:400;opacity:.7}dd,ul{margin:0;padding:0}ul{list-style:none}li{overflow-wrap:anywhere}@media(max-width:550px){dl>div{grid-template-columns:1fr;gap:4px}}
</style>

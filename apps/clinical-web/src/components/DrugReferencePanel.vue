<script setup lang="ts">
import {onUnmounted,ref} from 'vue';
import {THERAPIES} from '../domain/therapyRegistry';
import {configuredDrugReferenceSource,type DrugReferenceRegister} from '../services/drugReferenceSource';
import ContextHelp from './ContextHelp.vue';
const source=configuredDrugReferenceSource();
const open=ref(false),loading=ref(false),error=ref(''),register=ref<DrugReferenceRegister|null>(null);
const expanded=ref<string|null>(null);
let active:AbortController|null=null;
async function toggle():Promise<void>{
 open.value=!open.value;
 if(!open.value){active?.abort();loading.value=false;return;}
 if(register.value||loading.value)return;
 await load();
}
async function load():Promise<void>{
 active?.abort();error.value='';register.value=null;loading.value=false;
 if(!source){error.value='Regulatory and safety reference data are not connected.';return;}
 const controller=new AbortController();active=controller;loading.value=true;
 try{
  const rows=await source.list(controller.signal);
  if(!controller.signal.aborted)register.value=rows;
 }catch{
  if(!controller.signal.aborted)error.value='Could not retrieve the recorded drug references.';
 }finally{if(!controller.signal.aborted)loading.value=false;}
}
onUnmounted(()=>active?.abort());
</script>
<template>
 <section class="drug-register" aria-labelledby="drug-register-title">
  <div class="drug-register-head">
   <h2 id="drug-register-title">Drug references</h2>
   <div class="drug-register-head-actions">
    <ContextHelp label="About drug references" title="Regulatory and safety records">
     <p>These are records from the original research database. An active database flag or regulator label does not verify the latest approved indication, dose, safety warning or jurisdiction.</p>
     <p>The original register is for scientific traceability. Refer to current authorized product information for treatment decisions.</p>
    </ContextHelp>
    <button type="button" :aria-expanded="open" aria-controls="drug-register-content" @click="toggle">{{open?'Close':'Explore references'}}</button>
   </div>
  </div>
  <div v-if="open" id="drug-register-content">
   <p class="drug-register-caption">Original EU rule register and safety references · recorded data</p>
   <p v-if="loading" role="status" class="drug-register-state">Loading reference records…</p>
   <div v-else-if="error" role="alert" class="drug-register-state"><span>{{error}}</span> <button type="button" @click="load">Retry</button></div>
   <template v-else-if="register">
    <div class="drug-register-list">
     <div v-for="therapy in THERAPIES" :key="therapy.id" class="drug-register-entry">
      <div class="drug-register-row">
       <strong>{{therapy.label}}</strong>
       <span v-if="register.rules.some(r=>r.therapy===therapy.id)" class="drug-register-muted">EU reference recorded</span>
       <span v-else class="drug-register-muted">No EU rule in this register</span>
       <button type="button" :aria-expanded="expanded===therapy.id" :aria-controls="'drug-register-detail-'+therapy.id" @click="expanded=expanded===therapy.id?null:therapy.id">{{expanded===therapy.id?'Close':'Details'}}</button>
      </div>
      <div v-if="expanded===therapy.id" :id="'drug-register-detail-'+therapy.id" class="drug-register-detail">
       <template v-for="rule in register.rules.filter(r=>r.therapy===therapy.id)" :key="rule.id">
        <p><strong>{{rule.jurisdiction}}</strong> · {{rule.regulator}} · {{rule.recordedDate||'Date not recorded'}}</p>
        <p v-if="rule.recordedRule" class="drug-register-rule"><span>Recorded rule text:</span> {{rule.recordedRule}}</p>
       </template>
       <p v-if="!register.rules.some(r=>r.therapy===therapy.id)" class="drug-register-muted">The original calculator includes this regimen, but this database register contains no matching EU rule record.</p>
       <p class="drug-register-safety">Recorded safety entries: {{register.alerts.filter(a=>a.therapy===therapy.id).length}}</p>
       <ul v-if="register.alerts.some(a=>a.therapy===therapy.id)">
        <li v-for="alert in register.alerts.filter(a=>a.therapy===therapy.id)" :key="alert.id">{{alert.title}} <span class="drug-register-muted">· {{alert.severity}} · {{alert.sourceLabel||'Source unspecified'}}</span></li>
       </ul>
      </div>
     </div>
    </div>
    <p class="drug-register-foot">{{register.otherMedicationAlerts}} additional medication/interaction entries exist in the original safety register. They are not automatically assigned to a modulator.</p>
   </template>
  </div>
 </section>
</template>
<style scoped>
.drug-register{margin-top:1rem;border:1px solid var(--border,#dce4e5);border-radius:10px;padding:.85rem 1rem;min-width:0}
.drug-register-head,.drug-register-head-actions{display:flex;gap:.5rem .75rem;align-items:center;justify-content:space-between}
.drug-register-head h2{font-size:.94rem;margin:0}
.drug-register-head button,.drug-register-state button,.drug-register-row button{font:inherit;font-size:.73rem;border:1px solid var(--border,#dce4e5);border-radius:6px;background:transparent;color:inherit;padding:.35rem .65rem;cursor:pointer}
.drug-register-head button:focus-visible,.drug-register-state button:focus-visible,.drug-register-row button:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.drug-register-caption,.drug-register-foot,.drug-register-state{font-size:.73rem;color:var(--text-muted,#687381);line-height:1.5;margin:.6rem 0}
.drug-register-list{border-top:1px solid var(--border,#dce4e5)}
.drug-register-entry{border-bottom:1px solid var(--border,#dce4e5)}
.drug-register-row{display:grid;grid-template-columns:minmax(120px,1fr) minmax(170px,1fr) auto;gap:.7rem;align-items:center;min-height:3.1rem}
.drug-register-row strong{font-size:.79rem}
.drug-register-muted{color:var(--text-muted,#687381);font-size:.72rem}
.drug-register-detail{padding:.3rem 0 .8rem;font-size:.74rem;line-height:1.55;overflow-wrap:anywhere}
.drug-register-detail p{margin:.4rem 0}
.drug-register-rule span{font-weight:600}
.drug-register-safety{font-weight:610}
.drug-register-detail ul{margin:.3rem 0 .6rem;padding-left:1.25rem}
.drug-register-detail li{margin:.3rem 0}
@media(max-width:620px){.drug-register{padding:.75rem .85rem}.drug-register-row{grid-template-columns:minmax(0,1fr) auto;gap:.3rem .5rem;padding:.5rem 0}.drug-register-row>span{grid-column:1;grid-row:2}.drug-register-row button{grid-column:2;grid-row:1/span 2}}
</style>

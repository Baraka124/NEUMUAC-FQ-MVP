<script setup lang="ts">
import {computed,ref,watch} from 'vue';
import type {ResearchHistory} from '../services/liveResearchHistory';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import {recordedConflictFocus} from '../domain/recordedConflictFocus';
import {
 createEvidenceConflictTrace,prepareEvidenceConflictTraceability,traceRelationOptions,
 type EvidenceConflictTraceEntry,type ProvisionalRelation
} from '../domain/evidenceConflictTraceability';

const props=defineProps<{
 variantId:string;
 history:ResearchHistory;
 references:readonly LiveEvidenceReference[];
}>();
const conflicts=computed(()=>recordedConflictFocus(props.history,props.variantId)?.unresolved??[]);
const records=computed(()=>props.references.slice().sort((a,b)=>a.id-b.id));
const workingNotes=ref<readonly EvidenceConflictTraceEntry[]>([]);
const conflictId=ref('');
const referenceId=ref('');
const relation=ref<ProvisionalRelation>('undetermined');
const question=ref('');
const locator=ref('');
const interpretation=ref('');
const notice=ref('');
const invalid=ref(false);
const chosenReference=computed(()=>records.value.find(r=>String(r.id)===referenceId.value)||null);
const contextIndex=computed(()=>new Map(records.value.map(r=>[r.id,r])));
const conflictIndex=computed(()=>new Map(conflicts.value.map(c=>[c.id,c])));
const recordedConflictsWithNotes=computed(()=>new Set(workingNotes.value.map(x=>x.conflictId)).size);

watch(()=>[props.variantId,props.history,props.references],()=>{
 workingNotes.value=[];conflictId.value='';referenceId.value='';
 relation.value='undetermined';question.value='';locator.value='';
 interpretation.value='';notice.value='';invalid.value=false;
},{flush:'sync'});

function addNote():void{
 invalid.value=false;notice.value='';
 const entry=createEvidenceConflictTrace(props.variantId,props.history,props.references,true,{
  conflictId:Number(conflictId.value),referenceId:Number(referenceId.value),
  relation:relation.value,question:question.value,locator:locator.value,
  interpretation:interpretation.value
 },workingNotes.value);
 if(!entry){
  invalid.value=true;
  notice.value='Choose a different unresolved conflict/reference pair, a question (15–240 characters), an exact source locator (4–180 characters) and a working interpretation (20–900 characters). Duplicate pairs are not accepted.';
  return;
 }
 workingNotes.value=[...workingNotes.value,entry];
 referenceId.value='';relation.value='undetermined';question.value='';
 locator.value='';interpretation.value='';
 notice.value='Local research note added. It has not been saved or submitted.';
}
function removeNote(entry:EvidenceConflictTraceEntry):void{
 workingNotes.value=workingNotes.value.filter(x=>x!==entry);
 invalid.value=false;notice.value='Local note removed.';
}
function downloadWorksheet():void{
 invalid.value=false;notice.value='';
 const content=prepareEvidenceConflictTraceability(
  props.variantId,props.history,props.references,workingNotes.value,true
 );
 if(!content){
  invalid.value=true;
  notice.value='The selected source context or local note failed integrity checks. No worksheet was exported.';
  return;
 }
 const url=URL.createObjectURL(new Blob([content],{type:'text/markdown;charset=utf-8'}));
 try{
  const anchor=document.createElement('a');
  anchor.href=url;
  anchor.download='neumuacFQ-evidence-traceability-'+props.variantId+'.md';
  document.body.appendChild(anchor);anchor.click();anchor.remove();
  notice.value='Local working worksheet exported. No scientific decision or server submission occurred.';
 }finally{window.setTimeout(()=>URL.revokeObjectURL(url),5000);}
}
</script>

<template>
 <details class="nfq-traceability" data-testid="nfq-traceability">
  <summary>
   <span>Evidence-to-conflict traceability</span>
   <small>Manual research worksheet · local only</small>
  </summary>
  <div class="nfq-trace-inner">
   <p class="nfq-trace-intro">The recorded evidence register links references to the variant—not to individual contradictions.
    Explicitly document a possible relationship after examining the original scientific source.
    Every entry below is an <strong>unverified working interpretation</strong>, not a validated clinical or research decision.</p>
   <div class="nfq-trace-progress" role="status" data-testid="nfq-trace-progress">
    {{workingNotes.length}} local {{workingNotes.length===1?'link':'links'}} ·
    {{recordedConflictsWithNotes}} of {{conflicts.length}} unresolved {{conflicts.length===1?'record':'records'}} with notes ·
    {{records.length}} source {{records.length===1?'record':'records'}} available
   </div>
   <form class="nfq-trace-form" aria-label="Add provisional source association" @submit.prevent="addNote">
    <div class="nfq-trace-pair">
     <label for="nfq-trace-conflict">Recorded contradiction
      <select id="nfq-trace-conflict" v-model="conflictId" data-testid="nfq-trace-conflict" required>
       <option value="" disabled>Choose an unresolved record</option>
       <option v-for="item in conflicts" :key="item.id" :value="String(item.id)">#{{item.id}} · {{item.field}}</option>
      </select>
     </label>
     <label for="nfq-trace-source">Catalogued reference
      <select id="nfq-trace-source" v-model="referenceId" data-testid="nfq-trace-reference" required>
       <option value="" disabled>Choose an original reference</option>
       <option v-for="item in records" :key="item.id" :value="String(item.id)">#{{item.id}} · {{item.title.slice(0,88)}}</option>
      </select>
     </label>
    </div>
    <p v-if="chosenReference" class="nfq-trace-source">
     {{chosenReference.source}}<span v-if="chosenReference.pmid"> · PMID {{chosenReference.pmid}}</span>
     <span v-if="chosenReference.doi"> · DOI {{chosenReference.doi}}</span>
     <a :href="chosenReference.url" target="_blank" rel="noopener noreferrer">Inspect original source <span aria-hidden="true">↗</span></a>
    </p>
    <label for="nfq-trace-relationship">Provisional relationship
     <select id="nfq-trace-relationship" v-model="relation" data-testid="nfq-trace-relation">
      <option v-for="item in traceRelationOptions" :key="item.value" :value="item.value">{{item.label}}</option>
     </select>
    </label>
    <label for="nfq-trace-question">Exact scientific question being investigated
     <textarea id="nfq-trace-question" v-model="question" data-testid="nfq-trace-question" rows="2" maxlength="240"
      placeholder="What precise question must be checked against the recorded field?" required></textarea>
    </label>
    <label for="nfq-trace-locator">Source location to check
     <input id="nfq-trace-locator" v-model="locator" data-testid="nfq-trace-locator" maxlength="180"
      placeholder="e.g. PMID 1234 · Results · Table 2" required />
    </label>
    <label for="nfq-trace-interpretation">Working interpretation — not independently verified
     <textarea id="nfq-trace-interpretation" v-model="interpretation" data-testid="nfq-trace-interpretation" rows="3"
      maxlength="900" placeholder="Describe exactly what should be independently checked and why." required></textarea>
    </label>
    <div class="nfq-trace-form-actions">
     <button type="submit" data-testid="nfq-trace-add" :disabled="workingNotes.length>=30">Add working link</button>
     <span>Up to 30 unique links · no automatic matching</span>
    </div>
   </form>
   <p v-if="notice" class="nfq-trace-notice" :role="invalid?'alert':'status'">{{notice}}</p>
   <div v-if="workingNotes.length" class="nfq-trace-entries" aria-label="Locally prepared source associations">
    <article v-for="entry in workingNotes" :key="entry.conflictId+':'+entry.referenceId" class="nfq-trace-entry">
     <div class="nfq-trace-entry-head">
      <div>
       <span class="nfq-trace-entry-id">CONFLICT {{entry.conflictId}} · REFERENCE {{entry.referenceId}}</span>
       <h3>{{conflictIndex.get(entry.conflictId)?.field||'Unverified field'}}</h3>
       <p>{{contextIndex.get(entry.referenceId)?.title||'Unverified reference'}}</p>
      </div>
      <button type="button" :aria-label="'Remove working link for conflict '+entry.conflictId+' and reference '+entry.referenceId" @click="removeNote(entry)">Remove</button>
     </div>
     <p class="nfq-trace-entry-relation">{{traceRelationOptions.find(x=>x.value===entry.relation)?.label}}</p>
     <p><strong>Question:</strong> {{entry.question}}</p>
     <p><strong>Locator:</strong> {{entry.locator}}</p>
     <p><strong>Working note:</strong> {{entry.interpretation}}</p>
    </article>
   </div>
   <div class="nfq-trace-actions">
    <button type="button" data-testid="nfq-trace-download" :disabled="!workingNotes.length" @click="downloadWorksheet">Export provisional worksheet · MD</button>
    <p>No drafts are transmitted or stored. Refreshing sources, changing variant or leaving this page clears these notes.</p>
   </div>
  </div>
 </details>
</template>

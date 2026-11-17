<script setup lang="ts">
import {computed,ref,watch} from 'vue';
import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import {
 buildSourceReconciliationDocket,createReconciliationResearchNote,
 portableReconciliationResearchNotes,type ReconciliationResearchNote,
 type ReconciliationQuestionKind,type ReconciliationSource
} from '../domain/sourceEvidenceReconciliation';
import {THERAPIES,type CoreModulatorId} from '../domain/therapyRegistry';

const props=defineProps<{
 active:boolean;variantId:string;claims:readonly CuratedSourceClaim[];
 references:readonly LiveEvidenceReference[];
}>();
const expanded=ref(false);
const therapyFilter=ref<CoreModulatorId|'all'>('all');
const selectedId=ref('');
const questionKind=ref<ReconciliationQuestionKind>('needs-additional-evidence');
const question=ref('');
const context=ref('');
const followUp=ref('');
const drafts=ref<readonly ReconciliationResearchNote[]>([]);
const notice=ref('');
const docket=computed(()=>buildSourceReconciliationDocket({
 variantId:props.variantId,claims:props.claims,references:props.references,maxCases:100
}));
const visible=computed(()=>therapyFilter.value==='all'?docket.value.cases:
 docket.value.cases.filter(c=>c.therapy===therapyFilter.value));
const selected=computed(()=>visible.value.find(c=>c.id===selectedId.value)??null);
const therapyLabel=(id:CoreModulatorId)=>THERAPIES.find(t=>t.id===id)?.label??id;
function clearForm():void{
 questionKind.value='needs-additional-evidence';
 question.value='';context.value='';followUp.value='';notice.value='';
}
function clear():void{
 expanded.value=false;therapyFilter.value='all';selectedId.value='';
 drafts.value=[];clearForm();
}
function toggle():void{
 if(expanded.value)clear();
 else{expanded.value=true;selectedId.value=visible.value[0]?.id??'';}
}
watch(()=>props.variantId,clear);
watch(()=>props.active,v=>{if(!v)clear();});
watch(therapyFilter,()=>{
 selectedId.value=visible.value[0]?.id??'';
 clearForm();
});
function choose(id:string):void{
 if(!visible.value.some(c=>c.id===id))return;
 selectedId.value=id;clearForm();
}
function addNote():void{
 if(!props.active||!expanded.value||!selected.value)return;
 try{
  const item=createReconciliationResearchNote(selected.value,{
   questionKind:questionKind.value,question:question.value.trim(),
   sourceContext:context.value.trim(),followUp:followUp.value.trim(),
   createdAt:new Date().toISOString()
  });
  if(drafts.value.length>=100)throw new Error('Local research note limit');
  drafts.value=[...drafts.value,item];
  question.value='';context.value='';followUp.value='';
  notice.value='Unreviewed research note added locally; not saved to the server or independently adjudicated.';
 }catch{
  notice.value='Complete the source-specific research question, context and next action. No note was added.';
 }
}
function removeNote(index:number):void{
 drafts.value=drafts.value.filter((_,i)=>i!==index);
 notice.value='Local research note discarded.';
}
function exportNotes():void{
 if(!drafts.value.length||!props.active)return;
 try{
  const portable=portableReconciliationResearchNotes(drafts.value);
  const url=URL.createObjectURL(new Blob([portable],{type:'application/json;charset=utf-8'}));
  try{
   const anchor=document.createElement('a');
   anchor.href=url;anchor.download='neumuacfq-reconciliation-notes-'+props.variantId+'.json';
   document.body.appendChild(anchor);anchor.click();anchor.remove();
  }finally{window.setTimeout(()=>URL.revokeObjectURL(url),5000);}
  notice.value='Unreviewed research notebook export requested. This is not an approved evidence record.';
 }catch{notice.value='Notebook export failed; no scientific reconciliation is assumed.';}
}
function typeLabel(kind:string):string{
 return kind.replaceAll('-',' ');
}
</script>

<template>
 <section class="nfq-reconcile" data-testid="nfq-source-reconciliation">
  <header class="nfq-reconcile-head">
   <div>
    <strong>Scientific evidence reconciliation</strong>
    <p>Source-specific comparison · study independence · unresolved research questions</p>
   </div>
   <button type="button" :aria-expanded="expanded" @click="toggle">
    {{expanded?'Close reconciliation':'Examine reviewed findings'}}
   </button>
  </header>
  <div v-if="expanded" class="nfq-reconcile-body">
   <p class="nfq-reconcile-note">Only independently approved source claims for this exact variant are compared.
    This does not infer equivalent genotypes, resolve conflicts automatically, or predict response.
   </p>
   <div class="nfq-reconcile-summary">
    <span>{{docket.totalCandidates}} potential comparison{{docket.totalCandidates===1?'':'s'}}</span>
    <span>{{docket.excludedSourceClaims}} unapproved or unlinked source claim{{docket.excludedSourceClaims===1?'':'s'}} excluded</span>
    <span v-if="docket.limited">Showing the first {{docket.cases.length}} prioritized cases; remaining comparisons are not included in this view</span>
   </div>
   <p v-if="!docket.cases.length" class="nfq-reconcile-note" role="status">
    No independently reviewed source pairs currently require a reconciliation comparison.
    Missing records do not establish biological agreement or absence of conflict.
   </p>
   <template v-else>
    <div class="nfq-reconcile-filters">
     <label>Therapy
      <select v-model="therapyFilter">
       <option value="all">All five therapies</option>
       <option v-for="therapy in THERAPIES" :key="therapy.id" :value="therapy.id">
        {{therapy.label}}
       </option>
      </select>
     </label>
     <label>Source comparison
      <select :value="selectedId" @change="choose(($event.target as HTMLSelectElement).value)"
       aria-label="Select independently reviewed source comparison">
       <option v-for="item in visible" :key="item.id" :value="item.id">
        {{therapyLabel(item.therapy)}} · {{item.first.studyFamilyId}} / {{item.second.studyFamilyId}} · {{item.reasons.join(', ')}}
       </option>
      </select>
     </label>
    </div>
    <p v-if="!visible.length" class="nfq-reconcile-note">No source pairs match this therapy.</p>
    <template v-if="selected">
     <p class="nfq-reconcile-note">
      {{therapyLabel(selected.therapy)}} · {{typeLabel(selected.context)}}.
      <strong>Unresolved source comparison</strong> — not a verified biological contradiction.
     </p>
     <div class="nfq-reconcile-pair" data-testid="nfq-source-comparison-pair">
      <section v-for="(source,i) in [selected.first,selected.second]" :key="source.claimId">
       <strong>Reviewed source {{i+1}}</strong>
       <p>{{source.sourceTitle}}</p>
       <a :href="source.sourceUrl" target="_blank" rel="noopener noreferrer">
        Open original publication</a>
       <dl>
        <div><dt>Claim / revision</dt><dd>{{source.claimId.slice(0,8)}} · {{source.revision}}</dd></div>
        <div><dt>Study family</dt><dd>{{source.studyFamilyId}}</dd></div>
        <div><dt>Registry</dt><dd>{{source.studyRegistration||'Not recorded'}}</dd></div>
        <div><dt>Finding as reported</dt><dd>{{typeLabel(source.finding)}}</dd></div>
        <div><dt>Genotype scope</dt><dd>{{source.scope}} {{source.genotypePair?.join(' / ')||''}}</dd></div>
        <div><dt>Study method</dt><dd>{{source.method}}</dd></div>
        <div><dt>Endpoint</dt><dd>{{source.endpoint}}</dd></div>
        <div><dt>Model · timepoint</dt><dd>{{source.model}} · {{source.timepoint}}</dd></div>
        <div><dt>Analysis unit</dt><dd>{{source.sampling}}</dd></div>
        <div><dt>Exact citation</dt><dd>{{source.originalLocator}}</dd></div>
       </dl>
       <details>
        <summary>Source rationale and independent review evidence</summary>
        <p>{{source.interpretation}}</p>
        <p>{{source.reviewSeals.length}} distinct review attestations recorded</p>
       </details>
      </section>
     </div>
     <section class="nfq-reconcile-questions">
      <strong>Questions requiring source-level reconciliation</strong>
      <ul><li v-for="item in selected.contextQuestions" :key="item">{{item}}</li></ul>
     </section>
     <form class="nfq-reconcile-form" data-testid="nfq-reconciliation-note-form"
      @submit.prevent="addNote">
      <strong>Prepare a source-specific research question</strong>
      <p class="nfq-reconcile-note">This is an unreviewed, local working note.
       Saving it does not resolve the source discrepancy or change approved evidence.</p>
      <label>What needs independent scientific investigation?
       <select v-model="questionKind">
        <option value="needs-additional-evidence">Additional source evidence</option>
        <option value="study-overlap">Potential overlapping studies</option>
        <option value="endpoint-or-assay">Assay, endpoint or comparator</option>
        <option value="genotype-or-population">Genotype or source population</option>
        <option value="source-interpretation">Interpretation of source finding</option>
       </select>
      </label>
      <label>Precise research question
       <textarea v-model="question" rows="2" minlength="30" maxlength="1000"
        placeholder="Specify exactly what the two original reports leave unresolved" required />
      </label>
      <label>Source-specific explanation and differences
       <textarea v-model="context" rows="3" minlength="30" maxlength="1200"
        placeholder="Cite page, table, assay conditions, population, timepoint and limitations" required />
      </label>
      <label>Next verifiable research action
       <textarea v-model="followUp" rows="2" minlength="20" maxlength="800"
        placeholder="Describe which publication data or assay must be checked" required />
      </label>
      <button type="submit" :disabled="drafts.length>=100">Add unreviewed local question</button>
     </form>
    </template>
   </template>
   <section v-if="drafts.length" class="nfq-reconcile-notebook" data-testid="nfq-reconciliation-notebook">
    <header class="nfq-reconcile-head">
     <div>
      <strong>Unreviewed local research notebook · {{drafts.length}} question{{drafts.length===1?'':'s'}}</strong>
      <p>Only available in this browser session; export before leaving</p>
     </div>
     <button type="button" @click="exportNotes">Export research questions (JSON)</button>
    </header>
    <article v-for="(note,i) in drafts" :key="i">
     <strong>{{typeLabel(note.questionKind)}} · {{note.sourceClaims[0].studyFamilyId}} / {{note.sourceClaims[1].studyFamilyId}}</strong>
     <p>{{note.question}}</p>
     <p class="nfq-reconcile-note">{{note.followUp}}</p>
     <button type="button" @click="removeNote(i)">Discard question</button>
    </article>
   </section>
   <p v-if="notice" class="nfq-reconcile-note" role="status">{{notice}}</p>
  </div>
 </section>
</template>

<style scoped>
.nfq-reconcile{border-top:1px solid var(--border,#dfe6ee);padding:12px 0;color:var(--text,#243d5b);font-size:11px}
.nfq-reconcile-head{display:flex;justify-content:space-between;align-items:start;gap:10px 16px;flex-wrap:wrap}
.nfq-reconcile-head strong,.nfq-reconcile-questions strong,.nfq-reconcile-form>strong{font-size:12px;font-weight:650}
.nfq-reconcile-head p,.nfq-reconcile-note{font-size:11px;color:var(--text-muted,#73859b);line-height:1.55;margin:5px 0}
.nfq-reconcile button{background:transparent;border:1px solid var(--border,#c5d4e3);border-radius:5px;padding:6px 9px;font:inherit;font-size:11px;color:inherit;cursor:pointer}
.nfq-reconcile button:disabled{opacity:.45;cursor:not-allowed}
.nfq-reconcile button:focus-visible,.nfq-reconcile a:focus-visible,.nfq-reconcile select:focus-visible,
.nfq-reconcile textarea:focus-visible{outline:2px solid #3876c5;outline-offset:2px}
.nfq-reconcile-body{padding-top:8px}
.nfq-reconcile-summary{display:flex;flex-wrap:wrap;gap:8px 16px;margin:9px 0;font-size:11px;color:var(--text-muted,#73859b)}
.nfq-reconcile-filters{display:flex;flex-wrap:wrap;gap:10px 16px;padding:8px 0}
.nfq-reconcile-filters label,.nfq-reconcile-form label{display:grid;gap:5px;min-width:0}
.nfq-reconcile-filters select,.nfq-reconcile-form select,.nfq-reconcile-form textarea{font:inherit;font-size:11px;min-width:0;max-width:100%;box-sizing:border-box;padding:7px 8px;border:1px solid var(--border,#c5d4e3);border-radius:5px;background:var(--surface,#fff);color:inherit}
.nfq-reconcile-filters label:last-child{flex:1 1 340px}
.nfq-reconcile-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin:10px 0 14px}
.nfq-reconcile-pair section{border-top:1px solid var(--border,#dfe6ee);padding:10px 0;min-width:0}
.nfq-reconcile-pair section>strong{font-size:11px}
.nfq-reconcile-pair a{font-size:11px;color:var(--link,#2869a9)}
.nfq-reconcile-pair p,.nfq-reconcile-pair details{line-height:1.5;margin:5px 0}
.nfq-reconcile-pair dl{display:grid;gap:7px;margin:10px 0}
.nfq-reconcile-pair dl>div{display:grid;grid-template-columns:minmax(110px,38%) minmax(0,1fr);gap:8px}
.nfq-reconcile-pair dt{color:var(--text-muted,#73859b)}
.nfq-reconcile-pair dd{margin:0;overflow-wrap:anywhere}
.nfq-reconcile-questions{padding:8px 0;border-top:1px solid var(--border,#dfe6ee)}
.nfq-reconcile-questions ul{padding-left:18px;line-height:1.6}
.nfq-reconcile-form{display:grid;gap:10px;max-width:780px;border-top:1px solid var(--border,#dfe6ee);padding:13px 0}
.nfq-reconcile-form button{justify-self:start}
.nfq-reconcile-notebook{border-top:1px solid var(--border,#dfe6ee);margin-top:8px;padding:12px 0}
.nfq-reconcile-notebook article{border-top:1px solid var(--border,#dfe6ee);padding:9px 0}
.nfq-reconcile-notebook article p{line-height:1.5}
@media(max-width:650px){.nfq-reconcile-pair{grid-template-columns:1fr}}
</style>

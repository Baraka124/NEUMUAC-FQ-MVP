<script setup lang="ts">
import {computed,ref} from 'vue';
import {RouterLink} from 'vue-router';
import {evidenceReferences,evidenceVariantCount,EVIDENCE_SNAPSHOT_DATE} from '../services/publicEvidence';
const term=ref('');
const rows=computed(()=>{const q=term.value.trim().toLocaleLowerCase();return q?evidenceReferences().filter(r=>[r.title,r.source,r.type,r.journal||'',r.pmid||'',r.variantId].some(v=>v.toLocaleLowerCase().includes(q))):evidenceReferences()});
const visible=ref(30);
const paged=computed(()=>rows.value.slice(0,visible.value));
function reveal(){visible.value+=30}
</script>
<template>
 <div class="page evidence-page">
  <div class="eyebrow">CFTR RESEARCH / SOURCES</div>
  <h1>Evidence & provenance</h1>
  <p class="intro">Explore existing links to scientific resources recorded in NeumuacFQ. These are references, not independently validated interpretations or evidence grades.</p>
  <section class="evidence-overview" aria-label="Evidence coverage">
   <div><strong>{{evidenceReferences().length}}</strong><span>Recorded references</span></div>
   <div><strong>{{evidenceVariantCount}}</strong><span>Variants with references</span></div>
   <div><strong>{{EVIDENCE_SNAPSHOT_DATE}}</strong><span>Source snapshot</span></div>
  </section>
  <div class="evidence-search-head">
   <label for="evidence-search">Find a source or reference</label>
   <input id="evidence-search" v-model="term" type="search" placeholder="Title, source, PMID or variant ID" @input="visible=30"/>
  </div>
  <p class="evidence-results-count" role="status">{{rows.length}} matching references</p>
  <p v-if="!rows.length" class="empty-result">No recorded references match this search.</p>
  <div v-else class="evidence-register" aria-label="Recorded citations">
   <article v-for="item in paged" :key="item.id" class="evidence-row">
    <div class="evidence-row-meta"><span>{{item.source}}</span><span v-if="item.year">{{item.year}} (recorded)</span></div>
    <h2><a :href="item.url" target="_blank" rel="noopener noreferrer">{{item.title}} <span aria-hidden="true">↗</span></a></h2>
    <div class="evidence-row-foot"><RouterLink :to="'/variants/'+item.variantId">Variant record #{{item.variantId}}</RouterLink><span v-if="item.journal">{{item.journal}}</span><span v-if="item.pmid">PMID {{item.pmid}}</span></div>
   </article>
   <button v-if="paged.length<rows.length" class="evidence-more" type="button" @click="reveal">Show more references</button>
  </div>
  <p class="history-disclaimer">Reference titles, links and dates are retained as entered in the source database. Publication dates and source claims have not been independently checked. Other evidence datasets and reviewer histories are not included in this public view.</p>
 </div>
</template>
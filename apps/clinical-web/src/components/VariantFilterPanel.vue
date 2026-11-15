<script setup lang="ts">
import {computed} from 'vue';
import ContextHelp from './ContextHelp.vue';

const classFilter=defineModel<string>('classFilter',{required:true});
const subtypeFilter=defineModel<string>('subtypeFilter',{required:true});
const responseFilter=defineModel<string>('responseFilter',{required:true});
const sort=defineModel<string>('sort',{required:true});
const searchMode=defineModel<string>('searchMode',{required:true});
const emit=defineEmits<{close:[];reset:[]}>();
const changed=computed(()=>Number(classFilter.value!=='all')+
 Number(subtypeFilter.value!=='all')+Number(responseFilter.value!=='all')+
 Number(sort.value!=='name-asc')+Number(searchMode.value!=='contains'));
</script>

<template>
 <section id="variant-filter-panel" class="variant-filter-panel" data-testid="nfq-guided-filters"
   aria-label="Search preferences" @keydown.esc.stop="emit('close')">
  <header class="variant-filter-panel-head">
   <div>
    <span class="variant-filter-panel-kicker">RESEARCH DISCOVERY</span>
    <h3 id="variant-filter-title" tabindex="-1">Refine results</h3>
    <p class="nfq-filter-guidance">Begin with class or response, then refine how matches are ordered. Results update as you select.</p>
   </div>
   <button class="variant-filter-close" type="button" aria-label="Close search preferences" @click="emit('close')">
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
   </button>
  </header>
  <div class="variant-filter-panel-fields">
   <section class="nfq-filter-group" aria-label="Biological context">
    <h4>Biological context</h4>
    <div class="nfq-filter-grid">
     <div class="nfq-filter-field">
      <label for="class-filter">Functional class</label>
      <select id="class-filter" v-model="classFilter">
       <option value="all">All classes</option>
       <option v-for="item in ['I','II','III','IV','V','VI']" :key="item" :value="item">Class {{item}}</option>
       <option value="unclassified">Unclassified in database</option>
      </select>
     </div>
     <div class="nfq-filter-field">
      <label for="subtype-filter">Class subtype</label>
      <select id="subtype-filter" v-model="subtypeFilter">
       <option value="all">All recorded subtypes</option>
       <option value="exceptional">Exceptional</option>
       <option value="true">True Class I</option>
       <option value="presumed">Presumed</option>
       <option value="atypical">Atypical</option>
       <option value="standard">Standard</option>
       <option value="unclassified">Subtype not recorded</option>
      </select>
     </div>
    </div>
   </section>
   <section class="nfq-filter-group" aria-label="Recorded therapy response">
    <div class="nfq-filter-group-title">
     <h4>Recorded response</h4>
     <ContextHelp label="Why the response filter lists two therapies" title="Separate variant and genotype evidence">
      <p>ETI and Alyftrek have independent recorded variant response fields. They are not inferred from functional class or from one another.</p>
      <p>Kalydeco, Symkevi and Orkambi are compared through genotype research rules; they do not have individual variant-response fields here. All five treatments remain available in therapy comparison.</p>
     </ContextHelp>
    </div>
    <div class="nfq-filter-field">
     <label for="response-filter">Recorded variant response</label>
     <select id="response-filter" v-model="responseFilter">
      <option value="all">All recorded results</option>
      <optgroup label="ETI · Kaftrio / Trikafta">
       <option value="eti-responsive">Recorded responsive</option>
       <option value="eti-non-responsive">Recorded non-responsive</option>
      </optgroup>
      <optgroup label="Alyftrek">
       <option value="alyftrek-responsive">Recorded responsive</option>
       <option value="alyftrek-non-responsive">Recorded non-responsive</option>
      </optgroup>
     </select>
    </div>
   </section>
   <section class="nfq-filter-group" aria-label="Find and organize recorded records">
    <h4>Find &amp; organize</h4>
    <div class="nfq-filter-grid">
     <div class="nfq-filter-field">
      <label for="search-mode">Match mode</label>
      <select id="search-mode" v-model="searchMode">
       <option value="contains">Contains name, HGVS or alias</option>
       <option value="exact-name">Exact recorded name or notation</option>
      </select>
     </div>
     <div class="nfq-filter-field">
      <label for="variant-sort">Sort results</label>
      <select id="variant-sort" v-model="sort">
       <option value="name-asc">Name A–Z</option>
       <option value="name-desc">Name Z–A</option>
       <option value="recent-record">Record ID · newest first</option>
       <option value="fewest-validations">Fewest recorded validations</option>
       <option value="most-validations">Most recorded validations</option>
      </select>
     </div>
    </div>
   </section>
  </div>
  <footer class="variant-filter-panel-foot">
   <span class="nfq-filter-count" role="status" data-testid="nfq-filter-count">{{changed?changed+' preferences changed':'All default preferences'}}</span>
   <div class="nfq-filter-foot-actions">
    <button type="button" class="variant-filter-reset" @click="emit('reset')">Reset</button>
    <button type="button" class="variant-filter-done" @click="emit('close')">View results</button>
   </div>
  </footer>
 </section>
</template>

<style scoped>
/* 14H153: compact guided research preferences. Native v-model updates remain
   immediate; "View results" only closes the panel, not a staged apply. */
.variant-filter-panel{
 position:absolute;top:calc(100% + 8px);left:0;z-index:45;
 width:min(540px,calc(100vw - 44px));max-width:calc(100vw - 44px);
 max-height:min(560px,calc(100dvh - 128px));
 display:flex;flex-direction:column;min-width:0;overflow:hidden;
 background:#fff;border:1px solid #cfdaea;border-radius:10px;
 box-shadow:0 16px 42px rgba(18,44,83,.16);color:#172c48;
}
.variant-filter-panel-head{
 flex:0 0 auto;display:flex;align-items:start;justify-content:space-between;
 gap:12px;padding:16px 18px 12px;border-bottom:1px solid #edf1f6;
}
.variant-filter-panel-kicker{color:#526e96;font-size:10px;letter-spacing:.08em;font-weight:700}
.variant-filter-panel h3{font-size:18px;letter-spacing:-.03em;line-height:1.25;margin:4px 0;color:#182e4b}
.nfq-filter-guidance{font-size:11.5px;line-height:1.5;color:#586c86;max-width:47ch;margin:7px 0 0}
.variant-filter-close{
 flex:0 0 32px;display:grid;place-items:center;width:32px;height:32px;
 padding:0;border:1px solid #d7e1ed;border-radius:6px;background:transparent;
 color:#42658f;cursor:pointer;box-shadow:none
}
.variant-filter-panel-fields{
 display:grid;gap:13px;overflow-y:auto;overscroll-behavior:contain;
 scrollbar-width:thin;min-height:0;padding:13px 18px 17px;
}
.nfq-filter-group{display:grid;gap:9px;min-width:0}
.nfq-filter-group+.nfq-filter-group{border-top:1px solid #e8eef5;padding-top:12px}
.nfq-filter-group-title{display:flex;align-items:center;justify-content:space-between;gap:9px}
.nfq-filter-group h4{margin:0;color:#2b537f;font-size:11px;letter-spacing:.015em;font-weight:700}
.nfq-filter-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.nfq-filter-field{min-width:0;display:grid;gap:6px}
.nfq-filter-field label{font-size:11.3px;line-height:1.4;color:#3c5575;font-weight:620}
.nfq-filter-field select{
 width:100%;min-width:0;min-height:39px;height:39px;
 border:1px solid #cbd8e9;border-radius:6px;background:#fff;
 padding:7px 27px 7px 9px;color:#1b3556;font:inherit;font-size:12px;box-shadow:none
}
.nfq-filter-field select:hover{border-color:#89a9d8}
.variant-filter-panel-foot{
 flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:7px 12px;
 padding:11px 18px;border-top:1px solid #e4ebf4;background:#fbfcfe;
}
.nfq-filter-count{font-size:11px;color:#617995;line-height:1.35}
.nfq-filter-foot-actions{display:flex;align-items:center;gap:7px;flex:none}
.nfq-filter-foot-actions button{min-height:34px;padding:6px 11px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:610;border-radius:6px}
.variant-filter-reset{border:1px solid transparent;background:transparent;color:#34628e}
.variant-filter-done{border:1px solid #c2d3e8;background:transparent;color:#265fa3}
.variant-filter-panel button:hover{border-color:#95b4dc;background:rgba(41,121,255,.045)}
.variant-filter-panel button:focus-visible,.nfq-filter-field select:focus-visible{
 outline:2px solid #377bd0;outline-offset:2px
}
#variant-filter-title:focus{outline:none}
@media(min-width:611px) and (max-width:1024px){
 /* The worklist sits next to the main research area on narrow desktops. */
 .variant-filter-panel{width:min(520px,calc(100vw - 340px))}
}
@media(max-width:610px){
 .variant-filter-panel{width:min(350px,calc(100vw - 38px));max-height:min(590px,calc(100dvh - 110px))}
 .variant-filter-panel-head{padding:13px 13px 10px}
 .variant-filter-panel-fields{padding:12px 13px 14px;gap:12px}
 .nfq-filter-grid{grid-template-columns:minmax(0,1fr)}
 .variant-filter-panel-foot{padding:10px 13px}
 .nfq-filter-guidance{font-size:11px}
}
@media(prefers-reduced-motion:reduce){.variant-filter-panel{scroll-behavior:auto}}
</style>

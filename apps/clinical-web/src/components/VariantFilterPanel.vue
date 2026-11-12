<script setup lang="ts">
const classFilter=defineModel<string>('classFilter',{required:true});
const subtypeFilter=defineModel<string>('subtypeFilter',{required:true});
const responseFilter=defineModel<string>('responseFilter',{required:true});
const sort=defineModel<string>('sort',{required:true});
const searchMode=defineModel<string>('searchMode',{required:true});
const emit=defineEmits<{close:[];reset:[]}>();
</script>
<template>
 <section id="variant-filter-panel" class="variant-filter-panel" aria-label="Search preferences" @keydown.esc.stop="emit('close')">
  <header class="variant-filter-panel-head">
   <div>
    <span class="variant-filter-panel-kicker">WORKLIST PREFERENCES</span>
    <h3>Refine results</h3>
   </div>
   <button class="variant-filter-close" type="button" aria-label="Close search preferences" @click="emit('close')">
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
   </button>
  </header>
  <div class="variant-filter-panel-fields">
   <label for="class-filter">Functional class</label>
   <select id="class-filter" v-model="classFilter">
    <option value="all">All classes</option>
    <option v-for="item in ['I','II','III','IV','V','VI']" :key="item" :value="item">Class {{item}}</option>
    <option value="unclassified">Unclassified in database</option>
   </select>
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
   <p class="nfq-response-filter-note">Kalydeco, Symkevi and Orkambi have genotype research rules, not individual response fields. Their results appear in the therapy comparison.</p>
   <label for="variant-sort">Sort results</label>
   <select id="variant-sort" v-model="sort">
    <option value="name-asc">Name A–Z</option>
    <option value="name-desc">Name Z–A</option>
    <option value="recent-record">Record ID · newest first</option>
    <option value="fewest-validations">Fewest recorded validations</option>
    <option value="most-validations">Most recorded validations</option>
   </select>
   <label for="search-mode">Match mode</label>
   <select id="search-mode" v-model="searchMode">
    <option value="contains">Contains name, HGVS or alias</option>
    <option value="exact-name">Exact recorded name or notation</option>
   </select>
  </div>
  <footer class="variant-filter-panel-foot">
   <button type="button" class="variant-filter-reset" @click="emit('reset')">Reset preferences</button>
   <button type="button" class="variant-filter-done" @click="emit('close')">Done</button>
  </footer>
 </section>
</template>
<style scoped>
/* 14H137C3: full original filter functionality in a smaller, calmer surface. */
.variant-filter-panel{
 position:absolute;top:calc(100% + 7px);left:0;z-index:40;
 width:min(316px,calc(100vw - 42px));
 max-height:min(490px,calc(100dvh - 122px));
 overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;
 background:#fff;border:1px solid #ccd9e9;border-radius:8px;
 box-shadow:0 9px 24px rgba(18,44,83,.12);
 padding:14px 15px 12px;color:#162540;
}
.variant-filter-panel-head{
 display:flex;align-items:flex-start;justify-content:space-between;
 gap:9px;margin-bottom:10px;
}
.variant-filter-panel-kicker{
 font-size:10px;font-weight:640;letter-spacing:.055em;color:#6b7d96;
}
.variant-filter-panel h3{
 font-size:16px;line-height:1.25;letter-spacing:-.025em;margin:4px 0 0;
 color:#162540;
}
.variant-filter-close{
 display:grid;place-items:center;flex:0 0 40px;
 width:40px;height:40px;min-height:40px;
 background:transparent;border:1px solid #d2deec;
 border-radius:6px;color:#4773a8;cursor:pointer;box-shadow:none;
}
.variant-filter-panel-fields{display:grid;gap:5px}
.variant-filter-panel-fields label{
 font-size:11.5px;font-weight:630;color:#435976;margin-top:5px;
}
.variant-filter-panel-fields label:first-child{margin-top:0}
.variant-filter-panel-fields select{
 width:100%;min-width:0;min-height:40px;height:40px;
 border:1px solid #c6d5e7;border-radius:6px;
 background:#fff;color:#162540;
 padding:6px 10px;font:inherit;font-size:12.5px;
 box-shadow:none;
}
.variant-filter-panel-fields select:hover{border-color:#9bb9e2}
.variant-filter-panel-fields select:focus-visible,
.variant-filter-panel button:focus-visible{
 outline:2px solid #2979ff;outline-offset:2px;
}
.variant-filter-panel-foot{
 display:flex;align-items:center;justify-content:space-between;
 gap:9px;border-top:1px solid #e2e9f2;margin-top:12px;padding-top:10px;
}
.variant-filter-panel-foot button{
 min-height:40px;padding:7px 10px;
 cursor:pointer;font:inherit;font-size:12px;font-weight:590;
}
.variant-filter-reset{
 border:1px solid transparent;border-radius:6px;
 background:transparent;color:#3d689e;
 text-decoration:none;text-underline-offset:3px;
}
.variant-filter-done{
 border:1px solid #bdcfe5;border-radius:6px;
 background:transparent;color:#285caa;
}
.variant-filter-close:hover,.variant-filter-reset:hover,.variant-filter-done:hover{
 background:rgba(41,121,255,.06);border-color:#9ebce8;
}
.nfq-response-filter-note{
 margin:2px 0 4px;font-size:11px;line-height:1.5;color:#697d93;
}
@media(max-width:420px){
 .variant-filter-panel{width:min(302px,calc(100vw - 38px));padding:12px}
}
</style>

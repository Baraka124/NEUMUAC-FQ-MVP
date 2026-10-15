<script setup lang="ts">
const classFilter=defineModel<string>('classFilter',{required:true});
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
.variant-filter-panel{position:absolute;top:calc(100% + 8px);left:0;z-index:40;width:min(328px,calc(100vw - 54px));max-height:min(480px,calc(100dvh - 155px));overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;background:#fff;border:1px solid #cdded2;border-radius:10px;box-shadow:0 15px 36px #1c443321;padding:18px 18px 14px;color:#234638}
.variant-filter-panel-head{display:flex;align-items:start;justify-content:space-between;gap:12px;margin-bottom:16px}
.variant-filter-panel-kicker{font-size:10px;font-weight:700;letter-spacing:.09em;color:#6c8976}
.variant-filter-panel h3{font-size:17px;line-height:1.3;letter-spacing:-.025em;margin:4px 0 0}
.variant-filter-close{display:grid;place-items:center;width:31px;height:31px;flex:none;background:#f8faf8;border:1px solid #dbe8df;border-radius:7px;color:#52715d;cursor:pointer}
.variant-filter-panel-fields{display:grid;gap:7px}
.variant-filter-panel-fields label{font-size:12px;font-weight:660;color:#3c6350;margin-top:7px}
.variant-filter-panel-fields label:first-child{margin-top:0}
.variant-filter-panel-fields select{width:100%;min-width:0;min-height:43px;border:1px solid #c9dbcf;border-radius:7px;background:#fcfdfc;color:#264435;padding:8px 11px;font:inherit;font-size:13px}
.variant-filter-panel-fields select:focus-visible,.variant-filter-panel button:focus-visible{outline:3px solid #218b6a;outline-offset:2px}
.variant-filter-panel-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid #e5ede7;margin-top:18px;padding-top:13px}
.variant-filter-panel-foot button{min-height:36px;cursor:pointer;font:inherit;font-size:12px;font-weight:660}
.variant-filter-reset{border:0;background:transparent;color:#3c7154;padding:7px 0;text-decoration:underline;text-underline-offset:3px}
.variant-filter-done{border:1px solid #a9cdb4;border-radius:6px;background:#edf7f0;color:#205f41;padding:7px 14px}
@media(max-width:420px){.variant-filter-panel{width:min(300px,calc(100vw - 44px));padding:14px}}
</style>

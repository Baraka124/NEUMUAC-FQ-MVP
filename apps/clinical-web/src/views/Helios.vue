<script setup lang="ts">
import {ref} from 'vue';
const showContext=ref(false);
const areas=[
 {title:'Review queue',detail:'Proposals, priority and ownership',state:'Awaiting authorized connection'},
 {title:'Evidence assessment',detail:'Proposed change and recorded supporting sources',state:'Scientific review pending'},
 {title:'Decision history',detail:'Attributed decisions and audit chronology',state:'Restricted until access review'}
] as const;
</script>

<template>
 <div class="page helios-workspace">
  <div class="helios-head">
   <div>
    <div class="eyebrow">SCIENTIFIC CURATION</div>
    <h1>Helios</h1>
    <p class="helios-subtitle">Research review</p>
   </div>
   <button type="button" class="helios-info" aria-label="About Helios and current access limitations"
    aria-controls="helios-context" :aria-expanded="showContext" @click="showContext=!showContext">i</button>
  </div>
  <div v-if="showContext" id="helios-context" class="helios-context">
   Helios is being rebuilt from the original review workflows. Proposals, approval, claims and audit
   history remain unavailable here until server-side reviewer authorization and scientific governance
   have been verified. This view does not display synthetic review records.
  </div>
  <div class="helios-current" role="status">
   <span class="helios-status-dot" aria-hidden="true"></span>
   <span>Read-only preparation</span>
   <span class="helios-status-sep" aria-hidden="true">·</span>
   <span>Review records not connected</span>
  </div>
  <section class="helios-panel" aria-labelledby="helios-panel-title">
   <div class="helios-panel-heading">
    <h2 id="helios-panel-title">Review workspace</h2>
    <span class="helios-caption">No live decisions available</span>
   </div>
   <div class="helios-worklist">
    <div v-for="area in areas" :key="area.title" class="helios-workitem">
     <div class="helios-workitem-copy"><h3>{{area.title}}</h3><p>{{area.detail}}</p></div>
     <span class="helios-workitem-state">{{area.state}}</span>
    </div>
   </div>
  </section>
  <p class="helios-footnote">The existing research catalog remains available through <RouterLink to="/variants">Variants</RouterLink> and <RouterLink to="/evidence">Evidence</RouterLink>.</p>
 </div>
</template>

<style scoped>
.helios-workspace{max-width:1060px;margin:0 auto;padding-bottom:4rem}
.helios-head{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1.35rem}
.helios-head h1{margin:.26rem 0 .15rem;font-size:clamp(1.65rem,2.8vw,2.2rem);font-weight:600;letter-spacing:-.035em;line-height:1.2}
.helios-subtitle{margin:0;color:var(--text-muted,#687381);font-size:.92rem}
.helios-info{width:31px;height:31px;flex:none;border:1px solid var(--border,#dce2e7);background:transparent;border-radius:50%;color:inherit;font:600 .8rem inherit;cursor:pointer}
.helios-info:focus-visible{outline:2px solid currentColor;outline-offset:3px}
.helios-context{border:1px solid var(--border,#dce2e7);border-radius:12px;padding:1rem 1.1rem;font-size:.85rem;line-height:1.65;max-width:74ch;margin-bottom:1rem}
.helios-current{display:flex;align-items:center;flex-wrap:wrap;gap:.5rem;color:var(--text-muted,#687381);font-size:.81rem;margin-bottom:1.35rem}
.helios-status-dot{width:7px;height:7px;border-radius:50%;background:#8996a3;flex:none}
.helios-status-sep{opacity:.6}
.helios-panel{background:var(--surface,#fff);border:1px solid var(--border,#dce2e7);border-radius:14px;overflow:hidden}
.helios-panel-heading{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:.5rem;padding:1.1rem 1.25rem;border-bottom:1px solid var(--border,#dce2e7)}
.helios-panel-heading h2{font-size:1rem;font-weight:600;letter-spacing:-.015em;margin:0}
.helios-caption{font-size:.75rem;color:var(--text-muted,#687381)}
.helios-workitem{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1.1rem 1.25rem}
.helios-workitem+.helios-workitem{border-top:1px solid var(--border,#dce2e7)}
.helios-workitem h3{font-size:.9rem;font-weight:600;margin:0 0 .24rem}
.helios-workitem p{font-size:.78rem;color:var(--text-muted,#687381);margin:0;line-height:1.55}
.helios-workitem-state{color:var(--text-muted,#687381);font-size:.75rem;text-align:right;max-width:190px}
.helios-footnote{margin:1.2rem 0 0;font-size:.8rem;line-height:1.6;color:var(--text-muted,#687381)}
.helios-footnote a{color:inherit;text-underline-offset:3px}
@media(max-width:620px){.helios-panel-heading,.helios-workitem{padding:1rem}.helios-workitem{align-items:flex-start;flex-direction:column;gap:.4rem}.helios-workitem-state{text-align:left;max-width:none}.helios-workspace{max-width:100%}}
</style>
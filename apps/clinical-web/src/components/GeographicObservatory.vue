<script setup lang="ts">
import {computed,ref} from 'vue';
import {SPAIN_REGIONS} from '../domain/spainRegionalBoundaries';
type Lens='geography'|'institutions'|'gaps';
type Scope='spain'|'international';
const lens=ref<Lens>('geography'),scope=ref<Scope>('spain'),selected=ref<string|null>(null),period=ref('historical'),metric=ref('volume'),listMode=ref(false);
const selectedRegion=computed(()=>SPAIN_REGIONS.find(r=>r.code===selected.value)||null);
function choose(code:string){selected.value=selected.value===code?null:code;}
function setScope(next:Scope){scope.value=next;selected.value=null;}
</script>
<template>
 <section class="geo-observatory" aria-label="Geographic research intelligence">
  <header class="geo-head">
   <div><p class="geo-kicker">RESEARCH INTELLIGENCE · GEOGRAPHY</p><h2>Geographic search activity</h2><p>Regional research activity and catalog coverage. Personal locations are not displayed.</p></div>
   <span class="geo-access-status">Aggregate data pending verification</span>
  </header>
  <div class="geo-toolbar">
   <div class="geo-tabs" role="group" aria-label="Analysis mode">
    <button v-for="item in [{id:'geography',label:'Geography'},{id:'institutions',label:'Institutions'},{id:'gaps',label:'Research gaps'}] as const" :key="item.id" type="button" :aria-pressed="lens===item.id" @click="lens=item.id">{{item.label}}</button>
   </div>
   <label class="geo-select-label">Scope <select :value="scope" @change="setScope(($event.target as HTMLSelectElement).value as Scope)"><option value="spain">Spain</option><option value="international">International</option></select></label>
  </div>
  <div class="geo-context">
   <span>{{lens==='geography'?'Search-event geography':lens==='institutions'?'Verified research affiliation':'Unmatched search analysis'}}</span>
   <span>Historical register · March–June 2026 · Includes tests</span>
  </div>
  <div class="geo-layout">
   <div class="geo-map-surface">
    <div class="geo-map-heading"><span>{{scope==='spain'?'Spain · Autonomous communities':'International overview'}}</span><span>Regional boundaries · No individual pins</span></div>
    <div v-if="scope==='spain'" class="geo-map-inner">
     <svg viewBox="0 0 690 560" role="img" aria-label="Selectable map of the autonomous communities and cities of Spain; boundaries only, no activity values" preserveAspectRatio="xMidYMid meet">
      <title>Spain regional reference map</title>
      <rect x="0" y="0" width="690" height="560" fill="#f8faf8"/>
      <g fill="#e7eee8" stroke="#a5b9aa" stroke-width=".9" stroke-linejoin="round">
       <path v-for="region in SPAIN_REGIONS" :key="region.code" :d="region.path" class="geo-region" :class="{'geo-region-selected':selected===region.code}" role="button" tabindex="0" :aria-label="region.name+' · regional boundary, activity unavailable'" @click="choose(region.code)" @keydown.enter.prevent="choose(region.code)" @keydown.space.prevent="choose(region.code)" />
      </g>
      <rect x="459" y="388" width="204" height="123" rx="7" class="geo-inset-outline"/>
      <text x="476" y="406" class="geo-map-label">CANARY ISLANDS · INSET</text>
      <text x="236" y="410" class="geo-map-label">CEUTA</text><text x="353" y="470" class="geo-map-label">MELILLA</text>
      <text x="54" y="541" class="geo-map-caption">Boundaries for navigation only · Not shaded by search intensity</text>
     </svg>
    </div>
    <div v-else class="geo-international">
     <div class="geo-world-symbol"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="47" fill="none" stroke="currentColor" stroke-width="1.5"/><ellipse cx="60" cy="60" rx="22" ry="47" fill="none" stroke="currentColor"/><path d="M13 60h94M25 32h70M25 88h70" fill="none" stroke="currentColor"/></svg></div>
     <strong>International geographic aggregates</strong>
     <p>Country-level mapping will become available when approved, privacy-protected geographic data are connected.</p>
     <button type="button" @click="setScope('spain')">Return to Spain</button>
    </div>
    <footer class="geo-map-foot"><span><i class="geo-legend-shape"/> Boundaries only</span><span>Activity values unavailable</span></footer>
   </div>
   <aside class="geo-region-insight" aria-label="Selected geographic detail">
    <p class="geo-kicker">{{lens==='geography'?'REGIONAL ACTIVITY':lens==='institutions'?'INSTITUTIONAL CONTEXT':'RESEARCH GAP CONTEXT'}}</p>
    <h3>{{selectedRegion?.name|| (scope==='spain'?'Select a region':'International overview')}}</h3>
    <p v-if="selectedRegion">Region selected. Validated search counts and location confidence have not yet been connected.</p>
    <p v-else>Select a region on the map or from the list to inspect its source and coverage status.</p>
    <div class="geo-insight-line"><span>Search events</span><strong>Unavailable</strong></div>
    <div class="geo-insight-line"><span>Matches / misses</span><strong>Unavailable</strong></div>
    <div class="geo-insight-line"><span>Location confidence</span><strong>Not assessed</strong></div>
    <div class="geo-insight-note"><strong>Data interpretation</strong><p>An unmatched query is not evidence of a novel CFTR variant. Device geography and institutional affiliation are separate dimensions.</p></div>
   </aside>
  </div>
  <div class="geo-regions-section">
   <div class="geo-regions-heading"><div><h3>Regional index</h3><p>Accessible alternative to selecting regions on the map.</p></div><button type="button" :aria-expanded="listMode" @click="listMode=!listMode">{{listMode?'Hide region list':'Browse all regions'}}</button></div>
   <div v-if="listMode" class="geo-region-grid">
    <button v-for="region in SPAIN_REGIONS" :key="region.code" type="button" :aria-pressed="selected===region.code" @click="choose(region.code)">{{region.name}}<span>{{selected===region.code?'Selected':'→'}}</span></button>
   </div>
  </div>
  <p class="geo-safety-note">Data access has not passed the geographic privacy release gate. This map displays real administrative boundary shapes only—no actual search locations, hospital associations or fabricated hit/miss statistics. The existing Evidence Coverage view remains available separately.</p>
 </section>
</template>
<style scoped>
.geo-observatory{color:#203c34;min-width:0}
.geo-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin:0 0 22px}
.geo-kicker{font-size:10px;font-weight:760;letter-spacing:.105em;color:#658174;margin:0 0 7px}
.geo-head h2{font-size:clamp(23px,2.3vw,32px);margin:0 0 8px;letter-spacing:-.045em}
.geo-head p:not(.geo-kicker){font-size:13px;color:#6b8175;margin:0;line-height:1.6}
.geo-access-status{font-size:11px;color:#617e70;border:1px solid #d6e6db;border-radius:5px;padding:7px 10px;white-space:nowrap;background:#f7faf8}
.geo-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin:0 0 16px}
.geo-tabs{display:flex;gap:3px;border:1px solid #d9e6dd;border-radius:7px;background:#f8faf8;padding:3px;flex-wrap:wrap}
.geo-tabs button{border:0;border-radius:5px;background:transparent;padding:9px 13px;font-size:12px;font-weight:600;color:#6b8474}
.geo-tabs button[aria-pressed="true"]{background:#fff;color:#20553d;box-shadow:0 1px 5px #244a3615}
.geo-select-label{display:flex;align-items:center;gap:10px;font-size:12px;color:#647d70}
.geo-select-label select{min-height:38px;padding:7px 11px;border:1px solid #d1e0d5;border-radius:6px;color:#244e37;background:white}
.geo-context{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;border-bottom:1px solid #e1eae3;padding-bottom:12px;margin-bottom:16px;font-size:11px;color:#789083}
.geo-layout{display:grid;grid-template-columns:minmax(0,1.85fr) minmax(245px,1fr);gap:15px;align-items:stretch}
.geo-map-surface,.geo-region-insight{min-width:0;border:1px solid #dce8de;border-radius:9px;background:#fff;overflow:hidden}
.geo-map-heading{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:17px 19px 7px;font-size:12px;font-weight:700}
.geo-map-heading span:last-child{font-size:10px;color:#89a093;font-weight:500}
.geo-map-inner{padding:0 10px}
.geo-map-inner svg{display:block;width:100%;max-height:540px;aspect-ratio:690/560}
.geo-region{cursor:pointer;transition:fill .14s}
.geo-region:hover,.geo-region:focus{fill:#bfd6c6;stroke:#316d53;stroke-width:1.8;outline:none}
.geo-region-selected{fill:#9dc4ae;stroke:#276a4d;stroke-width:2}
.geo-inset-outline{fill:none;stroke:#d3e0d8;stroke-dasharray:3 4}
.geo-map-label{fill:#5d7b6b;font-size:10px;font-weight:700;letter-spacing:.07em}
.geo-map-caption{fill:#7e9788;font-size:10px}
.geo-map-foot{display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;border-top:1px solid #e8eee9;padding:12px 17px;color:#738b7b;font-size:11px}
.geo-legend-shape{display:inline-block;width:11px;height:11px;background:#e7eee8;border:1px solid #a5b9aa;border-radius:2px;margin-right:6px;vertical-align:-1px}
.geo-region-insight{padding:clamp(17px,2vw,25px)}
.geo-region-insight h3{font-size:clamp(19px,1.8vw,25px);line-height:1.25;letter-spacing:-.03em;margin:5px 0 10px}
.geo-region-insight>p:not(.geo-kicker){font-size:13px;color:#647f70;line-height:1.65;margin:0 0 24px}
.geo-insight-line{display:flex;justify-content:space-between;gap:13px;padding:12px 0;border-top:1px solid #e5ede7;font-size:12px}
.geo-insight-line span{color:#718b79}.geo-insight-line strong{font-size:12px;font-weight:650;text-align:right}
.geo-insight-note{margin-top:23px;background:#f5f9f5;padding:14px;border-radius:6px}
.geo-insight-note strong{font-size:12px}.geo-insight-note p{font-size:12px;line-height:1.65;color:#617968;margin:5px 0 0}
.geo-international{min-height:390px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:11px;text-align:center;padding:25px;color:#547465}
.geo-world-symbol{width:85px;height:85px;opacity:.45}.geo-world-symbol svg{width:100%;height:100%}
.geo-international strong{font-size:17px}.geo-international p{max-width:345px;font-size:13px;line-height:1.65}
.geo-international button{border:1px solid #c5d8cc;border-radius:6px;padding:8px 15px;background:white;color:#31664d;font-weight:650}
.geo-regions-section{margin-top:22px}
.geo-regions-heading{display:flex;justify-content:space-between;align-items:center;gap:12px}
.geo-regions-heading h3{font-size:16px;margin:0 0 5px}
.geo-regions-heading p{font-size:12px;color:#778d7e;margin:0}
.geo-regions-heading button{background:transparent;border:1px solid #d8e4dc;border-radius:6px;padding:9px 12px;font-size:12px;font-weight:650;color:#306d50}
.geo-region-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:14px}
.geo-region-grid button{display:flex;justify-content:space-between;gap:7px;text-align:left;background:#fff;border:1px solid #e1e9e2;border-radius:6px;min-height:42px;padding:10px;font-size:12px;color:#476652}
.geo-region-grid button[aria-pressed="true"]{background:#eaf4ec;border-color:#99beaa}
.geo-safety-note{font-size:11px;line-height:1.7;color:#728879;margin:21px 0 0;max-width:850px}
@media(max-width:1050px){.geo-layout{grid-template-columns:minmax(0,1fr)}.geo-map-inner svg{max-height:450px}.geo-region-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:620px){.geo-head{display:block}.geo-access-status{display:inline-block;margin-top:12px;white-space:normal}.geo-toolbar{align-items:stretch}.geo-tabs{width:100%;display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}.geo-tabs button{padding:9px 4px;font-size:11px}.geo-map-heading{padding:14px 12px 6px}.geo-map-inner{padding:0 4px}.geo-map-inner svg{max-height:360px}.geo-region-grid{grid-template-columns:minmax(0,1fr)}.geo-context{display:grid}}
@media(prefers-reduced-motion:reduce){.geo-region{transition:none}}
</style>

<script setup lang="ts">
import {computed,ref} from 'vue';
import {SPAIN_REGIONS} from '../domain/spainRegionalBoundaries';

type Scope='spain'|'international';
const scope=ref<Scope>('spain');
const selected=ref<string|null>(null);
const listMode=ref(false);
const detailPanel=ref<HTMLElement|null>(null);
const selectedRegion=computed(()=>SPAIN_REGIONS.find(region=>region.code===selected.value)||null);
const alphabeticalRegions=[...SPAIN_REGIONS].sort((a,b)=>a.name.localeCompare(b.name,'es'));
function choose(code:string){selected.value=code;}
function chooseFromPicker(code:string){selected.value=code||null;}
function clearSelection(){selected.value=null;}
function changeScope(value:Scope){scope.value=value;selected.value=null;listMode.value=false;}
function openSelectedDetail(){
 const panel=detailPanel.value;
 if(!panel||!selectedRegion.value)return;
 const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 panel.scrollIntoView({behavior:reduceMotion?'instant':'smooth',block:'start'});
 panel.focus({preventScroll:true});
}
</script>

<template>
 <section class="geo-observatory" aria-label="Geographic atlas">
  <div class="geo-toolbar" aria-label="Geographic research controls">
   <label class="geo-select-label" for="geo-scope">Scope
    <select id="geo-scope" :value="scope" @change="changeScope(($event.target as HTMLSelectElement).value as Scope)">
     <option value="spain">Spain</option><option value="international">International</option>
    </select>
   </label>
  </div>

  <div class="geo-layout">
   <section class="geo-map-surface" aria-label="Regional atlas">
    <div class="geo-map-heading">
     <div><strong>{{scope==='spain'?'Spain':'International overview'}}</strong><span>{{scope==='spain'?'17 communities · 2 autonomous cities':'Country-level data pending'}}</span></div>
     <label v-if="scope==='spain'" for="geo-region-picker" class="geo-region-picker">Choose a region
      <select id="geo-region-picker" :value="selected||''" @change="chooseFromPicker(($event.target as HTMLSelectElement).value)">
       <option value="">All Spain</option>
       <option v-for="region in alphabeticalRegions" :key="region.code" :value="region.code">{{region.name}}</option>
      </select>
     </label>
     <span v-else class="geo-map-hint">Country-level data unavailable</span>
    </div>
    <div v-if="selectedRegion" class="geo-current-selection"><span role="status">{{selectedRegion.name}} selected</span><button class="geo-selected-detail-link" type="button" @click="openSelectedDetail">View region details <span aria-hidden="true">→</span></button></div>
    <div v-if="scope==='spain'" class="geo-map-inner">
     <svg viewBox="0 0 690 525" role="group" aria-label="Selectable map of Spain, its autonomous communities and cities. Administrative boundaries only, without individual searches or activity statistics." preserveAspectRatio="xMidYMid meet">
      <title>Spain · autonomous communities and cities</title>
      <rect x="0" y="0" width="690" height="525" fill="#f9fbf9"/>
      <g fill="#e7eee8" stroke="#abc0ae" stroke-width="1.05" stroke-linejoin="round">
       <path v-for="region in SPAIN_REGIONS" :key="region.code" :d="region.path" class="geo-region"
         :class="{'geo-region-selected':selected===region.code}"
         role="button" tabindex="0" :aria-pressed="selected===region.code"
         :aria-label="region.name+' · region, activity unavailable'"
         aria-controls="geo-region-detail"
         @click="choose(region.code)" @keydown.enter.prevent="choose(region.code)" @keydown.space.prevent="choose(region.code)"><title>{{region.name}}</title></path>
      </g>
      <rect x="460" y="386" width="204" height="126" rx="6" class="geo-inset-outline" aria-hidden="true"/>
      <text x="477" y="405" class="geo-map-label">CANARIAS · INSET</text>
      <text x="228" y="412" class="geo-map-label geo-city-label">CEUTA</text>
      <text x="362" y="459" class="geo-map-label geo-city-label">MELILLA</text>
     </svg>
    </div>

    <div v-else class="geo-international">
     <svg viewBox="0 0 100 100" width="74" height="74" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
      <circle cx="50" cy="50" r="38"/><ellipse cx="50" cy="50" rx="18" ry="38"/><path d="M12 50h76M22 30h56M22 70h56"/>
     </svg>
     <strong>International overview</strong>
     <p>Country-level research aggregates are not available yet. This view will not infer individuals' locations.</p>
     <button type="button" @click="changeScope('spain')">Return to Spain</button>
    </div>
    <footer class="geo-map-foot">
     <span class="geo-legend"><span class="geo-legend-swatch" aria-hidden="true"></span>Regional boundaries</span>
     <span>Individual search locations are never shown</span>
    </footer>
   </section>

   <aside id="geo-region-detail" ref="detailPanel" tabindex="-1" class="geo-region-insight" aria-label="Selected geographic detail">
    <p class="geo-kicker">REGION</p>
    <div class="geo-insight-heading"><h3 aria-live="polite">{{selectedRegion?.name||(scope==='spain'?'Choose a region':'International overview')}}</h3><button v-if="selectedRegion" class="geo-clear-selection" type="button" @click="clearSelection">Clear selection</button></div>
    <p class="geo-insight-intro">{{selectedRegion?'Administrative boundary selected. No verified regional activity figures are available.':scope==='spain'?'Select a region on the map or by name.':'No verified country-level research aggregates are available.'}}</p>
    <div class="geo-insight-note" role="note">
     <strong>Data not published</strong>
     <p>Regional searches, matches and attribution are not verified. This map represents boundaries, not patients or institutions.</p>
    </div>
   </aside>
  </div>

  <details class="geo-about">
   <summary>About this atlas and its data</summary>
   <p>Geographic boundaries are a public reference. Professional affiliation, search activity and patient location are distinct concepts and are not inferred here.</p>
   <p>Historical records include tests. Regional search statistics are not published. The map does not represent patient locations, institution locations or clinical demand.</p>
  </details>
  <section v-if="scope==='spain'" class="geo-regions-section" aria-label="Spain regions">
   <div class="geo-regions-heading">
    <div><h3>Region index</h3><p>Find a community without navigating the map.</p></div>
    <button type="button" :aria-expanded="listMode" aria-controls="geo-region-list" @click="listMode=!listMode">{{listMode?'Hide region list':'Browse all regions'}} <span aria-hidden="true">{{listMode?'−':'+'}}</span></button>
   </div>
   <div v-if="listMode" id="geo-region-list" class="geo-region-grid">
    <button v-for="region in alphabeticalRegions" :key="region.code" type="button" :aria-pressed="selected===region.code" aria-controls="geo-region-detail" @click="choose(region.code)">
     <span>{{region.name}}</span><span aria-hidden="true">{{selected===region.code?'✓':'↗'}}</span>
    </button>
   </div>
  </section>
 </section>
</template>

<style scoped>
.geo-observatory{color:#233d32;min-width:0;container-type:inline-size}
.geo-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:18px}
.geo-head-copy{min-width:0;max-width:640px}
.geo-kicker{font-size:10px;font-weight:750;letter-spacing:.11em;color:#658575;margin:0 0 6px}
.geo-head h2{font-size:clamp(19px,2.15vw,27px);font-weight:680;letter-spacing:-.032em;line-height:1.2;margin:0 0 6px}
.geo-head-copy>p:last-child{font-size:13px;line-height:1.55;color:#6b8073;margin:0}
.geo-access-status{display:inline-flex;align-items:center;gap:8px;flex:0 0 auto;border:1px solid #dbe6dd;border-radius:5px;background:#f8faf8;padding:8px 10px;color:#577462;font-size:11px;line-height:1.35}
.geo-status-dot{width:6px;height:6px;border-radius:50%;background:#8daa96;flex:0 0 auto}
.geo-toolbar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:12px}
.geo-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:3px;border:1px solid #dae6dd;background:#f5f8f5;border-radius:7px;padding:3px;min-width:min(100%,360px)}
.geo-tabs button{appearance:none;border:0;border-radius:5px;min-height:40px;padding:7px 12px;background:transparent;color:#5b7464;font-size:12px;font-weight:625;white-space:nowrap}
.geo-tabs button[aria-pressed="true"]{background:#fff;color:#1e5c3e;box-shadow:0 1px 4px #214b3418}
.geo-tabs button:hover:not([aria-pressed="true"]){background:#eaf2eb}
.geo-select-label{display:flex;gap:9px;align-items:center;color:#657f6e;font-size:12px;font-weight:600}
.geo-select-label select{min-height:40px;padding:8px 30px 8px 12px;border:1px solid #cbdbce;border-radius:6px;background:#fff;color:#28553d;font-size:12px}
.geo-context{display:flex;justify-content:space-between;align-items:center;gap:8px 20px;flex-wrap:wrap;padding:0 0 12px;border-bottom:1px solid #e0eae3;margin:0 0 14px;font-size:11px;line-height:1.5;color:#738b79}
.geo-context span:first-child{color:#456b55}
.geo-layout{display:grid;grid-template-columns:minmax(0,2.05fr) minmax(250px,1fr);gap:14px;align-items:start}
.geo-map-surface,.geo-region-insight{min-width:0;border:1px solid #dbe7dd;border-radius:8px;background:#fff;overflow:hidden}
.geo-map-heading{display:flex;align-items:start;justify-content:space-between;gap:12px;padding:16px 17px 4px}
.geo-map-heading div{display:grid;gap:3px}.geo-map-heading strong{font-size:14px;font-weight:670;line-height:1.2}.geo-map-heading div span{font-size:11px;color:#82998a}
.geo-map-hint{font-size:11px;color:#69826f}
.geo-map-inner{padding:0 7px}.geo-map-inner svg{display:block;width:100%;height:auto;max-height:545px}
.geo-region{cursor:pointer;transition:fill .15s,stroke .15s}
.geo-region:hover,.geo-region:focus-visible{fill:#c6daca;stroke:#357554;stroke-width:1.85;outline:none}
.geo-region-selected{fill:#a6cdb1;stroke:#225d42;stroke-width:2}
.geo-inset-outline{fill:none;stroke:#b9cdbc;stroke-dasharray:3 5}
.geo-map-label{fill:#557460;font-size:10px;letter-spacing:.065em;font-weight:700}
.geo-map-foot{display:flex;align-items:center;justify-content:space-between;gap:8px 14px;flex-wrap:wrap;border-top:1px solid #e7efe9;padding:10px 16px;color:#668371;font-size:11px;line-height:1.45}
.geo-legend{display:inline-flex;align-items:center;gap:7px}
.geo-legend-swatch{width:12px;height:12px;background:#e7eee8;border:1px solid #abc0ae;border-radius:2px}
.geo-region-picker{display:flex;align-items:center;justify-content:flex-end;gap:10px;margin:5px 12px 0;color:#58725f;font-size:11px;font-weight:650}
.geo-region-picker select{width:min(240px,68%);min-height:38px;border:1px solid #c8dacd;border-radius:6px;background:#fff;padding:7px 10px;color:#27583f;font-size:12px}
.geo-region-insight{padding:clamp(16px,2vw,24px)}
.geo-insight-heading{display:flex;justify-content:space-between;align-items:start;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.geo-region-insight h3{font-size:clamp(18px,1.7vw,24px);letter-spacing:-.035em;line-height:1.25;margin:0;font-weight:690}
.geo-clear-selection{appearance:none;flex:0 0 auto;min-height:34px;padding:5px 9px;border:1px solid #d0e1d5;border-radius:5px;background:#fff;color:#3e7054;font-size:11px;font-weight:650}
.geo-clear-selection:hover{background:#eef6ef}
.geo-insight-intro{margin:0 0 17px;color:#688374;font-size:12px;line-height:1.6}
.geo-insight-data{margin:0}
.geo-insight-data>div{display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid #e5ece6;padding:12px 0;font-size:12px}
.geo-insight-data dt{color:#688373}.geo-insight-data dd{margin:0;color:#3a5c46;font-weight:650;text-align:right}
.geo-insight-note{border-top:1px solid #e4ece6;padding-top:15px;margin-top:8px}
.geo-insight-note strong{font-size:12px;font-weight:675}.geo-insight-note p{margin:5px 0 0;color:#718878;font-size:12px;line-height:1.6}
.geo-international{min-height:370px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;text-align:center;padding:22px;color:#668473}
.geo-international strong{font-size:15px;color:#385f47}.geo-international p{max-width:360px;font-size:12px;line-height:1.6;margin:0}
.geo-international button{min-height:40px;border:1px solid #cbdccd;border-radius:5px;background:white;color:#2a6445;padding:8px 13px;font-size:12px;font-weight:650}
.geo-regions-section{margin-top:19px;border-top:1px solid #e1ebe4;padding-top:14px}
.geo-regions-heading{display:flex;justify-content:space-between;align-items:center;gap:12px}
.geo-regions-heading h3{font-size:15px;font-weight:660;margin:0 0 3px}
.geo-regions-heading p{font-size:12px;color:#798f7f;margin:0}
.geo-regions-heading button{background:#fff;border:1px solid #d7e3d9;border-radius:6px;min-height:40px;padding:8px 12px;color:#2e6749;font-size:12px;font-weight:650;white-space:nowrap}
.geo-regions-heading button span{font-size:16px;margin-left:7px}
.geo-region-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:12px}
.geo-region-grid button{display:flex;align-items:center;justify-content:space-between;text-align:left;gap:9px;min-width:0;min-height:44px;border:1px solid #e0e9e1;border-radius:6px;background:#fff;padding:10px 11px;font-size:12px;color:#456a52}
.geo-region-grid button:hover{border-color:#a9c4b0}
.geo-region-grid button[aria-pressed="true"]{background:#eaf4ec;border-color:#8ab99a;color:#1e5638}
.geo-safety-note{margin:16px 0 0;color:#7a9180;font-size:11px;line-height:1.6}
.geo-tabs button:focus-visible,.geo-regions-heading button:focus-visible,.geo-region-grid button:focus-visible,.geo-select-label select:focus-visible,.geo-region-picker select:focus-visible,.geo-international button:focus-visible,.geo-clear-selection:focus-visible{outline:2px solid #2b8866;outline-offset:3px}
@container(max-width:850px){
 .geo-layout{grid-template-columns:minmax(0,1fr)}
 .geo-map-inner svg{max-height:440px}
 .geo-region-insight{padding:18px}
 .geo-insight-data{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
 .geo-insight-data>div{display:grid;gap:5px;align-content:start;padding:11px;border:1px solid #e5ece6;border-radius:5px}
 .geo-insight-data dd{text-align:left}
 .geo-insight-note{margin-top:16px}
}
@container(max-width:585px){
 .geo-head{display:grid;gap:10px}
 .geo-access-status{justify-self:start}
 .geo-toolbar{display:grid;gap:10px}
 .geo-tabs{width:100%;min-width:0}
 .geo-tabs button{font-size:11px;padding:7px 4px}
 .geo-select-label{justify-content:space-between}
 .geo-select-label select{min-width:145px}
 .geo-context{display:grid;gap:4px}
 .geo-map-heading{padding:14px 13px 3px}
 .geo-map-hint{font-size:10px;max-width:46%;text-align:right}
 .geo-map-inner{padding:0 2px 2px}
 .geo-map-inner svg{max-height:355px}
 .geo-region-picker{display:grid;justify-content:stretch;gap:6px;margin:10px 11px 6px;color:#5b7965;font-size:12px;font-weight:650}
 .geo-region-picker select{min-width:0;width:100%;min-height:44px;border:1px solid #c8dacd;border-radius:6px;background:#fff;padding:9px 11px;color:#27583f;font-size:13px}
 .geo-map-label{font-size:15px}
 .geo-city-label{font-size:16px}
 .geo-insight-data{grid-template-columns:minmax(0,1fr);gap:0}
 .geo-insight-data>div{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border:0;border-top:1px solid #e5ece6;border-radius:0}
 .geo-insight-data dd{text-align:right}
 .geo-regions-heading{align-items:start}
 .geo-regions-heading p{display:none}
 .geo-region-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
 .geo-map-foot{font-size:10px}
}
@container(max-width:370px){
 .geo-region-grid{grid-template-columns:minmax(0,1fr)}
 .geo-regions-heading button{font-size:11px;padding:7px}
}
@media(prefers-reduced-motion:reduce){.geo-region{transition:none}}

/* Phase 4F-7E: prioritize the atlas, with explanation on demand. */
.geo-toolbar{margin:0 0 6px}
.geo-data-status{font-size:11px;color:#738b79;margin:0 0 9px;line-height:1.4}
.geo-map-heading{align-items:center;min-height:60px;padding:10px 17px;gap:12px}
.geo-region-picker{margin:0;gap:10px}
.geo-region-picker select{width:clamp(150px,17vw,210px);min-height:44px}
.geo-current-selection{color:#3e7558;font-size:11px;margin:0 17px 5px}
.geo-region-insight{padding:clamp(16px,1.8vw,22px)}
.geo-insight-intro{margin-bottom:12px}
.geo-insight-note{margin-top:14px}
.geo-about{margin:14px 0 0;border-top:1px solid #e0eae3;padding:8px 0 0;color:#607b69;font-size:12px}
.geo-about summary{width:max-content;max-width:100%;cursor:pointer;min-height:38px;display:flex;align-items:center;color:#2b6447;font-weight:650;font-size:12px}
.geo-about p{max-width:750px;margin:4px 0 10px;line-height:1.6}
.geo-about summary:focus-visible{outline:2px solid #2b8866;outline-offset:3px}
@container(max-width:585px){
 .geo-map-heading{display:grid;grid-template-columns:1fr;gap:8px;padding:11px 12px 7px}
 .geo-region-picker{display:grid;gap:5px;justify-content:stretch}
 .geo-region-picker select{width:100%;min-width:0;min-height:44px}
 .geo-map-inner{padding:0 2px}
 .geo-map-inner svg{max-height:none}
 .geo-data-status{font-size:10.5px}
}

/* Phase 4F-7F: the map is the subject; no faux analysis modes. */
.geo-toolbar{justify-content:flex-end;margin:0 0 6px}
.geo-current-selection{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.geo-selected-detail-link{display:none;align-items:center;gap:7px;min-height:40px;border:0;background:transparent;padding:5px 0;color:#296b4a;font:inherit;font-size:12px;font-weight:650;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.geo-selected-detail-link:focus-visible,.geo-region-insight:focus-visible{outline:2px solid #2b8866;outline-offset:3px}
.geo-region-insight{scroll-margin-top:80px}
@container(max-width:850px){
 .geo-selected-detail-link{display:inline-flex}
}
@container(max-width:585px){
 .geo-toolbar{display:flex;justify-content:flex-end}
 .geo-select-label{gap:8px}
 .geo-select-label select{min-height:44px}
 .geo-selected-detail-link{margin-left:auto}
}

/* Keep native selection comfortably tappable without a large empty field. */
.geo-region-picker select{width:clamp(142px,12vw,186px);min-height:42px;padding:7px 30px 7px 10px}
@container(max-width:585px){.geo-region-picker select{width:min(100%,230px);min-height:42px}}
</style>
<script setup lang="ts">
import {computed,ref} from 'vue';
import {SPAIN_REGIONS} from '../domain/spainRegionalBoundaries';

type Lens='geography'|'institutions'|'gaps';
type Scope='spain'|'international';
const lens=ref<Lens>('geography');
const scope=ref<Scope>('spain');
const selected=ref<string|null>(null);
const listMode=ref(false);
const selectedRegion=computed(()=>SPAIN_REGIONS.find(region=>region.code===selected.value)||null);
const alphabeticalRegions=[...SPAIN_REGIONS].sort((a,b)=>a.name.localeCompare(b.name,'es'));
const lensDescription=computed(()=>lens.value==='geography'
 ? 'Search-event geography is separate from professional affiliation.'
 : lens.value==='institutions'
 ? 'Only explicitly verified institutional activity will be attributed.'
 : 'An unmatched search is not evidence of a novel CFTR variant.');
function choose(code:string){selected.value=selected.value===code?null:code;}
function chooseFromPicker(code:string){selected.value=code||null;}
function changeScope(value:Scope){scope.value=value;selected.value=null;listMode.value=false;}
</script>

<template>
 <section class="geo-observatory" aria-label="Geographic research intelligence">
  <header class="geo-head">
   <div class="geo-head-copy">
    <p class="geo-kicker">RESEARCH ATLAS · SPAIN FIRST</p>
    <h2>Regional exploration</h2>
    <p>Explore Spain by autonomous community. Geographic activity remains separate from the identity of researchers or patients.</p>
   </div>
   <span class="geo-access-status" role="status"><span aria-hidden="true" class="geo-status-dot"></span>Aggregate data pending verification</span>
  </header>

  <div class="geo-toolbar" aria-label="Geographic research controls">
   <div class="geo-tabs" role="group" aria-label="Analysis mode">
    <button type="button" :aria-pressed="lens==='geography'" @click="lens='geography'">Geography</button>
    <button type="button" :aria-pressed="lens==='institutions'" @click="lens='institutions'">Institutions</button>
    <button type="button" :aria-pressed="lens==='gaps'" @click="lens='gaps'">Research gaps</button>
   </div>
   <label class="geo-select-label" for="geo-scope">Scope
    <select id="geo-scope" :value="scope" @change="changeScope(($event.target as HTMLSelectElement).value as Scope)">
     <option value="spain">Spain</option><option value="international">International</option>
    </select>
   </label>
  </div>

  <div class="geo-context" aria-live="polite">
   <span>{{lensDescription}}</span>
   <span>Historical searches include testing · Statistics not published</span>
  </div>

  <div class="geo-layout">
   <section class="geo-map-surface" aria-label="Regional atlas">
    <div class="geo-map-heading">
     <div><strong>{{scope==='spain'?'Spain':'International overview'}}</strong><span>{{scope==='spain'?'17 communities · 2 autonomous cities':'Country-level data pending'}}</span></div>
     <span class="geo-map-hint">{{scope==='spain'?'Select a region':'No activity map yet'}}</span>
    </div>

    <div v-if="scope==='spain'" class="geo-map-inner">
     <label for="geo-region-picker" class="geo-region-picker">Choose a region
      <select id="geo-region-picker" :value="selected||''" @change="chooseFromPicker(($event.target as HTMLSelectElement).value)">
       <option value="">All Spain</option>
       <option v-for="region in alphabeticalRegions" :key="region.code" :value="region.code">{{region.name}}</option>
      </select>
     </label>
     <svg viewBox="0 0 690 525" role="img" aria-label="Selectable map of Spain, its autonomous communities and cities. Administrative boundaries only, without individual searches or activity statistics." preserveAspectRatio="xMidYMid meet">
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
     <span>No search coordinates displayed</span>
    </footer>
   </section>

   <aside id="geo-region-detail" class="geo-region-insight" aria-label="Selected geographic detail" aria-live="polite">
    <p class="geo-kicker">{{lens==='geography'?'GEOGRAPHIC VIEW':lens==='institutions'?'INSTITUTIONAL VIEW':'RESEARCH GAP VIEW'}}</p>
    <h3>{{selectedRegion?.name||(scope==='spain'?'Choose a region':'International overview')}}</h3>
    <p class="geo-insight-intro">{{selectedRegion?'Selected region · '+selectedRegion.name:scope==='spain'?'Select on the map or use the region selector.':'Data will be displayed by country when available.'}}</p>
    <dl class="geo-insight-data">
     <div><dt>Qualified searches</dt><dd>—</dd></div>
     <div><dt>Matches / misses</dt><dd>—</dd></div>
     <div><dt>Location confidence</dt><dd>Not assessed</dd></div>
    </dl>
    <div class="geo-insight-note">
     <strong>What the map represents</strong>
     <p>Regions are reference boundaries, not patient locations. Scientific demand cannot be inferred from unverified search events.</p>
    </div>
   </aside>
  </div>

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
  <p class="geo-safety-note">Public map · Administrative boundaries only. Validated geographic aggregates are not yet connected.</p>
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
.geo-layout{display:grid;grid-template-columns:minmax(0,1.85fr) minmax(250px,1fr);gap:14px;align-items:start}
.geo-map-surface,.geo-region-insight{min-width:0;border:1px solid #dbe7dd;border-radius:8px;background:#fff;overflow:hidden}
.geo-map-heading{display:flex;align-items:start;justify-content:space-between;gap:12px;padding:16px 17px 4px}
.geo-map-heading div{display:grid;gap:3px}.geo-map-heading strong{font-size:14px;font-weight:670;line-height:1.2}.geo-map-heading div span{font-size:11px;color:#82998a}
.geo-map-hint{font-size:11px;color:#69826f}
.geo-map-inner{padding:0 7px}.geo-map-inner svg{display:block;width:100%;height:auto;max-height:545px}
.geo-region{cursor:pointer;transition:fill .15s,stroke .15s}
.geo-region:hover,.geo-region:focus{fill:#c6daca;stroke:#357554;stroke-width:1.85;outline:none}
.geo-region-selected{fill:#a6cdb1;stroke:#225d42;stroke-width:2}
.geo-inset-outline{fill:none;stroke:#b9cdbc;stroke-dasharray:3 5}
.geo-map-label{fill:#557460;font-size:10px;letter-spacing:.065em;font-weight:700}
.geo-map-foot{display:flex;align-items:center;justify-content:space-between;gap:8px 14px;flex-wrap:wrap;border-top:1px solid #e7efe9;padding:10px 16px;color:#668371;font-size:11px;line-height:1.45}
.geo-legend{display:inline-flex;align-items:center;gap:7px}
.geo-legend-swatch{width:12px;height:12px;background:#e7eee8;border:1px solid #abc0ae;border-radius:2px}
.geo-region-picker{display:none}
.geo-region-insight{padding:clamp(16px,2vw,24px)}
.geo-region-insight h3{font-size:clamp(18px,1.7vw,24px);letter-spacing:-.035em;line-height:1.25;margin:0 0 8px;font-weight:690}
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
.geo-tabs button:focus-visible,.geo-regions-heading button:focus-visible,.geo-region-grid button:focus-visible,.geo-select-label select:focus-visible,.geo-region-picker select:focus-visible,.geo-international button:focus-visible{outline:2px solid #2b8866;outline-offset:3px}
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
 .geo-map-hint{display:none}
 .geo-map-inner{padding:0 2px 2px}
 .geo-map-inner svg{max-height:355px}
 .geo-region-picker{display:grid;gap:6px;margin:10px 11px 6px;color:#5b7965;font-size:12px;font-weight:650}
 .geo-region-picker select{min-width:0;width:100%;min-height:44px;border:1px solid #c8dacd;border-radius:6px;background:#fff;padding:9px 11px;color:#27583f;font-size:13px}
 .geo-city-label{font-size:12px}
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
</style>
<script setup lang="ts">
import {computed,nextTick,ref,watch,onUnmounted} from 'vue';
import {SPAIN_REGIONS} from '../domain/spainRegionalBoundaries';
import {canonicalGeographicRegionCode,GEOGRAPHIC_RESEARCH_PROVENANCE,displayedGeographicObservationWindow,observedWindowLabel} from '../domain/geographicResearchProvenance';
import {getRegionalResearchActivity,type RegionalResearchActivity} from '../domain/regionalResearchActivity';
import {authController,authSessionProvider} from '../services/authSession';
import {readConfigFromEnvironment} from '../services/liveVariants';
import {researcherRole} from '../services/researchRole';

const props=defineProps<{variantId?:string|null;initialRegionCode?:string|null}>();
const emit=defineEmits<{regionSelected:[code:string|null]}>();
const provenance=GEOGRAPHIC_RESEARCH_PROVENANCE;
const recordedActivity=ref<readonly RegionalResearchActivity[]>([]);
const activityState=ref<'restricted'|'checking'|'available'|'empty'|'unavailable'>('restricted');
const activityCodes=computed(()=>new Set(recordedActivity.value.map(item=>item.regionCode)));
const observedRange=computed(()=>observedWindowLabel(displayedGeographicObservationWindow(recordedActivity.value)));
const refreshRevision=ref(0);
let geoAbort:AbortController|null=null;
watch([()=>researcherRole.phase,()=>authController?.state.phase,()=>props.variantId,refreshRevision],()=>{
 geoAbort?.abort();geoAbort=null;recordedActivity.value=[];
 if(authController?.state.phase==='checking'||researcherRole.phase==='checking'){
  activityState.value='checking';return;
 }
 if(authController?.state.phase!=='signed-in'||researcherRole.phase!=='verified'){
  activityState.value='restricted';return;
 }
 const config=readConfigFromEnvironment();
 if(!config||!authSessionProvider){activityState.value='unavailable';return;}
 activityState.value='checking';
 const request=new AbortController();geoAbort=request;
 void getRegionalResearchActivity(config,authSessionProvider,props.variantId??null,fetch,request.signal)
  .then(result=>{
   if(request.signal.aborted||geoAbort!==request)return;
   recordedActivity.value=result.rows;
   activityState.value=result.status;
  }).catch(()=>{
   if(!request.signal.aborted&&geoAbort===request)activityState.value='unavailable';
  }).finally(()=>{if(geoAbort===request)geoAbort=null;});
},{immediate:true});
onUnmounted(()=>geoAbort?.abort());
const activityTotal=(value:number)=>value.toLocaleString('en-GB');
const regionByCode=(code:string)=>SPAIN_REGIONS.find(region=>region.code===code)?.name||code;
const shortDate=(value:string)=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value));


const selected=ref<string|null>(null);
const selectedActivity=computed(()=>recordedActivity.value.find(item=>item.regionCode===selected.value)||null);
const detailPanel=ref<HTMLElement|null>(null);
const mapSvg=ref<SVGSVGElement|null>(null);
const zoom=ref(1),centerX=ref(345),centerY=ref(262.5);
const mapViewBox=computed(()=>[centerX.value-345/zoom.value,centerY.value-262.5/zoom.value,690/zoom.value,525/zoom.value].join(' '));
function constrainMap(){
 const halfW=345/zoom.value,halfH=262.5/zoom.value;
 centerX.value=Math.max(halfW,Math.min(690-halfW,centerX.value));
 centerY.value=Math.max(halfH,Math.min(525-halfH,centerY.value));
}
function changeZoom(delta:number){zoom.value=Math.max(1,Math.min(3,zoom.value+delta));constrainMap();}
function panMap(dx:number,dy:number){centerX.value+=dx/zoom.value;centerY.value+=dy/zoom.value;constrainMap();}
function resetMap(){zoom.value=1;centerX.value=345;centerY.value=262.5;}
function revealMapRegion(code:string){
 const path=[...(mapSvg.value?.querySelectorAll<SVGPathElement>('path.geo-region')??[])].find(p=>p.dataset.regionCode===code);
 if(!path||zoom.value===1)return;
 const bounds=path.getBBox();centerX.value=bounds.x+bounds.width/2;centerY.value=bounds.y+bounds.height/2;constrainMap();
}
const previewCode=ref<string|null>(null);
const keyboardRegion=ref(SPAIN_REGIONS[0]?.code??'');
watch(()=>props.initialRegionCode,code=>{
 const region=canonicalGeographicRegionCode(code);
 selected.value=region;
 if(region)keyboardRegion.value=region;
 previewCode.value=null;
},{immediate:true});
const selectedRegion=computed(()=>SPAIN_REGIONS.find(region=>region.code===selected.value)||null);
const alphabeticalRegions=[...SPAIN_REGIONS].sort((a,b)=>a.name.localeCompare(b.name,'es'));
const previewRegion=computed(()=>SPAIN_REGIONS.find(region=>region.code===previewCode.value)||null);
function choose(code:string){
 const region=canonicalGeographicRegionCode(code);
 if(!region)return;
 selected.value=region;
 keyboardRegion.value=region;
 emit('regionSelected',region);
}
function chooseFromPicker(code:string){
 const region=canonicalGeographicRegionCode(code);
 selected.value=region;
 if(region){keyboardRegion.value=region;revealMapRegion(region);}
 else resetMap();
 emit('regionSelected',region);
}
function clearSelection(){selected.value=null;emit('regionSelected',null);}
function focusRegion(code:string){
 keyboardRegion.value=code;
 previewCode.value=code;
}
function clearPreview(code:string){if(previewCode.value===code)previewCode.value=null;}
function onMapKeydown(event:KeyboardEvent,code:string){
 if(event.key==='Escape'){
  if(selected.value){event.preventDefault();clearSelection();}
  return;
 }
 const current=SPAIN_REGIONS.findIndex(region=>region.code===code);
 if(current<0)return;
 const last=SPAIN_REGIONS.length-1;
 let target=-1;
 if(event.key==='ArrowRight'||event.key==='ArrowDown')target=current===last?0:current+1;
 else if(event.key==='ArrowLeft'||event.key==='ArrowUp')target=current===0?last:current-1;
 else if(event.key==='Home')target=0;
 else if(event.key==='End')target=last;
 if(target<0)return;
 event.preventDefault();
 const nextRegion=SPAIN_REGIONS[target];
 keyboardRegion.value=nextRegion.code;
 revealMapRegion(nextRegion.code);
 void nextTick(()=>{
  const paths=mapSvg.value?.querySelectorAll<SVGPathElement>('path.geo-region');
  [...(paths??[])].find(path=>path.dataset.regionCode===nextRegion.code)?.focus();
 });
}
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
  <div class="geo-layout">
   <section class="geo-map-surface" aria-label="Regional atlas">
    <div class="geo-map-heading">
     <div><strong>Spain</strong><span class="geo-map-context" :class="{'is-preview':Boolean(previewRegion)}" data-testid="geo-map-context">{{previewRegion?previewRegion.name+' · Administrative boundary':'17 communities · 2 autonomous cities'}}</span></div>
     <label for="geo-region-picker" class="geo-region-picker">Choose a region
      <select id="geo-region-picker" :value="selected||''" @change="chooseFromPicker(($event.target as HTMLSelectElement).value)">
       <option value="">All Spain</option>
       <option v-for="region in alphabeticalRegions" :key="region.code" :value="region.code">{{region.name}}</option>
      </select>
     </label>
    </div>
    <div v-if="selectedRegion" class="geo-current-selection"><span role="status">{{selectedRegion.name}} selected</span><button class="geo-selected-detail-link" type="button" @click="openSelectedDetail">View region details <span aria-hidden="true">→</span></button></div>
    <div class="geo-map-inner">
     <div class="geo-viewport-controls" role="group" aria-label="Map navigation">
      <button type="button" aria-label="Zoom out" :disabled="zoom===1" @click="changeZoom(-.5)">−</button>
      <span aria-live="polite" class="geo-zoom-value">{{Math.round(zoom*100)}}%</span>
      <button type="button" aria-label="Zoom in" :disabled="zoom===3" @click="changeZoom(.5)">+</button>
      <button type="button" aria-label="Pan west" :disabled="zoom===1" @click="panMap(-100,0)">←</button>
      <button type="button" aria-label="Pan north" :disabled="zoom===1" @click="panMap(0,-100)">↑</button>
      <button type="button" aria-label="Pan south" :disabled="zoom===1" @click="panMap(0,100)">↓</button>
      <button type="button" aria-label="Pan east" :disabled="zoom===1" @click="panMap(100,0)">→</button>
      <button type="button" :disabled="zoom===1" @click="resetMap">Fit map</button>
     </div>
     <span id="geo-map-keyboard-hint" class="geo-screen-reader-only">Use arrow keys to explore regions, Home or End to jump, Enter or Space to select, and Escape to clear the selected region.</span>
     <svg ref="mapSvg" :viewBox="mapViewBox" role="group" aria-describedby="geo-map-keyboard-hint" aria-label="Selectable map of Spain, its autonomous communities and cities. Administrative boundaries only, without individual searches or activity statistics." preserveAspectRatio="xMidYMid meet">
      <title>Spain · autonomous communities and cities</title>
      <rect x="0" y="0" width="690" height="525" fill="#f9fbf9"/>
      <g fill="#e7eee8" stroke="#abc0ae" stroke-width="1.05" stroke-linejoin="round">
       <path v-for="region in SPAIN_REGIONS" :key="region.code" :d="region.path" class="geo-region"
          :class="{'geo-region-selected':selected===region.code,'geo-region-research-active':activityCodes.has(region.code)}"
         role="button" :tabindex="keyboardRegion===region.code?0:-1" :data-region-code="region.code" :aria-pressed="selected===region.code"
         :aria-label="region.name+(activityCodes.has(region.code)?' · historical research search aggregate available':' · administrative boundary')"
         aria-controls="geo-region-detail"
         @pointerenter="previewCode=region.code" @pointerleave="clearPreview(region.code)"
         @focus="focusRegion(region.code)" @blur="clearPreview(region.code)"
         @click="choose(region.code)" @keydown.enter.prevent="choose(region.code)" @keydown.space.prevent="choose(region.code)" @keydown="onMapKeydown($event,region.code)"><title>{{region.name}}</title></path>
      </g>
      <rect x="460" y="386" width="204" height="126" rx="6" class="geo-inset-outline" aria-hidden="true"/>
      <text x="477" y="405" class="geo-map-label">CANARIAS · INSET</text>
      <text x="228" y="412" class="geo-map-label geo-city-label">CEUTA</text>
      <text x="362" y="459" class="geo-map-label geo-city-label">MELILLA</text>
     </svg>
    </div>

    <footer class="geo-map-foot">
     <span class="geo-legend"><span class="geo-legend-swatch" aria-hidden="true"></span>Regional boundaries</span>
     <span v-if="recordedActivity.length" class="geo-activity-map-legend">Blue · published historical search aggregate (presence, not intensity)</span>
     <span>Individual search locations are never shown</span>
    </footer>
   </section>

   <aside id="geo-region-detail" ref="detailPanel" tabindex="-1" class="geo-region-insight" aria-label="Selected geographic detail">
    <p class="geo-kicker">REGION</p>
    <div class="geo-insight-heading"><h3 aria-live="polite">{{selectedRegion?.name||'Choose a region'}}</h3><button v-if="selectedRegion" class="geo-clear-selection" type="button" @click="clearSelection">Clear selection</button></div>
    <p class="geo-insight-intro">{{selectedRegion?'Administrative region selected.':'Select a region on the map or by name.'}}</p>
    <section class="geo-research-activity" aria-label="Geographic research search activity" data-testid="geo-research-activity">
     <div class="geo-research-title"><strong>Research search activity</strong><span v-if="activityState==='available'">Historical · aggregate</span></div>
     <p v-if="activityState==='checking'" role="status" class="geo-research-muted">Checking research activity…</p>
     <p v-else-if="activityState==='restricted'" class="geo-research-muted">Available to verified research members only. <RouterLink v-if="authController?.state.phase!=='signed-in'" to="/sign-in">Sign in</RouterLink></p>
     <p v-else-if="activityState==='unavailable'" role="status" class="geo-research-muted">Research activity cannot be verified from the source right now. <button type="button" class="geo-clear-selection" @click="refreshRevision++">Retry source</button></p>
     <p v-else-if="activityState==='empty'" class="geo-research-muted">{{props.variantId?'No publishable aggregate for this variant.':'No publishable regional aggregates were returned.'}}</p>
     <template v-else-if="activityState==='available'">
      <div v-if="selectedRegion&&selectedActivity" class="geo-research-selected" data-testid="geo-research-selected">
       <strong class="geo-research-number">{{activityTotal(selectedActivity.searchEvents)}}</strong>
       <span>recorded search events · {{activityTotal(selectedActivity.distinctSessions)}} distinct sessions</span>
       <small>{{shortDate(selectedActivity.firstObservedAt)}} – {{shortDate(selectedActivity.lastObservedAt)}}</small>
      </div>
      <p v-else-if="selectedRegion" class="geo-research-muted">No publishable aggregate was returned for this region{{props.variantId?' for this variant':''}}. This does not mean no searches occurred.</p>
      <div v-else class="geo-research-rows" data-testid="geo-research-rows">
       <div v-for="entry in recordedActivity" :key="entry.regionCode" class="geo-research-row">
        <span>{{regionByCode(entry.regionCode)}}</span>
        <strong>{{activityTotal(entry.searchEvents)}} <small>events</small></strong>
        <span class="geo-research-sessions">{{activityTotal(entry.distinctSessions)}} sessions</span>
       </div>
      </div>
      <p class="geo-research-provenance">Coarse IP-based region estimate · 20+ recorded events and 10+ sessions per region. Historical records may include tests.</p>
     </template>
     <details v-if="activityState==='available'" class="geo-source-provenance" data-testid="geo-source-provenance">
      <summary>Source and observed period</summary>
      <dl>
       <div><dt>Source</dt><dd>{{provenance.dataset}}</dd></div>
       <div><dt>Matching</dt><dd>{{provenance.method}}</dd></div>
       <div><dt>Region method</dt><dd>{{provenance.attribution}}</dd></div>
       <div v-if="observedRange"><dt>Displayed period</dt><dd data-testid="geo-observed-range">{{observedRange}}</dd></div>
       <div><dt>Minimum sample</dt><dd>{{provenance.suppression}}</dd></div>
       <div><dt>Excluded</dt><dd>{{provenance.exclusions}}</dd></div>
      </dl>
      <p>{{provenance.statement}}</p>
     </details>
    </section>
    <div class="geo-insight-note" role="note">
     <strong>Evidence boundary</strong>
     <p>These are historical research search events, not patients, variant prevalence, clinical demand or institutional activity. Raw locations are not disclosed.</p>
    </div>
   </aside>
  </div>

  <details class="geo-about">
   <summary>About this atlas and its data</summary>
   <p>Geographic boundaries are a public reference. Professional affiliation, search activity and patient location are distinct concepts and are not inferred here.</p>
   <p>Historical records may include tests. Regional search statistics are not published publicly. Verified research members can view minimum-sized, source-attributed aggregates; raw records and locations remain restricted. The map never represents patients or clinical demand.</p>
  </details>
 </section>
</template>

<style scoped>
.geo-screen-reader-only{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
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

/* 14H162 · Research activity is genuine source-backed aggregation, not
   patients, inferred prevalence, or noisy decorative cartography. */
.geo-region-research-active{fill:#c5def7;stroke:#5f98d2}
.geo-region-research-active:hover,.geo-region-research-active:focus-visible{fill:#afd0f5}
.geo-region-research-active.geo-region-selected{fill:#91bbea;stroke:#215f9e;stroke-width:2}
.geo-activity-map-legend{color:#3a6798;font-size:10.5px}
.geo-research-activity{margin:12px 0 9px;padding-top:10px;border-top:1px solid #e3eaf2;min-width:0}
.geo-research-title{display:flex;align-items:baseline;justify-content:space-between;gap:5px;flex-wrap:wrap}
.geo-research-title strong{color:#284667;font-size:11.5px;font-weight:690}
.geo-research-title span,.geo-research-provenance{color:#657e9c;font-size:10px;line-height:1.45}
.geo-research-muted{font-size:11.5px;line-height:1.55;color:#536c88;margin:9px 0}
.geo-research-muted a{color:#2263ad;text-decoration:underline;text-underline-offset:3px}
.geo-research-rows{display:grid;gap:0;margin:10px 0 7px}
.geo-research-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;gap:3px 8px;border-bottom:1px solid #e7eef6;padding:7px 0;font-size:11px;color:#355677}
.geo-research-row strong{font-size:13.5px;color:#1c467b;font-variant-numeric:tabular-nums}
.geo-research-row strong small{font-size:10px;font-weight:450}
.geo-research-sessions{grid-column:1/-1;color:#687f99;font-size:10px}
.geo-research-selected{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:baseline;margin:9px 0;color:#4f6989;font-size:11px}
.geo-research-number{color:#195999;font-size:24px;font-variant-numeric:tabular-nums;font-weight:690;line-height:1.2}
.geo-research-selected small{flex:1 0 100%;color:#667f98;font-size:10.5px}
.geo-research-provenance{margin:8px 0 3px}

:global(.app-frame[data-nfq-theme="midnight"]) .geo-region-research-active{fill:#254875;stroke:#6ba0e0}
:global(.app-frame[data-nfq-theme="midnight"]) .geo-region-research-active.geo-region-selected{fill:#33679d;stroke:#b6d9ff}
:global(.app-frame[data-nfq-theme="midnight"]) :is(.geo-research-title strong,.geo-research-row strong,.geo-research-number){color:#d4e7ff}
:global(.app-frame[data-nfq-theme="midnight"]) :is(.geo-research-muted,.geo-research-row,.geo-research-sessions,.geo-research-selected,.geo-research-provenance,.geo-research-title span){color:#afc6e3}
:global(.app-frame[data-nfq-theme="midnight"]) .geo-research-activity{border-color:#354e71}
:global(.app-frame[data-nfq-theme="midnight"]) .geo-research-row{border-color:#354e71}
:global(.app-frame[data-nfq-theme="midnight"]) .geo-research-muted a{color:#a9d0ff}

/* 14H164 provenance lives in the existing insight, never a new dashboard card. */
.geo-source-provenance{margin:12px 0 0;color:#4f6b80;font-size:10.8px;line-height:1.5}
.geo-source-provenance summary{cursor:pointer;font-size:11px;font-weight:650;color:#3e709e}
.geo-source-provenance summary:focus-visible{outline:2px solid #2979ff;outline-offset:2px}
.geo-source-provenance dl{display:grid;gap:5px;margin:9px 0 6px}
.geo-source-provenance dl>div{display:grid;grid-template-columns:minmax(82px,.42fr) minmax(0,1fr);gap:6px 12px}
.geo-source-provenance dt{color:#718ba4}
.geo-source-provenance dd{margin:0;color:#385977;overflow-wrap:anywhere}
.geo-source-provenance p{margin:7px 0 0;font-size:10.8px;line-height:1.5}
:global(.app-frame[data-nfq-theme="midnight"]) .geo-source-provenance summary{color:#b4d4ff}
:global(.app-frame[data-nfq-theme="midnight"]) .geo-source-provenance dt{color:#a0badb}
:global(.app-frame[data-nfq-theme="midnight"]) .geo-source-provenance dd,
:global(.app-frame[data-nfq-theme="midnight"]) .geo-source-provenance p{color:#bcd2ed}
/* GEO02: a map-first, neutral editorial stage with bounded navigation. */
.geo-map-inner{position:relative;padding:0; background:#f9fbfc}
.geo-map-inner svg{max-height:620px}
.geo-viewport-controls{display:flex;align-items:center;flex-wrap:wrap;gap:3px;padding:5px 16px 7px;color:#344e69;background:#fff}
.geo-viewport-controls button{min-width:34px;min-height:36px;padding:4px 9px;border:1px solid #d7e0e9;border-radius:4px;background:transparent;color:inherit;font:inherit;cursor:pointer}
.geo-viewport-controls button:disabled{opacity:.42;cursor:default}
.geo-viewport-controls button:focus-visible{outline:2px solid #2867b3;outline-offset:2px}
.geo-zoom-value{font-size:11px;min-width:42px;text-align:center;font-variant-numeric:tabular-nums}
.geo-map-surface,.geo-region-insight{border-color:#dce4ec}
.geo-map-foot,.geo-about{border-color:#e4ebf1;color:#526b83}
.geo-map-inner svg>rect:first-of-type{fill:#f6f8fb}
.geo-map-inner svg>g{fill:#e1e7ee;stroke:#9baec1}
.geo-region:hover,.geo-region:focus-visible{fill:#c2d0df;stroke:#486b91}
.geo-region-selected{fill:#a7bbd1;stroke:#294f79}
.geo-inset-outline{stroke:#a9b7c7}
.geo-map-label{fill:#4f6984}
.geo-legend-swatch{background:#e1e7ee;border-color:#9baec1}
.geo-region-picker,.geo-map-heading div span,.geo-current-selection,.geo-insight-intro,.geo-kicker{color:#536e88}
.geo-region-picker select,.geo-clear-selection{border-color:#d5dfe9;color:#315678}
.geo-about summary,.geo-selected-detail-link{color:#315b86}
:global(.app-frame[data-nfq-theme="midnight"]) .geo-viewport-controls{background:#172b40;color:#c4d8ee}
:global(.app-frame[data-nfq-theme="midnight"]) .geo-viewport-controls button{border-color:#405975}
@container(max-width:585px){.geo-viewport-controls{padding:4px 10px;gap:4px}.geo-viewport-controls button{min-height:44px;min-width:40px}.geo-map-inner svg{max-height:none}}
</style>
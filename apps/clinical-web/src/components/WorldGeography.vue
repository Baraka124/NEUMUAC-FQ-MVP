<script setup lang="ts">
import {computed,ref} from 'vue';
import {boundaryCountryLabel} from '../domain/worldCountryIdentity';
import {WORLD_ATLAS_BOUNDARIES,WORLD_ATLAS_SOURCE} from '../domain/worldAtlasBoundaries';
const props=defineProps<{affiliationCounts?:Readonly<Record<string,number>>;publicationMode?:boolean}>();
const label=boundaryCountryLabel;
const options=computed(()=>[...new Set(WORLD_ATLAS_BOUNDARIES.map(x=>x.id))].map(id=>({id,name:label(id)})).sort((a,b)=>a.name.localeCompare(b.name)));
const count=(id:string)=>props.affiliationCounts?.[id]??0;
const emit=defineEmits<{openSpain:[]}>();
const selected=ref<string|null>(null);
function select(id:string){selected.value=id;}
</script>
<template>
 <section class="world-atlas" aria-label="International geographic reference">
  <header><div><h2>World reference</h2><p>{{publicationMode?'Publication affiliation geography':'Administrative geography · simplified boundaries'}}</p></div><label class="world-picker">Country <select :value="selected||''" @change="selected=($event.target as HTMLSelectElement).value||null"><option value="">All boundaries</option><option v-for="option in options" :key="option.id" :value="option.id">{{option.name}}</option></select></label><button type="button" @click="emit('openSpain')">Explore Spain</button></header>
  <svg viewBox="0 0 720 360" role="img" aria-label="World country boundaries; Spain highlighted for regional exploration">
   <rect width="720" height="360" fill="#f5f8fc"/>
   <path v-for="(country,index) in WORLD_ATLAS_BOUNDARIES" :key="index" :d="country.d" fill-rule="evenodd" :class="{spain:!publicationMode&&country.id==='724',affiliated:publicationMode&&count(country.id)>0,selected:selected===country.id}" @click="select(country.id)"><title>{{label(country.id)}}</title></path>
  </svg>
  <div class="world-foot"><span>{{WORLD_ATLAS_SOURCE}}</span><span>{{publicationMode?'Blue · resolved publication affiliation present':'Blue · Spain regional atlas available, not genetic frequency'}}</span></div>
  <aside aria-live="polite"><strong>{{selected?label(selected):'Geographic context'}}</strong><p>{{publicationMode?(selected&&count(selected)>0?count(selected)+' resolved institutions for the retrieved publication.':'No resolved affiliation shown here; this is not proof of absence.'):'Population allele observations are listed separately. Boundaries do not indicate variant presence, absence, frequency or ancestry.'}}</p><button v-if="selected==='724'" type="button" @click="emit('openSpain')">Open regional atlas</button><button v-if="selected" type="button" @click="selected=null">Clear selection</button></aside>
 </section>
</template>
<style scoped>
.world-atlas{min-width:0;color:#29435e;border:1px solid #dce4ec;border-radius:6px;background:#fff;overflow:hidden}
header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;flex-wrap:wrap}h2{font-size:17px;margin:0;font-weight:650}p{font-size:12px;line-height:1.55;margin:4px 0;color:#546c84}
svg{width:100%;height:auto;display:block}path{fill:#e0e7ee;stroke:#9cadbd;stroke-width:.35;cursor:pointer}path:hover,path.selected{fill:#b5c7d9;stroke:#41668e}path.spain{fill:#759fc9;stroke:#305c8b}
button{background:transparent;color:#315b86;border:1px solid #cdd9e5;border-radius:4px;padding:8px 12px;min-height:40px;font:inherit;font-size:12px;cursor:pointer}button:focus-visible{outline:2px solid #2867b3;outline-offset:2px}
.world-foot{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:10px 18px;font-size:11px;color:#546c84}
aside{padding:14px 18px;border-top:1px solid #e4ebf1;font-size:13px}aside button{margin:8px 8px 0 0}
path.affiliated{fill:#759fc9;stroke:#305c8b}path.selected{stroke:#183b60;stroke-width:1.3}.world-picker{display:flex;gap:6px;align-items:center;font-size:12px}.world-picker select{max-width:180px;min-height:40px;color:inherit;background:white;border:1px solid #cdd9e5;border-radius:4px}
</style>

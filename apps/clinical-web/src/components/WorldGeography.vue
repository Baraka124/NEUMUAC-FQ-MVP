<script setup lang="ts">
import {ref} from 'vue';
import {WORLD_ATLAS_BOUNDARIES,WORLD_ATLAS_SOURCE} from '../domain/worldAtlasBoundaries';
const emit=defineEmits<{openSpain:[]}>();
const selected=ref<string|null>(null);
function select(id:string){selected.value=id;}
</script>
<template>
 <section class="world-atlas" aria-label="International geographic reference">
  <header><div><h2>World reference</h2><p>Administrative geography · simplified boundaries</p></div><button type="button" @click="emit('openSpain')">Explore Spain</button></header>
  <svg viewBox="0 0 720 360" role="img" aria-label="World country boundaries; Spain highlighted for regional exploration">
   <rect width="720" height="360" fill="#f5f8fc"/>
   <path v-for="(country,index) in WORLD_ATLAS_BOUNDARIES" :key="index" :d="country.d" fill-rule="evenodd" :class="{spain:country.id==='724',selected:selected===country.id}" @click="select(country.id)"><title>{{country.id==='724'?'Spain': 'Boundary reference '+country.id}}</title></path>
  </svg>
  <div class="world-foot"><span>{{WORLD_ATLAS_SOURCE}}</span><span>Blue · Spain regional atlas available, not genetic frequency</span></div>
  <aside aria-live="polite"><strong>{{selected==='724'?'Spain':selected?'Selected boundary · '+selected:'Population evidence'}}</strong><p>No verified population-frequency dataset is connected. Boundaries do not indicate variant presence, absence, frequency or ancestry.</p><button v-if="selected==='724'" type="button" @click="emit('openSpain')">Open regional atlas</button><button v-if="selected" type="button" @click="selected=null">Clear selection</button></aside>
 </section>
</template>
<style scoped>
.world-atlas{min-width:0;color:#29435e;border:1px solid #dce4ec;border-radius:6px;background:#fff;overflow:hidden}
header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;flex-wrap:wrap}h2{font-size:17px;margin:0;font-weight:650}p{font-size:12px;line-height:1.55;margin:4px 0;color:#546c84}
svg{width:100%;height:auto;display:block}path{fill:#e0e7ee;stroke:#9cadbd;stroke-width:.35;cursor:pointer}path:hover,path.selected{fill:#b5c7d9;stroke:#41668e}path.spain{fill:#759fc9;stroke:#305c8b}
button{background:transparent;color:#315b86;border:1px solid #cdd9e5;border-radius:4px;padding:8px 12px;min-height:40px;font:inherit;font-size:12px;cursor:pointer}button:focus-visible{outline:2px solid #2867b3;outline-offset:2px}
.world-foot{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:10px 18px;font-size:11px;color:#546c84}
aside{padding:14px 18px;border-top:1px solid #e4ebf1;font-size:13px}aside button{margin:8px 8px 0 0}
</style>

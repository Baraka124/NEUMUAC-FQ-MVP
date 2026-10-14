<script setup lang="ts">
import {computed,ref} from 'vue';
import {useRoute,useRouter} from 'vue-router';
import {fixtures} from '../fixtures/variants';
import {searchFixtures} from '../domain/variant';
const route=useRoute(),router=useRouter();
const query=ref('');
const filtered=computed(()=>searchFixtures(fixtures,query.value));
const selected=computed(()=>fixtures.find(v=>v.id===route.params.id));
</script>
<template><div class="page"><div class="eyebrow">VARIANTS / SYNTHETIC RESEARCH DATA</div><h1>Variant worklist</h1><p class="intro">An interaction foundation for search, selection and reading context. Not a clinical variant database.</p><div class="columns variant-columns"><section class="surface"><div class="section-head"><h2>Research worklist</h2><span>{{filtered.length}} synthetic</span></div><label for="search">Search identifiers or aliases</label><input id="search" v-model="query" type="search" autocomplete="off" placeholder="DEMO-CFTR-001"/><p v-if="!filtered.length" role="status">No matching synthetic records.</p><div v-else class="worklist"><button v-for="v in filtered" :key="v.id" :class="{selected:selected?.id===v.id}" :aria-current="selected?.id===v.id?'true':undefined" @click="router.push('/variants/'+v.id)"><strong>{{v.name}}</strong><span>{{v.reviewState.replaceAll('-',' ')}} · {{v.evidenceCount}} example references</span></button></div></section><section class="surface detail"><template v-if="selected"><div class="eyebrow">SYNTHETIC RECORD</div><h2>{{selected.name}}</h2><p>No clinical classification has been calculated.</p><dl class="facts"><div><dt>Record</dt><dd>{{selected.id}}</dd></div><div><dt>Aliases</dt><dd>{{selected.aliases.join(', ')}}</dd></div><div><dt>Review</dt><dd>{{selected.reviewState}}</dd></div></dl></template><template v-else><div class="eyebrow">RECORD CONTEXT</div><h2>{{route.params.id?'Unknown demonstration record':'Select a variant'}}</h2><p>Choose a synthetic record to inspect its structure.</p></template></section></div></div></template>

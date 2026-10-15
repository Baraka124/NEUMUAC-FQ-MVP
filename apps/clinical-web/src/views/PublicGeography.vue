<script setup lang="ts">
import GeographicObservatory from '../components/GeographicObservatory.vue';
</script>
<template>
 <div class="page public-geography-page">
  <div class="eyebrow">CFTR RESEARCH / PUBLIC GEOGRAPHY</div>
  <h1>Geographic intelligence</h1>
  <p class="intro">Explore Spanish regional boundaries and research geography. Search activity statistics are withheld until privacy-approved aggregation is available.</p>
  <GeographicObservatory/>
 </div>
</template>
<style scoped>
.public-geography-page{padding-top:20px}
.public-geography-page .intro{margin:0 0 24px;max-width:850px}
</style>
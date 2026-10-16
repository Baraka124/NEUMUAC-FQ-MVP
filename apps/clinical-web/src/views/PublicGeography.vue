<script setup lang="ts">
import GeographicObservatory from '../components/GeographicObservatory.vue';
</script>
<template>
 <div class="page public-geography-page">
  <div class="eyebrow">CFTR RESEARCH / PUBLIC GEOGRAPHY</div>
  <h1>Geographic intelligence</h1>
  <GeographicObservatory/>
 </div>
</template>
<style scoped>
.public-geography-page{padding-top:4px}
.public-geography-page .geo-page-title{display:flex;align-items:baseline;flex-wrap:wrap;gap:7px 18px;margin:0 0 13px}
.public-geography-page .geo-page-title h1{font-size:clamp(25px,2.4vw,33px);line-height:1.2;letter-spacing:-.035em;margin:0;font-weight:670}
.public-geography-page .geo-page-title span{font-size:11px;color:#718776}
@media(max-width:600px){.public-geography-page .geo-page-title{margin-bottom:10px}.public-geography-page .geo-page-title h1{font-size:26px}}
.public-geography-page .intro{margin:0 0 24px;max-width:850px}
</style>
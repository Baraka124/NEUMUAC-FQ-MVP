<script setup lang="ts">
import {ref} from 'vue';
import {RouterLink,useRouter} from 'vue-router';

const query=ref('');
const router=useRouter();
function openVariantSearch():void{
  const q=query.value.trim();
  void router.push({path:'/variants',query:q?{q}:{}});
}
</script>

<template>
  <div class="page research-home nfq-workspace-home">
    <header class="research-home-intro nfq-workspace-intro">
      <div class="eyebrow">PUBLIC RESEARCH · READ ONLY</div>
      <h1>CFTR variant research</h1>
      <p class="intro">Search recorded CFTR variants and review linked scientific references.</p>
    </header>

    <section class="nfq-home-discovery" aria-labelledby="nfq-home-search-heading">
      <div class="nfq-home-discovery-heading">
        <div>
          <span class="section-label">VARIANT SEARCH</span>
          <h2 id="nfq-home-search-heading">Search recorded variants</h2>
        </div>
        <span class="nfq-home-read-status">Public access</span>
      </div>
      <form class="nfq-home-search-form" role="search" aria-label="Search CFTR variants" @submit.prevent="openVariantSearch">
        <label for="nfq-home-search">Search CFTR variants</label>
        <div class="nfq-home-search-controls">
          <input id="nfq-home-search" v-model="query" type="search" autocomplete="off"
            spellcheck="false" placeholder="Variant name, HGVS or recorded alias" />
          <button type="submit">Search variants <span aria-hidden="true">→</span></button>
        </div>
      </form>
      <div class="nfq-home-links">
        <RouterLink to="/variants">Explore variant records <span aria-hidden="true">→</span></RouterLink>
        <RouterLink to="/variants?class=I">Open Class I variant worklist <span aria-hidden="true">→</span></RouterLink>
        <RouterLink to="/geography">Explore geographic atlas <span aria-hidden="true">→</span></RouterLink>
      </div>
    </section>

    <p class="nfq-home-research-note">Variant names, functional classes and scientific determinations are database-recorded fields. They are not independently validated clinical assessments.</p>
  </div>
</template>

<style scoped>
/* 14H137C — original instrument scale: quiet controls, proportionate search.
   Source: original neumuacFQ; search behaviour and form semantics unchanged. */
.nfq-workspace-home{
 width:100%;max-width:880px;margin-inline:0;
 padding-top:clamp(10px,1.6vw,20px);
}
.nfq-workspace-intro{max-width:780px;margin:0 0 21px}
.nfq-workspace-intro h1{
 font-size:clamp(30px,3vw,44px);line-height:1.15;margin:8px 0 9px;letter-spacing:-.055em;
}
.nfq-workspace-intro .intro{
 font-size:14px;line-height:1.6;max-width:650px;margin:0;color:#526780;
}
.nfq-home-discovery{
 width:100%;max-width:780px;background:#fff;border:1px solid #d9e2ed;
 border-radius:8px;padding:clamp(16px,2vw,24px);box-shadow:none;
}
.nfq-home-discovery-heading{
 display:flex;align-items:start;justify-content:space-between;gap:12px;
}
.nfq-home-discovery-heading h2{
 font-size:clamp(19px,2vw,24px);letter-spacing:-.035em;
 margin:5px 0 17px;color:#162540;
}
.nfq-home-read-status{
 font-size:11px;color:#60758f;background:transparent;
 border:1px solid #d8e2f0;border-radius:5px;
 white-space:nowrap;padding:4px 7px;
}
.nfq-home-search-form{display:block}
.nfq-home-search-form label{
 display:block;margin:0 0 7px;font-size:12px;font-weight:610;color:#455a78;
}
.nfq-home-search-controls{
 display:grid;grid-template-columns:minmax(0,1fr) auto;
 align-items:center;gap:8px;width:100%;max-width:540px;min-width:0;
}
.nfq-home-search-controls input{
 display:block;min-width:0;width:100%;max-width:100%;
 height:42px;min-height:42px;
 border:1px solid #c6d6e8;border-radius:6px;background:#fff;
 color:#162540;padding:8px 11px;
 font:inherit;font-size:13px;font-weight:400;
 box-shadow:none;outline-offset:2px;
}
.nfq-home-search-controls input::placeholder{color:#6b7e96;opacity:1}
.nfq-home-search-controls input:hover{border-color:#a8bddd}
.nfq-home-search-controls input:focus-visible{
 outline:2px solid #2979ff;outline-offset:2px;border-color:#2979ff;
}
.nfq-home-search-controls button{
 display:inline-flex;align-items:center;justify-content:center;gap:7px;
 flex:none;min-width:0;min-height:40px;height:40px;
 border:1px solid #bdcee5;border-radius:6px;background:transparent;
 color:#275eaf;padding:7px 12px;box-shadow:none;
 font:inherit;font-size:12px;font-weight:600;letter-spacing:0;
 white-space:nowrap;cursor:pointer;transition:background-color .12s ease,border-color .12s ease;
}
.nfq-home-search-controls button:hover{
 background:rgba(41,121,255,.065);border-color:#8eafe1;color:#164d9f;
}
.nfq-home-search-controls button:focus-visible{
 outline:2px solid #2979ff;outline-offset:3px;
}
.nfq-home-links{
 display:flex;gap:9px 22px;flex-wrap:wrap;
 border-top:1px solid #e4eaf2;margin-top:20px;padding-top:14px;
}
.nfq-home-links a{
 color:#285caa;font-size:12px;font-weight:590;
 text-decoration:none;text-underline-offset:4px;
}
.nfq-home-links a:hover{text-decoration:underline}
.nfq-home-links a:focus-visible{outline:2px solid #2979ff;outline-offset:3px}
.nfq-home-research-note{
 font-size:12px;color:#65798f;line-height:1.6;
 max-width:740px;margin:15px 0 0;
}
@media(max-width:520px){
 .nfq-workspace-home{padding-top:10px}
 .nfq-workspace-intro{margin-bottom:16px}
 .nfq-home-discovery{padding:15px 14px}
 .nfq-home-discovery-heading h2{margin-bottom:13px}
 .nfq-home-read-status{display:none}
 .nfq-home-search-controls{grid-template-columns:minmax(0,1fr);justify-items:start;gap:9px}
 .nfq-home-search-controls input{height:42px;min-height:42px}
 .nfq-home-search-controls button{width:auto;min-height:40px;height:40px}
 .nfq-home-links{display:flex;gap:12px 18px;margin-top:16px}
}
@media(prefers-reduced-motion:reduce){
 .nfq-home-search-controls button{transition:none}
}
</style>

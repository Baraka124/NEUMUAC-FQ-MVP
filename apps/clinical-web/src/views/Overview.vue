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
      <form class="nfq-home-search-form" role="search" @submit.prevent="openVariantSearch">
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
      </div>
    </section>

    <p class="nfq-home-research-note">Variant names, functional classes and scientific determinations are database-recorded fields. They are not independently validated clinical assessments.</p>
  </div>
</template>

<style scoped>
.nfq-workspace-home{width:100%;max-width:1020px;margin-inline:0;padding-top:clamp(12px,2vw,24px)}
.nfq-workspace-intro{max-width:780px;margin:0 0 25px}
.nfq-workspace-intro h1{font-size:clamp(30px,3vw,44px);line-height:1.15;margin:8px 0 9px;letter-spacing:-.055em}
.nfq-workspace-intro .intro{font-size:14px;line-height:1.6;max-width:650px;margin:0;color:#526d60}
.nfq-home-discovery{background:#fff;border:1px solid #dbe8df;border-radius:10px;padding:clamp(20px,2.6vw,34px);box-shadow:0 4px 20px #173c2308}
.nfq-home-discovery-heading{display:flex;align-items:start;justify-content:space-between;gap:15px}
.nfq-home-discovery-heading h2{font-size:clamp(19px,2vw,25px);letter-spacing:-.04em;margin:6px 0 22px;color:#163b2b}
.nfq-home-read-status{font-size:11px;color:#4b7663;background:#edf5ef;border:1px solid #d6e8da;border-radius:5px;white-space:nowrap;padding:7px 9px}
.nfq-home-search-form{display:block}
.nfq-home-search-form label{font-size:12px;font-weight:650;color:#365c4b;display:block;margin-bottom:8px}
.nfq-home-search-controls{display:flex;gap:10px;min-width:0}
.nfq-home-search-controls input{width:100%;min-width:0;min-height:52px;flex:1 1 auto;border:1px solid #b9d3c4;border-radius:7px;background:#fbfdfb;color:#1d3d2c;padding:12px 15px;font:inherit;font-size:15px}
.nfq-home-search-controls input:focus-visible{outline:3px solid #198366;outline-offset:2px}
.nfq-home-search-controls button{flex-shrink:0;display:flex;align-items:center;gap:15px;min-height:52px;padding:12px 18px;border-radius:7px;border:1px solid #185a42;background:#185a42;color:#fff;font:inherit;font-size:13px;font-weight:700;cursor:pointer}
.nfq-home-search-controls button:hover{background:#114d38}
.nfq-home-search-controls button:focus-visible{outline:3px solid #198366;outline-offset:2px}
.nfq-home-links{display:flex;gap:10px 30px;flex-wrap:wrap;border-top:1px solid #e4ece6;margin-top:25px;padding-top:18px}
.nfq-home-links a{font-size:13px;font-weight:650;color:#17694d;text-decoration:none;text-underline-offset:4px}
.nfq-home-links a:hover{text-decoration:underline}
.nfq-home-research-note{font-size:12px;color:#668174;line-height:1.6;max-width:750px;margin:17px 0 0}
@media(max-width:620px){.nfq-workspace-home{padding-top:10px}.nfq-home-search-controls{flex-direction:column}.nfq-home-search-controls button{justify-content:space-between}.nfq-home-read-status{display:none}.nfq-home-links{display:grid;gap:13px}}
</style>

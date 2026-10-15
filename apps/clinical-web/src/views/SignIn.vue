<script setup lang="ts">
import {RouterLink} from 'vue-router';
import ResearchSignInForm from '../components/ResearchSignInForm.vue';
</script>
<template>
 <div class="nfq-entry-landing nfq-entry-signin nfq-signin-simplified"><header class="nfq-entry-header"><RouterLink to="/" class="nfq-entry-logo" aria-label="neumuacFQ home"><img src="/brand/neumuacfq-logo.png" alt="neumuacFQ · CFTR evidence, connected." /></RouterLink><RouterLink class="nfq-entry-header-access" to="/workspace">Explore research ↗</RouterLink></header><main id="main" tabindex="-1" class="nfq-entry-main"><div class="page staff-signin nfq-entry-page">
  <div class="nfq-signin-brand"><img src="/brand/neumuacfq-logo.png" alt="neumuacFQ · CFTR evidence, connected." /><span>STAFF ACCESS · SECURE RESEARCH ENVIRONMENT</span></div>
  <h1>Continue your research.</h1>
  <p class="intro">Sign in with your authorized research account. The public CFTR evidence workspace remains available without an account.</p>
  <section class="research-entry" aria-labelledby="staff-signin-title">
   <div class="research-entry-main">
    <div class="section-label">SECURE SESSION</div>
    <h2 id="staff-signin-title">Research account</h2>
    <ResearchSignInForm id-prefix="dedicated-account"/>
    <RouterLink class="research-entry-link" to="/variants">Continue without signing in <span aria-hidden="true">→</span></RouterLink>
   </div>
   <aside class="research-entry-aside" aria-label="Account permissions">
    <div class="section-label">ACCOUNT PERMISSIONS</div>
    <p>Accounts are assigned permissions by the research team. Signing in does not automatically enable editing, approval or administrative operations.</p>
    <p>There is no public registration or self-assigned administrator role.</p>
   </aside>
  </section>
 </div></main><footer class="nfq-entry-footer"><span>neumuacFQ · Authorized research access</span><RouterLink to="/">Back to home</RouterLink></footer></div>
</template>
<style scoped>
.nfq-signin-simplified .nfq-entry-header{border-bottom:0}
.nfq-signin-simplified .research-entry{border-color:#e0eae9}
.nfq-signin-simplified .nfq-entry-footer{border-top:1px solid #e3eae9}
</style>

<script setup lang="ts">
import {RouterLink} from 'vue-router';
import ResearchAccessPanel from '../components/ResearchAccessPanel.vue';
</script>

<template>
 <div class="nfq-entry-landing nfq-entry-signin nfq-signin-institutional nfq-entry-surface">
  <header class="nfq-entry-header nfq-signin-masthead">
   <RouterLink to="/" class="nfq-entry-logo" aria-label="neumuacFQ home">
    <img src="/brand/neumuacfq-logo.png" alt="neumuacFQ" />
   </RouterLink>
   <RouterLink to="/workspace" class="nfq-signin-header-link">Explore public research <span aria-hidden="true">↗</span></RouterLink>
  </header>

  <main id="main" tabindex="-1" class="nfq-entry-main nfq-signin-main">
   <section class="nfq-signin-stage" aria-labelledby="nfq-signin-title">
    <div class="nfq-signin-context">
      <p class="nfq-signin-eyebrow">CFTR RESEARCH · ACCOUNT ACCESS</p>
      <h2>CFTR variant research</h2>
      <p>Explore recorded CFTR variants and scientific evidence without an account. Sign in for research workflows assigned to you.</p>
    </div>
    <section class="nfq-login-card" aria-labelledby="nfq-signin-title">
     <ResearchAccessPanel id-prefix="dedicated-account" heading-id="nfq-signin-title" dedicated/>
    </section>
   </section>
  </main>

  <footer class="nfq-entry-footer nfq-signin-footer">
   <span>neumuacFQ · CFTR research</span>
   <RouterLink to="/">Back to home</RouterLink>
  </footer>
 </div>
</template>

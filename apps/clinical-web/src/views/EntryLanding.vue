<script setup lang="ts">
import {ref} from 'vue';
import {RouterLink} from 'vue-router';
import ResearchAccessPanel from '../components/ResearchAccessPanel.vue';
const loginOpen=ref(false);
</script>

<template>
  <div class="nfq-portal-landing nfq-entry-surface">
    <header class="nfq-portal-masthead">
      <RouterLink to="/" class="nfq-portal-brand" aria-label="neumuacFQ home">
        <img src="/brand/neumuacfq-logo.png" alt="neumuacFQ · CFTR evidence, connected." />
      </RouterLink>
      <div class="nfq-portal-masthead-right">
        <span class="nfq-portal-header-context">CFTR RESEARCH · PUBLIC ACCESS</span>
        <button type="button" class="nfq-portal-header-link" :aria-expanded="loginOpen" aria-controls="nfq-portal-account" @click="loginOpen=!loginOpen">{{loginOpen?'Research tools':'Sign in'}} <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <main id="main" tabindex="-1" class="nfq-portal-content">
      <div class="nfq-portal-layout" :class="{'nfq-portal-layout-auth':loginOpen}">
        <section class="nfq-portal-intro" aria-labelledby="nfq-entry-heading">
          <p class="nfq-portal-kicker">PUBLIC RESEARCH ACCESS</p>
          <h1 id="nfq-entry-heading">CFTR variant research</h1>
          <p class="nfq-portal-description">A research workspace for recorded CFTR variants, scientific references and evidence review.</p>

          <div class="nfq-portal-actions" aria-label="Choose how to enter">
            <RouterLink to="/workspace" class="nfq-portal-enter">
              <span>Explore public research</span>
              <svg viewBox="0 0 24 24" aria-hidden="true" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
            </RouterLink>
          </div>
          <p class="nfq-portal-access-note">Public research is available without an account.</p>
        </section>

        <section v-if="loginOpen" id="nfq-portal-account" class="nfq-portal-account nfq-portal-login-card" aria-labelledby="nfq-portal-account-title">
          <ResearchAccessPanel id-prefix="entry-account" heading-id="nfq-portal-account-title" @close="loginOpen=false"/>
        </section>
        <nav v-else class="nfq-portal-index" aria-labelledby="nfq-portal-index-heading">
          <div class="nfq-portal-index-top">
            <p class="nfq-portal-kicker">WORKSPACE DIRECTORY</p>
            <h2 id="nfq-portal-index-heading">Research tools</h2>
          </div>
          <RouterLink to="/variants" class="nfq-portal-index-link">
            <span><strong>Variant records</strong><small>Names, HGVS notation and recorded aliases</small></span>
            <span class="nfq-portal-index-arrow" aria-hidden="true">↗</span>
          </RouterLink>
          <RouterLink to="/evidence" class="nfq-portal-index-link">
            <span><strong>Scientific references</strong><small>Recorded publications and source information</small></span>
            <span class="nfq-portal-index-arrow" aria-hidden="true">↗</span>
          </RouterLink>
          <RouterLink to="/genotype" class="nfq-portal-index-link">
            <span><strong>Variant-pair research</strong><small>Exploratory comparison of two recorded variants</small></span>
            <span class="nfq-portal-index-arrow" aria-hidden="true">↗</span>
          </RouterLink>
          <RouterLink to="/geography" class="nfq-portal-index-link"><span><strong>Geographic atlas</strong><small>Spain-first regional map · public access</small></span><span class="nfq-portal-index-arrow" aria-hidden="true">↗</span></RouterLink>
          <RouterLink to="/intelligence" class="nfq-portal-index-link">
            <span><strong>Research coverage</strong><small>Recorded evidence links and documentation gaps</small></span>
            <span class="nfq-portal-index-arrow" aria-hidden="true">↗</span>
          </RouterLink>
        </nav>
      </div>

      <div class="nfq-portal-research-notice" role="note">
        <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 10.5v6M12 7.5h.01" stroke-linecap="round"/></svg>
        <p>Research records are presented as stored. Classifications and evidence links are not independent clinical assessments.</p>
      </div>
    </main>

    <footer class="nfq-portal-footer">
      <span>neumuacFQ · CFTR research</span>
      <span>Research use · Not a clinical decision-support service</span>
    </footer>
  </div>
</template>

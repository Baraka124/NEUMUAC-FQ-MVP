<script setup lang="ts">
import {RouterLink} from 'vue-router';
</script>

<template>
  <div class="nfq-entry-landing">
    <header class="nfq-entry-header">
      <RouterLink to="/" class="nfq-entry-logo" aria-label="neumuacFQ home">
        <img src="/brand/neumuacfq-logo.png" alt="neumuacFQ · CFTR evidence, connected." />
      </RouterLink>
      <RouterLink to="/sign-in" class="nfq-entry-header-access">Staff access <span aria-hidden="true">↗</span></RouterLink>
    </header>

    <main id="main" tabindex="-1" class="nfq-entry-main">
      <div class="nfq-entry-hero">
        <section class="nfq-entry-copy" aria-labelledby="nfq-entry-heading">
          <div class="nfq-entry-eyebrow"><span class="nfq-entry-dot" aria-hidden="true"></span> CFTR RESEARCH · EVIDENCE & PROVENANCE</div>
          <h1 id="nfq-entry-heading">From variant records to <em>traceable evidence.</em></h1>
          <p class="nfq-entry-lead">An independent research workspace for exploring recorded CFTR variant identities, scientific references and the evidence available behind them.</p>
          <div class="nfq-entry-paths" aria-label="Choose how to enter">
            <RouterLink to="/workspace" class="nfq-entry-primary">
              <span><strong>Explore public research</strong><small>No account required</small></span>
              <span class="nfq-entry-action-arrow" aria-hidden="true">↗</span>
            </RouterLink>
            <RouterLink to="/sign-in" class="nfq-entry-secondary">
              <span><strong>Sign in as research staff</strong><small>For authorized accounts</small></span>
              <span aria-hidden="true">→</span>
            </RouterLink>
          </div>
          <p class="nfq-entry-assurance">Public exploration is read-only. Scientific labels reflect recorded sources, not independent clinical validation.</p>
        </section>

        <aside class="nfq-entry-preview" aria-label="Research workspace capabilities">
          <div class="nfq-entry-preview-top">
            <span class="nfq-entry-preview-kicker">THE RESEARCH WORKSPACE</span>
            <img src="/brand/neumuacfq-icon.png" alt="" class="nfq-entry-preview-mark" />
          </div>
          <div class="nfq-entry-preview-bottom">
            <h2>Evidence in context.</h2>
            <div class="nfq-entry-capability"><span>01</span><div><strong>Variant identities</strong><p>Explore recorded CFTR nomenclature and source fields.</p></div></div>
            <div class="nfq-entry-capability"><span>02</span><div><strong>Scientific references</strong><p>Follow recorded publications and source provenance.</p></div></div>
            <div class="nfq-entry-capability"><span>03</span><div><strong>Research coverage</strong><p>Examine documented evidence gaps without inferred clinical conclusions.</p></div></div>
          </div>
        </aside>
      </div>
    </main>

    <footer class="nfq-entry-footer">
      <span>neumuacFQ · CFTR research platform</span>
      <span>Research use · Not a clinical decision-support service</span>
    </footer>
  </div>
</template>

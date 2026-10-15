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
          <div class="nfq-entry-eyebrow"><span class="nfq-entry-dot" aria-hidden="true"></span> CFTR RESEARCH</div>
          <h1 id="nfq-entry-heading">CFTR variant research</h1>
          <p class="nfq-entry-lead">Search recorded CFTR variants, review linked references, compare variant records and examine research coverage.</p>
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
          <p class="nfq-entry-assurance">Public access is read-only. Recorded classifications are not independent clinical assessments.</p>
        </section>

        <aside class="nfq-entry-preview" aria-label="Research workspace capabilities">
          <div class="nfq-entry-preview-top">
            <span class="nfq-entry-preview-kicker">PUBLIC RESEARCH TOOLS</span>
            <img src="/brand/neumuacfq-icon.png" alt="" class="nfq-entry-preview-mark" />
          </div>
          <div class="nfq-entry-preview-bottom">
            <h2>Available research tools</h2>
            <div class="nfq-entry-capability"><span>01</span><div><strong>Variant search</strong><p>Recorded names, HGVS notation and aliases.</p></div></div>
            <div class="nfq-entry-capability"><span>02</span><div><strong>References</strong><p>Linked publications and recorded source information.</p></div></div>
            <div class="nfq-entry-capability"><span>03</span><div><strong>Research coverage</strong><p>Recorded evidence links and missing documentation.</p></div></div>
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

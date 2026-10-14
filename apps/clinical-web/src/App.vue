<script setup lang="ts">
import { ref, watch } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { sections } from './router';

const route = useRoute();
const mobileMenuOpen = ref(false);
watch(() => route.fullPath, () => { mobileMenuOpen.value = false; });

function closeNavigation(): void { mobileMenuOpen.value = false; }
</script>

<template>
  <div class="app-frame" @keydown.esc="closeNavigation">
    <a class="skip-link" href="#main">Skip to main content</a>

    <aside class="sidebar" aria-label="Application navigation">
      <RouterLink class="wordmark" to="/" aria-label="NeumuacFQ overview">
        <span class="wordmark-icon" aria-hidden="true"><span class="mark-line"></span><span class="mark-line"></span><span class="mark-line"></span></span>
        <span class="wordmark-text"><strong>NeumuacFQ</strong><small>CFTR research intelligence</small></span>
      </RouterLink>
      <div class="sidebar-caption">WORKSPACES</div>
      <nav class="workspace-nav" aria-label="Workspaces">
        <RouterLink v-for="(section, index) in sections" :key="section.path" :to="section.path"
          :class="{ 'variant-route-active': section.path === '/variants' && route.path.startsWith('/variants/') }">
          <span class="nav-index" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
          <span>{{ section.name }}</span>
        </RouterLink>
      </nav>
      <div class="sidebar-base">
        <span class="sidebar-rule" aria-hidden="true"></span>
        <strong>Research environment</strong>
        <span>Phase 1B · isolated prototype</span>
        <span>Not for clinical use</span>
      </div>
    </aside>

    <div class="workspace-frame">
      <header class="institution-header">
        <div class="header-location">
          <button class="mobile-menu-button" type="button" aria-controls="mobile-workspace-nav"
            :aria-expanded="mobileMenuOpen" @click="mobileMenuOpen = !mobileMenuOpen">
            <span class="hamburger" aria-hidden="true">☰</span>
            <span>{{ mobileMenuOpen ? 'Close menu' : 'Workspaces' }}</span>
          </button>
          <span class="header-path">NEUMUACFQ <span aria-hidden="true">/</span> CLINICAL WORKSPACE</span>
        </div>
        <div class="header-environment" role="status"><span class="environment-dot" aria-hidden="true"></span> Synthetic environment</div>
      </header>

      <nav v-if="mobileMenuOpen" id="mobile-workspace-nav" class="mobile-nav" aria-label="Mobile workspaces">
        <RouterLink v-for="section in sections" :key="section.path" :to="section.path" @click="closeNavigation">
          {{ section.name }}
        </RouterLink>
      </nav>

      <main id="main" tabindex="-1">
        <div class="development-notice" role="note">
          <span class="notice-symbol" aria-hidden="true">i</span>
          <div>
            <strong>Prototype environment · synthetic records only</strong>
            <p>No patient data, medical recommendations, real evidence or live data connections.</p>
          </div>
        </div>
        <RouterView />
      </main>
      <footer class="page-footer">
        <span>NeumuacFQ · Research software architecture</span>
        <span>Phase 1B design study · No clinical functionality</span>
      </footer>
    </div>
  </div>
</template>

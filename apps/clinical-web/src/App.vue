<script setup lang="ts">
import { ref, watch } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { sections } from './router';
import {authController} from './services/authSession';
import {readConfigFromEnvironment} from './services/liveVariants';

const route = useRoute();
const mobileMenuOpen = ref(false);
const availableSections = sections.slice(0, 2);
// A configured endpoint does not mean a successful authenticated connection.
const sourceConfigured = Boolean(readConfigFromEnvironment());
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
        <RouterLink v-for="(section, index) in availableSections" :key="section.path" :to="section.path"
          :class="{ 'variant-route-active': section.path === '/variants' && route.path.startsWith('/variants/') }">
          <span class="nav-index" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
          <span>{{ section.name }}</span>
        </RouterLink>
      </nav>
      <RouterLink class="staff-access-link" to="/admin">Research administration <span aria-hidden="true">→</span></RouterLink>
      <p class="sidebar-roadmap">Evidence, clinical review, genotype and reporting tools are in development.</p>
      <div class="sidebar-base">
        <span class="sidebar-rule" aria-hidden="true"></span>
        <strong>Research environment</strong>
        <span>Modernization · read-only access</span>
        <span>Clinical interpretation not migrated</span>
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
        <div class="header-environment" :class="{ 'preview-environment': !sourceConfigured }" role="status">
          <span class="environment-dot" aria-hidden="true"></span>
          <template v-if="!sourceConfigured"><span>Public catalog · snapshot available</span></template>
          <template v-else-if="authController?.state.phase==='signed-in'"><span>{{ authController.state.email || 'Signed in' }}</span><button type="button" @click="authController.signOut()">Sign out</button></template>
          <RouterLink v-else-if="authController" to="/sign-in">Sign in</RouterLink>
          <span v-else>Public research access</span>
        </div>
      </header>

      <nav v-if="mobileMenuOpen" id="mobile-workspace-nav" class="mobile-nav" aria-label="Mobile workspaces">
        <RouterLink v-for="section in availableSections" :key="section.path" :to="section.path" @click="closeNavigation">
          {{ section.name }}
        </RouterLink>
      </nav>

      <main id="main" tabindex="-1">
        <div class="development-notice" :class="{ 'preview-notice': !sourceConfigured }" role="note">
          <span class="notice-symbol" aria-hidden="true">i</span>
          <div>
            <template v-if="!sourceConfigured">
              <strong>Public research interface · verified snapshot</strong>
              <p>Explore 2,234 real CFTR variant nomenclature records captured 14 October 2026. Live synchronization and editing are not connected.</p>
            </template>
            <template v-else>
              <strong>Public CFTR catalog · read-only access</strong>
              <p>Visitors may browse approved variant nomenclature. Contributions and approvals require separate authorization.</p>
            </template>
          </div>
        </div>
        <RouterView />
      </main>
      <footer class="page-footer">
        <span>NeumuacFQ · Research software architecture</span>
        <span>{{ sourceConfigured ? 'Controlled research access · under verification' : 'Public catalog · snapshot available' }}</span>
      </footer>
    </div>
  </div>
</template>

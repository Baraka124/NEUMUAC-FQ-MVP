<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { researchWorkspaces, researchShortcuts } from './domain/researchWorkspaces';
import {authController} from './services/authSession';
import {readConfigFromEnvironment} from './services/liveVariants';

const route = useRoute();
const router=useRouter();
function goToShortcut(path:string){closeLauncher();void router.push(path);}
const routeName = computed(() => availableSections.find(section => section.path===route.path || (section.path==='/variants'&&route.path.startsWith('/variants/')))?.name || (route.path==='/admin'?'Administration':route.path==='/sign-in'?'Staff sign-in':'Research workspace'));
const isHome = computed(() => route.path==='/');
const mobileMenuOpen = ref(false);
const launcherOpen=ref(false);
const launcherQuery=ref('');
const launcherInput=ref<HTMLInputElement|null>(null);
const launcherResults=computed(()=>[...researchWorkspaces,...researchShortcuts].filter(item=>{
 const q=launcherQuery.value.trim().toLocaleLowerCase();
 return !q||[item.name,item.description,...item.keywords].some(v=>v.toLocaleLowerCase().includes(q));
}));
function openLauncher(){mobileMenuOpen.value=false;launcherQuery.value='';launcherOpen.value=true;void nextTick(()=>launcherInput.value?.focus());}
function closeLauncher(){launcherOpen.value=false;}
function keyboardShortcut(e:KeyboardEvent){
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();launcherOpen.value?closeLauncher():openLauncher();}
 if(e.key==='Escape'){closeLauncher();closeNavigation();}
}

const sidebarCollapsed = ref(false);
const NAV_STORAGE_KEY = 'nfq-sidebar-collapsed-v1';
let compactQuery: MediaQueryList | null = null;
let manualPreference: boolean | null = null;

function syncSidebarToViewport(): void {
  sidebarCollapsed.value = manualPreference ?? Boolean(compactQuery?.matches);
}

onMounted(() => {
  compactQuery = window.matchMedia('(max-width: 1180px)');
  try {
    const stored = window.localStorage.getItem(NAV_STORAGE_KEY);
    manualPreference = stored === 'true' ? true : stored === 'false' ? false : null;
  } catch { manualPreference = null; }
  syncSidebarToViewport();
  compactQuery.addEventListener('change', syncSidebarToViewport);
  window.addEventListener('keydown',keyboardShortcut);
});

onUnmounted(() => {compactQuery?.removeEventListener('change', syncSidebarToViewport);window.removeEventListener('keydown',keyboardShortcut);});

function toggleSidebar(): void {
  sidebarCollapsed.value = !sidebarCollapsed.value;
  manualPreference = sidebarCollapsed.value;
  try { window.localStorage.setItem(NAV_STORAGE_KEY, String(manualPreference)); }
  catch { /* Optional UI preference only; private storage may be unavailable. */ }
}
const availableSections = researchWorkspaces;
// A configured endpoint does not mean a successful authenticated connection.
const sourceConfigured = Boolean(readConfigFromEnvironment());
watch(() => route.fullPath, () => { mobileMenuOpen.value = false;launcherOpen.value=false; });

function closeNavigation(): void { mobileMenuOpen.value = false; }
</script>

<template>
  <div class="app-frame" :class="{ 'sidebar-collapsed': sidebarCollapsed }" @keydown.esc="closeNavigation">
    <a class="skip-link" href="#main">Skip to main content</a>

    <aside class="sidebar" aria-label="Application navigation">
      <RouterLink class="wordmark" to="/" aria-label="NeumuacFQ overview" title="NeumuacFQ overview">
        <span class="wordmark-icon" aria-hidden="true"><span class="mark-line"></span><span class="mark-line"></span><span class="mark-line"></span></span>
        <span v-if="!sidebarCollapsed" class="wordmark-text"><strong>NeumuacFQ</strong><small>CFTR research intelligence</small></span>
      </RouterLink>
      <button class="sidebar-toggle" type="button" aria-controls="primary-workspace-nav"
        :aria-expanded="!sidebarCollapsed"
        :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :title="sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'"
        @click="toggleSidebar">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path v-if="sidebarCollapsed" d="m9 5 7 7-7 7"/>
          <path v-else d="m15 5-7 7 7 7"/>
        </svg>
      </button>
      <div v-if="!sidebarCollapsed" class="sidebar-caption">WORKSPACES</div>
      <nav id="primary-workspace-nav" class="workspace-nav" aria-label="Workspaces">
        <RouterLink v-for="(section, index) in availableSections" :key="section.path" :to="section.path"
          :aria-label="section.name" :title="sidebarCollapsed ? section.name : undefined"
          :class="{ 'variant-route-active': section.path === '/variants' && route.path.startsWith('/variants/') }">
          <svg class="nav-glyph" viewBox="0 0 24 24" width="21" height="21" fill="none"
            stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <template v-if="section.path === '/'">
              <rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/>
              <rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/>
              <rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/>
              <rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>
            </template>
            <template v-else-if="section.path === '/variants'">
              <path d="M7 3c11 5 11 13 0 18M17 3C6 8 6 16 17 21"/>
              <path d="M9 6h6M7.5 10h9M7.5 14h9M9 18h6"/>
            </template>
            <template v-else><path d="M5 4h14M5 9h14M5 14h10M5 19h14"/></template>
          </svg>
          <span v-if="!sidebarCollapsed" class="nav-index" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
          <span v-if="!sidebarCollapsed" class="nav-name">{{ section.name }}</span>
        </RouterLink>
      </nav>
      <RouterLink class="staff-access-link" to="/admin" aria-label="Research administration"
        :title="sidebarCollapsed ? 'Research administration' : undefined">
        <svg class="nav-glyph" viewBox="0 0 24 24" width="21" height="21" fill="none"
          stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 3 19 6v5c0 5-3.5 8.3-7 10-3.5-1.7-7-5-7-10V6l7-3Z"/>
          <path d="M9 12h6m-3-3v6"/>
        </svg>
        <span v-if="!sidebarCollapsed" class="staff-link-name">Research administration <span aria-hidden="true">→</span></span>
      </RouterLink>
      <p v-if="!sidebarCollapsed" class="sidebar-roadmap">Clinical review and reporting tools are in development.</p>
      <div v-if="!sidebarCollapsed" class="sidebar-base">
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
          <span class="header-path">NEUMUACFQ <span aria-hidden="true">/</span> <strong>{{routeName}}</strong></span>
        </div>
        <button type="button" class="workspace-launcher-trigger" @click="openLauncher" aria-label="Open workspace switcher"><span>Search workspaces</span><kbd>Ctrl K</kbd></button>
        <div class="header-environment" :class="{ 'preview-environment': !sourceConfigured }" role="status">
          <span class="environment-dot" aria-hidden="true"></span>
          <template v-if="!sourceConfigured"><span>Live variant source · configuration pending</span></template>
          <template v-else-if="authController?.state.phase==='signed-in'"><span>{{ authController.state.email || 'Signed in' }}</span><button type="button" @click="authController.signOut()">Sign out</button></template>
          <RouterLink v-else-if="authController" to="/sign-in">Sign in</RouterLink>
          <span v-else>Public research access</span>
        </div>
      </header>

      <button v-if="mobileMenuOpen" type="button" class="mobile-nav-backdrop" tabindex="-1" aria-label="Close workspace navigation" @click="closeNavigation"></button>
      <nav v-if="mobileMenuOpen" id="mobile-workspace-nav" class="mobile-nav" aria-label="Mobile workspaces">
        <div class="mobile-nav-heading">Research workspaces <button type="button" aria-label="Close menu" @click="closeNavigation">×</button></div>
        <RouterLink v-for="section in availableSections" :key="section.path" :to="section.path" @click="closeNavigation">
          {{ section.name }}
        </RouterLink>
        <RouterLink class="mobile-admin-link" to="/admin" @click="closeNavigation">Research administration</RouterLink>
      </nav>

      <div v-if="launcherOpen" class="launcher-backdrop" @click.self="closeLauncher">
        <section role="dialog" aria-modal="true" aria-label="Research workspace switcher" class="workspace-launcher" @keydown.esc.stop="closeLauncher">
          <div class="launcher-search"><input ref="launcherInput" v-model="launcherQuery" type="search" aria-label="Find a research workspace" placeholder="Search workspaces and research shortcuts"/><button type="button" aria-label="Close workspace switcher" @click="closeLauncher">×</button></div>
          <p class="launcher-heading">WORKSPACES & RESEARCH SHORTCUTS</p>
          <div class="launcher-options"><button v-for="item in launcherResults" :key="item.id" type="button" @click="goToShortcut(item.path)"><strong>{{item.name}}</strong><span>{{item.description}}</span></button><p v-if="!launcherResults.length" role="status">No matching research workspace.</p></div>
          <p class="launcher-footnote">Only currently available workspaces are listed. Editing and review tools remain subject to separate authorization.</p>
        </section>
      </div>
      <main id="main" tabindex="-1" :class="{'home-main':isHome}">
        <div v-if="!sourceConfigured" class="development-notice" :class="{ 'preview-notice': !sourceConfigured }" role="note">
          <span class="notice-symbol" aria-hidden="true">i</span>
          <div>
            <template v-if="!sourceConfigured">
              <strong>Live CFTR research interface</strong>
              <p>Variant search uses the live source when configured. Changes and approvals are reserved for authorized staff.</p>
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

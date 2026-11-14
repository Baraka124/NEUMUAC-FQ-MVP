<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { researchWorkspaces, researchShortcuts } from './domain/researchWorkspaces';
import {connectedResearchDestination} from './domain/connectedResearchNavigation';
import {authController} from './services/authSession';
import {researcherRole} from './services/researchRole';
import {guestDesignation} from './services/guestDesignation';
import {resolveWorkspacePersona,workspaceTitle} from './domain/workspacePersona';
import {readConfigFromEnvironment} from './services/liveVariants';
import {nextResearchTheme,parseResearchTheme,RESEARCH_THEME_STORAGE_KEY,type ResearchTheme} from './domain/researchTheme';

const route = useRoute();
const router=useRouter();
const persona=computed(()=>resolveWorkspacePersona(
 authController?.state.phase??'signed-out',researcherRole.phase,researcherRole.role,guestDesignation.phase
));
const accountWorkspaceTitle=computed(()=>workspaceTitle(persona.value));
const sidebarAccessSummary=computed(()=>({
 administrator:'Administrator workspace',reviewer:'Scientific review access',
 researcher:'Research contributor',guest:'Guest · Public research',
 pending:'Access not assigned',account:'Checking research access',public:'Public research · Read only'
})[persona.value]);

function workspaceTarget(path:string){return connectedResearchDestination(path,{path:route.path,fullPath:route.fullPath,query:route.query});}
function goToShortcut(path:string){closeLauncher();void router.push(workspaceTarget(path));}
const isHome = computed(() => route.path==='/workspace');
const isOuterEntry = computed(() => route.path==='/' || route.path==='/sign-in' || route.path==='/activate' || route.path==='/recover');
const researchTheme=ref<ResearchTheme>('light');
function switchResearchTheme():void{
 researchTheme.value=nextResearchTheme(researchTheme.value);
 try{window.localStorage.setItem(RESEARCH_THEME_STORAGE_KEY,researchTheme.value);}
 catch{/* Nonessential visual preference is still active for this session. */}
}
const mobileMenuOpen = ref(false);
const launcherOpen=ref(false);
const launcherQuery=ref('');
const launcherInput=ref<HTMLInputElement|null>(null);
const launcherResults=computed(()=>[...researchWorkspaces,...researchShortcuts.map(item=>item.id==='staff'?{...item,name:accountWorkspaceTitle.value,description:'Account, verified profile and permitted research operations'}:item)].filter(item=>{
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
  sidebarCollapsed.value = manualPreference ?? false;
}

onMounted(() => {
  try{researchTheme.value=parseResearchTheme(window.localStorage.getItem(RESEARCH_THEME_STORAGE_KEY));}
  catch{researchTheme.value='light';}
  compactQuery = window.matchMedia('(max-width: 760px)');
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
  <div v-if="isOuterEntry" class="nfq-outer-shell"><a class="skip-link" href="#main">Skip to main content</a><RouterView /></div>
  <div v-else class="app-frame" :data-nfq-theme="researchTheme" :class="{ 'sidebar-collapsed': sidebarCollapsed }" @keydown.esc="closeNavigation">
    <a class="skip-link" href="#main">Skip to main content</a>

    <aside class="sidebar" aria-label="Application navigation">
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
      <div class="sidebar-scroll">
      <RouterLink class="wordmark" to="/workspace" aria-label="NeumuacFQ overview" title="NeumuacFQ overview">
        <span class="wordmark-icon" aria-hidden="true"><img src="/brand/neumuacfq-icon.png" alt="" @error="($event.target as HTMLImageElement).style.display='none'"/></span>
        <span v-if="!sidebarCollapsed" class="wordmark-text"><strong>neumuacFQ</strong><small>CFTR variant research</small></span>
      </RouterLink>

      <div v-if="!sidebarCollapsed" class="sidebar-caption">RESEARCH WORKSPACES</div>
      <nav id="primary-workspace-nav" class="workspace-nav" aria-label="Workspaces">
        <RouterLink v-for="section in availableSections" :key="section.path" :to="workspaceTarget(section.path)"
          :aria-current="(route.path===section.path || (section.path==='/variants' && route.path.startsWith('/variants/')))?'page':undefined"
          :aria-label="section.name" :title="sidebarCollapsed ? section.name : undefined"
          :class="{ 'variant-route-active': section.path === '/variants' && route.path.startsWith('/variants/') }">
          <svg class="nav-glyph" viewBox="0 0 24 24" width="21" height="21" fill="none"
            stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <template v-if="section.path === '/workspace'">
              <rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/>
              <rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/>
              <rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/>
              <rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>
            </template>
            <template v-else-if="section.path === '/variants'">
              <path d="M7 3c11 5 11 13 0 18M17 3C6 8 6 16 17 21"/>
              <path d="M9 6h6M7.5 10h9M7.5 14h9M9 18h6"/>
            </template>
            <template v-else-if="section.path === '/genotype'">
              <circle cx="8.5" cy="12" r="5.5"/><circle cx="15.5" cy="12" r="5.5"/>
            </template>
            <template v-else-if="section.path === '/intelligence'">
              <path d="M4 20V11M10 20V5M16 20V14M22 20V9"/>
            </template>
            <template v-else-if="section.path === '/geography'">
              <circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18M12 3c5 5 5 13 0 18"/>
            </template>
            <template v-else><path d="M6 5h12M6 10h12M6 15h8M6 20h12"/></template>
          </svg>
          <span v-if="!sidebarCollapsed" class="nav-name">{{ section.name }}</span>
        </RouterLink>
      </nav>
      <RouterLink class="staff-access-link" :to="workspaceTarget('/admin')" :aria-label="accountWorkspaceTitle"
        :title="sidebarCollapsed ? accountWorkspaceTitle : undefined">
        <svg class="nav-glyph" viewBox="0 0 24 24" width="21" height="21" fill="none"
          stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path v-if="persona==='administrator'" d="M12 3 19 6v5c0 5-3.5 8.3-7 10-3.5-1.7-7-5-7-10V6l7-3Z"/>
          <template v-else><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></template>
          <path v-if="persona==='administrator'" d="M9 12h6m-3-3v6"/>
        </svg>
        <span v-if="!sidebarCollapsed" class="staff-link-name">{{accountWorkspaceTitle}} <span aria-hidden="true">→</span></span>
      </RouterLink>
      <div v-if="!sidebarCollapsed" class="sidebar-base">
        <span class="sidebar-rule" aria-hidden="true"></span>
        <span>{{sidebarAccessSummary}}</span>
      </div>
      </div>
    </aside>

    <div class="workspace-frame">
      <header class="institution-header">
        <div class="header-location">
          <button class="mobile-menu-button" type="button" aria-controls="mobile-workspace-nav"
            :aria-label="mobileMenuOpen ? 'Close workspaces' : 'Open workspaces'"
            :aria-expanded="mobileMenuOpen" @click="mobileMenuOpen = !mobileMenuOpen">
            <span class="hamburger" aria-hidden="true">☰</span>
            <span>{{ mobileMenuOpen ? 'Close menu' : 'Workspaces' }}</span>
          </button>
          <RouterLink class="header-path header-overview-link" to="/workspace" aria-label="Research overview">Research</RouterLink>
        </div>
        <RouterLink class="nfq-phone-wordmark" to="/workspace" aria-label="neumuacFQ research overview"><strong>neumuac<span>FQ</span></strong></RouterLink>
        <button type="button" class="workspace-launcher-trigger" @click="openLauncher" aria-label="Open workspace switcher"><svg class="nfq-phone-launcher-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><span>Switch workspace</span><kbd>Ctrl K</kbd></button>
        <div class="nfq-header-right">
          <button type="button" class="nfq-theme-switch" data-testid="nfq-research-theme-switch"
            :aria-label="researchTheme==='light'?'Switch to midnight theme':'Switch to light theme'"
            :title="researchTheme==='light'?'Switch to midnight scientific workspace':'Switch to light scientific workspace'"
            :aria-pressed="researchTheme==='midnight'" @click="switchResearchTheme">
            <svg v-if="researchTheme==='light'" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20.9 13.2A8.7 8.7 0 0 1 10.8 3.1 8.8 8.8 0 1 0 20.9 13.2Z"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>
            </svg>
            <span class="nfq-theme-switch-label">{{researchTheme==='light'?'Midnight':'Daylight'}}</span>
          </button>
        <div class="header-environment" :class="{ 'preview-environment': !sourceConfigured }" role="status">
          <span class="environment-dot" aria-hidden="true"></span>
          <template v-if="!sourceConfigured"><span>Live variant source · configuration pending</span></template>
          <template v-else-if="authController?.state.phase==='signed-in'">
           <RouterLink class="nfq-header-profile-link" :to="workspaceTarget('/admin')" aria-label="Open my research profile">
            <span class="nfq-header-profile-mark" aria-hidden="true">FQ</span>
            <span class="nfq-header-profile-copy"><strong>My profile</strong><small>{{sidebarAccessSummary}}</small></span>
           </RouterLink>
           <button type="button" class="nfq-header-signout" aria-label="Sign out" @click="authController.signOut()">Sign out</button>
          </template>
          <RouterLink v-else-if="authController" to="/sign-in">Sign in</RouterLink>
          <span v-else>Public research access</span>
        </div>
        </div>
      </header>

      <button v-if="mobileMenuOpen" type="button" class="mobile-nav-backdrop" tabindex="-1" aria-label="Close workspace navigation" @click="closeNavigation"></button>
      <nav v-if="mobileMenuOpen" id="mobile-workspace-nav" class="mobile-nav" aria-label="Mobile workspaces">
        <div class="mobile-nav-heading">Research workspaces <button type="button" aria-label="Close menu" @click="closeNavigation">×</button></div>
        <RouterLink v-for="section in availableSections" :key="section.path" :to="workspaceTarget(section.path)" @click="closeNavigation">
          {{ section.name }}
        </RouterLink>
        <RouterLink class="mobile-admin-link" :to="workspaceTarget('/admin')" @click="closeNavigation">{{accountWorkspaceTitle}}</RouterLink>
        <div class="nfq-mobile-theme-row">
          <span>Research appearance</span>
          <button type="button" class="nfq-mobile-theme-switch"
            :aria-label="researchTheme==='light'?'Switch to midnight theme':'Switch to light theme'"
            :aria-pressed="researchTheme==='midnight'" @click="switchResearchTheme">
            {{researchTheme==='light'?'Midnight':'Daylight'}}
          </button>
        </div>
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
        <span>neumuacFQ · CFTR research</span>
        <span>{{ sourceConfigured ? 'Research information · not clinically validated' : 'Research access · source configuration pending' }}</span>
      </footer>
    </div>
  </div>
</template>

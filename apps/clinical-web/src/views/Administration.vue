<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { authController } from '../services/authSession';
import {researcherRole,refreshResearcherRole} from '../services/researchRole';

const signedIn = computed(() => authController?.state.phase === 'signed-in');
const phase = computed(() => authController?.state.phase || 'unavailable');
const identity = computed(() => signedIn.value ? authController?.state.email || 'Authenticated account' : 'No research account signed in');
</script>
<template>
 <div class="page research-admin">
  <div class="eyebrow">NEUMUACFQ / RESEARCH OPERATIONS</div>
  <h1>Research administration</h1>
  <p class="intro">An authenticated research workspace in development. This screen reports available session state and authorization readiness; it does not grant scientific or administrative permissions.</p>
  <section class="research-entry" aria-labelledby="admin-access-heading">
   <div class="research-entry-main">
    <span class="section-label">RESEARCH SESSION</span>
    <h2 id="admin-access-heading">{{ signedIn ? 'Research account signed in' : 'Research staff access' }}</h2>
    <p>{{identity}}</p>
    <p v-if="phase==='checking'" role="status">Checking the existing session…</p>
    <p v-else-if="phase==='error'" role="alert">Authentication could not be confirmed. Editing remains unavailable.</p>
    <p v-else-if="signedIn">Your Supabase session is present. This is not proof of contributor, reviewer or administrator authority.</p>
    <p v-else-if="authController">Sign in to identify your research account. Public CFTR research remains available without a session.</p>
    <p v-else>Staff authentication is not configured here. No management operations are available.</p>
    <RouterLink v-if="!signedIn && authController" class="research-entry-link" to="/sign-in">Sign in <span aria-hidden="true">→</span></RouterLink>
    <RouterLink v-else class="research-entry-link" to="/variants">Explore public variants <span aria-hidden="true">→</span></RouterLink>
   </div>
   <aside class="research-entry-aside" aria-label="Administration availability">
    <span class="section-label">PERMISSION VERIFICATION</span>
    <dl class="research-capabilities">
     <div><dt>Identity</dt><dd>{{signedIn ? 'Session present' : 'Not authenticated'}}</dd></div>
     <div><dt>Research membership</dt><dd>{{researcherRole.phase==='verified' ? researcherRole.role : researcherRole.phase==='unassigned' ? 'No assignment' : 'Not verifiable'}}</dd></div>
     <div><dt>Scientific reviewer role</dt><dd>Not verifiable</dd></div>
     <div><dt>Administrator role</dt><dd>Not verifiable</dd></div>
    </dl>
    <p v-if="signedIn&&researcherRole.phase==='unavailable'" role="alert">Role verification unavailable. No operations will be enabled.</p><button v-if="signedIn" type="button" class="evidence-more" @click="refreshResearcherRole">Recheck role</button><p>Signing in does not grant research editing privileges. Database-enforced assignments and audit controls are required before contributions are enabled.</p>
   </aside>
  </section>
  <section class="admin-readiness" aria-label="Research operations readiness">
   <h2>Scientific operations</h2>
   <div class="admin-readiness-grid">
    <article><h3>Propose evidence</h3><p>Contribution submission requires a server-side contributor permission and an attributable, auditable draft.</p><span>Not enabled</span></article>
    <article><h3>Review and validate</h3><p>Scientific review requires verified reviewer authority, provenance and controlled decisions.</p><span>Not enabled</span></article>
    <article><h3>Research governance</h3><p>Role assignment and audit administration require independently verified administrator authority.</p><span>Not enabled</span></article>
   </div>
   <p class="history-disclaimer">Legacy role-name statistics are not authenticated account assignments. This module cannot infer permissions from an email address, a client session or a claimed professional title.</p>
  </section>
 </div>
</template>
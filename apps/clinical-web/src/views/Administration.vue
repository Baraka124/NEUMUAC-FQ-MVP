<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { authController } from '../services/authSession';

const signedIn = computed(() => authController?.state.phase === 'signed-in');
</script>

<template>
  <div class="page research-admin">
    <div class="eyebrow">NEUMUACFQ / RESEARCH OPERATIONS</div>
    <h1>Research administration</h1>
    <p class="intro">A private workspace for evidence contribution, scientific review and governance. Public variant exploration remains available without an account.</p>
    <section class="research-entry" aria-labelledby="admin-access-heading">
      <div class="research-entry-main">
        <span class="section-label">ACCESS</span>
        <h2 id="admin-access-heading">{{ signedIn ? 'Signed-in research session' : 'Staff authentication' }}</h2>
        <p v-if="signedIn">Your identity is signed in. Editorial and administrative permissions must be independently confirmed before any contribution or management action is enabled.</p>
        <p v-else-if="authController">Sign in with an authorized research account to access staff-only tools. Public research remains available without signing in.</p>
        <p v-else>Staff sign-in has not yet been connected in this deployment. No management operations are exposed.</p>
        <RouterLink v-if="!signedIn && authController" class="research-entry-link" to="/sign-in">Staff sign in <span aria-hidden="true">→</span></RouterLink>
        <RouterLink v-else class="research-entry-link" to="/variants">Explore public variants <span aria-hidden="true">→</span></RouterLink>
      </div>
      <aside class="research-entry-aside" aria-label="Administration availability">
        <div class="section-label">CONTROLLED OPERATIONS</div>
        <dl class="research-capabilities">
          <div><dt>Scientific contributions</dt><dd>Awaiting authorization service</dd></div>
          <div><dt>Evidence review</dt><dd>Awaiting verified reviewer role</dd></div>
          <div><dt>User and role management</dt><dd>Not connected</dd></div>
        </dl>
        <p>Signing in is not sufficient to obtain editing privileges. All changes must be authorized and audited server-side.</p>
      </aside>
    </section>
  </div>
</template>

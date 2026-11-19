<script setup lang="ts">
import {RouterLink} from 'vue-router';
import ResearchSignInForm from './ResearchSignInForm.vue';
import ContextHelp from './ContextHelp.vue';

const props=withDefaults(defineProps<{
 idPrefix:string;
 headingId:string;
 dedicated?:boolean;
}>(),{dedicated:false});
const emit=defineEmits<{(event:'close'):void}>();
</script>

<template>
 <div class="nfq-access-panel">
  <div class="nfq-access-heading nfq-portal-login-heading nfq-login-card-heading">
   <div class="nfq-access-heading-copy">
    <p class="nfq-access-kicker">RESEARCH ACCOUNT</p>
    <h1 v-if="props.dedicated" :id="props.headingId">Research sign-in</h1>
    <h2 v-else :id="props.headingId">Research sign-in</h2>
    <p class="nfq-access-caption">Authorized accounts only</p>
   </div>
   <ContextHelp label="About account access" title="Research account access">
    <p>Research accounts are assigned by the team. Signing in does not automatically grant editing, approval or administrative permissions.</p>
    <p>Public CFTR research remains accessible without an account.</p>
   </ContextHelp>
  </div>

  <ResearchSignInForm :id-prefix="props.idPrefix"/>

  <nav class="nfq-access-links" aria-label="Research access options">
   <RouterLink to="/recover" class="nfq-access-text-link">Reset password</RouterLink>
   <button v-if="!props.dedicated" type="button" class="nfq-access-text-link nfq-portal-back" @click="emit('close')">Return to research tools</button>
   <RouterLink v-else to="/variants" class="nfq-access-text-link nfq-signin-public-link">Continue without signing in</RouterLink>
  </nav>
 </div>
</template>

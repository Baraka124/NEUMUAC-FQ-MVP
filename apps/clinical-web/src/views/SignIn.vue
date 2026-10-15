<script setup lang="ts">
import {ref} from 'vue';
import {RouterLink,useRouter} from 'vue-router';
import {authController} from '../services/authSession';
const email=ref(''),password=ref(''),busy=ref(false),router=useRouter();
async function submit(){if(!authController||busy.value)return;busy.value=true;try{if(await authController.signIn(email.value,password.value)){password.value='';await router.replace('/admin');}}finally{busy.value=false;}}
</script>
<template>
 <div class="nfq-entry-landing nfq-entry-signin"><header class="nfq-entry-header"><RouterLink to="/" class="nfq-entry-logo" aria-label="neumuacFQ home"><img src="/brand/neumuacfq-logo.png" alt="neumuacFQ · CFTR evidence, connected." /></RouterLink><RouterLink class="nfq-entry-header-access" to="/workspace">Explore research ↗</RouterLink></header><main id="main" tabindex="-1" class="nfq-entry-main"><div class="page staff-signin nfq-entry-page">
  <div class="nfq-signin-brand"><img src="/brand/neumuacfq-logo.png" alt="neumuacFQ · CFTR evidence, connected." /><span>STAFF ACCESS · SECURE RESEARCH ENVIRONMENT</span></div>
  <h1>Continue your research.</h1>
  <p class="intro">Sign in with your authorized research account. The public CFTR evidence workspace remains available without an account.</p>
  <section class="research-entry" aria-labelledby="staff-signin-title">
   <div class="research-entry-main">
    <div class="section-label">SECURE SESSION</div>
    <h2 id="staff-signin-title">Research account</h2>
    <p v-if="!authController" role="status">Staff authentication is not configured in this deployment. Public variant exploration remains available.</p>
    <form v-else class="staff-signin-form" @submit.prevent="submit">
     <label for="auth-email">Email address</label><input id="auth-email" v-model="email" type="email" autocomplete="username" required/>
     <label for="auth-password">Password</label><input id="auth-password" v-model="password" type="password" autocomplete="current-password" required/>
     <p v-if="authController.state.message" role="alert">{{authController.state.message}}</p>
     <button type="submit" :disabled="busy">{{busy?'Signing in…':'Sign in'}}</button>
    </form>
    <RouterLink class="research-entry-link" to="/variants">Continue without signing in <span aria-hidden="true">→</span></RouterLink>
   </div>
   <aside class="research-entry-aside" aria-label="Account permissions">
    <div class="section-label">ACCOUNT PERMISSIONS</div>
    <p>Accounts are assigned permissions by the research team. Signing in does not automatically enable editing, approval or administrative operations.</p>
    <p>There is no public registration or self-assigned administrator role.</p>
   </aside>
  </section>
 </div></main><footer class="nfq-entry-footer"><span>neumuacFQ · Authorized research access</span><RouterLink to="/">Back to home</RouterLink></footer></div>
</template>

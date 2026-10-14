<script setup lang="ts">
import {ref} from 'vue';
import {useRouter} from 'vue-router';
import {authController} from '../services/authSession';
const email=ref(''),password=ref(''),busy=ref(false),router=useRouter();
async function submit(){if(!authController||busy.value)return;busy.value=true;try{if(await authController.signIn(email.value,password.value)){password.value='';await router.replace('/variants');}}finally{busy.value=false;}}
</script>
<template><div class="page"><div class="eyebrow">AUTHORIZED RESEARCH ACCESS</div><h1>Sign in</h1><p class="intro">Access to research records requires an authorized Supabase account. No open registration or anonymous clinical access is available in this workspace.</p><section class="surface auth-surface" aria-label="Research sign in"><p v-if="!authController" role="status">Authentication is not configured for this environment.</p><form v-else @submit.prevent="submit"><label for="auth-email">Email address</label><input id="auth-email" v-model="email" type="email" autocomplete="username" required/><label for="auth-password">Password</label><input id="auth-password" v-model="password" type="password" autocomplete="current-password" required/><p v-if="authController.state.message" role="alert">{{authController.state.message}}</p><button type="submit" :disabled="busy">{{busy?'Signing in…':'Sign in'}}</button></form></section></div></template>

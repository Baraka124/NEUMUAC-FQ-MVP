<script setup lang="ts">
import {ref} from 'vue';
import {useRouter} from 'vue-router';
import {authController} from '../services/authSession';

const props=withDefaults(defineProps<{idPrefix?:string}>(),{idPrefix:'research-auth'});
const email=ref(''),password=ref(''),passwordVisible=ref(false),busy=ref(false),router=useRouter();
async function submit():Promise<void>{
 if(!authController||busy.value)return;
 busy.value=true;
 try{
  if(await authController.signIn(email.value,password.value)){
   password.value='';
   passwordVisible.value=false;
   await router.replace('/admin');
  }
 }finally{busy.value=false;}
}
</script>

<template>
 <div class="nfq-account-form">
  <p v-if="!authController" role="status" class="nfq-account-unavailable">Account sign-in is not configured in this deployment. Public research remains available.</p>
  <form v-else class="staff-signin-form nfq-account-fields" @submit.prevent="submit">
   <label :for="props.idPrefix+'-email'">Email address</label>
   <input :id="props.idPrefix+'-email'" v-model="email" type="email" autocomplete="username" required />
   <label :for="props.idPrefix+'-password'">Password</label>
   <div class="nfq-password-control">
    <input :id="props.idPrefix+'-password'" v-model="password" :type="passwordVisible?'text':'password'" autocomplete="current-password" required />
    <button class="nfq-password-toggle" type="button" :aria-label="passwordVisible?'Hide password':'Show password'" :aria-pressed="passwordVisible" @click="passwordVisible=!passwordVisible">
     <svg v-if="passwordVisible" width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18M10.6 5.2A11.4 11.4 0 0 1 12 5c5.1 0 8.8 4.1 10 7a12.5 12.5 0 0 1-3.2 4.5M6.2 6.1C3.9 7.6 2.7 10 2 12c1.2 2.9 4.9 7 10 7a9.7 9.7 0 0 0 3.1-.5M9.9 9.8a3 3 0 0 0 4.3 4.3"/></svg>
     <svg v-else width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.7-7 10-7 10 7 10 7-3.7 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
    </button>
   </div>
   <p v-if="authController.state.message" role="alert">{{authController.state.message}}</p>
   <button type="submit" :disabled="busy">{{busy?'Signing in…':'Sign in'}}</button>
  </form>
 </div>
</template>

<style scoped>
.nfq-account-fields{display:grid;gap:9px;margin:0}
.nfq-account-fields label{font-size:12px;color:#385869;font-weight:680}
.nfq-account-fields input{min-height:45px;width:100%;padding:11px 13px;border:1px solid #cbdad7;border-radius:6px;background:#fff;color:#153b44;font:inherit;font-size:14px}
.nfq-account-fields input:focus-visible{outline:3px solid #008f90;outline-offset:2px}
.nfq-password-control{position:relative;min-width:0}
.nfq-password-control input{padding-right:56px}
.nfq-account-fields .nfq-password-toggle{position:absolute;top:50%;right:2px;transform:translateY(-50%);display:grid;place-items:center;width:44px;height:44px;min-height:44px;padding:0;margin:0;border:0;border-radius:6px;background:transparent;color:#416d60;cursor:pointer}
.nfq-account-fields .nfq-password-toggle:hover{background:#edf5ef;color:#244e3b}
.nfq-account-fields .nfq-password-toggle:focus-visible{outline:3px solid #26866a;outline-offset:1px}
.nfq-account-fields button{min-height:47px;border:1px solid #12354c;border-radius:6px;padding:10px 18px;background:#12354c;color:#fff;font-size:13px;font-weight:710;cursor:pointer;margin-top:8px}
.nfq-account-fields button:hover{background:#1e5065}
.nfq-account-fields button:disabled{opacity:.65;cursor:wait}
.nfq-account-unavailable{color:#596e73;font-size:13px;line-height:1.6;margin:0}
</style>

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
/* A field is a field, not a dashboard tile; the single real submit action
   retains a measured solid treatment. Auth logic and feedback are unchanged. */
.nfq-account-fields{
 display:grid;
 grid-template-columns:minmax(0,1fr);
 gap:8px;
 margin:0;
 min-width:0;
}
.nfq-account-fields label{
 display:block;
 color:#395a4c;
 font-size:11.5px;
 line-height:1.4;
 font-weight:620;
 letter-spacing:0;
}
.nfq-account-fields label:not(:first-child){margin-top:5px}
.nfq-account-fields input{
 display:block;
 width:100%;
 min-width:0;
 min-height:40px;
 padding:8px 11px;
 border:1px solid #bfcec5;
 border-radius:5px;
 background:#fff;
 color:#19372d;
 font:inherit;
 font-size:13px;
 font-weight:450;
 line-height:1.5;
 box-shadow:none;
 outline:none;
}
.nfq-account-fields input:hover{border-color:#9db8a9}
.nfq-account-fields input:focus-visible{
 border-color:#397962;
 outline:2px solid #397962;
 outline-offset:1px;
}
/* Chrome/Edge credentials are often autofilled. Their default saturated
   blue field backgrounds clash with the otherwise neutral clinical form. */
.nfq-account-fields input:-webkit-autofill,
.nfq-account-fields input:-webkit-autofill:hover,
.nfq-account-fields input:-webkit-autofill:focus{
 -webkit-text-fill-color:#19372d;
 -webkit-box-shadow:0 0 0 1000px #fff inset;
 box-shadow:0 0 0 1000px #fff inset;
 caret-color:#19372d;
}
.nfq-password-control{position:relative;min-width:0}
.nfq-password-control input{padding-right:48px}
.nfq-account-fields .nfq-password-toggle{
 position:absolute;
 top:50%;
 right:2px;
 transform:translateY(-50%);
 display:grid;
 place-items:center;
 width:40px;
 height:40px;
 min-width:40px;
 min-height:40px;
 padding:0;
 margin:0;
 border:0;
 border-radius:4px;
 background:transparent;
 color:#47695d;
 box-shadow:none;
 cursor:pointer;
}
.nfq-account-fields .nfq-password-toggle:hover{background:#f2f6f3;color:#244e3b}
.nfq-account-fields .nfq-password-toggle:focus-visible{
 outline:2px solid #397962;
 outline-offset:1px;
}
.nfq-account-fields .nfq-password-toggle svg{width:17px;height:17px}
.nfq-account-fields button[type="submit"]{
 justify-self:start;
 width:auto;
 min-width:110px;
 min-height:40px;
 margin:8px 0 0;
 padding:8px 19px;
 display:inline-flex;
 align-items:center;
 justify-content:center;
 border:1px solid #193e34;
 border-radius:5px;
 background:#193e34;
 color:#fff;
 font-size:12px;
 font-weight:620;
 line-height:1.4;
 letter-spacing:0;
 box-shadow:none;
 cursor:pointer;
}
.nfq-account-fields button[type="submit"]:hover:not(:disabled){
 background:#28574b;
 border-color:#28574b;
}
.nfq-account-fields button[type="submit"]:focus-visible{
 outline:2px solid #397962;
 outline-offset:2px;
}
.nfq-account-fields button[type="submit"]:disabled{opacity:.6;cursor:wait}
.nfq-account-fields p[role="alert"]{
 margin:2px 0;
 font-size:12px;
 line-height:1.55;
 color:#955149;
}
.nfq-account-unavailable{
 margin:0;
 max-width:39ch;
 font-size:12px;
 line-height:1.55;
 color:#586f65;
}
@media(max-width:480px){
 /* Avoid mobile browser zoom on focused sign-in fields. */
 .nfq-account-fields input{font-size:16px}
}
</style>

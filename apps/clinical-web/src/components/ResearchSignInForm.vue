<script setup lang="ts">
import {ref} from 'vue';
import {useRouter} from 'vue-router';
import {authController} from '../services/authSession';

const props=withDefaults(defineProps<{idPrefix?:string}>(),{idPrefix:'research-auth'});
const email=ref(''),password=ref(''),busy=ref(false),router=useRouter();
async function submit():Promise<void>{
 if(!authController||busy.value)return;
 busy.value=true;
 try{
  if(await authController.signIn(email.value,password.value)){
   password.value='';
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
   <input :id="props.idPrefix+'-password'" v-model="password" type="password" autocomplete="current-password" required />
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
.nfq-account-fields button{min-height:47px;border:1px solid #12354c;border-radius:6px;padding:10px 18px;background:#12354c;color:#fff;font-size:13px;font-weight:710;cursor:pointer;margin-top:8px}
.nfq-account-fields button:hover{background:#1e5065}
.nfq-account-fields button:disabled{opacity:.65;cursor:wait}
.nfq-account-unavailable{color:#596e73;font-size:13px;line-height:1.6;margin:0}
</style>

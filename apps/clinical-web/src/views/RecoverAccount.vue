<script setup lang="ts">
import {ref} from 'vue';
import {RouterLink} from 'vue-router';
import {authController} from '../services/authSession';
const address=ref('');
const busy=ref(false);
const sent=ref(false);
const error=ref(false);
async function submit(){
 if(busy.value||!authController)return;
 busy.value=true;error.value=false;
 try{
  const ok=await authController.requestPasswordRecovery(address.value);
  if(ok){sent.value=true;address.value='';}
  else error.value=true;
 }finally{busy.value=false;}
}
</script>
<template>
 <main id="main" tabindex="-1" class="nfq-recovery-page">
  <section class="nfq-recovery-panel">
   <img src="/brand/neumuacfq-logo.png" alt="neumuacFQ" class="nfq-recovery-logo"/>
   <h1>Account password recovery</h1>
   <p>Enter your registered research email. If the account exists, you will receive an email to choose a new password.</p>
   <form v-if="!sent" @submit.prevent="submit">
    <label for="nfq-recovery-email">Research email</label>
    <input id="nfq-recovery-email" v-model="address" type="email" autocomplete="email" required maxlength="254"/>
    <button type="submit" :disabled="busy||!authController">{{busy?'Sending…':'Send recovery email'}}</button>
   </form>
   <p v-else role="status">If this address is registered, a password-recovery email has been requested. Check your inbox and spam folder.</p>
   <p v-if="error" role="alert">Recovery could not be requested. Try again or contact the research administrator.</p>
   <RouterLink to="/sign-in">Return to sign-in</RouterLink>
  </section>
 </main>
</template>
<style scoped>
.nfq-recovery-page{min-height:75dvh;display:grid;place-items:center;padding:clamp(20px,5vw,70px);background:#fafbf9;color:#223c45}
.nfq-recovery-panel{width:min(100%,480px);padding:28px;border:1px solid #d7e1df;background:#fff;border-radius:7px}
.nfq-recovery-logo{max-width:175px;max-height:74px;object-fit:contain;margin-bottom:18px}
.nfq-recovery-panel h1{font-size:clamp(23px,3vw,31px);line-height:1.2;letter-spacing:-.035em}
.nfq-recovery-panel p{font-size:13px;line-height:1.7;color:#5b7079}
.nfq-recovery-panel form{display:grid;gap:12px;margin:22px 0}
.nfq-recovery-panel label{font-size:12px;font-weight:650}
.nfq-recovery-panel input{min-height:44px;border:1px solid #b9c9cc;border-radius:5px;padding:10px 12px;background:#fff;color:#223c45}
.nfq-recovery-panel button{min-height:43px;padding:10px 18px;border:0;border-radius:5px;background:#193d4b;color:#fff;font-weight:650;cursor:pointer}
.nfq-recovery-panel button:disabled{opacity:.55}
.nfq-recovery-panel a{display:inline-flex;margin-top:12px;color:#265c69;font-size:13px}
</style>
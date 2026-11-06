<script setup lang="ts">
import {ref} from 'vue';
import {RouterLink} from 'vue-router';
import {invitationActivation,finishInvitation} from '../services/invitationActivation';
const password=ref(''),confirm=ref(''),busy=ref(false),notice=ref('');
async function submit(){
 if(busy.value||invitationActivation.phase!=='ready')return;
 if(password.value!==confirm.value){notice.value='Passwords do not match.';return;}
 busy.value=true;notice.value='';
 try{
  const ok=await finishInvitation(password.value);
  if(ok){password.value='';confirm.value='';}
  else notice.value=invitationActivation.message;
 }finally{busy.value=false;}
}
</script>
<template>
 <main id="main" class="nfq-invite-page" tabindex="-1">
  <section class="nfq-invite-panel" aria-labelledby="invite-title">
   <img class="nfq-invite-logo" src="/brand/neumuacfq-logo.png" alt="neumuacFQ"/>
   <h1 id="invite-title">Activate your research account</h1>
   <p class="nfq-invite-desc">Choose your own password. An account does not automatically grant access to scientific editing or approval.</p>
   <p v-if="invitationActivation.phase==='verifying'" role="status">Verifying invitation…</p>
   <p v-else-if="invitationActivation.phase==='error'" role="alert">{{invitationActivation.message}}</p>
   <form v-else-if="invitationActivation.phase==='ready'" class="nfq-invite-form" @submit.prevent="submit">
    <label for="nfq-new-password">New password</label>
    <input id="nfq-new-password" v-model="password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required/>
    <label for="nfq-confirm-password">Confirm new password</label>
    <input id="nfq-confirm-password" v-model="confirm" type="password" autocomplete="new-password" minlength="12" maxlength="128" required/>
    <p class="nfq-invite-desc">Use at least 12 characters and a unique password. Your administrator will never need to know it.</p>
    <p v-if="notice" role="alert">{{notice}}</p>
    <button type="submit" :disabled="busy||!password||!confirm">{{busy?'Saving…':'Create password'}}</button>
   </form>
   <div v-else-if="invitationActivation.phase==='complete'">
    <p role="status">Your password is set. Your account is ready to sign in; research permissions remain independently assigned.</p>
    <RouterLink to="/admin" class="nfq-invite-continue">Open research workspace</RouterLink>
   </div>
   <p v-else role="status">Open the invitation link from your email to activate your account.</p>
   <RouterLink v-if="invitationActivation.phase!=='complete'" to="/sign-in" class="nfq-invite-back">Return to sign-in</RouterLink>
  </section>
 </main>
</template>
<style scoped>
.nfq-invite-page{min-height:75dvh;display:grid;place-items:center;padding:clamp(20px,5vw,70px);background:#fafbf9;color:#223c45}
.nfq-invite-panel{width:min(100%,480px);padding:28px;border:1px solid #d7e1df;background:#fff;border-radius:7px}
.nfq-invite-logo{width:175px;height:auto;max-height:74px;object-fit:contain;object-position:left center;margin-bottom:19px}
.nfq-invite-panel h1{font-size:clamp(23px,3vw,31px);font-weight:720;letter-spacing:-.035em;line-height:1.2;margin:0 0 12px}
.nfq-invite-desc{color:#5b7079;font-size:13px;line-height:1.6}
.nfq-invite-form{display:grid;gap:10px;margin:21px 0}
.nfq-invite-form label{font-size:12px;font-weight:650}
.nfq-invite-form input{min-height:43px;padding:10px 12px;border:1px solid #b9c9cc;border-radius:5px;background:#fff;color:#223c45}
.nfq-invite-form button,.nfq-invite-continue{display:inline-flex;justify-content:center;align-items:center;min-height:43px;padding:10px 18px;border-radius:5px;border:1px solid #193d4b;background:#193d4b;color:#fff;font-size:13px;font-weight:650;text-decoration:none}
.nfq-invite-form button:disabled{opacity:.55}
.nfq-invite-back{display:inline-flex;font-size:13px;margin-top:20px;color:#265c69}
</style>
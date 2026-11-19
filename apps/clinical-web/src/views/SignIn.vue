<script setup lang="ts">
import {RouterLink} from 'vue-router';
import ResearchSignInForm from '../components/ResearchSignInForm.vue';
import ContextHelp from '../components/ContextHelp.vue';
</script>

<template>
 <div class="nfq-entry-landing nfq-entry-signin nfq-signin-institutional">
  <header class="nfq-entry-header nfq-signin-masthead">
   <RouterLink to="/" class="nfq-entry-logo" aria-label="neumuacFQ home">
    <img src="/brand/neumuacfq-logo.png" alt="neumuacFQ" />
   </RouterLink>
   <RouterLink to="/workspace" class="nfq-signin-header-link">Explore public research <span aria-hidden="true">↗</span></RouterLink>
  </header>

  <main id="main" tabindex="-1" class="nfq-entry-main nfq-signin-main">
   <section class="nfq-signin-stage" aria-labelledby="nfq-signin-title">
    <div class="nfq-signin-context">
      <p class="nfq-signin-eyebrow">CFTR RESEARCH · ACCOUNT ACCESS</p>
      <h2>Research access</h2>
      <p>Public records remain accessible without signing in. Research accounts provide access to assigned capabilities and authorized workflows.</p>
    </div>
    <div class="nfq-login-card">
     <div class="nfq-login-card-heading">
      <div>
       <h1 id="nfq-signin-title">Research sign-in</h1>
       <p>Authorized accounts</p>
      </div>
      <ContextHelp label="About account access" title="Research account access">
       <p>Research accounts are assigned by the team. Signing in does not automatically grant editing, approval or administrative permissions.</p>
       <p>Public CFTR research remains accessible without an account. This sign-in uses the configured research authentication service.</p>
      </ContextHelp>
     </div>
     <ResearchSignInForm id-prefix="dedicated-account" />
     <RouterLink to="/recover" class="nfq-signin-public-link">Reset password</RouterLink>
     <RouterLink class="nfq-signin-public-link" to="/variants">Continue without signing in <span aria-hidden="true">→</span></RouterLink>
    </div>
   </section>
  </main>

  <footer class="nfq-entry-footer nfq-signin-footer">
   <span>neumuacFQ · CFTR research</span>
   <RouterLink to="/">Back to home</RouterLink>
  </footer>
 </div>
</template>

<style scoped>
/* Dedicated authentication route uses the same institutional reading
   language as the public gateway. No decorative helix, glass, or hero tile. */
.nfq-signin-institutional{
 min-height:100dvh;
 display:flex;
 flex-direction:column;
 background:#fbfcfa;
 color:#183631;
 font-family:'IBM Plex Sans',Inter,'Segoe UI',system-ui,sans-serif;
 -webkit-font-smoothing:antialiased;
}
.nfq-signin-masthead{
 width:min(1240px,100%);
 min-height:104px;
 margin-inline:auto;
 padding-inline:clamp(22px,3.5vw,48px);
 display:flex;
 align-items:center;
 justify-content:space-between;
 gap:16px;
 border-bottom:1px solid #dfe7e2;
}
.nfq-signin-masthead .nfq-entry-logo{
 flex:0 0 auto;
 display:flex;
 align-items:center;
 min-width:0;
}
.nfq-signin-masthead .nfq-entry-logo img{
 width:175px;
 height:83px;
 max-width:100%;
 object-fit:contain;
 object-position:left center;
}
.nfq-signin-header-link{
 display:inline-flex;
 align-items:center;
 gap:9px;
 min-height:38px;
 color:#2d594a;
 font-size:12px;
 font-weight:590;
 text-decoration:none;
 white-space:nowrap;
}
.nfq-signin-header-link:hover{text-decoration:underline;text-underline-offset:3px}
.nfq-signin-institutional .nfq-signin-main{
 flex:1;
 display:flex;
 flex-direction:column;
 justify-content:flex-start;
 width:min(1240px,100%);
 max-width:none;
 min-height:0;
 margin-inline:auto;
 padding:clamp(42px,8vh,80px) clamp(22px,3.5vw,48px) 24px;
}
.nfq-signin-stage{
 display:grid;
 grid-template-columns:minmax(0,1.1fr) minmax(305px,.8fr);
 align-items:start;
 gap:clamp(32px,4.5vw,72px);
 min-height:0;
 padding:0;
 margin:0;
 border-radius:0;
 background:transparent;
 border:0;
 box-shadow:none;
 overflow:visible;
}
.nfq-signin-context{
 min-width:0;
 padding:6px 0 0;
}
.nfq-signin-eyebrow{
 color:#416f60;
 font-size:10px;
 font-weight:650;
 letter-spacing:.07em;
 line-height:1.45;
 margin:0;
}
.nfq-signin-context h2{
 margin:20px 0 18px;
 max-width:15ch;
 color:#183631;
 font:500 clamp(42px,4.2vw,60px)/1.07 'Iowan Old Style','Baskerville',Georgia,serif;
 letter-spacing:-.053em;
}
.nfq-signin-context p:not(.nfq-signin-eyebrow){
 max-width:490px;
 margin:0;
 color:#4d6960;
 font-size:15px;
 line-height:1.66;
}
.nfq-login-card{
 position:relative;
 z-index:1;
 width:min(100%,390px);
 min-width:0;
 margin:0;
 padding:6px 0 0 clamp(22px,2.6vw,34px);
 border:0;
 border-left:1px solid #dfe7e2;
 border-radius:0;
 background:transparent;
 box-shadow:none;
 -webkit-backdrop-filter:none;
 backdrop-filter:none;
}
.nfq-login-card-heading{
 display:flex;
 align-items:flex-start;
 justify-content:space-between;
 gap:12px;
 margin:0 0 22px;
}
.nfq-login-card-heading h1{
 font:500 clamp(26px,2.6vw,33px)/1.16 'Iowan Old Style','Baskerville',Georgia,serif;
 letter-spacing:-.042em;
 margin:4px 0 0;
 color:#183631;
}
.nfq-login-card-heading p{
 color:#697e74;
 font-size:11px;
 line-height:1.45;
 margin:6px 0 0;
}
.nfq-login-card :deep(.nfq-account-fields){gap:8px}
.nfq-login-card :deep(.nfq-account-fields label){
 font-size:11.5px;
 font-weight:600;
 color:#395a4c;
}
.nfq-login-card :deep(.nfq-account-fields input){
 min-height:40px;
 padding:8px 11px;
 border:1px solid #bfcec5;
 border-radius:5px;
 background:#fff;
 color:#19372d;
 font-size:13px;
 box-shadow:none;
}
.nfq-login-card :deep(.nfq-account-fields input:focus-visible){
 outline:2px solid #397962;
 outline-offset:2px;
}
.nfq-login-card :deep(.nfq-account-fields button[type="submit"]){
 justify-self:start;
 width:auto;
 min-height:40px;
 margin-top:7px;
 padding:8px 19px;
 border:1px solid #193e34;
 border-radius:5px;
 background:#193e34;
 color:#fff;
 font-size:12px;
 box-shadow:none;
}
.nfq-login-card :deep(.nfq-account-fields button[type="submit"]:hover){background:#28574b}
.nfq-login-card :deep(.nfq-account-unavailable){font-size:12px;line-height:1.55}
.nfq-signin-public-link{
 display:inline-flex;
 align-items:center;
 gap:7px;
 min-height:31px;
 margin:10px 20px 0 0;
 color:#2c654f;
 text-decoration:none;
 font-size:11.5px;
 font-weight:530;
}
.nfq-signin-public-link:hover{text-decoration:underline;text-underline-offset:3px}
.nfq-signin-institutional .nfq-signin-footer{
 width:min(1240px,100%);
 display:flex;
 justify-content:space-between;
 align-items:center;
 gap:15px;
 margin-inline:auto;
 padding:14px clamp(22px,3.5vw,48px);
 border-top:1px solid #dfe7e2;
 color:#697e74;
 font-size:10.5px;
}
.nfq-signin-footer a{color:#2c654f;text-decoration:none}
.nfq-signin-footer a:hover{text-decoration:underline;text-underline-offset:3px}
.nfq-signin-institutional :is(a,button,summary):focus-visible{
 outline:2px solid #2b725f;
 outline-offset:3px;
}
@media(max-width:850px){
 .nfq-signin-stage{grid-template-columns:minmax(0,1fr) minmax(285px,.92fr);gap:28px}
 .nfq-signin-context h2{font-size:clamp(38px,5vw,48px)}
 .nfq-signin-context p:not(.nfq-signin-eyebrow){font-size:13px}
}
@media(max-width:760px){
 .nfq-signin-masthead{min-height:92px}
 .nfq-signin-masthead .nfq-entry-logo img{width:153px;height:72px}
 .nfq-signin-institutional .nfq-signin-main{justify-content:flex-start;padding-block:23px}
 .nfq-signin-stage{grid-template-columns:minmax(0,1fr);gap:0}
 /* The approved logo and form title already orient mobile readers. Avoid
    repeating a second tall editorial introduction above the form. */
 .nfq-signin-context{display:none}
 .nfq-login-card{padding:8px 0 0;border-left:0;max-width:390px;width:100%}
}
@media(max-width:420px){
 .nfq-signin-masthead{min-height:82px}
 .nfq-signin-masthead .nfq-entry-logo img{width:128px;height:61px}
 .nfq-signin-header-link{font-size:11px;white-space:normal;max-width:132px;text-align:right}
 .nfq-login-card-heading h1{font-size:28px}
}
@media(max-width:600px){
 .nfq-login-card :deep(.nfq-context-help){position:static}
 .nfq-login-card :deep(.nfq-context-help-panel){
  position:absolute;
  top:60px;
  left:4px;
  right:4px;
  width:auto;
  max-height:min(52vh,290px);
 }
}
</style>

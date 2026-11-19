<script setup lang="ts">
import {ref} from 'vue';
import {RouterLink} from 'vue-router';
import ResearchSignInForm from '../components/ResearchSignInForm.vue';
import ContextHelp from '../components/ContextHelp.vue';
const loginOpen=ref(false);
</script>

<template>
  <div class="nfq-portal-landing">
    <header class="nfq-portal-masthead">
      <RouterLink to="/" class="nfq-portal-brand" aria-label="neumuacFQ home">
        <img src="/brand/neumuacfq-logo.png" alt="neumuacFQ · CFTR evidence, connected." />
      </RouterLink>
      <div class="nfq-portal-masthead-right">
        <span class="nfq-portal-header-context">CFTR RESEARCH · PUBLIC ACCESS</span>
        <button type="button" class="nfq-portal-header-link" :aria-expanded="loginOpen" aria-controls="nfq-portal-account" @click="loginOpen=!loginOpen">{{loginOpen?'Research tools':'Sign in'}} <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <main id="main" tabindex="-1" class="nfq-portal-content">
      <div class="nfq-portal-layout">
        <section class="nfq-portal-intro" aria-labelledby="nfq-entry-heading">
          <p class="nfq-portal-kicker">PUBLIC RESEARCH ACCESS</p>
          <h1 id="nfq-entry-heading">CFTR variant research</h1>
          <p class="nfq-portal-description">A research workspace for recorded CFTR variants, scientific references and evidence review.</p>

          <div class="nfq-portal-actions" aria-label="Choose how to enter">
            <RouterLink to="/workspace" class="nfq-portal-enter">
              <span>Explore public research</span>
              <svg viewBox="0 0 24 24" aria-hidden="true" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
            </RouterLink>
          </div>
          <p class="nfq-portal-access-note">Public research is available without an account.</p>
        </section>

        <section v-if="loginOpen" id="nfq-portal-account" class="nfq-portal-account nfq-portal-login-card" aria-labelledby="nfq-portal-account-title">
          <div class="nfq-portal-login-heading">
            <div><h2 id="nfq-portal-account-title">Research sign-in</h2><p>Authorized accounts</p></div>
            <ContextHelp label="About account access" title="Research account access">
              <p>Research accounts are assigned by the team. Signing in does not automatically grant editing, approval or administrative permissions.</p>
              <p>Public CFTR research remains accessible without an account.</p>
            </ContextHelp>
          </div>
          <ResearchSignInForm id-prefix="entry-account"/>
          <div class="nfq-portal-account-links">
            <RouterLink to="/recover" class="nfq-portal-recover">Reset password</RouterLink>
            <button type="button" class="nfq-portal-back" @click="loginOpen=false">← Return to research tools</button>
          </div>
        </section>
        <nav v-else class="nfq-portal-index" aria-labelledby="nfq-portal-index-heading">
          <div class="nfq-portal-index-top">
            <p class="nfq-portal-kicker">WORKSPACE DIRECTORY</p>
            <h2 id="nfq-portal-index-heading">Research tools</h2>
          </div>
          <RouterLink to="/variants" class="nfq-portal-index-link">
            <span><strong>Variant records</strong><small>Names, HGVS notation and recorded aliases</small></span>
            <span class="nfq-portal-index-arrow" aria-hidden="true">↗</span>
          </RouterLink>
          <RouterLink to="/evidence" class="nfq-portal-index-link">
            <span><strong>Scientific references</strong><small>Recorded publications and source information</small></span>
            <span class="nfq-portal-index-arrow" aria-hidden="true">↗</span>
          </RouterLink>
          <RouterLink to="/genotype" class="nfq-portal-index-link">
            <span><strong>Variant-pair research</strong><small>Exploratory comparison of two recorded variants</small></span>
            <span class="nfq-portal-index-arrow" aria-hidden="true">↗</span>
          </RouterLink>
          <RouterLink to="/geography" class="nfq-portal-index-link"><span><strong>Geographic atlas</strong><small>Spain-first regional map · public access</small></span><span class="nfq-portal-index-arrow" aria-hidden="true">↗</span></RouterLink>
          <RouterLink to="/intelligence" class="nfq-portal-index-link">
            <span><strong>Research coverage</strong><small>Recorded evidence links and documentation gaps</small></span>
            <span class="nfq-portal-index-arrow" aria-hidden="true">↗</span>
          </RouterLink>
        </nav>
      </div>

      <div class="nfq-portal-research-notice" role="note">
        <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 10.5v6M12 7.5h.01" stroke-linecap="round"/></svg>
        <p>Research records are presented as stored. Classifications and evidence links are not independent clinical assessments.</p>
      </div>
    </main>

    <footer class="nfq-portal-footer">
      <span>neumuacFQ · CFTR research</span>
      <span>Research use · Not a clinical decision-support service</span>
    </footer>
  </div>
</template>

<style scoped>
/* Public research gateway · editorial, task-led and consistent with the
   clinical application. The approved PNG logo is never redrawn or replaced. */
.nfq-portal-landing{
 --portal-ink:#183631;
 --portal-secondary:#4d6960;
 --portal-muted:#697e74;
 --portal-line:#dfe7e2;
 --portal-action:#193e34;
 min-height:100dvh;
 display:flex;
 flex-direction:column;
 background:#fbfcfa;
 color:var(--portal-ink);
 font-family:'IBM Plex Sans',Inter,'Segoe UI',system-ui,sans-serif;
 font-kerning:normal;
 -webkit-font-smoothing:antialiased;
}
.nfq-portal-masthead,.nfq-portal-content,.nfq-portal-footer{
 width:min(1240px,100%);
 margin-inline:auto;
 padding-inline:clamp(22px,3.5vw,48px);
}
.nfq-portal-masthead{
 min-height:104px;
 display:flex;
 align-items:center;
 justify-content:space-between;
 gap:24px;
 border-bottom:1px solid var(--portal-line);
}
.nfq-portal-brand{
 position:relative;
 display:block;
 width:174px;
 height:104px;
 overflow:hidden;
 flex:0 0 auto;
}
.nfq-portal-brand img{
 position:absolute;
 display:block;
 width:170px;
 height:170px;
 max-width:none;
 object-fit:contain;
 left:0;
 top:-33px;
}
.nfq-portal-masthead-right{display:flex;align-items:center;gap:24px;min-width:0}
.nfq-portal-header-context{
 font-size:10px;
 letter-spacing:.07em;
 font-weight:630;
 color:var(--portal-muted);
 white-space:nowrap;
}
.nfq-portal-header-link{
 display:inline-flex;
 align-items:center;
 justify-content:space-between;
 gap:20px;
 min-height:39px;
 padding:8px 12px;
 border:1px solid #cbd9d0;
 border-radius:5px;
 background:transparent;
 color:var(--portal-ink);
 text-decoration:none;
 font:inherit;
 font-size:12px;
 font-weight:610;
 white-space:nowrap;
 cursor:pointer;
}
.nfq-portal-header-link:hover{background:#f2f6f2;border-color:#aebfb3}
.nfq-portal-content{
 flex:1;
 display:flex;
 flex-direction:column;
 justify-content:center;
 padding-block:clamp(25px,4.5vh,45px) 21px;
}
.nfq-portal-layout{
 display:grid;
 grid-template-columns:minmax(0,1.12fr) minmax(310px,.89fr);
 column-gap:clamp(30px,4.5vw,65px);
 align-items:start;
}
.nfq-portal-intro{min-width:0;padding:clamp(3px,.75vw,12px) 0 0}
.nfq-portal-kicker{
 margin:0;
 color:#416f60;
 font-size:10px;
 line-height:1.5;
 letter-spacing:.075em;
 font-weight:650;
}
.nfq-portal-intro h1{
 max-width:15.5ch;
 margin:20px 0 21px;
 color:var(--portal-ink);
 font-family:'Iowan Old Style','Baskerville','Palatino Linotype',Georgia,serif;
 font-size:clamp(43px,4.25vw,60px);
 font-weight:500;
 letter-spacing:-.053em;
 line-height:1.08;
 text-wrap:balance;
}
.nfq-portal-description{
 max-width:490px;
 margin:0;
 font-size:clamp(14px,1.18vw,16px);
 line-height:1.65;
 font-weight:420;
 color:var(--portal-secondary);
}
.nfq-portal-actions{
 display:flex;
 align-items:center;
 flex-wrap:wrap;
 gap:12px;
 margin-top:29px;
}
.nfq-portal-enter{
 display:inline-flex;
 align-items:center;
 justify-content:space-between;
 gap:21px;
 min-height:41px;
 padding:9px 14px;
 border:1px solid var(--portal-action);
 border-radius:5px;
 background:var(--portal-action);
 color:#fff;
 font-size:12px;
 font-weight:610;
 text-decoration:none;
 box-shadow:none;
}
.nfq-portal-enter:hover{background:#28574b;border-color:#28574b}
.nfq-portal-enter svg{flex:none;width:17px;height:17px}
.nfq-portal-access-note{
 margin:11px 0 0;
 color:var(--portal-muted);
 font-size:11px;
 line-height:1.55;
}
/* Directory is a readable index: it is not an ordered leaderboard, a set of
   faux cards or five decorative action buttons. */
.nfq-portal-index{
 min-width:0;
 padding:6px 0 0 clamp(22px,2.6vw,34px);
 border-left:1px solid var(--portal-line);
}
.nfq-portal-index-top{margin:0 0 18px}
.nfq-portal-index-top h2{
 margin:7px 0 0;
 color:var(--portal-ink);
 font:500 clamp(27px,2.7vw,34px)/1.15 'Iowan Old Style','Baskerville',Georgia,serif;
 letter-spacing:-.04em;
}
.nfq-portal-index-link{
 display:grid;
 grid-template-columns:minmax(0,1fr) 17px;
 align-items:center;
 gap:11px;
 min-height:65px;
 padding:12px 2px 12px 0;
 border-top:1px solid var(--portal-line);
 color:var(--portal-ink);
 text-decoration:none;
}
.nfq-portal-index-link>span:first-child{min-width:0}
.nfq-portal-index-link strong,.nfq-portal-index-link small{display:block}
.nfq-portal-index-link strong{
 font-size:12.5px;
 line-height:1.35;
 letter-spacing:-.01em;
 font-weight:650;
}
.nfq-portal-index-link small{
 margin-top:4px;
 color:var(--portal-muted);
 font-size:11px;
 line-height:1.45;
 font-weight:450;
}
.nfq-portal-index-arrow{
 justify-self:end;
 color:#527968;
 font-size:15px;
 transition:transform .14s ease;
}
.nfq-portal-index-link:hover strong{color:#17664f}
.nfq-portal-index-link:hover .nfq-portal-index-arrow{transform:translate(2px,-2px)}
/* Account access is the alternate research instrument within the same grid.
   Remove tinted floating-card styling and retain the genuine auth controls. */
.nfq-portal-account{
 width:100%;
 max-width:392px;
 min-width:0;
 padding:6px 0 0 clamp(22px,2.6vw,34px);
 border-left:1px solid var(--portal-line);
 align-self:start;
 justify-self:start;
}
.nfq-portal-login-card{
 border-radius:0;
 border-top:0;
 border-right:0;
 border-bottom:0;
 background:transparent;
 box-shadow:none;
 -webkit-backdrop-filter:none;
 backdrop-filter:none;
}
.nfq-portal-login-heading{
 display:flex;
 align-items:flex-start;
 justify-content:space-between;
 gap:12px;
 margin:0 0 22px;
}
.nfq-portal-login-heading h2{
 margin:6px 0 0;
 font:500 clamp(26px,2.6vw,33px)/1.16 'Iowan Old Style','Baskerville',Georgia,serif;
 letter-spacing:-.041em;
 color:var(--portal-ink);
}
.nfq-portal-login-heading p{
 margin:6px 0 0;
 font-size:11px;
 line-height:1.45;
 color:var(--portal-muted);
}
.nfq-portal-login-card :deep(.nfq-account-fields){gap:8px}
.nfq-portal-login-card :deep(.nfq-account-fields label){
 color:#395a4c;
 font-size:11.5px;
 font-weight:600;
}
.nfq-portal-login-card :deep(.nfq-account-fields input){
 min-height:40px;
 padding:8px 11px;
 border:1px solid #bfcec5;
 border-radius:5px;
 background:#fff;
 color:#19372d;
 font-size:13px;
 box-shadow:none;
}
.nfq-portal-login-card :deep(.nfq-account-fields input:focus-visible){
 outline:2px solid #397962;
 outline-offset:2px;
}
.nfq-portal-login-card :deep(.nfq-account-fields button[type="submit"]){
 justify-self:start;
 width:auto;
 min-height:40px;
 margin-top:7px;
 padding:8px 19px;
 border:1px solid var(--portal-action);
 border-radius:5px;
 background:var(--portal-action);
 color:#fff;
 font-size:12px;
 box-shadow:none;
}
.nfq-portal-login-card :deep(.nfq-account-fields button[type="submit"]:hover){background:#28574b}
.nfq-portal-login-card :deep(.nfq-account-unavailable){font-size:12px;line-height:1.55}
.nfq-portal-account-links{
 display:flex;
 flex-wrap:wrap;
 align-items:center;
 gap:7px 20px;
 margin-top:13px;
}
.nfq-portal-recover,.nfq-portal-back{
 display:inline-flex;
 align-items:center;
 min-height:35px;
 border:0;
 background:transparent;
 color:#34634d;
 font:inherit;
 font-size:11.5px;
 font-weight:520;
 text-decoration:none;
 padding:5px 0;
 cursor:pointer;
}
.nfq-portal-recover:hover,.nfq-portal-back:hover{text-decoration:underline;text-underline-offset:3px}
.nfq-portal-research-notice{
 display:flex;
 align-items:flex-start;
 gap:10px;
 max-width:820px;
 margin-top:clamp(26px,4vh,43px);
 padding-top:15px;
 border-top:1px solid var(--portal-line);
 color:var(--portal-muted);
}
.nfq-portal-research-notice svg{flex:0 0 17px;margin-top:1px}
.nfq-portal-research-notice p{margin:0;font-size:11px;line-height:1.6}
.nfq-portal-footer{
 display:flex;
 align-items:center;
 justify-content:space-between;
 gap:12px 22px;
 flex-wrap:wrap;
 border-top:1px solid var(--portal-line);
 padding-block:14px;
 color:var(--portal-muted);
 font-size:10px;
 letter-spacing:0;
}
.nfq-portal-landing :is(button,a,summary):focus-visible{
 outline:2px solid #2b725f;
 outline-offset:3px;
}
@media(max-width:1000px){
 .nfq-portal-layout{grid-template-columns:minmax(0,1fr) minmax(290px,.96fr);column-gap:30px}
 .nfq-portal-intro h1{font-size:clamp(42px,5vw,53px)}
 .nfq-portal-header-context{display:none}
}
@media(max-width:760px){
 .nfq-portal-masthead{min-height:92px}
 .nfq-portal-brand{width:151px;height:92px}
 .nfq-portal-brand img{width:148px;height:148px;top:-28px}
 .nfq-portal-content{justify-content:flex-start;padding-block:24px 22px}
 .nfq-portal-layout{grid-template-columns:minmax(0,1fr);row-gap:27px}
 .nfq-portal-intro{padding:0}
 .nfq-portal-intro h1{margin:14px 0 14px;max-width:18ch;font-size:clamp(40px,7.1vw,53px)}
 .nfq-portal-actions{margin-top:22px}
 .nfq-portal-index{border-left:0;border-top:1px solid var(--portal-line);padding:19px 0 0}
 .nfq-portal-account{max-width:440px;border-left:0;border-top:1px solid var(--portal-line);padding:21px 0 0}
 .nfq-portal-research-notice{margin-top:27px}
}
@media(max-width:420px){
 .nfq-portal-masthead{min-height:82px}
 .nfq-portal-brand{width:123px;height:82px}
 .nfq-portal-brand img{width:119px;height:119px;top:-21px}
 .nfq-portal-header-link{min-height:38px;padding:7px 10px}
 .nfq-portal-intro h1{font-size:40px;max-width:15.5ch}
 .nfq-portal-footer{display:grid}
 .nfq-portal-index-link{min-height:62px}
}
@media(prefers-reduced-motion:reduce){
 .nfq-portal-index-arrow{transition:none}
 .nfq-portal-index-link:hover .nfq-portal-index-arrow{transform:none}
}
/* Contextual help remains within a narrow login area rather than extending
   underneath the browser edge or acquiring a full-screen glass panel. */
@media(max-width:600px){
 .nfq-portal-login-card :deep(.nfq-context-help){position:static}
 .nfq-portal-login-card :deep(.nfq-context-help-panel){
  position:absolute;
  top:58px;
  left:4px;
  right:4px;
  width:auto;
  max-height:min(52vh,290px);
 }
}
</style>
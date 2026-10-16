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
          <button type="button" class="nfq-portal-back" @click="loginOpen=false">← Return to research tools</button>
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
/* Institutional editorial entry: bounded reading widths, no oversized empty hero. */
.nfq-portal-landing{min-height:100dvh;display:flex;flex-direction:column;background:#fafbf9;color:#193b32}
.nfq-portal-masthead,.nfq-portal-content,.nfq-portal-footer{width:min(1190px,100%);margin-inline:auto;padding-inline:clamp(24px,4vw,62px)}
.nfq-portal-masthead{min-height:116px;display:flex;align-items:center;justify-content:space-between;gap:24px;border-bottom:1px solid #e4ebe6}
.nfq-portal-brand{position:relative;display:block;width:200px;height:88px;overflow:hidden;flex:0 0 auto}
.nfq-portal-brand img{position:absolute;display:block;width:172px;height:172px;max-width:none;object-fit:contain;left:0;top:-39px}
.nfq-portal-masthead-right{display:flex;align-items:center;gap:24px}
.nfq-portal-header-context{font-size:10px;letter-spacing:.14em;font-weight:700;color:#668274;white-space:nowrap}
.nfq-portal-header-link{display:inline-flex;align-items:center;gap:17px;min-height:42px;padding:10px 15px;border:1px solid #d5e2d8;border-radius:5px;background:transparent;color:#234b3b;text-decoration:none;font-size:12px;font-weight:680;white-space:nowrap}
.nfq-portal-header-link:hover{background:#f0f6f1;border-color:#a4bdae}
.nfq-portal-content{flex:1;display:flex;flex-direction:column;justify-content:center;padding-block:clamp(32px,5vh,58px) 28px}
.nfq-portal-layout{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(315px,.84fr);gap:clamp(38px,6vw,92px);align-items:start}
.nfq-portal-intro{min-width:0;padding-block:clamp(13px,3vw,38px)}
.nfq-portal-kicker{font-size:10px;line-height:1.55;letter-spacing:.14em;color:#3d7560;font-weight:740;margin:0}
.nfq-portal-intro h1{max-width:570px;margin:25px 0 22px;color:#193a32;font-family:"Iowan Old Style","Baskerville","Palatino Linotype",Georgia,serif;font-size:clamp(45px,4.25vw,62px);font-weight:500;letter-spacing:-.048em;line-height:1.08}
.nfq-portal-description{max-width:490px;font-size:clamp(15px,1.28vw,17px);line-height:1.7;color:#526d62;margin:0}
.nfq-portal-actions{display:flex;align-items:center;flex-wrap:wrap;margin-top:35px}
.nfq-portal-enter{display:inline-flex;justify-content:space-between;align-items:center;gap:22px;min-height:49px;padding:12px 17px;background:#163d33;color:#fff;border:1px solid #163d33;border-radius:5px;text-decoration:none;font-size:12px;font-weight:680}
.nfq-portal-enter:hover{background:#265746;border-color:#265746}
.nfq-portal-enter svg{flex:0 0 auto}
.nfq-portal-access-note{margin:12px 0 0;font-size:11px;line-height:1.6;color:#788e80}
.nfq-portal-index{counter-reset:workspace;min-width:0;padding:6px 0 0 27px;border-left:1px solid #dce6df}
.nfq-portal-index-top{margin:0 0 17px}
.nfq-portal-index-top h2{font-family:"Iowan Old Style","Baskerville",Georgia,serif;font-size:clamp(26px,2.4vw,32px);font-weight:500;letter-spacing:-.037em;line-height:1.25;color:#1b4034;margin:7px 0 0}
.nfq-portal-index-link{counter-increment:workspace;display:grid;grid-template-columns:25px minmax(0,1fr) 20px;align-items:center;gap:10px;min-height:73px;padding:12px 0;border-top:1px solid #e1e9e3;color:#214337;text-decoration:none}
.nfq-portal-index-link::before{content:counter(workspace,decimal-leading-zero);font-size:10px;letter-spacing:.08em;color:#879b8e;font-variant-numeric:tabular-nums}
.nfq-portal-index-link>span:first-child{min-width:0}
.nfq-portal-index-link strong,.nfq-portal-index-link small{display:block}
.nfq-portal-index-link strong{font-size:13px;font-weight:710;line-height:1.4;letter-spacing:-.009em}
.nfq-portal-index-link small{margin-top:4px;color:#6e8578;font-size:11px;line-height:1.45;font-weight:450}
.nfq-portal-index-arrow{font-size:17px;color:#487f64;justify-self:end;transition:transform .16s ease}
.nfq-portal-index-link:hover{color:#0f624a}
.nfq-portal-index-link:hover .nfq-portal-index-arrow{transform:translate(2px,-2px)}
.nfq-portal-account{min-width:0;padding:8px 0 0 27px;border-left:1px solid #dce6df}
.nfq-portal-account h2{font-family:Georgia,serif;font-size:30px;font-weight:500;letter-spacing:-.035em;margin:10px 0}
.nfq-portal-account-description{max-width:430px;color:#667e72;font-size:12px;line-height:1.65;margin:0 0 22px}
.nfq-portal-back{border:0;background:transparent;padding:13px 0;color:#2c6d51;font:inherit;font-size:12px;cursor:pointer}
.nfq-portal-research-notice{display:flex;align-items:flex-start;gap:10px;max-width:750px;margin-top:clamp(34px,6vh,65px);padding-top:17px;border-top:1px solid #e1e9e2;color:#6c8074}
.nfq-portal-research-notice svg{flex:0 0 17px;margin-top:1px}
.nfq-portal-research-notice p{font-size:11px;line-height:1.65;margin:0}
.nfq-portal-footer{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;border-top:1px solid #e4ebe6;padding-block:16px;font-size:10px;letter-spacing:.015em;color:#798e80}
.nfq-portal-header-link:focus-visible,.nfq-portal-brand:focus-visible,.nfq-portal-enter:focus-visible,.nfq-portal-index-link:focus-visible,.nfq-portal-back:focus-visible{outline:3px solid #17836a;outline-offset:3px}
@media(max-width:960px){.nfq-portal-layout{grid-template-columns:minmax(0,1fr) minmax(275px,.9fr);gap:36px}.nfq-portal-header-context{display:none}.nfq-portal-intro h1{font-size:clamp(41px,5vw,54px)}}
@media(max-width:760px){.nfq-portal-masthead{min-height:94px}.nfq-portal-brand{width:172px;height:76px}.nfq-portal-brand img{width:150px;height:150px;top:-35px}.nfq-portal-content{justify-content:flex-start;padding-block:28px}.nfq-portal-layout{grid-template-columns:minmax(0,1fr);gap:34px}.nfq-portal-intro{padding-block:10px 0}.nfq-portal-intro h1{font-size:clamp(39px,8vw,54px);margin:16px 0}.nfq-portal-description{max-width:530px}.nfq-portal-actions{margin-top:23px}.nfq-portal-index{border-left:0;padding:22px 0 0;border-top:1px solid #dce6df}.nfq-portal-account{border-left:0;padding:20px 0 0;border-top:1px solid #dce6df}.nfq-portal-research-notice{margin-top:34px}}
@media(max-width:420px){.nfq-portal-masthead{min-height:80px}.nfq-portal-brand{width:125px;height:66px}.nfq-portal-brand img{width:127px;height:127px;top:-31px}.nfq-portal-header-link{padding:8px 11px;min-height:39px}.nfq-portal-intro h1{font-size:39px}.nfq-portal-index-link{grid-template-columns:23px minmax(0,1fr) 18px;min-height:68px}.nfq-portal-footer{display:grid}}
@media(prefers-reduced-motion:reduce){.nfq-portal-index-arrow{transition:none}.nfq-portal-index-link:hover .nfq-portal-index-arrow{transform:none}}

/* Phase 4F-6F · entry reading scale and restrained directory affordances. */
.nfq-portal-intro h1{max-width:10.5ch;text-wrap:balance}
.nfq-portal-index-link{transition:background-color .16s ease,color .16s ease}
.nfq-portal-index-link:hover{background:linear-gradient(90deg,#f2f7f3 0%,transparent 96%)}
.nfq-portal-header-link svg,.nfq-portal-index-arrow{flex:none}
@media(min-width:761px){
 .nfq-portal-layout{gap:clamp(34px,4.5vw,70px)}
 .nfq-portal-intro{padding-block:clamp(8px,2vw,25px)}
}
@media(max-width:760px){
 .nfq-portal-intro h1{max-width:13ch}
 .nfq-portal-index-link{min-height:69px}
}
@media(prefers-reduced-motion:reduce){.nfq-portal-index-link{transition:none}}

/* Phase 4F-9B: the portal form remains an actual sign-in option, not a second long panel. */
.nfq-portal-login-card{width:min(100%,390px);justify-self:center;align-self:start;min-width:0;padding:clamp(18px,2.2vw,25px);border:1px solid #d4e2d8;border-radius:12px;background:rgba(249,252,249,.93);box-shadow:0 12px 30px -22px rgba(24,64,40,.2);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
.nfq-portal-login-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:16px}
.nfq-portal-login-heading h2{font-family:Georgia,"Times New Roman",serif;font-size:clamp(25px,2.8vw,30px);font-weight:500;letter-spacing:-.045em;line-height:1.1;margin:0;color:#173c2e}
.nfq-portal-login-heading p{font-size:11px;line-height:1.4;color:#647c6d;margin:5px 0 0}
.nfq-portal-login-card :deep(.nfq-account-fields){gap:7px}
.nfq-portal-login-card :deep(.nfq-account-fields label){color:#355748;font-size:11px}
.nfq-portal-login-card :deep(.nfq-account-fields input){min-height:43px;border:1px solid #c5d5c9;border-radius:7px;padding:9px 12px;background:#fff;color:#17392a;font-size:13px}
.nfq-portal-login-card :deep(.nfq-account-fields input:focus-visible){outline:2px solid #357b5a;outline-offset:2px}
.nfq-portal-login-card :deep(.nfq-account-fields button[type="submit"]){min-height:44px;background:#14392e;border-color:#14392e;border-radius:7px;font-size:12px;margin-top:7px}
.nfq-portal-login-card :deep(.nfq-account-fields button[type="submit"]:hover){background:#0b281f}
.nfq-portal-login-card :deep(.nfq-account-unavailable){font-size:12px;line-height:1.55}
.nfq-portal-login-card .nfq-portal-back{margin-top:12px;min-height:38px;padding:5px 0;font-size:12px}
.nfq-portal-login-card .nfq-portal-back:hover{text-decoration:underline;text-underline-offset:3px}
@media(max-width:760px){.nfq-portal-login-card{justify-self:stretch;max-width:390px;margin:0 auto;padding:20px 18px}}
/* Keep mobile help inside the card instead of a fixed layer clipped by glass. */
@media(max-width:600px){
 .nfq-portal-login-card :deep(.nfq-context-help){position:static}
 .nfq-portal-login-card :deep(.nfq-context-help-panel){position:absolute;top:63px;left:11px;right:11px;width:auto;max-height:min(52vh,290px)}
}
</style>
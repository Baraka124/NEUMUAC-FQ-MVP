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
    <!-- Atmospheric artwork only; the actual institutional identity remains the logo above. -->
    <svg class="nfq-signin-art" aria-hidden="true" focusable="false" viewBox="0 0 1100 550" preserveAspectRatio="xMidYMid slice">
     <defs>
      <linearGradient id="nfq-signin-helix" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#68d9be" stop-opacity=".38"/><stop offset="1" stop-color="#93dfea" stop-opacity=".09"/></linearGradient>
     </defs>
     <g fill="none" stroke="url(#nfq-signin-helix)" stroke-linecap="round">
      <g transform="translate(-65 -35) rotate(-15 170 260)">
       <path d="M95 -60C350 10 -25 170 175 280S350 490 95 645" stroke-width="2.3"/>
       <path d="M250 -60C-5 10 370 170 170 280S-5 490 250 645" stroke-width="2.3"/>
       <path d="M134 38h76M93 112h158M106 189h136M134 267h76M95 343h160M112 419h124M148 497h51" stroke-width="1.1"/>
      </g>
      <g transform="translate(735 -70) rotate(20 195 270)">
       <path d="M130 -80C380 10 15 170 205 285S370 510 135 640" stroke-width="2"/>
       <path d="M285 -80C35 10 400 170 210 285S45 510 280 640" stroke-width="2"/>
       <path d="M175 68h80M139 157h151M166 245h94M170 334h75M144 422h146M170 508h80" stroke-width="1.1"/>
      </g>
     </g>
     <g fill="#8ee1c7" opacity=".18"><circle cx="85" cy="420" r="3"/><circle cx="305" cy="116" r="2"/><circle cx="955" cy="132" r="3"/><circle cx="1046" cy="444" r="2"/></g>
    </svg>
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
/* The authentication card is intentionally small. The stage frames it, not the reverse. */
.nfq-signin-institutional{background:#fafbf9;color:#173b2d;min-height:100dvh}
.nfq-signin-masthead{min-height:80px;width:min(1180px,100%);padding-inline:clamp(18px,3vw,42px);border:0}
.nfq-signin-masthead .nfq-entry-logo img{height:70px;width:190px;object-fit:contain;object-position:left center}
.nfq-signin-header-link{display:inline-flex;gap:9px;align-items:center;min-height:44px;text-decoration:none;color:#39634b;font-size:12px;font-weight:650;white-space:nowrap}
.nfq-signin-header-link:hover{text-decoration:underline;text-underline-offset:3px}
.nfq-signin-header-link:focus-visible,.nfq-signin-public-link:focus-visible{outline:3px solid #25886a;outline-offset:3px}
.nfq-signin-institutional .nfq-signin-main{width:min(1180px,100%);padding:8px clamp(15px,3vw,42px) 15px;min-height:0}
.nfq-signin-stage{position:relative;isolation:isolate;display:grid;place-items:center;overflow:hidden;min-height:425px;padding:27px 18px;border-radius:17px;background:radial-gradient(ellipse 84% 110% at 50% 34%,#1e4a3c 0%,#123a2f 41%,#0b241e 100%);box-shadow:0 12px 35px -20px rgba(8,30,23,.3)}
.nfq-signin-art{position:absolute;inset:0;width:100%;height:100%;opacity:.67;pointer-events:none;user-select:none}
.nfq-login-card{position:relative;z-index:1;width:min(100%,390px);min-width:0;padding:clamp(21px,2.8vw,28px);border-radius:12px;border:1px solid rgba(255,255,255,.72);background:rgba(240,247,242,.93);box-shadow:0 16px 42px rgba(2,19,12,.26),inset 0 1px rgba(255,255,255,.9);-webkit-backdrop-filter:blur(15px);backdrop-filter:blur(15px)}
.nfq-login-card-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px}
.nfq-login-card-heading h1{font:500 clamp(28px,3.2vw,34px)/1.06 Georgia,"Times New Roman",serif;letter-spacing:-.045em;color:#102f25;margin:0}
.nfq-login-card-heading p{font-size:11px;line-height:1.5;color:#5c7768;margin:6px 0 0}
.nfq-signin-public-link{display:inline-flex;align-items:center;gap:7px;text-decoration:none;color:#245a43;font-size:12px;font-weight:610;margin-top:16px;min-height:35px}
.nfq-signin-public-link:hover{text-decoration:underline;text-underline-offset:3px}
.nfq-login-card :deep(.nfq-account-fields){gap:7px}
.nfq-login-card :deep(.nfq-account-fields label){font-size:11px;font-weight:650;color:#355748}
.nfq-login-card :deep(.nfq-account-fields input){min-height:43px;border-radius:7px;border:1px solid #bdcfc3;background:rgba(255,255,255,.84);padding:9px 12px;font-size:13px;color:#17392a}
.nfq-login-card :deep(.nfq-account-fields input:focus-visible){outline:2px solid #357b5a;outline-offset:2px}
.nfq-login-card :deep(.nfq-account-fields button[type="submit"]){min-height:44px;margin-top:9px;border-radius:7px;background:#14392e;border-color:#14392e;font-size:12px}
.nfq-login-card :deep(.nfq-account-fields button[type="submit"]:hover){background:#0b281f}
.nfq-login-card :deep(.nfq-account-unavailable){font-size:12px;line-height:1.55}
.nfq-signin-institutional .nfq-signin-footer{width:min(1180px,100%);border-top:0;padding:8px clamp(18px,3vw,42px) 18px;font-size:11px}
@media(max-width:540px){
 .nfq-signin-masthead{min-height:72px;gap:10px}
 .nfq-signin-masthead .nfq-entry-logo img{height:59px;width:155px}
 .nfq-signin-header-link{white-space:normal;max-width:110px;line-height:1.35;text-align:right;font-size:11px}
 .nfq-signin-stage{min-height:0;padding:32px 11px;border-radius:11px}
 .nfq-login-card{width:min(100%,390px);padding:22px 19px}
 .nfq-signin-institutional .nfq-signin-main{padding-top:4px;padding-bottom:8px}
}
/* The glass card establishes an overlay context; keep help within it on phones. */
@media(max-width:600px){
 .nfq-login-card :deep(.nfq-context-help){position:static}
 .nfq-login-card :deep(.nfq-context-help-panel){position:absolute;top:64px;left:12px;right:12px;width:auto;max-height:min(52vh,290px)}
}
@media(prefers-reduced-motion:reduce){.nfq-signin-stage *{scroll-behavior:auto}}
</style>

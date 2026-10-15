<script setup lang="ts">
import {RouterLink} from 'vue-router';
</script>

<template>
  <div class="nfq-portal-landing">
    <header class="nfq-portal-masthead">
      <RouterLink to="/" class="nfq-portal-brand" aria-label="neumuacFQ home">
        <img src="/brand/neumuacfq-logo.png" alt="neumuacFQ · CFTR evidence, connected." />
      </RouterLink>
      <div class="nfq-portal-masthead-right">
        <span class="nfq-portal-header-context">CFTR research platform</span>
        <RouterLink to="/sign-in" class="nfq-portal-header-link">Staff access
          <svg viewBox="0 0 24 24" aria-hidden="true" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
        </RouterLink>
      </div>
    </header>

    <main id="main" tabindex="-1" class="nfq-portal-content">
      <div class="nfq-portal-layout">
        <section class="nfq-portal-intro" aria-labelledby="nfq-entry-heading">
          <p class="nfq-portal-kicker">PUBLIC RESEARCH ACCESS</p>
          <h1 id="nfq-entry-heading">CFTR variant research</h1>
          <p class="nfq-portal-description">Search recorded CFTR variants, review scientific references, compare variant records and examine research coverage.</p>

          <div class="nfq-portal-actions" aria-label="Choose how to enter">
            <RouterLink to="/workspace" class="nfq-portal-enter">
              <span>Explore public research</span>
              <svg viewBox="0 0 24 24" aria-hidden="true" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
            </RouterLink>
            <RouterLink to="/sign-in" class="nfq-portal-staff">Sign in as research staff
              <svg viewBox="0 0 24 24" aria-hidden="true" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
            </RouterLink>
          </div>
          <p class="nfq-portal-access-note">Public access requires no account. Staff access is restricted to authorized users.</p>
        </section>

        <nav class="nfq-portal-index" aria-labelledby="nfq-portal-index-heading">
          <div class="nfq-portal-index-top">
            <p class="nfq-portal-kicker">RESEARCH WORKSPACES</p>
            <h2 id="nfq-portal-index-heading">Explore by task</h2>
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
.nfq-portal-landing{min-height:100dvh;display:flex;flex-direction:column;background:#fcfdfc;color:#173444}
.nfq-portal-masthead,.nfq-portal-content,.nfq-portal-footer{width:min(1440px,100%);margin-inline:auto;padding-inline:clamp(23px,5vw,78px)}
.nfq-portal-masthead{min-height:114px;border-bottom:1px solid #dce6e2;display:flex;align-items:center;justify-content:space-between;gap:28px}
.nfq-portal-brand{display:flex;width:246px;height:108px;flex-shrink:0;align-items:center;justify-content:flex-start;overflow:hidden}
.nfq-portal-brand img{display:block;width:246px;height:108px;object-fit:contain;object-position:left center}
.nfq-portal-masthead-right{display:flex;align-items:center;gap:clamp(24px,3vw,42px)}
.nfq-portal-header-context{font-size:12px;color:#60766f;letter-spacing:.01em}
.nfq-portal-header-link{display:inline-flex;align-items:center;gap:10px;border:1px solid #ceded7;border-radius:7px;padding:11px 15px;white-space:nowrap;color:#1b5345;background:#fff;text-decoration:none;font-size:13px;font-weight:690;transition:border-color .16s,background .16s}
.nfq-portal-header-link:hover{border-color:#7aa997;background:#f1f8f4}
.nfq-portal-content{flex:1;display:flex;flex-direction:column;justify-content:center;padding-block:clamp(34px,5vw,64px) 26px}
.nfq-portal-layout{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(330px,.88fr);gap:clamp(46px,6vw,102px);align-items:center}
.nfq-portal-intro{min-width:0;padding-block:12px}
.nfq-portal-kicker{font-size:10px;line-height:1.5;letter-spacing:.14em;color:#3e817b;font-weight:790;margin:0}
.nfq-portal-intro h1{font-size:clamp(43px,5.2vw,68px);line-height:1.075;letter-spacing:-.062em;max-width:650px;font-weight:650;color:#123141;margin:24px 0 23px}
.nfq-portal-description{max-width:590px;font-size:clamp(15px,1.2vw,17px);line-height:1.73;color:#546e73;margin:0}
.nfq-portal-actions{display:flex;flex-wrap:wrap;align-items:stretch;gap:10px;margin-top:38px}
.nfq-portal-actions a{display:inline-flex;align-items:center;justify-content:space-between;gap:20px;min-height:54px;border-radius:7px;padding:12px 19px;text-decoration:none;font-size:13px;font-weight:710;line-height:1.3;transition:background .16s,border-color .16s}
.nfq-portal-enter{background:#102f43;color:#fff;border:1px solid #102f43}
.nfq-portal-enter:hover{background:#1a495c;border-color:#1a495c}
.nfq-portal-staff{background:#fff;color:#1d5549;border:1px solid #cddfd5}
.nfq-portal-staff:hover{background:#f3f9f5;border-color:#8caf9b}
.nfq-portal-access-note{font-size:12px;line-height:1.65;color:#758984;max-width:550px;margin:15px 0 0}
.nfq-portal-index{min-width:0;border-top:2px solid #1a4c5a;padding-top:18px}
.nfq-portal-index-top{margin:0 0 15px}
.nfq-portal-index-top h2{font-size:clamp(22px,2vw,29px);font-weight:640;letter-spacing:-.04em;color:#153949;margin:8px 0 0}
.nfq-portal-index-link{display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:78px;padding:15px 3px;border-top:1px solid #dce6e2;color:#193e4a;text-decoration:none}
.nfq-portal-index-link strong,.nfq-portal-index-link small{display:block}
.nfq-portal-index-link strong{font-size:14px;letter-spacing:-.006em;font-weight:690;line-height:1.45}
.nfq-portal-index-link small{font-size:12px;font-weight:420;line-height:1.45;color:#677d80;margin-top:4px}
.nfq-portal-index-arrow{flex-shrink:0;font-size:18px;color:#4c8679;transition:transform .16s}
.nfq-portal-index-link:hover strong{color:#087977}
.nfq-portal-index-link:hover .nfq-portal-index-arrow{transform:translate(2px,-2px)}
.nfq-portal-research-notice{border-top:1px solid #dce6e2;margin-top:clamp(42px,5vw,74px);padding:19px 0 0;display:flex;gap:11px;align-items:flex-start;color:#6d8382;max-width:none}
.nfq-portal-research-notice svg{flex:none;margin-top:1px;color:#63887f}
.nfq-portal-research-notice p{font-size:12px;line-height:1.6;margin:0}
.nfq-portal-footer{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;border-top:1px solid #dce6e2;padding-block:17px;font-size:11px;color:#71837f}
.nfq-portal-header-link:focus-visible,.nfq-portal-brand:focus-visible,.nfq-portal-actions a:focus-visible,.nfq-portal-index-link:focus-visible{outline:3px solid #107e7a;outline-offset:3px}
@media(max-width:1040px){.nfq-portal-layout{grid-template-columns:minmax(0,1fr) minmax(285px,.85fr);gap:38px}.nfq-portal-header-context{display:none}.nfq-portal-intro h1{font-size:clamp(40px,5vw,56px)}.nfq-portal-actions a{min-height:51px}}
@media(max-width:760px){.nfq-portal-masthead{min-height:91px}.nfq-portal-brand{width:188px;height:84px}.nfq-portal-brand img{width:188px;height:84px}.nfq-portal-content{justify-content:flex-start;padding-block:33px 28px}.nfq-portal-layout{grid-template-columns:minmax(0,1fr);gap:43px}.nfq-portal-intro{padding:0}.nfq-portal-intro h1{font-size:clamp(37px,7.7vw,53px);margin:15px 0 16px}.nfq-portal-actions{margin-top:27px}.nfq-portal-index{padding-top:18px}.nfq-portal-research-notice{margin-top:38px}}
@media(max-width:420px){.nfq-portal-masthead{gap:10px;min-height:80px}.nfq-portal-brand{width:145px;height:75px}.nfq-portal-brand img{width:145px;height:75px}.nfq-portal-header-link{padding:9px 11px;font-size:12px}.nfq-portal-actions{display:grid;grid-template-columns:minmax(0,1fr)}.nfq-portal-description{font-size:15px}.nfq-portal-footer{font-size:10px}}
@media(prefers-reduced-motion:reduce){.nfq-portal-header-link,.nfq-portal-actions a,.nfq-portal-index-arrow{transition:none}.nfq-portal-index-link:hover .nfq-portal-index-arrow{transform:none}}
</style>

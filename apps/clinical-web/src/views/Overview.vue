<script setup lang="ts">
import {researchWorkspaces,researchShortcuts} from '../domain/researchWorkspaces';
</script>
<template>
  <div class="page research-home">
    <header class="research-home-intro">
      <div class="nfq-home-lockup"><img src="/brand/neumuacfq-logo.png" alt="neumuacFQ · CFTR evidence, connected." @error="($event.target as HTMLImageElement).style.display='none'" /></div>
      <div class="eyebrow">CFTR RESEARCH / PUBLIC WORKSPACE</div>
      <h1>CFTR variant research</h1>
      <p class="intro">A governed environment for examining recorded variant identities and, as verified services become available, their scientific evidence. The public workspace supports live read-only variant exploration, linked source references, variant-pair comparison, and research evidence-coverage review.</p>
    </header>

    <section class="research-entry" aria-labelledby="research-entry-title">
      <div class="research-entry-main">
        <div class="section-label">RESEARCH INDEX</div>
        <h2 id="research-entry-title">Variant records</h2>
        <p>Search recorded CFTR variant identities from the live source. No example or synthetic records are substituted.</p>
        <RouterLink class="research-entry-link" to="/variants">Explore variant records <span aria-hidden="true">→</span></RouterLink>
      </div>
      <aside class="research-entry-aside" aria-label="Current capability">
        <div class="section-label">CURRENT CAPABILITY</div>
        <dl class="research-capabilities">
          <div><dt>Variant identities</dt><dd>Live read-only lookup</dd></div>
          <div><dt>Sources and evidence</dt><dd>Recorded references; claims unverified</dd></div>
          <div><dt>Variant-pair research</dt><dd>Exploratory; no clinical predictions</dd></div><div><dt>Editing and curation</dt><dd>Not yet available</dd></div>
        </dl>
        <p>These availability statements describe the modern workspace, not the existing legacy application.</p>
      </aside>
    </section>
    <section class="research-workbench-index" aria-labelledby="workbench-title">
      <div class="section-label">RESEARCH TOOLS</div>
      <h2 id="workbench-title">Continue your research</h2>
      <div class="workbench-index-grid">
       <RouterLink v-for="tool in researchWorkspaces.filter(item=>item.id!=='overview')" :key="tool.id" :to="tool.path" class="workbench-index-item"><strong>{{tool.name}}</strong><span>{{tool.description}}</span><span aria-hidden="true">↗</span></RouterLink>
      </div>
      <div class="workbench-shortcut"><RouterLink :to="researchShortcuts[0].path">Open Class I variant worklist →</RouterLink></div>
    </section>
  </div>
</template>

<template>
  <div class="page research-home">
    <header class="research-home-intro">
      <div class="eyebrow">NEUMUACFQ / CFTR RESEARCH</div>
      <h1>CFTR variant research</h1>
      <p class="intro">A governed environment for examining recorded variant identities and, as verified services become available, their scientific evidence. The current Vue workspace provides authorized, read-only nomenclature access only.</p>
    </header>

    <section class="research-entry" aria-labelledby="research-entry-title">
      <div class="research-entry-main">
        <div class="section-label">RESEARCH INDEX</div>
        <h2 id="research-entry-title">Variant records</h2>
        <p>Search available variant identifiers and recorded nomenclature from the authorized source. Results are never replaced with example records.</p>
        <RouterLink class="research-entry-link" to="/variants">Explore variant records <span aria-hidden="true">→</span></RouterLink>
      </div>
      <aside class="research-entry-aside" aria-label="Current capability">
        <div class="section-label">CURRENT CAPABILITY</div>
        <dl class="research-capabilities">
          <div><dt>Identity and nomenclature</dt><dd>Read-only, when authorized</dd></div>
          <div><dt>Evidence and provenance</dt><dd>Pending verification</dd></div>
          <div><dt>Review and curation</dt><dd>Not yet available</dd></div>
        </dl>
        <p>These availability statements describe the modern workspace, not the existing legacy application.</p>
      </aside>
    </section>
  </div>
</template>

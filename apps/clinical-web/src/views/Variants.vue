<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { DEMO_RECORDS } from '../fixtures/variantRecords';
import { rankVariantRecords, evidenceOriginLabel, evidenceStateLabel, reviewStateLabel, type ReviewFacet } from '../domain/variantRecord';

const route = useRoute();
const router = useRouter();
const query = ref('');
const facet = ref<ReviewFacet>('all');
const results = computed(() => rankVariantRecords(DEMO_RECORDS, query.value, facet.value));
const selected = computed(() => DEMO_RECORDS.find(row => row.id === route.params.id) ?? null);
const selectedInResults = computed(() => !selected.value || results.value.some(x => x.record.id === selected.value?.id));
const facets: { value: ReviewFacet; label: string }[] = [
  { value: 'all', label: 'All records' },
  { value: 'needs-evidence', label: 'Evidence missing' },
  { value: 'review-planned', label: 'Review planned' },
  { value: 'unreviewed', label: 'Not reviewed' }
];
watch([query, facet], () => {
  if (!selectedInResults.value) void router.replace('/variants');
});
function choose(id: string) { void router.push('/variants/' + encodeURIComponent(id)); }
</script>

<template>
  <div class="page variant-page">
    <div class="eyebrow">RESEARCH WORKSPACES / VARIANT INTELLIGENCE</div>
    <div class="variant-heading">
      <div>
        <h1>Variant workspace</h1>
        <p class="intro">Explore record identity, research evidence and accountable review states in one coherent workspace.</p>
      </div>
      <span class="fixture-stamp">NONCLINICAL DEMONSTRATION</span>
    </div>

    <div class="record-layout">
      <section class="record-rail" aria-labelledby="record-list-title">
        <div class="rail-topline"><div><span class="section-label">RESEARCH INDEX</span><h2 id="record-list-title">Variant records</h2></div><span class="record-total">{{ results.length }} / {{ DEMO_RECORDS.length }}</span></div>
        <label for="search">Search identifier or example alias</label>
        <input id="search" v-model="query" type="search" autocomplete="off" placeholder="e.g. DEMO-CFTR-001" />
        <div class="facet-set" aria-label="Review status filters">
          <button v-for="f in facets" :key="f.value" type="button" :aria-pressed="facet === f.value" @click="facet = f.value">{{ f.label }}</button>
        </div>
        <p class="rail-caption">Search matches synthetic identifiers only; no nomenclature interpretation or federation is active.</p>
        <p v-if="!results.length" class="empty-result" role="status">No matching synthetic records. Adjust your search or review filter.</p>
        <div v-else class="record-list" aria-label="Search results">
          <button v-for="result in results" :key="result.record.id" type="button"
            :aria-current="selected?.id === result.record.id ? 'true' : undefined"
            :class="{ 'record-selected': selected?.id === result.record.id }" @click="choose(result.record.id)">
            <span class="record-first"><strong>{{ result.record.name }}</strong><span class="record-match">{{ result.tier === 'browse' ? 'Example' : result.tier + ' match' }}</span></span>
            <span class="record-subline">{{ reviewStateLabel(result.record.reviewState) }}</span>
            <span class="record-bottom">{{ result.record.evidence.length }} illustrative references <span aria-hidden="true">→</span></span>
          </button>
        </div>
      </section>

      <div class="record-content">
        <template v-if="selected">
          <article class="record-overview" aria-labelledby="selected-title">
            <div class="section-label">SYNTHETIC RESEARCH RECORD / {{ selected.id }}</div>
            <div class="record-identity">
              <div><h2 id="selected-title">{{ selected.name }}</h2><p>{{ selected.summary }}</p></div>
              <span class="record-state">{{ reviewStateLabel(selected.reviewState) }}</span>
            </div>
            <div class="source-note"><strong>Source:</strong> {{ evidenceOriginLabel(selected.recordSource.origin) }} · {{ selected.recordSource.sourceName }}. No scientific validation is implied.</div>
            <dl class="identity-grid">
              <div><dt>Reference identifier</dt><dd>{{ selected.nomenclature.legacy ?? 'Not available' }}</dd></div>
              <div><dt>Protein nomenclature</dt><dd>{{ selected.nomenclature.protein ?? 'Not recorded' }}</dd></div>
              <div><dt>cDNA nomenclature</dt><dd>{{ selected.nomenclature.cdna ?? 'Not recorded' }}</dd></div>
              <div><dt>Scientific determination</dt><dd>Not assessed in demonstration</dd></div>
            </dl>
          </article>

          <section class="record-section" aria-labelledby="evidence-heading">
            <div class="record-section-header"><div><div class="section-label">TRACEABILITY</div><h3 id="evidence-heading">Evidence register</h3></div><span class="record-total">{{ selected.evidence.length }} example records</span></div>
            <p class="section-description">Record presence, evidence source and reviewer state are distinct. No citation here refers to a real publication.</p>
            <p v-if="!selected.evidence.length" class="empty-result">No evidence is attached to this demonstration record. This does not indicate negative scientific evidence.</p>
            <div v-else class="evidence-list">
              <article v-for="evidence in selected.evidence" :key="evidence.id" class="evidence-item">
                <div class="evidence-heading"><strong>{{ evidence.title }}</strong><span>{{ evidenceStateLabel(evidence.state) }}</span></div>
                <p>{{ evidence.description }}</p>
                <div class="evidence-origin">{{ evidenceOriginLabel(evidence.provenance.origin) }} · {{ evidence.provenance.sourceName }}</div>
              </article>
            </div>
          </section>

          <section class="record-section" aria-labelledby="history-heading">
            <div class="section-label">GOVERNANCE</div><h3 id="history-heading">Record history</h3>
            <ol class="history-list">
              <li v-for="item in selected.history" :key="item.id"><strong>{{ item.kind.replaceAll('-', ' ') }}</strong><span>{{ item.actorLabel }} · {{ item.note }}</span></li>
            </ol>
            <p class="history-disclaimer">This timeline is generated from fixtures. It is not a real audit trail or authenticated clinical approval history.</p>
          </section>
        </template>
        <section v-else class="unselected-record" aria-labelledby="empty-title">
          <div class="section-label">RESEARCH CONTEXT</div>
          <h2 id="empty-title">{{ route.params.id ? 'Unknown demonstration record' : 'Select a variant record' }}</h2>
          <p>{{ route.params.id ? 'This route does not identify a synthetic fixture.' : 'Choose an entry to inspect identity, sources, missing evidence and review history.' }}</p>
          <p>Clinical classification, treatment eligibility and automated decisions are not available in this prototype.</p>
        </section>
      </div>
    </div>
  </div>
</template>

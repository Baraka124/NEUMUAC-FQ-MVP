import { normalizeTerm, type VariantPreview, type ReviewState } from './variant';

/**
 * Research *display* contracts. They deliberately contain no clinical efficacy,
 * variant pathogenicity or medical interpretation fields.
 */
export type EvidenceOrigin = 'synthetic-fixture' | 'direct-external' | 'curated-proxy' | 'local-annotation';
export type EvidenceState = 'unreviewed' | 'review-requested' | 'reviewed';
export type ReviewFacet = 'all' | ReviewState;
export type MatchTier = 'exact' | 'prefix' | 'related' | 'browse';

export interface Provenance {
  readonly sourceName: string;
  readonly origin: EvidenceOrigin;
  readonly sourceVersion: string | null;
  readonly retrievedAt: string | null;
  readonly referenceId: string | null;
}

export interface ResearchEvidence {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly state: EvidenceState;
  readonly provenance: Provenance;
}

export interface ReviewEvent {
  readonly id: string;
  readonly kind: 'fixture-created' | 'review-requested' | 'note-recorded';
  readonly recordedAt: string | null;
  readonly actorLabel: string;
  readonly note: string;
}

export interface VariantRecord extends VariantPreview {
  readonly summary: string;
  readonly nomenclature: {
    readonly legacy: string | null;
    readonly protein: string | null;
    readonly cdna: string | null;
  };
  readonly evidence: readonly ResearchEvidence[];
  readonly history: readonly ReviewEvent[];
  readonly recordSource: Provenance;
}

export interface VariantResult {
  readonly record: VariantRecord;
  readonly tier: MatchTier;
}

/** Simplified, deterministic display search (NOT legacy scientific search parity). */
export function rankVariantRecords(
  records: readonly VariantRecord[],
  term: string,
  facet: ReviewFacet = 'all'
): readonly VariantResult[] {
  const normalized = normalizeTerm(term);
  const ranked: (VariantResult & { index: number; weight: number })[] = [];
  records.forEach((record, index) => {
    if (facet !== 'all' && record.reviewState !== facet) return;
    if (!normalized) {
      ranked.push({ record, tier: 'browse', index, weight: 3 });
      return;
    }
    const fields = [
      record.name, ...record.aliases,
      record.nomenclature.legacy ?? '',
      record.nomenclature.protein ?? '',
      record.nomenclature.cdna ?? ''
    ].map(normalizeTerm).filter(Boolean);
    let weight = 99;
    if (fields.some(field => field === normalized)) weight = 0;
    else if (fields.some(field => field.startsWith(normalized))) weight = 1;
    else if (fields.some(field => field.includes(normalized))) weight = 2;
    if (weight !== 99) {
      ranked.push({
        record, index, weight,
        tier: weight === 0 ? 'exact' : weight === 1 ? 'prefix' : 'related'
      });
    }
  });
  return ranked.sort((a, b) => a.weight - b.weight || a.index - b.index)
    .map(({ record, tier }) => ({ record, tier }));
}

export function evidenceOriginLabel(origin: EvidenceOrigin): string {
  switch (origin) {
    case 'synthetic-fixture': return 'Synthetic example';
    case 'direct-external': return 'Direct external source';
    case 'curated-proxy': return 'Locally curated proxy';
    case 'local-annotation': return 'Local research annotation';
  }
}

export function evidenceStateLabel(state: EvidenceState): string {
  switch (state) {
    case 'unreviewed': return 'Not reviewed';
    case 'review-requested': return 'Review requested';
    case 'reviewed': return 'Reviewed';
  }
}

export function reviewStateLabel(state: ReviewState): string {
  switch (state) {
    case 'unreviewed': return 'Not reviewed';
    case 'needs-evidence': return 'Evidence missing';
    case 'review-planned': return 'Review planned';
  }
}

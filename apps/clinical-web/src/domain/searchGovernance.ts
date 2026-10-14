/**
 * Phase 2F: proposed search/analytics policy boundaries.
 *
 * Pure characterization for future integration: NOT used by the Vue search UI,
 * production search, Supabase, analytics writer, or any persistence layer.
 * No clinical/nomenclature equivalence is asserted here.
 */
export type SearchDisposition = 'browse' | 'search' | 'reject';
export type SearchReason =
  | 'empty' | 'below-search-threshold' | 'query-ready'
  | 'too-long' | 'external-link-or-contact' | 'parenthetical-qualifier'
  | 'sentence' | 'prose-fragment' | 'unsupported-paste';

export interface SearchDecision {
  readonly disposition: SearchDisposition;
  readonly reason: SearchReason;
}

/** A query is an interaction; search behavior does not determine analytics rights. */
export function decideSearchInteraction(raw: string): SearchDecision {
  const query = raw.trim();
  if (!query) return { disposition: 'browse', reason: 'empty' };
  if (query.length < 2) return { disposition: 'browse', reason: 'below-search-threshold' };
  if (query.length > 60) return { disposition: 'reject', reason: 'too-long' };
  if (/https?:\/\/|@[\w.]+\.\w{2,}|^\/[\w/]+/.test(query)) {
    return { disposition: 'reject', reason: 'external-link-or-contact' };
  }
  if (/\([^)]{3,}\)/.test(query)) {
    return { disposition: 'reject', reason: 'parenthetical-qualifier' };
  }
  const words = query.split(/\s+/);
  if (words.length >= 3 && words.every(word => /^[a-z]{4,}$/i.test(word))) {
    return { disposition: 'reject', reason: 'sentence' };
  }
  if (words.length >= 4 && !query.includes(':') &&
      !words.every(word => /\d/.test(word) || /^[cp]\./i.test(word) || word.length <= 3)) {
    return { disposition: 'reject', reason: 'prose-fragment' };
  }
  if (words.length >= 2 && !/\d/.test(query) && !/[>_+\-]/.test(query) &&
      !/^[cp]\./i.test(query) && words.every(word => /^[a-z]{5,}$/i.test(word))) {
    return { disposition: 'reject', reason: 'prose-fragment' };
  }
  return { disposition: 'search', reason: 'query-ready' };
}

export interface AnalyticsAuthorization {
  /** Feature is explicitly enabled in an authorized, reviewed context. */
  readonly analyticsEnabled: boolean;
  /** Purpose and lawful basis have been established by the data owner. */
  readonly collectionAuthorized: boolean;
  /** The query and metadata have passed a data-minimization review. */
  readonly minimizedInputApproved: boolean;
  /** The actual user/session has authority to participate in collection. */
  readonly actorAuthorized: boolean;
}
export type AnalyticsReason =
  | 'feature-disabled' | 'collection-not-authorized'
  | 'minimization-unverified' | 'actor-not-authorized'
  | 'not-a-search' | 'sensitive-or-qualified'
  | 'non-variant-query' | 'eligible-candidate-only';
export interface AnalyticsDecision {
  readonly eligibleCandidate: boolean;
  readonly reason: AnalyticsReason;
}

/**
 * The result is an eligibility signal, NOT an instruction to persist data.
 * No analytics writer is supplied in Phase 2F. The caller must separately
 * enforce consent/lawful basis, retention, tenant policy and safe persistence.
 */
export function decideAnalyticsCandidate(raw: string, policy: AnalyticsAuthorization): AnalyticsDecision {
  if (!policy.analyticsEnabled) return { eligibleCandidate: false, reason: 'feature-disabled' };
  if (!policy.collectionAuthorized) return { eligibleCandidate: false, reason: 'collection-not-authorized' };
  if (!policy.minimizedInputApproved) return { eligibleCandidate: false, reason: 'minimization-unverified' };
  if (!policy.actorAuthorized) return { eligibleCandidate: false, reason: 'actor-not-authorized' };
  if (decideSearchInteraction(raw).disposition !== 'search') {
    return { eligibleCandidate: false, reason: 'not-a-search' };
  }
  const query = raw.trim();
  const words = query.split(/\s+/);
  if (words.length === 2 && /\d/.test(words[0]) && /^[a-z]{5,}$/i.test(words[1])) {
    return { eligibleCandidate: false, reason: 'sensitive-or-qualified' };
  }
  // The scientific schema cannot confirm identity from a heuristic.
  // This coarse relevance filter is a proposed guard, not a clinical validator.
  const hasDigit = /\d/.test(query);
  const short = query.replace(/\s/g, '').length <= 4;
  const hasHgvsShape = /^[cCpPrRnNgG]\./.test(query) || /[>_]/.test(query);
  if (!hasDigit && !short && !hasHgvsShape) {
    return { eligibleCandidate: false, reason: 'non-variant-query' };
  }
  return { eligibleCandidate: true, reason: 'eligible-candidate-only' };
}

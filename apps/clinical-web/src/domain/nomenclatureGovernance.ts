/**
 * Phase 2G — versioned, fail-closed scientific decision contracts.
 * This module is an isolated engineering governance layer, NOT integrated
 * with the search engine, any clinical UI, Supabase, or production deploy.
 *
 * Approval metadata in source control is NOT an authenticated signature.
 * Future production activation requires a trusted approval service, scientific
 * validation and an independently authorized release.
 */

export type DecisionKind = 'alias-equivalence' | 'search-disposition';
export type DecisionStatus = 'proposed' | 'approved' | 'rejected' | 'retired';
export type ReviewRole = 'scientific' | 'engineering' | 'privacy';
export type DecisionApproval = 'approve' | 'reject';

export interface SourceReference {
  readonly sourceTitle: string;
  readonly sourceUrl: string;
  readonly sourceVersion: string;
  readonly citedOn: string; // YYYY-MM-DD (not a timestamp of clinical validation)
  readonly recordLocator: string;
}

/** A target must be accession- and sequence-context-specific. */
export interface AliasTarget {
  readonly gene: 'CFTR';
  readonly stableVariantId: string;
  readonly referenceSequence: string; // e.g. NM_000492.4 or another versioned accession
  readonly normalizedNotation: string;
}

export interface ReviewAttestation {
  readonly reviewerId: string;
  readonly role: ReviewRole;
  readonly recommendation: DecisionApproval;
  readonly reviewedOn: string;
  readonly reviewedRevision: number;
  readonly sourceLocator: string; // pointer to external trusted review evidence
}

/** Revisions are append-only in the planned governed store; static data cannot enforce immutability. */
export interface ScientificDecision {
  readonly id: string;
  readonly revision: number;
  readonly kind: DecisionKind;
  readonly status: DecisionStatus;
  readonly input: string;
  readonly proposedBy: string;
  readonly proposedOn: string;
  readonly rationale: string;
  readonly target: AliasTarget | null;
  readonly sourceReferences: readonly SourceReference[];
  readonly reviews: readonly ReviewAttestation[];
  readonly decidedOn: string | null;
  readonly dispositionNotes: string | null;
  readonly supersedesId: string | null;
}

export interface DecisionRegister {
  readonly schemaVersion: '1.0.0';
  readonly rulesetVersion: string;
  readonly legacyBlobSha: string;
  /** An explicit offline release switch. The committed register MUST remain disabled. */
  readonly activation: 'disabled' | 'release-authorized';
  readonly decisions: readonly ScientificDecision[];
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const ACCESSION_WITH_VERSION = /^[A-Za-z]{1,5}_\d+\.\d+$/;

/**
 * Explicit alias match only. We do NOT perform substring, phonetic, fuzzy or
 * whole-word medical canonicalization; the search engine is a separate concern.
 * Unicode lowercasing deliberately reveals Δ and δ as a possible collision.
 */
export function normalizeAliasKey(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('en-US');
}

function isValidDay(date: string): boolean {
  if (!ISO_DAY.test(date)) return false;
  const parsed = new Date(date + 'T00:00:00.000Z');
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}
function validExternalRef(reference: SourceReference): boolean {
  if (!reference.sourceTitle.trim() || !reference.sourceVersion.trim() ||
      !reference.recordLocator.trim() || !isValidDay(reference.citedOn)) return false;
  try {
    const url = new URL(reference.sourceUrl);
    return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password;
  } catch {
    return false;
  }
}

export interface RegisterAssessment {
  readonly errors: readonly string[];
  readonly pendingIds: readonly string[];
  readonly activeAliasCount: number;
  readonly deployable: boolean;
}

export function assessDecisionRegister(register: DecisionRegister): RegisterAssessment {
  const errors: string[] = [];
  const pendingIds: string[] = [];
  const ids = new Set<string>();
  const aliasKeys = new Map<string, string>();
  if (register.schemaVersion !== '1.0.0') errors.push('Unsupported schema version');
  if (!SEMVER.test(register.rulesetVersion)) errors.push('Invalid ruleset version');
  if (!/^[a-f0-9]{40}$/.test(register.legacyBlobSha)) errors.push('Legacy SHA missing');
  if (!['disabled', 'release-authorized'].includes(register.activation)) errors.push('Invalid activation state');

  for (const item of register.decisions) {
    const prefix = item.id + ' r' + item.revision;
    if (!/^NFQ-(?:NOM|GATE)-\d{3}$/.test(item.id) || ids.has(item.id)) errors.push(prefix + ': duplicated or invalid id');
    ids.add(item.id);
    if (!Number.isInteger(item.revision) || item.revision < 1) errors.push(prefix + ': invalid revision');
    if (!['alias-equivalence','search-disposition'].includes(item.kind)) errors.push(prefix + ': invalid kind');
    if (!['proposed','approved','rejected','retired'].includes(item.status)) errors.push(prefix + ': invalid status');
    if (!item.input.trim() || item.input.length > 100 || /[\r\n]/.test(item.input)) errors.push(prefix + ': invalid input');
    if (!item.proposedBy.trim() || !item.rationale.trim() || !isValidDay(item.proposedOn)) errors.push(prefix + ': missing origin information');

    if (item.status === 'proposed') {
      pendingIds.push(item.id);
      if (item.decidedOn !== null) errors.push(prefix + ': proposed decision cannot be dated as approved');
      // A draft may contain hypotheses, but those hypotheses can NEVER be active.
      continue;
    }

    if (item.status === 'rejected' || item.status === 'retired') {
      if (!item.decidedOn || !isValidDay(item.decidedOn) || !item.dispositionNotes?.trim()) {
        errors.push(prefix + ': closed disposition needs decision date and explanation');
      }
      continue;
    }

    // Approved records must have independent, traceable reviewers.
    if (!item.decidedOn || !isValidDay(item.decidedOn) || item.decidedOn < item.proposedOn) {
      errors.push(prefix + ': invalid approval date');
    }
    if (!item.dispositionNotes?.trim()) errors.push(prefix + ': missing approval rationale');
    if (item.sourceReferences.length < 1 || item.sourceReferences.some(r => !validExternalRef(r))) {
      errors.push(prefix + ': versioned authoritative references required');
    }
    const requiredRoles: readonly ReviewRole[] =
      item.kind === 'alias-equivalence' ? ['scientific','engineering'] : ['privacy','engineering'];
    const reviewers = new Set<string>();
    for (const role of requiredRoles) {
      const matching = item.reviews.filter(r => r.role === role && r.recommendation === 'approve' &&
        r.reviewedRevision === item.revision && isValidDay(r.reviewedOn) &&
        r.reviewedOn >= item.proposedOn && !!item.decidedOn && r.reviewedOn <= item.decidedOn &&
        r.sourceLocator.trim().length > 0);
      if (matching.length !== 1) {
        errors.push(prefix + ': requires exactly one valid ' + role + ' approval for this revision');
      } else {
        const review = matching[0];
        if (review.reviewerId === item.proposedBy || reviewers.has(review.reviewerId) ||
            !review.reviewerId.trim()) {
          errors.push(prefix + ': reviewers must be distinct from author and each other');
        }
        reviewers.add(review.reviewerId);
      }
    }
    if (item.reviews.some(r => r.recommendation === 'reject')) {
      errors.push(prefix + ': cannot approve with unresolved rejection');
    }
    if (item.kind === 'alias-equivalence') {
      const target = item.target;
      if (!target || target.gene !== 'CFTR' || !target.stableVariantId.trim() ||
          !target.normalizedNotation.trim() || !ACCESSION_WITH_VERSION.test(target.referenceSequence)) {
        errors.push(prefix + ': stable target and versioned reference accession required');
      }
      const key = normalizeAliasKey(item.input);
      if (aliasKeys.has(key)) errors.push(prefix + ': duplicate case-folded approved alias; also in ' + aliasKeys.get(key));
      aliasKeys.set(key, item.id);
    } else if (item.target !== null) {
      errors.push(prefix + ': query policy cannot carry an allele identity target');
    }
  }
  // A ruleset being formally release-authorized is not evidence of clinical validity.
  const activeAliasCount = register.decisions.filter(x=>x.status==='approved'&&x.kind==='alias-equivalence').length;
  return {
    errors, pendingIds, activeAliasCount,
    deployable: errors.length===0 && register.activation==='release-authorized' &&
      pendingIds.length===0
  };
}

export interface AliasResolution {
  readonly decisionId: string;
  readonly rulesetVersion: string;
  readonly revision: number;
  readonly target: AliasTarget;
}

/**
 * Fail closed; no fallback to historical alias tables. Output is for isolated
 * test evaluation only, and must not be used for clinical variant interpretation.
 */
export function resolveGovernedAlias(
  register: DecisionRegister, raw: string, referenceSequence: string
): AliasResolution | null {
  const assessment=assessDecisionRegister(register);
  if (!assessment.deployable || !referenceSequence || !raw.trim()) return null;
  const key=normalizeAliasKey(raw);
  const match=register.decisions.find(d=>d.status==='approved' && d.kind==='alias-equivalence' &&
    normalizeAliasKey(d.input)===key && d.target?.referenceSequence===referenceSequence);
  if (!match?.target) return null;
  return {decisionId:match.id,rulesetVersion:register.rulesetVersion,revision:match.revision,target:match.target};
}

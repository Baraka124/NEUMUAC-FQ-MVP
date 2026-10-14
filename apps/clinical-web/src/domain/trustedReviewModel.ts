/**
 * Phase 2H — pure trusted-boundary transition specification.
 *
 * NOT a security boundary when run in the browser. Identity, role membership,
 * evidence checks, release authority, time, row locks, transactional history
 * and idempotency MUST originate from a trusted backend. No UI imports this.
 * The implementation only models transitions for tests and backend design.
 */
import type { DecisionKind, ReviewRole } from './nomenclatureGovernance';

export type TrustedWorkflowRole = ReviewRole | 'release-manager';
export type WorkflowPhase = 'draft' | 'under-review' | 'ready-for-release' | 'rejected' | 'released';
export type ReviewVote = 'approve' | 'reject';
export type WorkflowError =
  | 'invalid-request'
  | 'not-authenticated'
  | 'not-authorized'
  | 'stale-version'
  | 'revision-mismatch'
  | 'invalid-transition'
  | 'evidence-not-verified'
  | 'reviewer-not-independent'
  | 'duplicate-review'
  | 'conflicting-idempotency-key'
  | 'release-not-verified';

export interface TrustedPrincipal {
  readonly subject: string;
  readonly authenticated: boolean;
  /** Backend-derived claims, never request-body roles or user_metadata. */
  readonly roles: readonly TrustedWorkflowRole[];
}

export interface TrustedReviewContext {
  readonly principal: TrustedPrincipal;
  /** Backend-supplied UTC timestamp, not a client clock. */
  readonly serverTime: string;
  /** Check authoritative evidence and the exact nomenclature revision in backend. */
  readonly evidenceVerified: boolean;
  /** Separate institutional release authorization/owner approval. */
  readonly releaseAuthorizationVerified: boolean;
}

export interface RecordedApproval {
  readonly role: ReviewRole;
  readonly subject: string;
  readonly revision: number;
  readonly approvedAt: string;
}

export interface ReviewEvent {
  readonly eventId: string; // idempotency key; server enforces database uniqueness
  readonly action: 'submitted' | 'review-approved' | 'review-rejected' | 'released';
  readonly actor: string;
  readonly revision: number;
  readonly previousVersion: number;
  readonly nextVersion: number;
  readonly occurredAt: string;
  readonly rationale: string;
  readonly role: ReviewRole | null;
}

export interface AppliedRequest {
  readonly key: string;
  readonly fingerprint: string;
}

export interface ReviewSnapshot {
  readonly id: string;
  readonly revision: number;
  readonly kind: DecisionKind;
  readonly proposerId: string;
  readonly phase: WorkflowPhase;
  readonly version: number;
  readonly approvals: readonly RecordedApproval[];
  /** Only to model idempotency; real service MUST persist keys transactionally. */
  readonly applied: readonly AppliedRequest[];
  /** Append-only model; real immutability needs trusted DB-level protections. */
  readonly history: readonly ReviewEvent[];
}

interface CommandBase {
  readonly decisionId: string;
  readonly revision: number;
  readonly expectedVersion: number;
  readonly idempotencyKey: string;
  readonly rationale: string;
}

export type ReviewCommand =
  | (CommandBase & { readonly action: 'submit' })
  | (CommandBase & { readonly action: 'review'; readonly role: ReviewRole; readonly vote: ReviewVote })
  | (CommandBase & { readonly action: 'release' });

export type TransitionResult =
  | { readonly ok: true; readonly next: ReviewSnapshot; readonly event: ReviewEvent | null; readonly replayed: boolean }
  | { readonly ok: false; readonly error: WorkflowError };

export const requiredReviewRoles = (kind: DecisionKind): readonly ReviewRole[] =>
  kind === 'alias-equivalence' ? ['scientific', 'engineering'] : ['privacy', 'engineering'];

const err = (error: WorkflowError): TransitionResult => ({ ok: false, error });
const validTime = (x: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(x)) return false;
  const dt = new Date(x);
  return Number.isFinite(dt.getTime()) && dt.toISOString().slice(0, 19) === x.slice(0, 19);
};

const validKey = (key: string): boolean => /^[a-zA-Z0-9_-]{12,128}$/.test(key);

/**
 * A caller MUST replace this pure specification with a server transaction.
 * Caller's TrustedReviewContext must never be obtained from browser input.
 *
 * Idempotent retry is checked before optimistic lock validation. A reused key
 * with different command parameters is rejected, even if the version changed.
 */
export function transitionReview(
  snapshot: ReviewSnapshot, command: ReviewCommand, trusted: TrustedReviewContext
): TransitionResult {
  if (!command.decisionId || !Number.isInteger(command.revision) ||
      !Number.isInteger(command.expectedVersion) || command.expectedVersion < 0 ||
      !validKey(command.idempotencyKey) || !command.rationale.trim() ||
      command.rationale.length > 4000 || !trusted.principal.subject.trim() ||
      !validTime(trusted.serverTime)) return err('invalid-request');
  if (!trusted.principal.authenticated) return err('not-authenticated');
  if (snapshot.id !== command.decisionId || snapshot.revision !== command.revision) {
    return err('revision-mismatch');
  }

  const fingerprint = JSON.stringify(command);
  const previous = snapshot.applied.find(x => x.key === command.idempotencyKey);
  if (previous) {
    if (previous.fingerprint !== fingerprint) return err('conflicting-idempotency-key');
    // Identity must also be bound to the key; caller's actor cannot replay
    // a command submitted by another actor.
    const recorded = snapshot.history.find(x => x.eventId === command.idempotencyKey);
    if (!recorded || recorded.actor !== trusted.principal.subject) return err('not-authorized');
    return { ok: true, next: snapshot, event: null, replayed: true };
  }
  if (snapshot.version !== command.expectedVersion) return err('stale-version');

  const subject = trusted.principal.subject;
  const permitted = (role: TrustedWorkflowRole) => trusted.principal.roles.includes(role);
  let phase: WorkflowPhase = snapshot.phase;
  let approvals: readonly RecordedApproval[] = snapshot.approvals;
  let eventAction: ReviewEvent['action'];
  let role: ReviewRole | null = null;

  if (command.action === 'submit') {
    if (snapshot.phase !== 'draft') return err('invalid-transition');
    if (subject !== snapshot.proposerId) return err('not-authorized');
    if (!trusted.evidenceVerified) return err('evidence-not-verified');
    phase = 'under-review';
    eventAction = 'submitted';
  } else if (command.action === 'review') {
    if (snapshot.phase !== 'under-review') return err('invalid-transition');
    if (!requiredReviewRoles(snapshot.kind).includes(command.role) || !permitted(command.role)) {
      return err('not-authorized');
    }
    if (subject === snapshot.proposerId) return err('reviewer-not-independent');
    if (snapshot.approvals.some(x => x.subject === subject || x.role === command.role)) {
      return err('duplicate-review');
    }
    if (!trusted.evidenceVerified) return err('evidence-not-verified');
    role = command.role;
    if (command.vote === 'reject') {
      phase = 'rejected'; // requires a NEW revision to reopen, not a hidden undo.
      eventAction = 'review-rejected';
    } else if (command.vote === 'approve') {
      approvals = [...snapshot.approvals, {
        role: command.role, subject, revision: snapshot.revision, approvedAt: trusted.serverTime
      }];
      const allRoles = requiredReviewRoles(snapshot.kind).every(required =>
        approvals.some(x => x.role === required && x.revision === snapshot.revision));
      phase = allRoles ? 'ready-for-release' : 'under-review';
      eventAction = 'review-approved';
    } else return err('invalid-request');
  } else if (command.action === 'release') {
    if (snapshot.phase !== 'ready-for-release') return err('invalid-transition');
    if (!permitted('release-manager')) return err('not-authorized');
    if (subject === snapshot.proposerId || snapshot.approvals.some(x => x.subject === subject)) {
      return err('reviewer-not-independent');
    }
    if (!trusted.evidenceVerified) return err('evidence-not-verified');
    if (!trusted.releaseAuthorizationVerified) return err('release-not-verified');
    const allRoles = requiredReviewRoles(snapshot.kind).every(required =>
      snapshot.approvals.some(x => x.role === required && x.revision === snapshot.revision));
    if (!allRoles) return err('invalid-transition');
    phase = 'released';
    eventAction = 'released';
  } else return err('invalid-request');

  const event: ReviewEvent = {
    eventId: command.idempotencyKey, action: eventAction!, actor: subject,
    revision: snapshot.revision, previousVersion: snapshot.version,
    nextVersion: snapshot.version + 1, occurredAt: trusted.serverTime,
    rationale: command.rationale.trim(), role
  };
  return {
    ok: true, replayed: false, event,
    next: {
      ...snapshot, phase, approvals, version: snapshot.version + 1,
      applied: [...snapshot.applied, { key: command.idempotencyKey, fingerprint }],
      history: [...snapshot.history, event]
    }
  };
}

# 14H149 · Original functional parity: batch lookup + private research sessions

## Why this phase

The protected legacy application is an advanced clinical research reference.
The engineering purpose of V7 is modularity, maintainability, security and
source-backed scientific integrity, **not deleting useful original workflows**.

The original 2.4 MB index.1.html contains:

- Batch-lookup launcher (original lines 6109–6114) and live function
  openBatchLookup/runBatchLookup (approximately lines 14522–14623):
  pasted multiline identifiers, normalization, exact, probable, candidate and
  not-found rows, plus entry into a chosen variant.
- Session in-memory ledger (STATE.sessionViews, original line 10839),
  session start (10840), per-search recent items (12981–12987), recent panel
  (7644–7654), and session-level export (around 25808).
- A separate database analytics pipeline (persistSearchEvent) and inactivity
  handling. These must be evaluated for privacy/governance, not copied by default.

## What V7 now implements

**1. Bulk variant discovery.** A compact, initially hidden "Batch lookup"
control sits beside the existing variant filters and saved variants. It
accepts newline, tab, comma and semicolon-separated recorded identifiers,
with a transparent limit of 100 entries in each run. The parser preserves
the original textual input and marks repeat/unsafe entries individually.

A bounded, cancellable GET-only resolver (3 concurrent items) first checks
an independent **unambiguous exact identity** with the existing live adapter
(or ID-scoped read for positive numeric record IDs). If no exact result can
be confirmed, it retrieves at most one page of candidate suggestions and
never automatically promotes a substring match or guessed synonym.
Each row explicitly distinguishes exact, potential candidates, no catalog
match, invalid input and unavailable source. Selecting a candidate still
enters the normal, independently verified dossier load.

The batch can export a formula-safe CSV retaining source status and
distinguishing confirmed variant ID from *unverified candidate IDs*.
No mutation, automatic therapy assignment, gene expression inference,
screen scraping or silent search-analytics writes. Pasted inputs are
ephemeral, never saved to local/session storage.

**2. Clinician's explicit working session.** The compact "My session"
control appears when authenticated. Clicking "Start session" enables a
temporary, in-memory ledger. Only actual, independently confirmed variant
dossier openings can enter the ledger; typing, misses and candidate
suggestions do not create views.

For each recorded variant, display source-recorded name, protein/cDNA,
functional class, subtype, separately recorded ETI and Alyftrek fields,
validation count, first/last view in UTC and number of verified opens.
Keep the last 100 distinct variant identities, with repeat visit count and
visible chronological recency. Start, pause, resume, end, clear and
opt-in CSV export are supported. Never include the user's account ID in
the export. Preserve the original independent therapeutic/genotype
interpretation rules and original exceptional Class I behavior.

The in-memory session is tied to the signed-in account and this page
load. It stops accumulating after 20 minutes without user interaction
(pointer/keyboard/touch/wheel events only), on hidden tabs, on manual
pause, or on session end. Idle and hidden pauses never auto-resume; the
clinician must explicitly choose Resume. A sign-out or account switch
clears it. A reload also starts without a ledger. No patient data,
geolocation, server writes, persistent analytics or background processing.

**3. Visual and architectural continuity.** The two tools are separate
Vue components backed by isolated, unit-tested TypeScript domain modules,
integrated into the existing Variants workspace. Calm outline buttons,
no overlay, no expanded persistent panel, original white/blue and Midnight
tones, 16px mobile textareas and safe footer containment. Previously
built research workspaces, access controls, evidence, clinical five-regimen
rules, governance, and the legacy file are untouched.

## Verification

- Unit: parser caps, duplicate and unsafe notation, exact-vs-candidate
  truthfulness, no writes, bounded parallelism, cancellation, CSV
  neutralization, explicit session opt-in, idle/tab pause, no automatic
  resume, identity clearing, 100-identity bound and export.
- Connected Playwright: dynamic batch results, candidate distinction,
  exported CSV, independent dossier opening; authenticated session start,
  confirmed visit capture, pause/resume/end/export/clear; Midnight parity and
  no horizontal overflow from 320 px to desktop.
- Required gate: existing TypeScript, Vitest and migration suite,
  all legacy endpoint/integrity, clinical foundation, therapy contract,
  parity tracking, full device browser suite, then verified GitHub Pages
  release identity.

## Later capabilities (not claimed)

A true multi-device/longitudinal session register would require
documented retention, access rules, consent/organizational legal basis,
auditable identity and RLS. This phase does **not** silently enable it.
The local session export is not a scientific validation or institutional
record, and a multiple-variant search is not compound-genotype assessment.

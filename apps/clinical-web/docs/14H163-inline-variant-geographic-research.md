# 14H163 · In-dossier, variant-linked geographic research

## Purpose
The globe beside each verified CFTR variant identity now reveals the existing
research-only regional search aggregate **inside the dossier**. The clinician
does not have to navigate away from the current variant, therapy, genotype or
evidence reading flow to see whether a source-backed regional aggregate exists.
The existing full Spain atlas remains a secondary, variant-preserving link.

## Data source and permissions
- Read path: `getRegionalResearchActivity` → fixed, read-only Supabase
  `nfq_geographic_research_activity(p_variant_id)` RPC from 14H162.
- Parameter: canonical, positive database variant ID from the independently
  confirmed variant dossier. Never a display name or search box text.
- Network request only on opening the globe **and** when authentication
  has completed and researcher membership is verified.
- The database checks the current signed-in account, active membership and
  minimum thresholds independently. Frontend gating is not authorization.
- A pending request is aborted on close, variant change, account change,
  membership change or component teardown. Stale responses are ignored.
- Client renders only validated coarse region code, safe event/session counts
  and the observation-date range. Never fetch raw logs, individual geographic
  coordinates, IPs, institutions, identities or patient records.

## Visible states
- `checking`: source verification in progress; no cached counts are shown.
- `restricted`: no verified research membership; counts never requested.
- `unavailable`: no verified response/configuration; not presented as zero.
- `empty`: no region meets 20 matched search events + 10 distinct sessions
  **for the selected variant**; may still be underlying below-threshold records.
- `available`: only independently qualified regional aggregates are shown
  with recorded date ranges, within a scroll-bounded compact panel.
- `closed`: no background query and no browser activity read.

All states retain the explanation that this measures *historical research
searches*, not patients, CFTR carrier prevalence, treatment response, clinical
demand, or affiliation. Records may include testing activity.

## UX and regression contract
- Original small blue outline globe remains by the dossier identity, with
  a soft-surface panel, light/midnight styles and compact mobile bottom
  positioning. No screen-wide dashboard/card wall or enlarged filled button.
- Escape, close button and click-outside dismiss the panel; close returns
  focus to the globe when explicitly requested.
- Existing search, responsive sidecar filters, therapies, authorizations,
  genotype and direct variant links are untouched.
- New pure decision-contract tests cover closed, malformed-identity,
  signed-out, unassigned, checking and verified states.
- Existing regional RPC decoder/fetch tests retain threshold, API transport,
  cancellation and unavailable/unauthorized gates.

## Release acceptance
Run Vue typecheck, Vitest, build, full browser suite, authenticated
research membership smoke and a production-domain visual pass. Without a
verified live authenticated check, implementation is source/CI acceptance
only, not full clinical or operational validation. The original user-uploaded
`index (86).html` stays immutable.

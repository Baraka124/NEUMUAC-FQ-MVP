# 14H164 — Traceable geographic research activity and region-continuous atlas

**Baseline:** 14H163 merged, research-only geographic activity RPC operational.
**Surface:** existing variant dossier globe and existing Spain atlas. No new module, no scientific-data mutation.

## Verified source
Read-only inspection of the *Cystic Fibrosis* Supabase project on 16 November 2026
confirmed the existing fixed-purpose RPC and underlying eligible-source predicate.

`public.search_logs` records are eligible for the aggregate only when:
- `country = 'Spain'`
- `ip_source = 'ipapi.co'` (coarse IP-estimated administrative region)
- `is_hit = TRUE` and `matched_variant_id IS NOT NULL`
- `searched_at IS NOT NULL`
- the region maps to a recognized autonomous community/city
- each published variant-specific region independently has **>=20** matched
  search events and **>=10** distinct non-empty session IDs.

The database held 787 events meeting the *base* eligibility predicate
(1 April–30 May 2026), **before per-region suppression** and regardless
of a specific variant. Another 183 events recorded with `browser_gps`
were excluded from the source predicate. This is an audit observation, not
a persistent UI fixture or patient-derived statistic. The counts are not
hardcoded anywhere in the browser.

The only browser-read API remains the existing authenticated
`nfq_geographic_research_activity(p_variant_id)` function. Authorization,
k-suppression and source records are enforced server-side, not by the UI.
It returns region code, event count, distinct session count, first/last
observation dates. It does not expose session IDs, GPS coordinates,
institution names, search text, IP addresses or patient identities.

## V9 delivery
1. The variant globe keeps its small, quiet original action. For verified
   researchers it shows eligible regional rows. Each row now opens the
   **same** atlas with `variant` and `region` in the URL. Opening the
   source details reveals the exact source category, scope, attribution
   method, publication threshold, exclusions and the observation period.
2. The period is computed only from dates in the **published aggregate rows**.
   It is labelled 'Observed across displayed regions' and expressed in UTC;
   it is **not** claimed to represent all underlying search logs or a
   complete reporting period.
3. The Spain atlas accepts only recognized region codes (01–19). The target
   region is preselected on the existing SVG, the right detail panel and
   the native region picker. Selecting another region updates the URL without
   losing the variant; clearing removes only the region parameter.
4. The same provenance vocabulary appears inside the existing atlas detail
   (collapsed until opened) rather than creating new cards, charts, padding
   or replacing the established map.
5. Public, guest, unassigned or unverified accounts cannot fetch protected
   counts; the deep link selects an administrative boundary **only**.
   Unsupported region or variant IDs never become data filters.

## Clinical/research interpretation boundary
This is historical **research platform search behaviour**. Some records
may have been generated in tests. The location is an IP-based estimate,
not a patient residence or hospital site. No claim is made about CFTR
allele frequency, geographic patient prevalence, clinical effectiveness,
patient outcomes, institutional demand, treatment usage or causality.

## Acceptance
- Pure domain tests: canonical region codes, invalid IDs, empty windows and
  correct UTC range derivation from returned rows only.
- Browser contract with isolated synthetic API fixtures (never exposed to
  production): verified, unassigned and public; region deep links, return,
  source readouts, no raw search_log REST endpoint.
- Existing full clinical foundation, therapy browser contract, responsive
  and legacy-integrity CI must remain green.
- Live authenticated acceptance still requires manual production verification
  by an active research member. Automatic production deploy success is
  not equivalent to clinical data validation.

**Never overwrite:** uploaded original `index (86).html`, archived
`index.1.html`, original classification and modulator logic, existing
role enforcement or the source-boundary/thresholding SQL.

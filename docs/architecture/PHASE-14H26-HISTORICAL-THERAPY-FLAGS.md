# Phase 14H26 — Historical therapy boolean reconciliation

The original dataset has two distinct sources of response information: `eti_prediction` / `alyftrek_prediction`, and independently stored boolean keys inside `therapy_responsive_drugs`. They are not equivalent. A `false` flag is an archived field value, **not** a medical non-response conclusion; a `true` flag is not proof of clinical benefit.

Read-only inspection of original rows confirmed:
- **G542X, record #19:** `cftr_class=I`, `class_subtype=exceptional`, `eti_prediction=non_responsive`, but `therapy_responsive_drugs.eti=true`. This is a data integrity inconsistency; the scientific category remains unchanged.
- **3120+1G→A, #35:** ETI `non_responsive`, Alyftrek `responsive`, original flags `eti=false` and `alyftrek=true`. Distinct drug responses are preserved.
- The original table has 2,234 ETI boolean keys and 1,193 Alyftrek boolean keys. A missing Alyftrek key remains **Not recorded**, not `false`.

## Implementation

The exact-variant `variantTherapySource` selects the original `therapy_responsive_drugs` field alongside the scientific response, using existing read-only authorization. The pure decoder rejects malformed non-boolean flag values and never coerces strings/numbers. The immutable profile stores these flags separately from response.

Within ETI or Alyftrek's optional details, display the historical flag and a restrained inconsistency note **only** if a definitive response category differs from the boolean. Unknown responses and missing flags are expressly non-comparable. The downloadable review brief also identifies the historical flags and discrepancy without silently changing the category.

Unit tests and connected-browser acceptance protect exceptional Class I G542X and true Class I Alyftrek cases, including strict response preservation.

**No schema/RLS edits, automatic reclassification, treatment advice, paid staging, or geographical hit/miss recording.** This stage prepares records for real scientific curation; it does not complete human reviewer approval.

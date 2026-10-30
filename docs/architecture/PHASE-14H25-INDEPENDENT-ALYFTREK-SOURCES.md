# Phase 14H25 — Independent ETI and Alyftrek source evidence

The five-regimen variant dossier previously nested *all* source-specific findings within ETI's expanded panel. A researcher inspecting Alyftrek saw its recorded `alyftrek_prediction`, but the Alyftrek detail contained no linked source evidence or source disagreement navigation.

This phase gives Alyftrek an independent, lazy `SourceResponsePanel` when its own therapy detail opens. ETI's source panel remains unchanged. Both use the existing exact-variant, GET-only `variant_evidence` → `evidence_sources` adapter, with the authorized session when configured.

- Count only records with an explicitly populated Alyftrek source response. ETI-only papers are not presented as Alyftrek-specific proof.
- When none exist, show **No linked Alyftrek response findings in this register**. The variant-level category remains visible and unchanged; absence of a linked source is not evidence of nonresponse.
- Compare independently recorded Alyftrek source labels and the variant-level Alyftrek category. Report conflicting categories and source IDs for review, never replace the stored response.
- Keep Class I functional class, exceptional subtype, ETI and Alyftrek independent; no automatic clinical response, drug eligibility or treatment recommendation.
- Unit and connected-browser tests cover Class I Alyftrek response, ETI-only sources, source disagreement, unknown categories, cross-variant isolation, disclosure and mobile overflow.
- No write endpoint, RLS changes, regulator claims, server approvals, or geographic hit/miss recording.

**Remaining:** the live Supabase `variant_evidence` inventory has no Alyftrek response rows in the earlier audit. This implementation is correct and useful even when the panel shows a precise absence of linked findings; source curation and clinician verification remain future work.

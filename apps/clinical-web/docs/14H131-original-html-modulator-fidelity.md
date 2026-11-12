# 14H131 · Original HTML → modular V6 functional-preservation contract

## Authority and scope

Reference furnished by the project owner: **`index (85)(1).html`** (40,176-line original monolith, not a copy of its database). The original file stays **unchanged and outside the deployable repository**. Line references below refer to this exact uploaded file; they permit later maintainers to reconcile the original without assuming the original database is available.

**Mandate:** preserve functionality and scientific nuance while separating concerns into testable modules. We are **not simplifying or removing features**. A historical behavior is documented, not automatically endorsed as clinically current. Verify regulator labels, evidence and cohort decisions separately before a clinical-use claim.

## Original compound-heterozygosity workflow

Original `AREA 3 — PHASE 3 COMPOUND HETEROZYGOSITY ENGINE` begins around lines **36809–36812**; `MODULATOR_MAP` at **36861–36986**; `computeCompoundHetVerdict` at **37201–37289**. It works with **two alleles**, not merely a single variant classification.

| Modulator | Original operative rule | Preserve as an independently inspectable result |
|---|---|---|
| Trikafta / ETI | Tier 1 named FDA/EMA label match; Tier 2 recorded ETI-responsive allele with `clinical_trial`, `frt_assay` or `fda_approved` evidence tier; Tier 3 conditional Class II `class_rule` evidence, with caution (36863–36885). Non-F508del pair triggers MDT review (36887–36894). | Distinguish source of match, evidence tier and MDT flag. A Class I label alone must never nullify a recorded exceptional response. |
| Kalydeco / IVA | Exact membership in an ivacaftor eligible-variant name set, searching legacy/protein/alternate aliases (36901–36915). Class III/IV labels are descriptive, **not** an eligibility shortcut. | Preserve alias matching and named-mutation-only logic. |
| Symdeko / Symkevi / TEZ-IVA | F508del homozygote **or** F508del + ivacaftor-eligible allele; specifically not F508del plus arbitrary second allele (36917–36943). | Preserve paired-allele rule and uncertainty when alleles are unavailable. |
| Orkambi / LUM-IVA | Exact F508del homozygote; explicitly reject loose substring matching (36945–36958). | No class-II-only inference; no loose name match. |
| Alyftrek / VNZ-TEZ-D-IVA | Original EU-oriented rule: at least one known non-Class-I allele, **or** direct Alyftrek-responsive clinical-trial evidence even for Class I; ambiguous/unrecorded class treated separately; ETI nonresponse/unknown signals MDT review (36960–36983). | Maintain independent Alyftrek fields, evidence tier and MDT/uncertainty signaling. Historical rule is **not** a current prescribing recommendation. |

### Cross-regimen details that must survive

- Class I `class_subtype === 'exceptional'` is expressly detected at **37209–37213** and carried in the verdict at **37283**. It is a review signal and does not automatically rewrite ETI or Alyftrek responses.
- ETI and Alyftrek are independently considered; original verdict includes `alyftrekOnlyEligible`, `alyftrekExpansionMutation`, `hasUnknownEti`, `etiMismatch`, `responsiveAllele`, `dominantAllele` and `eligibilityUncertain` (**37226–37287**). These are *different* concepts; do not combine them into a single boolean or “responsive” badge.
- **R117H** is explicitly marked haplotype-dependent with intron-8 poly-T/TG context (**36814–36858**). A single mutation name cannot substitute for its modifier context. Preserve the requirement for contextual verification before deriving a clinical interpretation.
- Source classifications can be internally inconsistent. Keep original recorded values visible and route discrepancies into scientific review rather than silently resolving them in UI code.

## Current modular separation (as inspected 2026-11-12)

- `src/domain/therapyRegistry.ts`: all five regimens, brand aliases, independent ETI/Alyftrek variant response fields; the other three are `genotype-rule-only` in a **single-variant dossier**.
- `src/domain/classIReviewSignals.ts`: explicit Class I exception, subtype/ETI discrepancy and independent ETI–Alyftrek divergence findings; no automatic reclassification.
- `src/components/TherapyWorkspace.vue`: 2 recorded variant responses + 3 genotype research rules, source inspection, evidence navigation, historical flags, and preserved selected variant.
- `e2e/therapy-browser-contract.spec.ts`: five-row dossier, Class I subtype and diverging drugs, contextual navigation, mobile overflow and genotype rule counts.

**Do not mistake absence of a per-variant response for failure or ineligibility.** Kalydeco, Symkevi and Orkambi are assessed on the *paired-genotype* path, not predicted from the isolated variant's functional class.

## Explicitly unresolved before declaring original-engine parity

1. Reconcile every original `MODULATOR_MAP` branch against the **modular paired-genotype evaluator** with executable fixtures: named ETI label, tier 2, tier 3, Kalydeco name aliases, F508del homo-/heterozygote, strict Orkambi matching, Alyftrek exceptional Class I, and unknown ETI.
2. Reconcile the original R117H poly-T/TG warning against modular haplotype handling; if the current data model lacks context, show the gap as **not assessed**, never infer it.
3. Verify that original MDT prompts, responsive-allele selection, dominant-allele descriptor and ETI/Alyftrek divergence have equivalent inspectable states, or document deliberately enhanced behavior.
4. Confirm source-data fields and evidence tiers against actual database schema independently; this HTML alone does not prove the original record values.
5. Review historical regulatory/clinical assertions against current authoritative evidence before exposing them as care guidance.

## Release invariant

A modularization change must (a) retain five distinct regimens, (b) keep variant response records and paired-genotype rule outcomes separate, (c) never derive an individual response solely from Class I–VI, (d) preserve original values and provenance, (e) maintain context-return navigation, (f) pass desktop/mobile and edge-case contracts, and (g) touch **neumuacFQ only**. Changes to scientific outcomes require their own explicit review and evidence-backed decision.

This document is a **traceable baseline**, not a replacement for the original file, not an imported database and not a deployment authorization.

# 14H135 — Original genotype-engine parity, verified research descriptors

## Original baseline

The original single-file `index (85)(1).html` remains preserved and unchanged. This phase uses:

- `IVACAFTOR_VARIANTS` at original lines **18548–18556**, the literal **31 name/alias** membership set.
- `MODULATOR_MAP` at lines **36862–36987**, the historical five-modulator paired-allele rules.
- `computeCompoundHetVerdict` at lines **37201–37289**, whose descriptive fields include `dominantAllele`, `responsiveAllele`, `hasUnknownEti`, `hasExceptionalClassI`, `etiMismatch`, `alyftrekOnlyEligible`, `alyftrekExpansionMutation` and `eligibilityUncertain`.

## What is now modularized without reclassification

`src/domain/originalPairVerdictContext.ts` computes read-only **historical descriptors** on top of the existing five-rule comparator:

| Original concept | Auditable V6 research descriptor | Guard |
|---|---|---|
| `dominantAllele` | Original class-order selected record | Historical ordering **is not patient phenotype** |
| `responsiveAllele` | First ETI-responsive recorded allele | Recorded ETI response; not proof of treatment effect |
| `hasUnknownEti`, `eti1Unknown`, `eti2Unknown` | Explicit missing/unknown ETI values | No negative inference |
| `etiMismatch` | Both recorded ETI values exist and differ | Does not reclassify either |
| `hasExceptionalClassI` | Exceptional subtype present | Preserve separately |
| `alyftrekOnlyEligible` | Alyftrek-only **research rule** match | Do **not** report medical eligibility |
| `alyftrekExpansionMutation` | Alyftrek research expansion review | Does not establish current label |
| `eligibilityUncertain` | Matched research rule + missing/unknown ETI | Scientific review flag only |

The results are inspectable behind a compact optional disclosure in the paired-variant research area. All 5 original regimen results, individual therapy responses and evidence tiers remain unchanged.

## Pair-rule matrix

- Exact F508del name aliases, not substring/intron inference.
- Full original 31-name ivacaftor set and negative controls including D110E.
- F508del plus a listed ivacaftor allele vs F508del/F508del: TEZ/IVA vs strict LUM/IVA.
- ETI direct evidence tier vs Class II class-rule evidence and a missing ETI response.
- Independently recorded exceptional Class I and ETI/Alyftrek divergence.
- R117H poly-T/TG remains **not assessed** (14H132), not inferred.
- Mobile/desktop browser contract, preserving original context and all five outcome rows.

## Still not established

This phase provides *source-level compatibility and regression protection*, not proof that any historic regulatory list still governs clinical use. Current EU/FDA/AEMPS indication, patient age/weight, patient genotype/phase, interaction screening, MDT signoff, drug switching and individual outcome claims require their own approved data and specialist oversight. The original monolith also implemented many non-genotype features, separately tracked for later modularization.

No production data mutation, no source HTML replacement, no change to existing candidate evaluation or current access controls. The next broader phases cover evidence curation, clinical usability and controlled operational acceptance.

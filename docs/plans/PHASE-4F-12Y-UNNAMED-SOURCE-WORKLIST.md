# Phase 4F-12Y — Unnamed-source documentation follow-up

NFQ-027 and NFQ-029 remain **Partial / Not migrated**, respectively. This phase adds an explicit **Source not named** filter to the existing Research coverage groups. It works only with the existing complete, successful public coverage read. It does not add a separate navigation item or pretend to supply an expert-ranked curation queue.

- Every record in this view has **one or more recorded reference links with no source name**. The source breakdown must account exactly for the reported number of links; inconsistent data fails instead of silently yielding an apparent list.
- A variant with no linked references belongs to *No links recorded*, not this group. A link from an unnamed source is never described as missing scientific research, poor evidence, or a clinical contradiction.
- Existing literal recorded-name search and source-count groupings are unchanged; groups are mutually chosen views but *Source not named* can overlap with One/Multiple.
- No alteration to Supabase reads, tables, permissions, clinical classifications, geographic activity, or patients. The source list is a documentation triage aid, not a clinical-priority score.
- Verified by unit tests for named versus unnamed sources, literal filtering, and incorrect source-count response refusal; deployment and independent source curation acceptance remain outstanding.

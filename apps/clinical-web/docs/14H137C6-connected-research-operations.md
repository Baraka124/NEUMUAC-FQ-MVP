# 14H137C6 · Connected FQ research operations — implementation and acceptance contract

## Project intention

The project owner's untouched original **`index (85)(1).html`** remains the historical source of functional scope, interaction richness and visual precision. This release **does not simplify** the five-modulator science, CFTR Class I exceptional response, recorded ETI/Alyftrek findings, curated source lineage, research workflows, or the role model. It turns previously disconnected operational steps into a safer, source-traceable experience in the modular Vue application.

## End-to-end research lifecycle and current evidence

| Stage | Existing implementation | C6 verification boundary |
| --- | --- | --- |
| Administrator invites a clinician / external guest | Private server-managed Supabase Auth invitation, explicit confirmation, read-only request history; a 202 acceptance does not assert email delivery | Existing **14H126–130** synthetic dispatch safety tests, including unknown delivery/duplicate prevention; **no real invitations sent** |
| Account accepts invitation | One-time invitation return is consumed *before* Vue hash routing; account activation is distinct from a verified research membership | Existing invitation-route and activation-unit tests; no fabricated activation or production identity confirmation |
| Administrator assigns research membership | Database-verified contributor/reviewer/administrator, separate verified professional identity; role operations require server authorization | Existing **14H123** role RPC contract plus C6 synthetic membership refresh across unassigned → contributor → reviewer → revoked |
| Researcher proposes source-supported correction | Versioned source proposals are separate from published source records; connected variant and evidence views | Existing original research-curation browser and API contracts; no new automatic publication |
| Independent reviewer examines proposal | A verified reviewer/admin sees only server-returned pending proposals and cannot approve their own work | C6 browser tests enforce author != reviewer, server-assigned role gating, full link to exact variant dossier and associated evidence list |
| Review decision and follow-up | Protected `nfq_review_source_correction` RPC records an audit decision; it does **not** directly update published `evidence_links` | C6 disables submit until accepted/rejected selection, valid 15–900 character rationale, independent acknowledgment; sends exactly one request; **reloads pending queue after accepted response** while retaining success message |
| Uncertain decision response | A timed-out or ambiguous POST may have committed server-side | C6 blocks that exact proposal from another decision in the **same mounted client session**, even after a queue refresh; requires independent audit verification rather than claiming success |
| Source publication | Source-level evidence and variant-level scientific interpretations remain independently versioned | No source publication was implemented or implied by a decision and no scientific algorithm/data fields changed |

## User experience

- Source review rows include small, quiet links for **Inspect variant dossier** and **Inspect recorded evidence**, both constructed through the application's validated internal route builders. No arbitrary URL or external target is accepted.
- Correct decision readiness is visible before request submission: choice, scientific rationale and explicit independent acknowledgment are all necessary. Rationale character count remains visible, with no intrusive full-screen confirmations or heavy buttons.
- Success feedback survives a fresh queue GET instead of leaving the reviewer on a blank idle list. Uncertain submission is explained and blocked per proposal; other work may continue after independent queue verification.
- Daylight and Midnight research themes use corresponding text/surface colors without recoloring existing CFTR class or evidence-status semantics. Buttons maintain proportionate, 40px touch/focus targets.

## Safety contracts

This release modifies **only the FQ frontend and synthetic test suites**. No FQ Supabase migration, live role mutation, email dispatch, guest designation, scientific record change, publication RPC, neumDESK edit, or original HTML overwrite.

Backend authorization/RLS and audit durability remain the final authorities. **Frontend confirmation is never evidence of publication.** Automated checks cannot replace a real authorized multi-account end-to-end test with delivery-provider evidence and server audit inspection.

## Acceptance

1. Domain, TypeScript, legacy integrity, endpoint inventory and functional parity remain green.
2. C6 browser test: reviewer can inspect each proposal's variant/evidence route; self-created proposals cannot be independently reviewed by the same account.
3. C6 browser test: button stays disabled until valid choice, rationale and acknowledgment; exact one-call RPC payload, no request to published evidence table; pending queue automatically refreshes.
4. C6 browser test: uncertain POST blocks same-proposal resend in current session after refresh.
5. C6 browser test: research membership display changes only after server role verification (unassigned → contributor → reviewer → unassigned), not because a professional profile exists or due to local UI state.
6. Existing invitation/history, access, guest, evidence, five-therapy and mobile workflows retain independent checks.
7. Production verification requires **authorized Vercel deployment read access**, a confirmed Git SHA/site assignment and a real-browser smoke check. A merged PR alone does not establish live deploy status.

## Follow-up acceptance beyond C6

Real-user acceptance should include correctly provisioned *synthetic* administrator, contributor, independent reviewer and guest accounts, server-recorded audit timestamps and failures, and evidence source publication governance. Require organizational approvals before real clinical data or invitation delivery; do not substitute browser mocks for these gates.

# 14H144 · Public Vue root and source-artifact release parity

## Context

The accepted V7 work (PRs #325–#328) is merged. The modern clinical Vue application now publishes from the checked-in repository root, retaining the original legacy page in `index.1.html`. The GitHub Pages cutover workflow builds the Vue application at an **application-source** revision and then makes a separate, automated **publish** commit to `main`.

The prior manual production-release audit erroneously compared the public `nfq-release-commit` marker to `${{ github.sha }}` (the *publish commit*). A successfully published page therefore appeared stale despite identifying its correct source.

## Correct provenance contract

1. The audited source commit is the single validated `nfq-release-commit` embedded in the actual **checked-in `index.html`** artifact. The publish-bot SHA is not the compilation source.
2. The checked-in release must also match the latest deployment-triggering source revision on the first-parent history of `main` (the clinical application or its cutover workflow). This prevents a previously published root and stale public page from jointly passing after a source-only release failure.
3. The checked-in and publicly observed HTML must identify the same original source commit.
4. The compiled root's hashed Vue JavaScript and CSS entry paths must also match the publicly served HTML. Invalid, missing, duplicate or remote entry tags fail closed.
5. The exact linked compiled assets must exist in the checked-in root, and frozen `index.1.html` must remain present.
6. The public probe continues to perform one credential-free GET of `https://fq.neumact.org/` only. It does not access authenticated routes, datasets, mutation endpoints, invitations or patient information.
7. The prior explicit `NFQ_EXPECTED_COMMIT` audit and its tests remain supported for other verification contexts.

## Scope and gates

This release-audit correction touches no Vue view, style, source schema, therapy model, authorisation rules, APIs, Supabase data, GitHub Pages publish workflow, public content or neumDESK. It does not create a deployment by itself.

Test cases cover source staleness despite matching old artifacts, source mismatch, differing JS/CSS identities at the same marker, missing/duplicate/untrusted entry tags, fixed-origin GET behavior and compatibility with the existing direct-SHA audit.

After branch CI succeeds, merge only if the implementation and deployment identity are reviewed. The **manual** `neumuacFQ public production release audit` workflow on `main` remains the production verification step; the live browser acceptance input is separately opt-in.

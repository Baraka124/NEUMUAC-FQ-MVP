# Phase 14H23 — Build identity for verifiable production acceptance

Production acceptance requires knowing **which exact commit** is running at `fq.neumact.org`, not only whether the repository or CI is green.

The Vite build now emits an inert public HTML meta tag named `nfq-release-commit` **only** when `VERCEL_GIT_COMMIT_SHA` (preferred) or `GITHUB_SHA` identifies a complete 40-character Git commit. The value is validated and lowercased; absent/invalid source values produce no claim. This is public nonsecret provenance, not an account identifier or credential.

The marker can be read without starting the application, signing in, collecting variant/patient data, or accessing Supabase. A missing marker is a **verification failure**, not evidence that the app is up to date. It appears only after the commit introducing this functionality is deployed by Vercel.

This commit **does not trigger a deployment** or verify production on its own; Vercel team access and public host acceptance are separate. No changes to frozen `index.1.html`, scientific data, genotype logic or geographic recording.

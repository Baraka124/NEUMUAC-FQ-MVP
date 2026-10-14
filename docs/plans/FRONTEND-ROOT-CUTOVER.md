# NeumuacFQ — Frontend cutover and rollback

## Deployment contract

Upon merge, `.github/workflows/live-vue-cutover.yml` runs on main, installs and verifies the Vue application, builds production assets with **VITE_NFQ_READ_ONLY_ENABLED=false**, preserves the historical blob as `index.1.html`, publishes generated `index.html` and `assets/` at repository root, and commits the result to main. GitHub Pages' existing branch-based deployment then serves the new interface on the unchanged CNAME, `fq.neumact.org`.

This is a **frontend visual-review cutover only**. No Supabase schema, RLS, key, credential, API, or production database mutation. Authenticated records will be unavailable until a separately reviewed access configuration is enabled. Unmigrated areas are labeled unavailable.

## Verification

- CI on the PR must pass prior to merge.
- The publisher verifies the archived legacy SHA is exactly `c18221fb6baf47782318ca3685b94b088c359a66`.
- Vue typecheck, tests, differential check, build, archived legacy integrity and redacted inventory must all succeed before committing root replacement.
- Confirm the Pages build and deployment job succeeds *after* generated root files are committed; check the domain in an incognito browser on desktop and mobile.
- Do not treat a successful workflow as validation of Supabase Auth/RLS or scientific functionality.

## Immediate rollback

The old experience will remain directly accessible at `https://fq.neumact.org/index.1.html`. This legacy entry uses pre-existing browser integrations: it is not a secure fallback for sensitive operations until the access audit is closed.

If the new site fails visibly, restore root from archive in an authorized commit:

```sh
cp index.1.html index.html
git add index.html
git commit -m "Rollback Vue root to frozen legacy interface"
git push origin main
```

The `index.1.html` file and compiled assets may remain available until cleanup; do not remove the archive without an independently tested rollback. For further modernization iterations, update the controlled publisher's trigger/build rather than hand-editing generated bundles.

## Restrictions

Do not configure a Supabase URL/key, enable database access, or run staging SQL merely to make the new UI appear populated. Do not add fictitious scientific data. Preserve the research interface design contract.

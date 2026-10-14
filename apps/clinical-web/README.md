# NeumuacFQ clinical-web — Phase 1A

A separate Vue 3 / TypeScript / Vite application scaffold with mock domain records.

Run from this folder:

```sh
npm install
npm run typecheck
npm test
npm run build
npm run dev
```

**Development only.** Never deploy this as the root `fq.neumact.org` application or connect it to production Supabase. The root `index.html` and `CNAME` remain unchanged. Static demo routes use hash history. Real clinical workflows, permissions, audit and scientific interpretation have *not* been migrated. No medical interpretation or patient information is present.

CI must pass before any merge. The production site stays on the existing root implementation until separately approved migration.

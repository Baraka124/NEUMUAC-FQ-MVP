# neumuacFQ — Public gateway / sign-in editorial system

**Status:** single-source design implementation, pending full browser CI and visual acceptance.

The public landing, the inline sign-in within it and the dedicated sign-in route are **one product**, not three separately themed landing pages. The scientific research workbench remains untouched.

## Visual identity

- **Canvas:** clean cold white (`#fbfcfd`), with white input surfaces; never mint, cream-green, gradient, illustration, colored-glass panel, decorative hero card or dark login-only backdrop.
- **Institutional ink:** `#152b40` for headings and primary content. **Supporting text:** `#495d71` / `#627487`. **Hairline:** `#dfe6ec`. **Focus:** `#197e94`.
- **Brand teal:** `#117c8d` used for navigation emphasis and identifying context, not scattered colored blocks. **Action navy:** `#193b53` for the *real* public research entry and sign-in submission only.
- The existing original approved `/brand/neumuacfq-logo.png` remains the only identity mark. The cropped square-logo frame is identical on the public and dedicated login routes; no redraws.
- Display hierarchy uses a measured editorial serif with an IBM Plex Sans institutional utility layer. Avoid random typefaces, extravagant letter spacing, huge form fields, faux badges and repeated arrow decoration.

## Interaction and architecture

`ResearchAccessPanel.vue` is the canonical shared presentation for both login states. Its responsibilities are the same heading, status, context help, real `ResearchSignInForm`, password recovery and escape back into public research. The panel changes only the return link and H1/H2 semantics by context. No auth logic has moved into the presentation.

The public landing retains the direct verified links to variants, publications, genotype, geography and research coverage. The sign-in state does not create a competing large primary public button. Read-only status and research descriptions are text, never pill-like buttons.

The single stylesheet `public-entry-editorial.css` owns the visual system. It is imported **after** the original clinical style layers, and is strictly scoped to `.nfq-entry-surface` to avoid changing the internal workspace. All competing local landing, sign-in and form style blocks were removed.

## Acceptance

- Public landing, inline sign-in and `/#/sign-in` have identical computed tokens, neutral surfaces, original logo sizing and readable typography.
- Public research does not require login. The provider, credentials, errors, password visibility, submit behavior, role checks, permissions and recovery routes remain unchanged.
- Original mobile/tablet/desktop route contracts, footer/readability requirements and authenticated 5-therapy browser contract must pass; CI never manufactures a session.
- Render at 320, 390, 768, 1024 and 1366px. No horizontal overflow, floating panels, excessive vertical whitespace, giant filled form buttons or blue autofill fields.
- Final human optical review and live-deployment check remain separate from automated checks.

**Freeze criterion:** after complete green CI and visual review, do not add decorative passes. Evolve the entry only when usability, clinical readability, security or a real product requirement supports the change.

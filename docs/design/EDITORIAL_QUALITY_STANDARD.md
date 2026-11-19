# neumuacFQ · Editorial quality standard

## Purpose

This is a product-specific acceptance standard for a CFTR research workbench, not a generic dashboard design brief. Scientific hierarchy, restraint and data trust take priority over visual decoration.

### 1. Typography

- **Typeface:** use the application's existing IBM Plex Sans / Inter / Segoe UI / system stack; never use faux-bold or synthetic condensed fonts. If the preferred font is not installed, the fallbacks must remain readable.
- **Page identity:** 29–38px responsive display at medium weight, negative tracking only for large headings; never repeat the same module heading inside multiple stacked cards.
- **Section headings:** approximately 17–23px, medium/semibold, optical spacing tied to content.
- **Controls and prose:** ~12–14px; preserve a practical 16px mobile text size for zoom-prone form fields.
- **Data:** tabular numeric alignment for clinical counts, confidence/value comparisons, dates and audit timestamps. Long explanations belong behind contextual information affordances when genuinely useful.

### 2. Color and surfaces

- **Original institutional signature:** preserve the proven dark navy sidebar #0C1422 and the working original electric blue as a selectively used action/focus color.
- **Daylight canvas:** #F4F5F7 with white content surfaces. Use hairline borders only to show a meaningful boundary.
- **Midnight:** preserve contrast and existing theme persistence rather than recoloring high-risk domain semantics.
- **Protected statuses:** therapy responsiveness, scientific uncertainty, missing evidence, adjudication and mutation classifications must retain their established semantics. Color must never be the sole interpretation channel.
- **No visual theatrics:** gradients, excessive shadows, raised cards, ornamental lines, artificial module counters, or promotional-looking buttons are inappropriate.

### 3. Interaction

- Controls should be visually calm in idle state, unambiguous on hover, and fully perceivable on keyboard focus.
- Search precedes filters; filters remain compact and never obscure primary search unexpectedly.
- Worklist selected states are distinct from hover, and unselected rows do not resemble filled calls to action.
- Dialogs maintain contained Tab/Shift+Tab focus, support Escape and restore focus to the invoking control.
- Tooltip/help information appears only when requested; nothing obscures the primary scientific task.
- Disabled, loading, permission-denied and empty-data states are truthful and must not imply real research data when the backend is unavailable.

### 4. Data is not a button

- **Scientific observations and recorded classifications** are read-only text by default: clear label, exact value, appropriate weight, spacing and restrained semantic color. Do not wrap each value in a colored rectangle, pill or artificial action affordance.
- **Actual operations** (inspect source, edit an authorized record, choose a filter, export, save) must be recognizable controls with real button or link semantics, accessible names, meaningful hover/focus/disabled states, and adequate hit targets.
- **States and warnings** must remain readable and truthful. Use clear words, not color-only signaling; reserve filled badges or special visual emphasis for exceptional operational states, not every routine value.
- **Subtype / ETI / Alyftrek dossier row** is the reference implementation of this separation: these are database-recorded annotations with separate meanings, not clickable eligibility claims or independent clinical validation.
- Don't imitate interactivity by giving static text rounded borders, decorative underlines, shadows or pointer cursors.

### 5. Acceptance matrix

Before any future design sign-off, review every **actual** module and openable surface (not just the overview): workspace, variant discovery, variant dossier, genotype, evidence curation, coverage, geography, reports/audit, governance, research account, invitations and mobile navigation.

For each applicable surface, inspect desktop 1366px, 1024px, 768px and mobile 390px/320px. Check overflow, focus, touch targets, search/filter layering, text truncation, browser zoom, midnight/light contrast, and error/empty states. An automated green CI establishes functional regression safety, **not** human optical quality.

### 6. Change discipline

Keep E01–E03 as the frozen baseline. New refinements must edit an existing relevant component or final stylesheet instead of adding a new global override layer. Record specific defects and their measured fixes. Avoid infinite generic design phases.

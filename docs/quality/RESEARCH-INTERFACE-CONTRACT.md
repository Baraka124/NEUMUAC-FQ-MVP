# NeumuacFQ — Research interface quality contract

**Applies to:** Vue clinical-web and its eventual replacement of the legacy root. **Not** authorization to redesign live production.

## Product position
A scientific workspace for CFTR variant discovery, evidence provenance and controlled curation, with restraint and precision expected of leading research institutions. Clinical validity must never be suggested solely by interface polish.

## Hard design rules
1. **Meaningful hierarchy**: global identity and navigation; scientific context; primary research object; evidence and provenance; secondary actions. No decorative dashboard duplication.
2. **Typography is architecture**: controlled scale, readable scientific notation, predictable line-height and tabular numerals; no oversized display headings throughout internal screens.
3. **No random buttons**: actions exist only where a clear user decision or authorized transition requires them. Primary action is unique per context; secondary actions use restrained contextual disclosure.
4. **No card proliferation**: use continuous editorial sections, aligned grids, fine dividers and selective elevated surfaces only where an interactive boundary warrants it.
5. **Search-first workflow**: search and variant identity remain stable when opening detailed evidence; deep links, back/forward, keyboard focus and filter state are preserved.
6. **Evidence literacy**: source, date, reference/version, uncertainty, review state and provenance are distinguishable; no artificial scores or synthetic results.
7. **Role-aware actions**: hide inappropriate actions, but enforce all permissions at the backend; unauthorized states must be clear, not silently substituted with empty data.
8. **Calm motion**: no panel jumps, header shake, unexpected modal stacking or excessive animation. Support reduced-motion preferences.
9. **Responsive and accessible**: test 390px, tablet and wide desktop; prevent horizontal truncation of HGVS notation, focus loss or inaccessible overlay controls.
10. **Real-data integrity**: never insert invented variants, references, clinical conclusions or misleading populated placeholders in the running UI.

## Proposed core information architecture
- **Explore:** variant discovery and classification *metadata* with explicit provenance; not automated medical advice.
- **Variant record:** identity and nomenclature, evidence trail, versioned references, unanswered questions.
- **Review workspace:** separate authenticated, auditable curator journey rather than a cosmetic extension of browsing.
- **Research gaps:** grounded gaps derived from actual source coverage, clearly marked as exploratory.
- **Administration:** narrowly scoped trusted management workflows, not a prominent global button field.

## Design review checks before interface merge
- Explain the purpose of every control; remove any without a clear use case.
- Check text size, scientific notation, spacing rhythm, nesting, keyboard journeys, state persistence and visual stability at desktop/mobile.
- Include loading, unconfigured, empty, denied, error and actual real-data states.
- Benchmark density, information hierarchy and evidence legibility against research-institution workflows without copying their branding.
- Require screenshot/video review and automated accessibility and responsive regressions as implementation becomes available.

**Implementation boundary:** This file establishes acceptance criteria; it does not claim these qualities are already achieved.

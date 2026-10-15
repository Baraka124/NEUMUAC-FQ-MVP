# Phase 4F-0 · Geographic Research Intelligence — UX & privacy contract

**Status:** Design baseline proposed for review; no map deployed and no geographic API reads added.  
**Relationship to existing work:** Complements the existing Research Intelligence workspace; does not replace the evidence-coverage register. Separate from in-progress CFTR2 PR #80.  
**Scope:** Aggregate research activity and unresolved queries, never patient geography, case incidence, clinician tracking or hospital utilization claims.

## 1. Why map quality depends on data semantics

Historic production schema observed 2026-10-15:
- 1,031 logged searches; 998 hits, 33 misses. Last event 2026-06-01. Many events were tests/demonstrations, so this is a **historical, contaminated baseline**, not a live demand map.
- Location source: 818 IP-derived `ipapi.co`, 183 `browser_gps`, 30 unknown.
- 1,001 events have coordinates, but only 818 have a country field. The other 213 have no country field (183 GPS and 30 unknown source), which demonstrates why raw coordinate coverage must not masquerade as reliable country attribution.
- `geo_search_enriched.location_tier` mixes device GPS, verified institution coordinates and fallback coordinates. DO NOT interpret `resolved_latitude/longitude` as the actual search point without inspecting its provenance.
- `search_logs` contains user/session identifiers, IPs and exact coordinates. Its anonymous SELECT policy and raw public geographic views are incompatible with an unrestricted public map. **Do not ship a map sourced directly from any of them.**

Never quietly attribute a traveller's device position to their home institution or conflate a hospital coordinate with the search event's coordinate.

## Spain-first geographic framing

**Primary map geography: Spain.** This is the platform's design/home focus and default viewport; it is **not** evidence that all searchers or institutions are Spanish, nor authorization to geolocate the visitor.

- On first arrival to the Geography tab, open a calm **Spain map** with its **17 autonomous communities**, plus **Ceuta and Melilla**, rather than a world map at maximum zoom. Include the **Canary Islands in a clearly identified inset** so they remain selectable; ensure Balearic Islands remain readable. No invented point locations.
- Each autonomous community is an aggregate region, not a pin. Clicking Andalucía, Galicia, Madrid, etc. updates the same insight panel and linked accessible region table. Do not divide communities into provinces/cities unless independently validated, privacy-safe data and adequate denominators warrant that detail.
- Keep a modest **Spain / International** geographic-scope control. International should show a country-level world overview; preserve unknown country as its own explicit group. Users must not have to hunt through the sidebar to change scope.
- Do not hardcode national population, institution distribution or research prevalence assumptions. Use official territorial boundaries, stable country/region codes, and consistent treatment of autonomous cities and islands.
- For Institution mode, Spain can be the default *filter*, but only verified institutional membership establishes affiliation. A clinician from Andalucía searching while travelling in Galicia contributes, at most, one event to appropriately qualified event geography and a separately attributed institutional view; no double-counting in the total.
- Historic country fields currently contain **816 Spain-labeled search events, 2 Tanzania-labeled and 213 unclassified**. Those counts are not the same as verified country-of-origin, hospital affiliation or clinical demand, and historical internal tests must not be promoted into real-world demand statistics.
- Do not pre-center a globe on a user's IP-derived location. Spain is a product default, not a personally inferred user location.
- Desktop: Spain choropleth and a contextual region panel. Mobile: Spanish regions accessible through an equivalent sortable/selectable list plus a compact map. The selected metric, period and privacy controls apply consistently to both.

## 2. Primary user question and information hierarchy

The primary question is **where are users encountering gaps in the platform's recorded CFTR variant coverage, and how is that changing?** Secondary questions: what proportion of queries match the catalog, whether data are representative, and which unresolved queries warrant curator investigation.

### Institutional layout (desktop at >=1200 px)

One-page research observatory:
1. Compact masthead: `Research intelligence`; subtitle `Geographic search activity` only as necessary. Adjacent provenance line: `Historical / dates / data completeness`, with no rhetorical hero.
2. Top control row: [Geography | Institutions | Research gaps] as one three-way view switch; period, geographic level and test-data inclusion controls nearby. No duplicated filters in a massive sidebar.
3. **Four restrained indicators**, not oversized scorecards: searches, matches, unmatched queries, location coverage. Metrics and denominators must identify whether they count events, sessions, or distinct queries.
4. Main visual area **roughly 65–70% width map, 30–35% research detail panel**. Map is primary, detail panel contextual—not an overlay hiding the map.
5. Below: accessible region data table and a linked trend or gap-resolution view, not a second competing map.

### Map presentation

- Neutral ivory/off-white land, muted slate/green geographic outlines, low-contrast waterways; minimize political and street labels, roads, satellite imagery, decorative overlays or 3D.
- **Aggregate geographical polygons** for country/region. Never render individual GPS or IP event pins by default. Institute-specific analysis is not represented by device-position markers.
- Pick **one choropleth measure at a time**: volume OR hit/miss rate OR coverage; do not blend count and rate into one misleading color. Show the other measures in the detail panel and a small two-value bar.
- Accessible palette: restrained green/teal for matched query events, warm amber for unmatched, neutral gray for insufficient/missing data; all quantities also labeled numerically/textually. No red/green-only distinction.
- Legend in a contained corner of map, not floating over labels or showing ambiguous `low→high` without denominator.
- No glossy glass, dramatic glow, pop-up piles, marker animation or gratuitous elevation.
- Show `Unknown geography` as a **separate explicit category**, never scatter those events around inferred coordinates.

### Side insight panel

Select a region, not a point. Panel shows location and confidence, period, total queries, matches, misses, denominator, relative percentage, any suppression, and what a miss means. Allow click-through to approved **aggregated gap investigations** where authorized. No names, IPs, session IDs or individual query histories.

## 3. Three different map modes

| Mode | Attribution | Valid statement | Invalid statement |
|---|---|---|---|
| Geography | Event region derived from qualified location metadata | Searches appear to have originated from a region at confidence X | Clinicians / patients / hospitals in the region were conducting CFTR studies |
| Institutions | Institution directly and explicitly associated with a verified account/research context | Verified institution-linked platform activity | Any search near the hospital belongs to that institution |
| Research gaps | Region-level, privacy-safe counts of unmatched/uncertain searches | The catalog failed to match N queries under versioned matching rules | Novel variant, lack of published evidence, incidence, patient burden |

The same search can contribute to an event-geography view and an institution view but **is never added together across modes to inflate platform totals**.

## 4. Interaction requirements

- Click or keyboard-select region → synchronized detail panel. On touch, tap region; always provide equivalent selectable region list/table.
- Zoom follows geographic administrative levels (global → country → region) and privacy thresholds; do not let deeper zoom reveal sensitive low-cell activity.
- No scroll hijack. Ordinary mouse-wheel or trackpad scrolling moves the page; zoom with explicit +/- controls (keyboard supported), optional modifier-based wheel behavior only if documented.
- No camera/pan shake, auto-zoom on metric change, continuous animated dots, intrusive tooltips, hover-only information or independently scrolling micro-panels.
- Map pan and detail-panel transitions <200 ms or none; honor `prefers-reduced-motion`.
- Cohesive keyboard focus order and Escape/back behavior. Region selection retained across metric switch where meaningful; clear stale selection when outside period/geography.
- **Explicit location confidence**: source, confidence, unknown rate, test/production flag if reliably known; never show falsely precise decimal GPS coordinates on aggregates.

## 5. Responsive behavior

- Wide desktop: map and contextual side panel, no second permanent sidebar.
- Medium laptop/tablet: map dominant; region details can stack underneath if available width is insufficient. Search/navigation shell remains stable.
- Phone: headline + controls → short KPI strip → map (reasonable fixed-height with zoom buttons, no page scroll trap) → selected region detail → searchable/sortable region table. A **List view** must provide equivalent analysis if small map labels become unusable.
- No horizontal overflow or visible extra nested scrollbar; meaningful map height within phone viewport. Avoid layouts where modal/legend obscures map.
- Evaluate 320, 390, 768, 1024, 1366, and 1600px widths.

## 6. Privacy and audit gates (hard requirements)

- Unrestricted raw `search_logs`, GPS, IP, clinician names, session IDs, free-text rare searches and `geo_search_enriched` rows **must not be delivered to browsers**. Restrict existing overly broad SELECT grants/policies and SECURITY DEFINER view exposure before adding an endpoint.
- Implement a trusted server-side aggregation service or carefully reviewed database views that return allowed geography + suppression metadata, never raw event payload.
- Provisional minimum cohort controls for detailed cells: consider >=10 independent sessions AND >=20 events, **subject to privacy/legal review and adversarial testing**; thresholds alone do not guarantee anonymity. Do not let successive filters/zoom reveal suppressed cells by subtraction (anti-differencing). Public country-level release may need higher thresholds.
- Require strict metadata about collection justification/notice, retention, purpose limitation and GDPR review; exact browser GPS should be opt-in only if a concrete necessary use case survives scrutiny. For ordinary geographic demand metrics, country/region after transient IP lookup is preferable.
- Do not infer institution from hospital_name free text, IP geolocation, country or location coincidence. Verified account-to-institution association plus explicit selected research context is a separate dimension.
- Establish a reliable environment marker (`production`, `demo`, `test`, `unknown`), rather than pretending old Galicia searches were all real demand. Unknown historical data remain labelled as unknown.
- The map must not classify single query misses as novel variants or scientifically unmet need; queue status and resolution must be evidence- and workflow-backed.

## 7. Data contract suggested for future backend

Map data should be a bounded, pre-aggregated response:
`{period,metric,mode, geography_level,location_code,location_label,event_count,matched_count,unmatched_count,unknown_count,unique_session_count,location_coverage_pct,confidence_class,environment_quality,suppressed,updated_at,source_version}`.

Do **not** return device coordinates or a clinician identifier to the map client. Data is unavailable unless privacy gate is complete. Do not generate fictitious production entries to make the map look populated.

## 8. Before any deployable PR

1. Review user-approved visual concept on real desktop, tablet and phone captures.
2. Confirm the absence of raw public geography access; establish server-side permission boundary and privacy/legal approval, without breaking trusted legacy ingest.
3. Reconcile the 2026-03-31 to 2026-06-01 legacy series and known test events, and specify how future production search events will be registered.
4. Verify definitions of `hit`, `miss`, `ambiguous`, `error`, `no result` and all denominators; version classification rules.
5. Build with no real-time individual pins, without capturing extra location data and without a client-side log fetch.
6. Validate keyboard/touch/zoom accessibility, small groups, no scroll hijack, performance, correct location confidence and non-differencing.
7. Sign off visual appearance, scientific meaning and authorization separately.

## Sequence

**4F-0:** This visual/data contract.  
**4F-1:** Privacy-safe aggregated backend + permission and collection repair.  
**4F-2:** Institutional map shell, view modes, region detail and table.  
**4F-3:** Research-gap investigation workflow + trend/closure metrics.  
**4F-4:** Responsive/quality acceptance using real approved aggregates.

This map belongs in **Intelligence** as an additional lens. Existing evidence coverage must remain accessible and intact.

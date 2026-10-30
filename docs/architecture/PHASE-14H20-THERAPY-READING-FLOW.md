# Phase 14H20 — ETI evidence hierarchy and interaction repair

NFQ-015 and NFQ-038 remain Partial.

## Changes

- The five-regimen table is the definitive *visible* response summary. ETI appears once, on the same row as its response; expanded details do not repeat the category or add a second heading that competes with the main result.
- Technical fields, source findings and real links remain present in the ETI disclosure. Nothing is silently removed from the original scientific data projection.
- Opening any therapy detail moves keyboard focus to the revealed content. If it is outside the viewport, it scrolls into view while respecting reduced-motion settings.
- The download action defers URL revocation so the browser can complete the review-brief save. The confirmation states that a download was requested, not that an external reviewer approved it.
- The optional live-production acceptance locators and local connected-browser assertions were updated to the revised accessible ETI details structure.
- No server-side review decision, clinical therapy recommendation, production DB write, paid staging or geographic telemetry.

## Acceptance

Unit/build, disconnected and connected mock-browser checks are CI gates. Real fq.neumact.org visual verification is **pending** until deployment access is authorized and the live bundle can be inspected. A CI pass does not mean production has deployed these changes.

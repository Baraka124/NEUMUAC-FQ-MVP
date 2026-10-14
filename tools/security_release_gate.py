#!/usr/bin/env python3
"""Fail-closed repository guard for non-deployed security proposals.

This is a static safety check, NOT proof of database security or JWT/RLS correctness.
"""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
SEC = ROOT / "staging" / "security"
EXPECTED = [
    "010_confidentiality_lockdown.sql",
    "020_clinical_write_lockdown.sql",
    "040_public_variant_catalog.sql",
    "050_authenticated_clinical_operations.sql",
]
errors = []
for filename in EXPECTED:
    path = SEC / filename
    if not path.is_file():
        errors.append(f"missing proposed migration: {path.relative_to(ROOT)}")
        continue
    sql = path.read_text(encoding="utf-8")
    if not re.search(r"\bBEGIN\s*;", sql, re.I) or not re.search(r"\bCOMMIT\s*;", sql, re.I):
        errors.append(f"{filename}: missing explicit transaction boundary")
    if not re.search(r"\bREVOKE\b", sql, re.I):
        errors.append(f"{filename}: missing REVOKE contract; review manual exception")
for migration_dir in [ROOT / "supabase" / "migrations"]:
    if migration_dir.exists():
        for filename in EXPECTED:
            if (migration_dir / filename).exists():
                errors.append(f"staging script incorrectly appears in production migration path: {filename}")
workflow_dir = ROOT / ".github" / "workflows"
for workflow in workflow_dir.glob("*.yml"):
    text = workflow.read_text(encoding="utf-8")
    if re.search(r"(psql\s+[^\n]*(?:010_confidentiality|020_clinical_write)|supabase\s+db\s+push)", text, re.I):
        errors.append(f"review deployment-looking workflow command: {workflow.name}")
if errors:
    print("Phase 2L static safety gate FAILED:\n" + "\n".join("- " + e for e in errors))
    sys.exit(1)
print("Phase 2L static non-deployment guard passed.")
print("NOT VERIFIED: live Supabase security, real JWT/RLS, restore, legacy compatibility.")

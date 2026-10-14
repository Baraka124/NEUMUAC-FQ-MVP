#!/usr/bin/env python3
"""Static, source-only legacy Supabase call inventory.

This scanner deliberately does not print URLs, credentials, arguments, rows, or
source snippets. It is an aid to manual review, not a JS parser or security proof.
"""
import argparse
import collections
import json
import pathlib
import re

CALL = re.compile(r"\b(?:supabase|db|client)\s*\.\s*(from|rpc)\s*\(\s*(?:(['\x22\x60])([A-Za-z_][A-Za-z_0-9.]*)\2)?", re.I)
GENERIC = re.compile(r"\.\s*(from|rpc)\s*\(\s*(?:(['\x22\x60])([A-Za-z_][A-Za-z_0-9.]*)\2)?", re.I)
HTTP = re.compile(r"\bfetch\s*\(", re.I)
WRITE = re.compile(r"\.\s*(insert|update|upsert|delete)\s*\(", re.I)
READ = re.compile(r"\.\s*(select|single|maybeSingle)\s*\(", re.I)


def inventory(source: str):
    records = []
    # Match calls line-by-line so paths and data values never leave this process.
    for line_number, line in enumerate(source.splitlines(), 1):
        for m in GENERIC.finditer(line):
            name = m.group(3) if m.group(2) else None
            records.append({"line": line_number, "call": m.group(1).lower(),
                            "object": name if name else "DYNAMIC_OR_UNRESOLVED",
                            "write_hint": bool(WRITE.search(line[m.end():])),
                            "read_hint": bool(READ.search(line[m.end():]))})
        for _ in HTTP.finditer(line):
            records.append({"line": line_number, "call": "fetch",
                            "object": "URL_REDACTED_MANUAL_REVIEW",
                            "write_hint": False, "read_hint": False})
    return records


def markdown(records, file_name):
    by_object = collections.defaultdict(list)
    for r in records:
        by_object[(r["call"], r["object"])].append(r)
    out = [
        "# Phase 2L-C — static legacy call inventory",
        "",
        "**Status:** machine-extracted candidates; NOT a complete endpoint audit, "
        "validated authorization inventory, or permission to deploy.",
        "",
        f"Source: \`{file_name}\`. No endpoint URLs, keys, arguments or clinical content included.",
        "",
        "| Call | Target | Occurrences | Source lines | Inline operation hints |",
        "|---|---|---:|---|---|",
    ]
    for (call, obj), group in sorted(by_object.items()):
        lines = ", ".join(str(x["line"]) for x in group[:20])
        if len(group) > 20:
            lines += f", +{len(group)-20} more"
        hints = "/".join(x for x, cond in [("write", any(r["write_hint"] for r in group)),
                                            ("read", any(r["read_hint"] for r in group))]
                         if cond) or "unclassified"
        out.append(f"| \`{call}\` | \`{obj}\` | {len(group)} | {lines} | {hints} |")
    out += [
        "", "## Limitations / follow-up requirements",
        "- JS may use aliases, optional chaining, multiline calls, bracket access and wrappers; "
        "these are NOT fully resolved.",
        "- Inline read/write hints are not operation classifications; trace chains and runtime calls manually.",
        "- Match candidates can include non-Supabase `.from()` calls and unrelated fetches.",
        "- Inventory all scripts/modules, RPC overloads, policy/grant combinations and legacy feature journeys.",
        "- Treat every dynamic target and fetch as unresolved until reviewed.",
        "- Never infer that an unmatched endpoint is safe or absent.",
        "",
    ]
    return "\n".join(out)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default="index.html")
    parser.add_argument("--output", default="docs/security/PHASE-2LC-STATIC-INVENTORY.md")
    args = parser.parse_args()
    source = pathlib.Path(args.source)
    records = inventory(source.read_text(encoding="utf-8"))
    if not records:
        raise SystemExit("FAIL: no candidate endpoints detected; inventory incomplete")
    output = pathlib.Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(markdown(records, source.as_posix()), encoding="utf-8")
    print(f"Scanned {source.name}: {len(records)} candidate calls, "
          f"{sum(x['object'].startswith(('DYNAMIC_', 'URL_REDACTED_')) for x in records)} unresolved.")
    print(f"Wrote {output}")


if __name__ == "__main__":
    main()

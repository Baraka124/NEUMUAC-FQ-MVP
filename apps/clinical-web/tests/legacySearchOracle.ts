/**
 * Phase 2C TEST-ONLY reference adapter.
 * Extracts actual declarations from the SHA-pinned legacy HTML, executes them
 * in a fresh constrained VM with synthetic records and every side effect disabled.
 * No backend requests, patient data, credential access or production mutations.
 *
 * This is a source-level differential test, not a clinical validation system.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, runInContext } from 'node:vm';
import type { VariantRecord } from '../src/domain/variantRecord';

export const LEGACY_SEARCH_BLOB = 'c18221fb6baf47782318ca3685b94b088c359a66';
const rootFile = resolve(dirname(fileURLToPath(import.meta.url)), '../../../index.html');
const legacyHtml = readFileSync(rootFile);
const gitHash = createHash('sha1')
  .update(Buffer.from('blob ' + legacyHtml.length + '\0')).update(legacyHtml).digest('hex');
if (gitHash !== LEGACY_SEARCH_BLOB) {
  throw new Error('Legacy source changed. Review the reference oracle before updating its SHA.');
}
const source = legacyHtml.toString('utf8');

function declaration(anchor: string, closing: RegExp): string {
  const offset = source.indexOf(anchor);
  if (offset < 0 || source.indexOf(anchor, offset + anchor.length) >= 0) {
    throw new Error('Reference extraction anchor missing or ambiguous: ' + anchor);
  }
  const tail = source.slice(offset);
  const match = closing.exec(tail);
  if (!match || match.index === undefined) throw new Error('No closing token for ' + anchor);
  return tail.slice(0, match.index + match[0].length);
}
const functionEnd = /^\}\s*$/m;
const constObjectEnd = /^\};\s*$/m;
const frozenEnd = /^\}\);\s*$/m;
const referenceSource = [
  declaration('function buildSearchIndex() {', functionEnd),
  declaration('function _phoneticKey(s) {', functionEnd),
  declaration('const SEARCH_GATE = Object.freeze({', frozenEnd),
  declaration('function searchVariants(query) {', functionEnd),
  declaration('const AA3TO1 = {', constObjectEnd),
  declaration('function normaliseQueryWithSteps(q) {', functionEnd),
  declaration('function normaliseQuery(q) {', functionEnd),
  'let _lastNormSteps = [];',
  declaration('function normaliseQueryTracked(q) {', functionEnd),
  declaration('function levenshtein(a, b) {', functionEnd)
].join('\n\n');

/** Maps controlled fixtures to only the legacy index fields under test. */
export function asLegacyRows(records: readonly VariantRecord[]) {
  return records.map(v => ({
    id: v.id,
    legacy_name: v.nomenclature.legacy,
    protein_name: v.nomenclature.protein,
    cdna_name: v.nomenclature.cdna,
    alt_names: v.aliases.join(','),
    clinical_relevance_score: 0,
    class_confidence: null,
    final_determination: null,
    clinical_alert: null,
    class_subtype: null
  }));
}
export interface OracleResult {
  readonly ids: readonly string[];
  readonly normalized: string;
  readonly blocked: boolean;
  readonly compound: boolean;
  readonly firstTier: number | null;
}
/** The oracle never runs the legacy app's initialization or database code. */
export function runLegacyOracle(records: readonly VariantRecord[], query: string): OracleResult {
  const rows = asLegacyRows(records);
  const state = {
    variants: rows,
    variantsById: new Map(rows.map(row => [row.id, row])),
    searchIndex: { lookup: new Map(), stats: {} },
    searchIntelligence: {
      _lastGateBlocked: false,
      _lastGateReason: null,
      _lastCompound: null,
      _lastSearchTier: null,
      _lastResult: null,
      _lastScores: null
    }
  };
  const sandbox = {
    STATE: state,
    CONFIG: { UI: { MIN_SEARCH_CHARS: 2 } },
    __query: query,
    // Disable analytics, timers, network, storage and global DOM access.
    setTimeout: () => undefined,
    logSearch: () => { throw new Error('Unexpected analytics persistence in search oracle'); },
    fetch: () => { throw new Error('Unexpected network access in search oracle'); }
  };
  const context = createContext(sandbox);
  runInContext(referenceSource + '\nbuildSearchIndex();', context, { timeout: 1000 });
  const result = runInContext('searchVariants(__query)', context, { timeout: 1000 }) as { id: string }[];
  const norm = runInContext('normaliseQueryWithSteps(__query).norm', context, { timeout: 1000 }) as string;
  return {
    ids: Array.from(result, row => String(row.id)),
    normalized: String(norm),
    blocked: state.searchIntelligence._lastGateBlocked,
    compound: !!state.searchIntelligence._lastCompound,
    firstTier: state.searchIntelligence._lastSearchTier
  };
}

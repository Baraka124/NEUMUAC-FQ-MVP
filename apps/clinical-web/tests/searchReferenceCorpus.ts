import { DEMO_RECORDS } from '../src/fixtures/variantRecords';
import type { VariantRecord } from '../src/domain/variantRecord';

/**
 * Offline differential inputs, NOT an assertion of molecular validity or
 * clinical pathogenicity. Identifiers are used only as search strings.
 * No patients, hospitals, audit users or production data are included.
 */
function record(
  id: string, name: string, protein: string | null = null, cdna: string | null = null,
  aliases: readonly string[] = []
): VariantRecord {
  return {
    ...DEMO_RECORDS[0], id, name, aliases,
    nomenclature: { legacy: name, protein, cdna },
    evidence: [], evidenceCount: 0
  };
}

export const REFERENCE_RECORDS: readonly VariantRecord[] = [
  record('v1', 'F508del', 'p.Phe508del', 'c.1521_1523delCTT'),
  record('v2', 'G551D', 'p.Gly551Asp'),
  record('v3', 'W1282X', 'p.Trp1282Ter'),
  record('v4', 'G551N'),
  record('v5', 'R117H', 'p.Arg117His', 'c.350G>A'),
  record('v6', 'N1303K', 'p.Asn1303Lys', 'c.3909C>G'),
  record('v7', 'G542X', 'p.Gly542Ter', 'c.1624G>T'),
  record('v8', '621+1G>T', null, 'c.489+1G>T'),
  record('v9', '3849+10kbC>T'),
  record('v10', '1717-1G>A', null, 'c.1585-1G>A'),
  record('v11', '1078delT'),
  // A controlled alias record checks that a record can have multiple names.
  record('v12', 'DEMO-ALIAS-018', null, null, ['EXAMPLE-OTHER-18', 'rs998877'])
];

export type CaseCategory =
  | 'existing-baseline'
  | 'exact-and-case'
  | 'hgvs-and-protein'
  | 'splice-and-legacy'
  | 'alias-and-numeric'
  | 'compound'
  | 'ambiguous-and-invalid';

export interface SearchReferenceCase {
  readonly query: string;
  readonly category: CaseCategory;
  /** This is a TEST classification, never a scientific evidence label. */
  readonly description: string;
}

const baseline = [
  'F508del', 'f508DEL', 'p.Phe508del', 'G551D',
  'p.Gly551Asp', 'c.1521_1523delCTT', 'W1282X',
  'deltaF508', '551', 'rs12345', 'G551E', 'G551D G551N',
  'https://example.test/variant', 'patient treatment report', 'ΔF508'
];

const extra: readonly SearchReferenceCase[] = [
  { query: 'R117H', category: 'exact-and-case', description: 'Single-letter legacy form' },
  { query: 'r117h', category: 'exact-and-case', description: 'Lowercase legacy form' },
  { query: 'N1303K', category: 'exact-and-case', description: 'Another legacy identity' },
  { query: 'G542X', category: 'exact-and-case', description: 'Termination-code legacy name' },
  { query: 'p.Arg117His', category: 'hgvs-and-protein', description: 'Three-letter amino acid form' },
  { query: 'p.Asn1303Lys', category: 'hgvs-and-protein', description: 'Three-letter amino acid form' },
  { query: 'p.Gly542Ter', category: 'hgvs-and-protein', description: 'Termination notation' },
  { query: 'c.350G>A', category: 'hgvs-and-protein', description: 'cDNA substitution syntax' },
  { query: 'c.3909C>G', category: 'hgvs-and-protein', description: 'cDNA substitution syntax' },
  { query: 'c.1624G>T', category: 'hgvs-and-protein', description: 'cDNA substitution syntax' },
  { query: 'c.1521_1523del', category: 'hgvs-and-protein', description: 'cDNA deletion without suffix' },
  { query: '621+1G>T', category: 'splice-and-legacy', description: 'Legacy splice-position notation' },
  { query: 'c.489+1G>T', category: 'splice-and-legacy', description: 'cDNA splice-position notation' },
  { query: '3849+10kbC>T', category: 'splice-and-legacy', description: 'Complex legacy splice name' },
  { query: '1717-1G>A', category: 'splice-and-legacy', description: 'Legacy splice-position notation' },
  { query: 'c.1585-1G>A', category: 'splice-and-legacy', description: 'cDNA splice-position notation' },
  { query: '1078delT', category: 'splice-and-legacy', description: 'Legacy deletion suffix' },
  { query: 'δF508', category: 'alias-and-numeric', description: 'Greek lowercase delta search' },
  { query: 'delta-F508', category: 'alias-and-numeric', description: 'Hyphenated historical alias' },
  { query: 'df508', category: 'alias-and-numeric', description: 'Legacy alias' },
  { query: 'CF508del', category: 'alias-and-numeric', description: 'Legacy typo alias' },
  { query: 'W1282stop', category: 'alias-and-numeric', description: 'Termination alias' },
  { query: 'G542stop', category: 'alias-and-numeric', description: 'Termination alias' },
  { query: '542', category: 'alias-and-numeric', description: 'Numeric shorthand' },
  { query: '1303', category: 'alias-and-numeric', description: 'Numeric shorthand' },
  { query: '508', category: 'alias-and-numeric', description: 'Numeric shorthand' },
  { query: 'rs998877', category: 'alias-and-numeric', description: 'Fixture rs identifier' },
  { query: 'EXAMPLE-OTHER-18', category: 'alias-and-numeric', description: 'Fixture alternative name' },
  { query: 'F508del R117H', category: 'compound', description: 'Two different legacy identities' },
  { query: 'G551D W1282X', category: 'compound', description: 'Second compound pair' },
  { query: 'F508del G551D W1282X', category: 'compound', description: 'Three-term compound query' },
  { query: 'G551D G551D', category: 'compound', description: 'Repeated compound name / deduplication' },
  { query: '123456789', category: 'ambiguous-and-invalid', description: 'Long numeric sequence' },
  { query: 'contact@example.test', category: 'ambiguous-and-invalid', description: 'Email-shaped input' },
  { query: 'unknown variant', category: 'ambiguous-and-invalid', description: 'Generic prose input' },
  { query: 'not-found-variant', category: 'ambiguous-and-invalid', description: 'No-match string' },
  { query: 'R117H carrier', category: 'ambiguous-and-invalid', description: 'Clinical-context qualifier, not an allele' }
];

export const SEARCH_REFERENCE_CASES: readonly SearchReferenceCase[] = [
  ...baseline.map(query => ({
    query, category: 'existing-baseline' as const,
    description: 'Phase 2C/2D locked baseline query'
  })),
  ...extra
];

if (new Set(SEARCH_REFERENCE_CASES.map(c => c.query)).size !== SEARCH_REFERENCE_CASES.length) {
  throw new Error('Duplicate search reference query');
}

import { describe, expect, it } from 'vitest';
import { rankVariantRecords, evidenceOriginLabel, reviewStateLabel } from './variantRecord';
import { DEMO_RECORDS } from '../fixtures/variantRecords';
import { syntheticRecordRepository } from '../services/variantRecords';

describe('Phase 2 nonclinical variant worklist contracts', () => {
  it('keeps exact matches ahead of related variants, regardless of input casing', () => {
    expect(rankVariantRecords(DEMO_RECORDS, '  DEMO-CFTR-002  ')[0]?.record.id).toBe('sample-002');
    expect(rankVariantRecords(DEMO_RECORDS, 'example-BETA')[0]?.tier).toBe('exact');
    expect(rankVariantRecords(DEMO_RECORDS, 'CFTR-001')[0]?.tier).toBe('related');
    expect(rankVariantRecords(DEMO_RECORDS, 'missing').length).toBe(0);
  });
  it('never conflates a record review state with evidence presence', () => {
    expect(rankVariantRecords(DEMO_RECORDS, '', 'needs-evidence').map(x => x.record.id)).toEqual(['sample-002']);
    expect(DEMO_RECORDS[1].evidence).toEqual([]);
    expect(DEMO_RECORDS[0].evidence.every(ev => ev.state === 'unreviewed')).toBe(true);
    expect(reviewStateLabel('needs-evidence')).toBe('Evidence missing');
  });
  it('identifies synthetic provenance and has no external or clinical claims', () => {
    for (const record of DEMO_RECORDS) {
      expect(record.recordSource.origin).toBe('synthetic-fixture');
      expect(record.evidenceCount).toBe(record.evidence.length);
      expect(record.evidence.every(e => e.provenance.origin === 'synthetic-fixture')).toBe(true);
      expect(record.nomenclature.protein).toBeNull();
    }
    expect(evidenceOriginLabel('curated-proxy')).toBe('Locally curated proxy');
    expect(evidenceOriginLabel('direct-external')).toBe('Direct external source');
  });
  it('only exposes a read-only repository and unknown record is explicit', async () => {
    expect(await syntheticRecordRepository.get('sample-002')).toEqual(DEMO_RECORDS[1]);
    expect(await syntheticRecordRepository.get('missing-id')).toBeNull();
    expect('save' in syntheticRecordRepository).toBe(false);
    expect('approve' in syntheticRecordRepository).toBe(false);
  });
});

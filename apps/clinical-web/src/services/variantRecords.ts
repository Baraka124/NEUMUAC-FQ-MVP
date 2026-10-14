import type { VariantRecord } from '../domain/variantRecord';
import { DEMO_RECORDS } from '../fixtures/variantRecords';

/** Adapter boundary: no production URL, authorization, mutations or network. */
export interface RecordRepository {
  list(): Promise<readonly VariantRecord[]>;
  get(id: string): Promise<VariantRecord | null>;
}

export const syntheticRecordRepository: RecordRepository = Object.freeze({
  async list() { return DEMO_RECORDS; },
  async get(id: string) { return DEMO_RECORDS.find(row => row.id === id) ?? null; }
});

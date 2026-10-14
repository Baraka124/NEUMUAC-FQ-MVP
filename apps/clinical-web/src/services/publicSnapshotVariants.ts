/**
 * Public, immutable nomenclature snapshot from the project's actual CFTR
 * variants table. No backend credentials, patient data, or clinical judgements.
 * Deliberately distinct from the live REST adapter: updates are NOT automatic.
 */
import {decodeRealVariant, PAGE_SIZE, type RealVariant, type RealVariantSource} from './liveVariants';

export const SNAPSHOT_DATE = '14 October 2026';
export const SNAPSHOT_EXPECTED_COUNT = 2234;

interface SnapshotPayload {
  snapshot_date: string;
  source: string;
  columns: string[];
  record_count: number;
  records: unknown[][];
}
let recordsPromise: Promise<readonly RealVariant[]> | null = null;

async function snapshotRecords(): Promise<readonly RealVariant[]> {
  if (!recordsPromise) {
    recordsPromise = import('../data/cftr-public-snapshot.json').then(module => {
      const payload = module.default as unknown as SnapshotPayload;
      if (payload.snapshot_date !== '2026-10-14' ||
          payload.record_count !== SNAPSHOT_EXPECTED_COUNT ||
          payload.records?.length !== SNAPSHOT_EXPECTED_COUNT ||
          payload.columns?.join(',') !== 'id,legacy_name,protein_name,cdna_name,alt_names')
        throw new Error('Public catalog snapshot metadata failed verification.');
      const ids = new Set<string>();
      const records = payload.records.map(row => {
        if (!Array.isArray(row) || row.length !== 5) throw new Error('Public catalog record shape changed.');
        const entry = decodeRealVariant({
          id: row[0], legacy_name: row[1], protein_name: row[2],
          cdna_name: row[3], alt_names: row[4]
        });
        if (!entry.legacyName || ids.has(entry.id)) throw new Error('Public catalog record identifier changed.');
        ids.add(entry.id);
        return entry;
      });
      return records.sort((a,b) =>
        (a.legacyName || '').localeCompare(b.legacyName || '', 'en', {sensitivity:'base'}));
    }).catch(error => { recordsPromise = null; throw error; });
  }
  return recordsPromise;
}

function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('The request was cancelled', 'AbortError');
}

export function createPublicSnapshotSource(): RealVariantSource {
  // Deliberately expose only list and get. No write methods, tokens, or
  // fallback to legacy public.variants REST endpoints.
  return Object.freeze({
    async list({query,page,signal}: {query:string;page:number;signal?:AbortSignal}) {
      if (!Number.isInteger(page) || page < 0 || page > 10000) throw new Error('Invalid catalog page');
      checkAbort(signal);
      const all = await snapshotRecords();
      checkAbort(signal);
      const needle = query.trim().toLocaleLowerCase('en');
      const matched = needle ? all.filter(record =>
        [record.legacyName, record.proteinName, record.cdnaName, ...record.aliases]
          .some(value => value?.toLocaleLowerCase('en').includes(needle))) : all;
      const start = page * PAGE_SIZE;
      return Object.freeze({records:matched.slice(start, start + PAGE_SIZE),hasMore:matched.length > start + PAGE_SIZE});
    },
    async get(id:string,signal?:AbortSignal) {
      if (!/^\d{1,18}$/.test(id)) return null;
      checkAbort(signal);
      const all = await snapshotRecords();
      checkAbort(signal);
      return all.find(item => item.id === id) ?? null;
    }
  });
}

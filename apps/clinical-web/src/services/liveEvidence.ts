import {validateReadOnlyConfig, type ReadOnlyConfig, VariantConnectionError} from './liveVariants';

export interface LiveEvidenceReference {
  readonly id: number;
  readonly variantId: string;
  readonly title: string;
  readonly url: string;
  readonly source: string;
  readonly type: string | null;
  readonly category: string | null;
  readonly journal: string | null;
  readonly year: number | null;
  readonly pmid: string | null;
  readonly doi: string | null;
  readonly recordedQualityScore:number|null;
  readonly recordedSourceWeight:number|null;
  readonly recordedCitationCount:number|null;
}
export interface EvidencePage {
  readonly records: readonly LiveEvidenceReference[];
  readonly hasMore: boolean;
}
export interface LiveEvidenceSource {
  list(options: { readonly query: string; readonly page: number; readonly signal?: AbortSignal }): Promise<EvidencePage>;
  forVariant(variantId: string, signal?: AbortSignal): Promise<readonly LiveEvidenceReference[]>;
}
export const EVIDENCE_PAGE_SIZE = 30;
const LINK_COLUMNS='id,variant_id,title,url,source,type,category,journal,year,pmid,doi,quality_score,source_weight,citation_count';
const trustedHosts = new Set([
  'pubmed.ncbi.nlm.nih.gov','www.ncbi.nlm.nih.gov','scholar.google.com','cftr2.org','www.cftr2.org','doi.org'
]);

export function decodeLiveEvidence(row: unknown): LiveEvidenceReference {
  if (!row || typeof row !== 'object' || Array.isArray(row))
    throw new VariantConnectionError('schema-mismatch','Unexpected evidence record');
  const data = row as Record<string,unknown>;
  if (typeof data.id !== 'number' || !Number.isSafeInteger(data.id) || data.id <= 0 ||
      !((typeof data.variant_id === 'number' && Number.isSafeInteger(data.variant_id) && data.variant_id > 0) ||
        (typeof data.variant_id === 'string' && /^[1-9]\d{0,17}$/.test(data.variant_id))) ||
      typeof data.title !== 'string' || !data.title.trim() || typeof data.url !== 'string')
    throw new VariantConnectionError('schema-mismatch','Invalid evidence record fields');
  let url:URL;
  try { url = new URL(data.url); }
  catch { throw new VariantConnectionError('schema-mismatch','Invalid reference URL'); }
  if (url.protocol !== 'https:' || !trustedHosts.has(url.hostname) ||
      url.username || url.password || url.port)
    throw new VariantConnectionError('schema-mismatch','Unreviewed external source URL');
  return Object.freeze({
    id:data.id,
    variantId:String(data.variant_id),
    title:data.title.trim(),
    url:url.toString(),
    source:typeof data.source==='string' && data.source.trim()?data.source.trim():'Source not recorded',
    type:typeof data.type==='string'?data.type:null,
    category:typeof data.category==='string'?data.category:null,
    journal:typeof data.journal==='string'?data.journal:null,
    year:typeof data.year==='number' && Number.isInteger(data.year)?data.year:null,
    pmid:typeof data.pmid==='string'?data.pmid:null,
    doi:typeof data.doi==='string'?data.doi:null,
    recordedQualityScore:typeof data.quality_score==='number'&&Number.isFinite(data.quality_score)?data.quality_score:null,
    recordedSourceWeight:typeof data.source_weight==='number'&&Number.isFinite(data.source_weight)?data.source_weight:null,
    recordedCitationCount:typeof data.citation_count==='number'&&Number.isSafeInteger(data.citation_count)?data.citation_count:null
  });
}

export function createLiveEvidenceSource(config: ReadOnlyConfig, transport: typeof fetch = fetch): LiveEvidenceSource {
  const endpoint = validateReadOnlyConfig(config);
  // Public evidence reads use the same publishable application identity.
  // Signed-in reviewer sessions and mutations are unrelated to this service.
  const headers:Record<string,string> = {
    apikey:config.publishableKey,
    Accept:'application/json'
  };
  if (!config.publishableKey.startsWith('sb_publishable_'))
    headers.Authorization='Bearer '+config.publishableKey;

  async function request(params:URLSearchParams, signal?:AbortSignal):Promise<readonly LiveEvidenceReference[]> {
    const url=new URL('/rest/v1/evidence_links',endpoint);
    url.search=params.toString();
    let response:Response;
    try {
      response=await transport(url.toString(),{method:'GET',headers,signal,credentials:'omit',cache:'no-store',redirect:'error'});
    } catch (cause) {
      if(signal?.aborted)throw cause;
      throw new VariantConnectionError('request-failed','The public reference service is unreachable.');
    }
    if(response.status===401||response.status===403)
      throw new VariantConnectionError('access-denied','Public references are not accessible.');
    if(!response.ok)
      throw new VariantConnectionError('request-failed','Public reference lookup failed.');
    const payload:unknown=await response.json();
    if(!Array.isArray(payload))
      throw new VariantConnectionError('schema-mismatch','Unexpected reference response');
    const records=payload.map(decodeLiveEvidence);
    // Never present duplicated IDs as independent scientific references.
    if(new Set(records.map(record=>record.id)).size!==records.length)
      throw new VariantConnectionError('schema-mismatch','Duplicate research reference identifiers.');
    return records;
  }
  return Object.freeze({
    async list({query,page,signal}:{query:string;page:number;signal?:AbortSignal}):Promise<EvidencePage>{
      if(!Number.isInteger(page)||page<0||page>10000)
        throw new VariantConnectionError('invalid-configuration','Invalid reference page');
      const text=query.trim();
      if(text && (text.length>70 || !/^[a-zA-Z0-9 _-]+$/.test(text)))
        throw new VariantConnectionError('request-failed','Unsupported reference search characters');
      const params=new URLSearchParams({
        select:LINK_COLUMNS,order:'id.asc',limit:String(EVIDENCE_PAGE_SIZE+1),offset:String(page*EVIDENCE_PAGE_SIZE)
      });
      if(text)params.set('or','(title.ilike.*'+text+'*,source.ilike.*'+text+'*,pmid.ilike.*'+text+'*)');
      const records=await request(params,signal);
      if(records.length>EVIDENCE_PAGE_SIZE+1)
        throw new VariantConnectionError('schema-mismatch','Unexpected reference page size.');
      return {records:records.slice(0,EVIDENCE_PAGE_SIZE),hasMore:records.length>EVIDENCE_PAGE_SIZE};
    },
    async forVariant(variantId:string,signal?:AbortSignal):Promise<readonly LiveEvidenceReference[]>{
      if(!/^[1-9]\d{0,17}$/.test(variantId))return [];
      // Request one beyond the supported full-view limit. If the response
      // reaches the boundary, do not present a truncated list as complete.
      const params=new URLSearchParams({select:LINK_COLUMNS,variant_id:'eq.'+variantId,order:'id.asc',limit:'201'});
      const records=await request(params,signal);
      if(records.length>=201)
        throw new VariantConnectionError('request-failed','Linked references exceed the supported complete view.');
      if(records.some(record=>record.variantId!==variantId))
        throw new VariantConnectionError('schema-mismatch','The reference response included another variant.');
      return records;
    }
  });
}

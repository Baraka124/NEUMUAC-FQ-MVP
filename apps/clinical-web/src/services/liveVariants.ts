import {parseDiscoveryTerms,buildDiscoveryExpression} from '../domain/compoundDiscovery';
/**
 * Real database records only. No fixture fallback, local persistent cache or writes.
 * Public/publishable API key is NOT an authorization mechanism: actual read access
 * must be granted and protected by Supabase RLS, which remains owner-unverified.
 */
export interface RealVariant {
  readonly id: string;
  readonly legacyName: string | null;
  readonly proteinName: string | null;
  readonly cdnaName: string | null;
  readonly aliases: readonly string[];
  /** Raw functional class label from the live catalog, not a clinical verdict. */
  readonly recordedClass?: string | null;
  readonly validationCount?: number | null;
}
export type RecordedClassFilter = 'all'|'I'|'II'|'III'|'IV'|'V'|'VI'|'unclassified';
export type VariantSort = 'name-asc'|'name-desc'|'recent-record'|'fewest-validations'|'most-validations';
export type VariantSearchMode = 'contains'|'exact-name';
export interface VariantListOptions {
  readonly query:string;
  readonly page:number;
  readonly classFilter?:RecordedClassFilter;
  readonly sort?:VariantSort;
  readonly searchMode?:VariantSearchMode;
  readonly signal?:AbortSignal;
}
export interface RealVariantPage {
  readonly records: readonly RealVariant[];
  readonly hasMore: boolean;
}
export interface RealVariantSource {
  list(options: VariantListOptions): Promise<RealVariantPage>;
  get(id: string, signal?: AbortSignal): Promise<RealVariant | null>;
  /** Separate narrow candidate lookup; may return null for ambiguity or a capped query. */
  resolveExact(query:string,filter?:RecordedClassFilter,signal?:AbortSignal):Promise<RealVariant|null>;
}
export type ConnectionIssue = 'not-configured' | 'invalid-configuration' | 'authentication-required' | 'access-denied' | 'schema-mismatch' | 'request-failed';
export class VariantConnectionError extends Error {
  constructor(public readonly code: ConnectionIssue, message: string) { super(message); this.name='VariantConnectionError'; }
}

/** Enabled only through deliberate non-secret environment configuration. */
export type ReadAccessMode = 'anonymous' | 'authenticated';
export interface ReadOnlyConfig {
  readonly endpoint: string;
  readonly publishableKey: string;
  readonly enabled: boolean;
  readonly accessMode?: ReadAccessMode;
  /** Temporary development adapter for GET-only calls to existing public.variants. */
  readonly readTable?: 'nfq_public_variant_catalog' | 'variants';
}
export interface ReadSessionProvider {
  /** Signed-in user JWT. Never supply a service/secret key here. */
  getAccessToken(): Promise<string | null>;
}
export function readConfigFromEnvironment(): ReadOnlyConfig | null {
  const endpoint = (import.meta.env.VITE_NFQ_SUPABASE_URL || '').trim();
  const publishableKey = (import.meta.env.VITE_NFQ_SUPABASE_PUBLISHABLE_KEY || '').trim();
  const enabled = import.meta.env.VITE_NFQ_READ_ONLY_ENABLED === 'true';
  if (!enabled || !endpoint || !publishableKey) return null;
  const accessMode: ReadAccessMode = import.meta.env.VITE_NFQ_READ_ACCESS_MODE === 'authenticated'
    ? 'authenticated' : 'anonymous';
  const readTable = import.meta.env.VITE_NFQ_VARIANT_SOURCE === 'variants'
    ? 'variants' : 'nfq_public_variant_catalog';
  return {endpoint, publishableKey, enabled, accessMode, readTable};
}
export function validateReadOnlyConfig(config: ReadOnlyConfig): URL {
  if (!config.enabled || !config.publishableKey.trim()) throw new VariantConnectionError('not-configured','Real-data access is not configured.');
  let base: URL;
  try { base = new URL(config.endpoint); } catch { throw new VariantConnectionError('invalid-configuration','Invalid data endpoint.'); }
  // HTTPS and a root endpoint only: reject embedded userinfo/path/query fragments.
  if (base.protocol !== 'https:' || !base.hostname || base.username || base.password ||
      base.pathname !== '/' || base.search || base.hash)
    throw new VariantConnectionError('invalid-configuration','Invalid data endpoint.');
  const key = config.publishableKey.trim();
  const modernPublic = /^sb_publishable_[a-zA-Z0-9_-]+$/.test(key);
  let legacyAnon = false;
  if (!modernPublic && key.split('.').length === 3) {
    try {
      // Only an accidental-secret safety check. JWT payload is NOT trusted
      // for authorization; Supabase validates the actual token and RLS.
      const body = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as {role?:unknown};
      legacyAnon = body.role === 'anon';
    } catch { legacyAnon = false; }
  }
  if (!modernPublic && !legacyAnon)
    throw new VariantConnectionError('invalid-configuration','Only a Supabase publishable or legacy anon key is permitted in browser configuration.');
  return base;
}
function requiredText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function decodeAliases(value: unknown): readonly string[] {
  if (Array.isArray(value)) return value.filter((x):x is string=>typeof x==='string'&&!!x.trim()).map(x=>x.trim());
  if (typeof value === 'string') {
    // Database may store this legacy field as comma-separated text or text[].
    return value.split(',').map(x=>x.trim()).filter(Boolean);
  }
  return [];
}
/** Do not manufacture a variant identifier or scientific conclusion on missing fields. */
export function decodeRealVariant(input: unknown): RealVariant {
  if (!input || typeof input!=='object' || Array.isArray(input)) throw new VariantConnectionError('request-failed','Unexpected record schema.');
  const raw = input as Record<string,unknown>;
  const id = typeof raw.id==='number' && Number.isFinite(raw.id) ? String(raw.id) : requiredText(raw.id);
  if (!id) throw new VariantConnectionError('request-failed','A variant identifier was missing.');
  const legacyName=requiredText(raw.legacy_name);
  const proteinName=requiredText(raw.protein_name);
  const cdnaName=requiredText(raw.cdna_name);
  return {id,legacyName,proteinName,cdnaName,aliases:decodeAliases(raw.alt_names),
    recordedClass:requiredText(raw.cftr_class),
    validationCount:typeof raw.validation_count==='number'&&Number.isSafeInteger(raw.validation_count)&&raw.validation_count>=0?raw.validation_count:null};
}
export function variantDisplayName(value: RealVariant): string {
  return value.legacyName || value.proteinName || value.cdnaName || value.id;
}
export function formatReadStatus(error: unknown): string {
  if (error instanceof VariantConnectionError) {
    if (error.code === 'not-configured') return 'The authorized variant database connection has not been configured.';
    if (error.code === 'access-denied') return 'The database has denied access to variant records.';
    if (error.code === 'authentication-required') return 'Sign in to access the authorized variant records.';
    if (error.code === 'schema-mismatch') return 'The variant schema is different from the expected read-only fields. Database verification is required.';
    if (error.code === 'invalid-configuration') return 'The database connection settings are invalid.';
  }
  return 'Variant records could not be loaded. Check the connection or access permissions.';
}
function safeSearchTerm(query: string): string {
  const trim=query.trim();
  if (trim.length>75 || !/^[a-zA-Z0-9 _.+>:\-]+$/.test(trim)) return '';
  return trim;
}
export const PAGE_SIZE=40;
const EXACT_CANDIDATE_LIMIT=41;
export function createReadOnlyRepository(
  config: ReadOnlyConfig,
  transport: typeof fetch = fetch,
  sessionProvider?: ReadSessionProvider
): RealVariantSource {
  const endpoint=validateReadOnlyConfig(config);
  const mode: ReadAccessMode = config.accessMode ?? 'anonymous';
  const table = config.readTable === 'variants' ? 'variants' : 'nfq_public_variant_catalog';
  async function request(params: URLSearchParams,signal?: AbortSignal): Promise<readonly RealVariant[]> {
    const url=new URL('/rest/v1/'+table,endpoint);
    url.search=params.toString();
    // Publishable keys identify the application; they are NOT bearer JWTs.
    const headers: Record<string,string> = {apikey:config.publishableKey,Accept:'application/json'};
    if (mode === 'authenticated') {
      if (!sessionProvider) throw new VariantConnectionError('authentication-required','An authenticated session provider is required.');
      const accessToken=await sessionProvider.getAccessToken();
      if (!accessToken) throw new VariantConnectionError('authentication-required','Please sign in.');
      if (accessToken === config.publishableKey || !/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(accessToken)) {
        throw new VariantConnectionError('authentication-required','A signed-in user JWT is required.');
      }
      headers.Authorization=`Bearer ${accessToken}`;
    } else if (mode === 'anonymous') {
      // Legacy anon keys are JWTs; modern publishable keys are NOT.
      if (!config.publishableKey.startsWith('sb_publishable_'))
        headers.Authorization=`Bearer ${config.publishableKey}`;
    } else throw new VariantConnectionError('invalid-configuration','Unknown read access mode.');
    let response:Response;
    try {
      response=await transport(url.toString(),{method:'GET',headers,signal,cache:'no-store',credentials:'omit',redirect:'error'});
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new VariantConnectionError('request-failed','The variant data source is unreachable.');
    }
    if (response.status===401||response.status===403) throw new VariantConnectionError('access-denied','Variant read access was denied.');
    if (!response.ok) {
      // Never expose untrusted raw database error details to the UI.
      let schemaError=false;
      try {
        const detail:unknown=await response.json();
        if (detail && typeof detail==='object' && !Array.isArray(detail)) {
          const code=(detail as {code?:unknown}).code;
          schemaError=code==='42703'||code==='PGRST200'||code==='PGRST204'||code==='PGRST205';
        }
      } catch { /* non-JSON error */ }
      throw new VariantConnectionError(schemaError?'schema-mismatch':'request-failed','Variant read failed.');
    }
    const data:unknown=await response.json();
    if (!Array.isArray(data)) throw new VariantConnectionError('request-failed','Unexpected database response.');
    return data.map(decodeRealVariant);
  }
  return Object.freeze({
    async list({query,page,classFilter='all',sort='name-asc',searchMode='contains',signal}: VariantListOptions) {
      const classes: readonly RecordedClassFilter[]=['all','I','II','III','IV','V','VI','unclassified'];
      const sorts: readonly VariantSort[]=['name-asc','name-desc','recent-record','fewest-validations','most-validations'];
      if(!classes.includes(classFilter)||!sorts.includes(sort)||!['contains','exact-name'].includes(searchMode))
        throw new VariantConnectionError('invalid-configuration','Invalid research filters.');
      if(table!=='variants'&&(classFilter!=='all'||sort==='fewest-validations'||sort==='most-validations'))
        throw new VariantConnectionError('not-configured','Scientific class filters require the full authorized variant source.');
      if (!Number.isInteger(page)||page<0||page>10000) throw new VariantConnectionError('invalid-configuration','Invalid page.');
      const params=new URLSearchParams({
        select:table==='variants'
          ? 'id,legacy_name,protein_name,cdna_name,alt_names,cftr_class,validation_count'
          : 'id,legacy_name,protein_name,cdna_name,alt_names',
        order:sort==='recent-record'?'id.desc':sort==='name-desc'?'legacy_name.desc,id.asc':
          sort==='fewest-validations'?'validation_count.asc.nullslast,id.asc':
          sort==='most-validations'?'validation_count.desc.nullslast,id.asc':'legacy_name.asc,id.asc',
        limit:String(PAGE_SIZE+1),offset:String(page*PAGE_SIZE)
      });
      if(classFilter!=='all')params.set('cftr_class',classFilter==='unclassified'?'is.null':'eq.'+classFilter);
      if(query.trim()){
        const terms=parseDiscoveryTerms(query);
        params.set('or',buildDiscoveryExpression(terms,searchMode==='exact-name'));
      }
      const result=await request(params,signal);
      return {records:result.slice(0,PAGE_SIZE),hasMore:result.length>PAGE_SIZE};
    },
    async resolveExact(query:string,filter:RecordedClassFilter='all',signal?:AbortSignal){
      // A dedicated request prevents alphabetic pages and user sorting from
      // hiding one exact variant among many substring matches.
      if(query.includes(',')||query.includes(';'))return null;
      const text=safeSearchTerm(query);
      if(!text || text.length<2)return null;
      const filters:readonly RecordedClassFilter[]=['all','I','II','III','IV','V','VI','unclassified'];
      if(!filters.includes(filter))throw new VariantConnectionError('invalid-configuration','Invalid class filter');
      if(table!=='variants'&&filter!=='all')return null;
      const params=new URLSearchParams({
        select:table==='variants'?'id,legacy_name,protein_name,cdna_name,alt_names,cftr_class,validation_count':
          'id,legacy_name,protein_name,cdna_name,alt_names',
        order:'id.asc',
        limit:String(EXACT_CANDIDATE_LIMIT)
      });
      if(filter!=='all')params.set('cftr_class',filter==='unclassified'?'is.null':'eq.'+filter);
      // Aliases are stored in legacy text, so fetch possible alias-containing
      // records, then validate full recorded aliases locally. No guessed synonym.
      params.set('or',`(legacy_name.ilike.${text},protein_name.ilike.${text},cdna_name.ilike.${text},alt_names.ilike.*${text}*)`);
      const candidates=await request(params,signal);
      if(candidates.length>=EXACT_CANDIDATE_LIMIT)return null; // Not proven complete.
      const {unambiguousExactMatch}=await import('../domain/instantMatch');
      return unambiguousExactMatch(text,candidates,false);
    },
    async get(id:string,signal?:AbortSignal) {
      if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) return null;
      const params=new URLSearchParams({select:table==='variants'
        ? 'id,legacy_name,protein_name,cdna_name,alt_names,cftr_class'
        : 'id,legacy_name,protein_name,cdna_name,alt_names',id:`eq.${id}`,limit:'1'});
      const found=await request(params,signal);
      return found[0]??null;
    }
  });
}

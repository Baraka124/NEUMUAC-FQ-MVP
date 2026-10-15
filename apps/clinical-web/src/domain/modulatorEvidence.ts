/**
 * NFQ-015 / NFQ-026 — CFTR modulator research evidence contract.
 *
 * This is an inert, source-bound data model. It contains NO treatment eligibility
 * rules, no class-to-drug lookup, no live records and no automatically asserted
 * response. The public UI must never convert this into prescribing advice.
 */
export type ModulatorId = 'ETI' | 'ALYFTREK' | 'IVACAFTOR' | 'LUMACAFTOR_IVACAFTOR' |
  'TEZACAFTOR_IVACAFTOR' | 'OTHER';
export type EvidenceMethod = 'regulatory-document' | 'clinical-study' | 'in-vitro-study' | 'curated-literature';
export type EvidenceFinding = 'reported-response' | 'reported-no-response' | 'mixed' |
  'inconclusive' | 'not-assessed' | 'regulatory-text-only';
export type Jurisdiction = 'EU' | 'US' | 'UK' | 'OTHER' | 'NOT_APPLICABLE';
export type ResearchSubjectKind = 'variant' | 'genotype' | 'population';
export type ModulatorReviewState = 'unreviewed' | 'review-pending' | 'reviewed';
export type EvidenceAuthority = 'EMA' | 'FDA' | 'PUBMED' | 'DOI';

/** Source document metadata, not independent adjudication. */
export interface ModulatorSource {
 readonly authority: EvidenceAuthority;
 readonly documentTitle: string;
 readonly documentUrl: string;
 readonly documentVersion: string;
 readonly publishedOn: string;       // ISO YYYY-MM-DD, source publication/revision date
 readonly retrievedOn: string;       // ISO YYYY-MM-DD; separate from publication date
 readonly locationInDocument: string;// e.g. numbered section/table/paragraph
}
export interface ModulatorEvidenceRecord {
 readonly recordId: string;          // attribution within a verified future evidence register
 readonly modulator: ModulatorId;
 readonly subjectKind: ResearchSubjectKind;
 readonly subjectId: string | null;  // exact local identifier, never alias-matched
 readonly method: EvidenceMethod;
 readonly finding: EvidenceFinding;
 readonly jurisdiction: Jurisdiction;
 readonly source: ModulatorSource;
 readonly reviewState: ModulatorReviewState;
}

/** An empty array is NOT proof of absence of modulator response or indication. */
export type EvidenceReadResult =
 | { readonly state:'not-configured' | 'access-denied' | 'unavailable' | 'unverified-schema'; readonly records:readonly [] }
 | { readonly state:'loaded'; readonly records:readonly ModulatorEvidenceRecord[] };

const evidenceMethods:readonly EvidenceMethod[]=[
 'regulatory-document','clinical-study','in-vitro-study','curated-literature'
];
const findings:readonly EvidenceFinding[]=[
 'reported-response','reported-no-response','mixed','inconclusive','not-assessed','regulatory-text-only'
];
const regulators:Readonly<Record<EvidenceAuthority,readonly string[]>>={
 EMA:['ema.europa.eu','www.ema.europa.eu'],
 FDA:['fda.gov','www.fda.gov','accessdata.fda.gov'],
 PUBMED:['pubmed.ncbi.nlm.nih.gov'],
 DOI:['doi.org']
};

function record(input:unknown):Record<string,unknown> {
 if(!input || typeof input!=='object' || Array.isArray(input))
  throw new Error('Evidence metadata must be a record.');
 return input as Record<string,unknown>;
}
function stringField(input:unknown,name:string,max=600):string{
 if(typeof input!=='string'||!input.trim()||input.length>max)
  throw new Error('Invalid or missing '+name+'.');
 return input.trim();
}
function enumField<T extends string>(value:unknown,options:readonly T[],field:string):T{
 if(typeof value!=='string'||!options.includes(value as T))throw new Error('Unsupported '+field+'.');
 return value as T;
}
function dateField(value:unknown,name:string):string {
 const iso=stringField(value,name,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)||Number.isNaN(Date.parse(iso+'T00:00:00Z'))||
   new Date(iso+'T00:00:00Z').toISOString().slice(0,10)!==iso)
  throw new Error('Invalid '+name+' date.');
 return iso;
}
function sourceUrl(raw:unknown,authority:EvidenceAuthority):string {
 const value=stringField(raw,'source URL',2048);
 let url:URL;
 try{url=new URL(value);}catch{throw new Error('Invalid source URL.');}
 const validHosts=regulators[authority];
 if(url.protocol!=='https:'||!validHosts.includes(url.hostname.toLowerCase())||
    url.username||url.password||url.port||url.hash || url.pathname==='/' && !url.search)
  throw new Error('Source must link to a concrete HTTPS document on its declared authority.');
 return url.toString();
}

/** Strict boundary decoder for future VERIFIED, source-approved read-only data.
 * It does not request data, infer a response, resolve variants or grant any role.
 */
export function decodeModulatorEvidence(input:unknown):ModulatorEvidenceRecord {
 const row=record(input),origin=record(row.source);
 const modulator=enumField(row.modulator,
  ['ETI','ALYFTREK','IVACAFTOR','LUMACAFTOR_IVACAFTOR','TEZACAFTOR_IVACAFTOR','OTHER'] as const,'modulator');
 const method=enumField(row.method,evidenceMethods,'evidence method');
 const finding=enumField(row.finding,findings,'evidence finding');
 const subjectKind=enumField(row.subjectKind,['variant','genotype','population'] as const,'subject type');
 const jurisdiction=enumField(row.jurisdiction,['EU','US','UK','OTHER','NOT_APPLICABLE'] as const,'jurisdiction');
 const reviewState=enumField(row.reviewState,['unreviewed','review-pending','reviewed'] as const,'review state');
 const authority=enumField(origin.authority,['EMA','FDA','PUBMED','DOI'] as const,'source authority');
 const subjectId=row.subjectId===null?null:stringField(row.subjectId,'subject ID',120);
 if(subjectKind==='population' ? subjectId!==null : subjectId===null)
  throw new Error('Subject scope and identifier do not agree.');
 if(method==='regulatory-document'){
  if(jurisdiction==='NOT_APPLICABLE'||finding!=='regulatory-text-only')
   throw new Error('A regulatory document is jurisdictional context, not a response verdict.');
  if((jurisdiction==='EU'&&authority!=='EMA')||(jurisdiction==='US'&&authority!=='FDA'))
   throw new Error('Regulatory authority and jurisdiction mismatch.');
 }else if(finding==='regulatory-text-only')
  throw new Error('Nonregulatory evidence cannot be a regulatory-indication claim.');
 if(method!=='regulatory-document' && jurisdiction!=='NOT_APPLICABLE' &&
   method==='in-vitro-study')
  throw new Error('Laboratory response must not be assigned a prescribing jurisdiction.');
 const publishedOn=dateField(origin.publishedOn,'publication');
 const retrievedOn=dateField(origin.retrievedOn,'retrieval');
 if(retrievedOn<publishedOn)throw new Error('Retrieved date predates source publication.');
 const source:ModulatorSource=Object.freeze({
  authority,
  documentTitle:stringField(origin.documentTitle,'source document title',300),
  documentUrl:sourceUrl(origin.documentUrl,authority),
  documentVersion:stringField(origin.documentVersion,'source version',100),
  publishedOn,retrievedOn,
  locationInDocument:stringField(origin.locationInDocument,'source location',160)
 });
 return Object.freeze({
  recordId:stringField(row.recordId,'evidence identifier',120),
  modulator,subjectKind,subjectId,method,finding,jurisdiction,source,reviewState
 });
}

/** This is NOT a recommendation/eligibility algorithm. */
export function describeEvidenceState(result:EvidenceReadResult):string{
 switch(result.state){
  case 'not-configured':return 'Modulator evidence has not been connected.';
  case 'access-denied':return 'This source is not available to this account.';
  case 'unavailable':return 'The modulator evidence source could not be loaded.';
  case 'unverified-schema':return 'The evidence source has not passed schema and authorization review.';
  case 'loaded':return result.records.length?
   'Source-bound research records are available; clinical interpretation is not supplied.':
   'No linked records were returned; this does not establish nonresponse or ineligibility.';
 }
}

import {clinVarVariationUrl} from '../domain/externalAuthority';

/**
 * ClinVar ESummary is an external, on-demand research reference, not the
 * NeumuacFQ variant classification or an independently adjudicated judgment.
 * No query by variant name, background polling, caching or patient data.
 */
export interface ClinVarAuthoritySummary {
  readonly variationId:string;
  readonly accession:string;
  readonly title:string;
  readonly germlineDescription:string|null;
  readonly reviewStatus:string|null;
  readonly lastEvaluated:string|null;
  readonly retrievedAt:string;
  readonly sourceUrl:string;
}

function identity(raw:string|null):{id:string;sourceUrl:string}|null{
  const sourceUrl=clinVarVariationUrl(raw);
  if(!raw||!sourceUrl)return null;
  const trimmed=raw.trim();
  const digits=/^VCV(\d{9})(?:\.\d+)?$/i.exec(trimmed)?.[1]??trimmed;
  if(!/^\d{1,12}$/.test(digits))return null;
  const id=String(Number(digits));
  return id!=='0'?{id,sourceUrl}:null;
}
function object(value:unknown):Record<string,unknown>|null{
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
}
function limitedText(value:unknown,limit:number):string|null{
  return typeof value==='string'&&value.trim()&&value.length<=limit?value.trim():null;
}

/** Fail closed if the authority record cannot be traced to the stored CFTR ID. */
export function decodeClinVarSummary(raw:unknown,recordedId:string,retrievedAt:string):ClinVarAuthoritySummary {
  const target=identity(recordedId);
  if(!target)throw new Error('Unsupported recorded ClinVar identifier');
  const result=object(object(raw)?.result);
  if(!result||!Array.isArray(result.uids)||result.uids.length!==1||
     result.uids[0]!==target.id)throw new Error('ClinVar identity cannot be verified');
  const record=object(result[target.id]);
  const accession=limitedText(record?.accession,24);
  const title=limitedText(record?.title,500);
  const uid=record?.uid;
  if(uid!==target.id||!accession||!/^VCV\d{9,12}$/.test(accession)||
     String(Number(accession.slice(3)))!==target.id||!title)
    throw new Error('ClinVar summary identity mismatch');
  const genes=record?.genes;
  if(!Array.isArray(genes)||!genes.some(g=>object(g)?.symbol==='CFTR'))
    throw new Error('ClinVar gene identity could not be verified');
  const germline=object(record?.germline_classification);
  return Object.freeze({
    variationId:target.id,accession,title,sourceUrl:target.sourceUrl,
    germlineDescription:limitedText(germline?.description,200),
    reviewStatus:limitedText(germline?.review_status,200),
    lastEvaluated:limitedText(germline?.last_evaluated,80),
    retrievedAt
  });
}

/** Explicit user action only. No retries, credential disclosure or writes. */
export async function retrieveClinVarSummary(
  recordedId:string|null,transport:typeof fetch=fetch,signal?:AbortSignal
):Promise<ClinVarAuthoritySummary>{
  const target=identity(recordedId);
  if(!target)throw new Error('No supported recorded ClinVar identifier');
  const url=new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi');
  url.search=new URLSearchParams({db:'clinvar',id:target.id,retmode:'json',tool:'neumuacfq'}).toString();
  const response=await transport(url.toString(),{
    method:'GET',credentials:'omit',redirect:'error',cache:'no-store',
    headers:{Accept:'application/json'},signal
  });
  if(!response.ok)throw new Error('ClinVar authority service unavailable');
  const json:unknown=await response.json();
  if(signal?.aborted)throw new Error('ClinVar request cancelled');
  return decodeClinVarSummary(json,recordedId!,new Date().toISOString());
}

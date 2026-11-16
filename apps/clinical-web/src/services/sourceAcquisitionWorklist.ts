import {validateReadOnlyConfig,VariantConnectionError,type ReadOnlyConfig,type ReadSessionProvider} from './liveVariants';

export type SourceTriageState='untriaged'|'source-located'|'metadata-needs-check'|'extraction-in-progress'|'ready-for-claim'|'not-extractable';
export interface SourceAcquisitionRecord{
 readonly id:number;readonly variantId:string;readonly title:string;readonly url:string;readonly source:string;
 readonly year:number|null;readonly pmid:string|null;readonly doi:string|null;
 readonly state:SourceTriageState;readonly note:string|null;readonly version:number;
 readonly updatedAt:string|null;readonly updatedByMe:boolean;readonly auditCount:number;
 readonly claimPending:number;readonly claimApproved:number;readonly numericApproved:number;
}
export const SOURCE_STATES:readonly {value:Exclude<SourceTriageState,'untriaged'>;label:string}[]=[
 {value:'metadata-needs-check',label:'Verify source metadata'},
 {value:'source-located',label:'Original source located'},
 {value:'extraction-in-progress',label:'Extraction in progress'},
 {value:'ready-for-claim',label:'Ready for source claim'},
 {value:'not-extractable',label:'Not extractable'}
];
export const SOURCE_LABELS:Readonly<Record<SourceTriageState,string>>={
 untriaged:'Not yet triaged','metadata-needs-check':'Metadata needs checking',
 'source-located':'Source located','extraction-in-progress':'Extraction in progress',
 'ready-for-claim':'Ready to propose a claim','not-extractable':'Not extractable'
};
const idPattern=/^[1-9][0-9]{0,17}$/;
const tokenPattern=/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const states=new Set(Object.keys(SOURCE_LABELS));
const hosts=new Set(['pubmed.ncbi.nlm.nih.gov','www.ncbi.nlm.nih.gov','cftr2.org',
 'www.cftr2.org','doi.org','scholar.google.com']);
function rec(value:unknown):Record<string,unknown>{
 if(value===null||typeof value!=='object'||Array.isArray(value))
  throw new VariantConnectionError('schema-mismatch','Invalid research source record');
 return value as Record<string,unknown>;
}
function int(value:unknown,label:string):number{
 if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0||value>1000000)
  throw new VariantConnectionError('schema-mismatch','Invalid '+label);
 return value;
}
function str(value:unknown,label:string,max:number):string{
 if(typeof value!=='string'||!value.trim()||value.length>max)
  throw new VariantConnectionError('schema-mismatch','Invalid '+label);
 return value.trim();
}
export function decodeSourceAcquisitionWorklist(value:unknown):readonly SourceAcquisitionRecord[]{
 const data=rec(value);
 if(data.source!=='nfq-acquisition-worklist-v1'||!Array.isArray(data.records)||
  data.records.length>1000||data.records.length!==int(data.total,'source total'))
  throw new VariantConnectionError('schema-mismatch','Incomplete source acquisition list');
 const seen=new Set<number>();
 return Object.freeze(data.records.map((item:unknown)=>{
  const r=rec(item),id=int(r.id,'reference ID'),variantId=str(r.variantId,'variant ID',18);
  if(!id||!idPattern.test(variantId)||seen.has(id))
   throw new VariantConnectionError('schema-mismatch','Duplicated or cross-variant reference identity');
  seen.add(id);
  const rawUrl=str(r.url,'reference URL',1500);
  let url:URL;
  try{url=new URL(rawUrl);}catch{throw new VariantConnectionError('schema-mismatch','Invalid source URL');}
  if(url.protocol!=='https:'||!hosts.has(url.hostname)||url.username||url.password||url.port)
   throw new VariantConnectionError('schema-mismatch','Untrusted source URL');
  const state=r.state as SourceTriageState,version=int(r.version,'triage version');
  if(!states.has(state)||version>100||typeof r.updatedByMe!=='boolean')
   throw new VariantConnectionError('schema-mismatch','Invalid source triage status');
  const note=r.note===null?null:str(r.note,'triage note',700);
  const updatedAt=r.updatedAt===null?null:str(r.updatedAt,'updated at',64);
  if(updatedAt&&!Number.isFinite(Date.parse(updatedAt))||
   state==='untriaged'&&(version!==0||note!==null||updatedAt!==null)||
   state!=='untriaged'&&(version===0||note===null||updatedAt===null))
   throw new VariantConnectionError('schema-mismatch','Source status and audit version inconsistent');
  const year=r.year===null?null:int(r.year,'publication year');
  if(year!==null&&(year<1900||year>2100))
   throw new VariantConnectionError('schema-mismatch','Invalid publication year');
  return Object.freeze({
   id,variantId,title:str(r.title,'reference title',2000),url:url.toString(),
   source:str(r.source,'source',150),year,
   pmid:r.pmid===null?null:str(r.pmid,'PMID',60),
   doi:r.doi===null?null:str(r.doi,'DOI',200),
   state,note,version,updatedAt,updatedByMe:r.updatedByMe,
   auditCount:int(r.auditCount,'audit count'),
   claimPending:int(r.claimPending,'pending claims'),
   claimApproved:int(r.claimApproved,'approved claims'),
   numericApproved:int(r.numericApproved,'approved numeric endpoints')
  });
 }));
}
export function sourceMetadataFlags(r:SourceAcquisitionRecord):readonly string[]{
 const flags:string[]=[];
 const url=new URL(r.url);
 if(/^(PubMed article|Untitled|Unknown title)\b/i.test(r.title))
  flags.push('Publication title needs checking');
 if(url.hostname==='pubmed.ncbi.nlm.nih.gov'){
  const linked=url.pathname.match(/^\/(\d+)\/?$/)?.[1];
  if(linked&&!r.pmid)flags.push('PMID missing from catalogue');
  if(linked&&r.pmid&&linked!==r.pmid)flags.push('PMID differs from source URL');
 }
 if(url.hostname==='doi.org'&&!r.doi)flags.push('DOI missing from catalogue');
 return Object.freeze(flags);
}
/** The URL-derived identifier is a candidate for on-demand PubMed lookup,
 * never a silent replacement for the catalogue's recorded PMID field.
 */
export function sourcePubMedId(row:SourceAcquisitionRecord):string|null{
 const url=new URL(row.url);
 if(url.hostname!=='pubmed.ncbi.nlm.nih.gov')return null;
 const id=url.pathname.match(/^\\/([1-9][0-9]{0,11})\\/?$/)?.[1]??null;
 return id;
}
export function summarizeSourceAcquisition(rows:readonly SourceAcquisitionRecord[]){
 return Object.freeze({
  total:rows.length,variants:new Set(rows.map(x=>x.variantId)).size,
  untriaged:rows.filter(x=>x.state==='untriaged').length,
  metadataFlags:rows.filter(x=>sourceMetadataFlags(x).length>0).length,
  pending:rows.reduce((n,x)=>n+x.claimPending,0),
  approved:rows.reduce((n,x)=>n+x.claimApproved,0),
  numeric:rows.reduce((n,x)=>n+x.numericApproved,0)
 });
}
export function sourceAcquisitionCsv(rows:readonly SourceAcquisitionRecord[]):string{
 const esc=(value:string|number|null)=>{
  const s=value===null?'':String(value);
  return '"'+( /^[=+@\-\t\r\n]/.test(s)?"'"+s:s).replace(/"/g,'""')+'"';
 };
 const cols=['Reference ID','Variant ID','Title','URL','Source','Year','PMID','DOI',
  'Status','Version','Triage note','Metadata flags','Pending claims','Approved claims','Approved numeric endpoints'];
 return [cols.map(esc).join(','),...rows.map(x=>[
  x.id,x.variantId,x.title,x.url,x.source,x.year,x.pmid,x.doi,SOURCE_LABELS[x.state],
  x.version,x.note,sourceMetadataFlags(x).join('; '),x.claimPending,x.claimApproved,x.numericApproved
 ].map(esc).join(','))].join('\r\n');
}
export function validTriageChange(id:number,version:number,state:SourceTriageState,note:string){
 return Number.isSafeInteger(id)&&id>0&&Number.isSafeInteger(version)&&version>=0&&version<100&&
  state!=='untriaged'&&states.has(state)&&
  typeof note==='string'&&note.trim().length>=20&&note.trim().length<=700&&
  !/[\u0000-\u001f\u007f]/.test(note);
}
export function createSourceAcquisitionService(
 config:ReadOnlyConfig,session:ReadSessionProvider,transport:typeof fetch=fetch
){
 const root=validateReadOnlyConfig(config);
 async function request(body:Record<string,unknown>,signal?:AbortSignal):Promise<unknown>{
  const token=await session.getAccessToken();
  if(!token||token===config.publishableKey||!tokenPattern.test(token))
   throw new VariantConnectionError('authentication-required','Active researcher token required');
  let response:Response;
  try{
   response=await transport(new URL('/rest/v1/rpc/nfq_source_acquisition_worklist',root).toString(),{
    method:'POST',headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,
     'content-type':'application/json',Accept:'application/json'},
    body:JSON.stringify(body),signal,credentials:'omit',cache:'no-store',redirect:'error'
   });
  }catch(error){
   if(signal?.aborted)throw error;
   throw new VariantConnectionError('request-failed','Source triage connection unavailable');
  }
  if(signal?.aborted)throw new VariantConnectionError('request-failed','Triage request cancelled');
  if(response.status===401||response.status===403)
   throw new VariantConnectionError('access-denied','Verified research membership required');
  if(!response.ok)throw new VariantConnectionError('request-failed','Source triage request failed');
  try{return await response.json();}catch{
   throw new VariantConnectionError('schema-mismatch','Unrecognized source triage response');
  }
 }
 return Object.freeze({
  async list(signal?:AbortSignal):Promise<readonly SourceAcquisitionRecord[]>{
   return decodeSourceAcquisitionWorklist(await request({
    p_action:'list',p_reference_id:null,p_expected_version:null,p_state:null,p_note:null
   },signal));
  },
  async triage(id:number,version:number,state:SourceTriageState,note:string):Promise<number>{
   if(!validTriageChange(id,version,state,note))
    throw new VariantConnectionError('invalid-configuration','Source triage rationale is incomplete');
   const result=rec(await request({
    p_action:'triage',p_reference_id:id,p_expected_version:version,
    p_state:state,p_note:note.trim()
   }));
   if(result.source!=='nfq-acquisition-worklist-v1'||result.referenceId!==id||
    result.state!==state||result.version!==version+1)
    throw new VariantConnectionError('schema-mismatch','Source triage acknowledgement was invalid');
   return version+1;
  }
 });
}

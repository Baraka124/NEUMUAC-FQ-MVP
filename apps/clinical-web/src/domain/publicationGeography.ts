export interface PublicationInstitution {id:string;name:string;countryCode:string}
export interface PublicationGeography {doi:string;title:string;institutions:PublicationInstitution[]}
export function canonicalPublicationDoi(input:string):string|null {
 const doi=input.trim().replace(/^https:\/\/doi\.org\//i,'').toLowerCase();
 return doi.length<=200&&/^10\.\d{4,9}\/[a-z0-9._;()/+:-]+$/i.test(doi)?doi:null;
}
export function decodePublicationGeography(raw:unknown,doi:string):PublicationGeography{
 if(!raw||typeof raw!=='object')throw Error('Unexpected work');
 const work=raw as Record<string,unknown>;
 if(typeof work.doi!=='string'||canonicalPublicationDoi(work.doi)!==doi||typeof work.display_name!=='string'||!Array.isArray(work.authorships))throw Error('Unverified work identity');
 const institutions=new Map<string,PublicationInstitution>();
 for(const author of work.authorships){
  if(!author||!Array.isArray(author.institutions))continue;
  for(const item of author.institutions){
   if(!item||typeof item.id!=='string'||!/^https:\/\/openalex\.org\/I\d+$/.test(item.id)||typeof item.display_name!=='string'||!item.display_name.trim()||typeof item.country_code!=='string'||!(/^[A-Z]{2}$/).test(item.country_code))continue;
   const next={id:item.id,name:item.display_name,countryCode:item.country_code};
   const previous=institutions.get(next.id);
   if(previous&&(previous.countryCode!==next.countryCode||previous.name!==next.name))throw Error('Conflicting affiliation metadata');
   institutions.set(next.id,next);
  }
 }
 return {doi,title:work.display_name,institutions:[...institutions.values()].sort((a,b)=>a.countryCode.localeCompare(b.countryCode)||a.name.localeCompare(b.name))};
}
export async function lookupPublicationGeography(input:string,signal:AbortSignal,transport:typeof fetch=fetch){
 const doi=canonicalPublicationDoi(input);
 if(!doi)throw Error('Invalid DOI');
 const endpoint='https://api.openalex.org/works/doi:'+encodeURIComponent(doi)+'?select=doi,display_name,authorships';
 const response=await transport(endpoint,{signal,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',redirect:'error',headers:{Accept:'application/json'}});
 if(!response.ok)throw Error('Source unavailable');
 return decodePublicationGeography(await response.json(),doi);
}

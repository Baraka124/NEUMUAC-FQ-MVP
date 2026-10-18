import {safeResearchReturnPath} from './researchJourney';

/**
 * Portable link to an evidence *view*, not a verified scientific source.
 * Validate every filter and drop current URL query/fragment context.
 */
export function portableEvidenceLink(path:unknown,currentHref:string):string|null{
 if(typeof path!=='string'||!/^\/evidence(?:\?|$)/.test(path))return null;
 const safe=safeResearchReturnPath(path,'workspace');
 if(!safe||safe!==path)return null;
 try{
  const url=new URL(currentHref);
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password)return null;
  url.search='';
  url.hash=path;
  return url.toString();
 }catch{return null;}
}

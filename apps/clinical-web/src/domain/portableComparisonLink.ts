import {pairRecordId} from './pairSelection';

/** Research record identity links, not patient genotype or clinical conclusions. */
export function portableComparisonLink(a:unknown,b:unknown,href:string):string|null{
 const first=pairRecordId(a),second=pairRecordId(b);
 if(!first||!second)return null;
 try{
  const url=new URL(href);
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password)return null;
  url.search='';
  url.hash='/genotype?'+new URLSearchParams({a:first,b:second}).toString();
  return url.toString();
 }catch{return null;}
}

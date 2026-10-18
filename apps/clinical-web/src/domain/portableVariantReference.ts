/**
 * Phase 4F-12S: portable source-identity references only.
 * A URL is a route into the public catalog, NOT evidence, validation,
 * treatment guidance, or a claim that the record is still accessible.
 */
const isCanonicalId=(value:unknown):value is string=>
 typeof value==='string'&&/^[1-9][0-9]{0,17}$/.test(value);
export function portableVariantLink(id:unknown,currentHref:string):string|null{
 if(!isCanonicalId(id))return null;
 try{
  const url=new URL(currentHref);
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password)return null;
  // Remove browsing/search context and URL parameters. The share only conveys
  // the stable recorded identity and does not capture a person's search.
  url.search='';
  url.hash='/variants/'+id;
  return url.toString();
 }catch{return null;}
}
export function portableSavedVariantsCsv(ids:readonly string[],currentHref:string):string|null{
 const canonical=[...new Set(ids.filter(isCanonicalId))].slice(0,40);
 // Refuse to emit a misleading partially-formed file when the origin is invalid.
 const links=canonical.map(id=>({id,link:portableVariantLink(id,currentHref)}));
 if(links.some(row=>!row.link))return null;
 return '\uFEFFvariant_id,record_url\r\n'+links.map(row=>row.id+',"'+row.link!.replaceAll('"','""')+'"').join('\r\n')+'\r\n';
}

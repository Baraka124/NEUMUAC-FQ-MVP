export interface PopulationObservation { readonly cohort:string;readonly allele:string;readonly count:number;readonly frequency:number }
export function recordedRsIds(aliases:readonly string[]):string[]{
 return [...new Set(aliases.map(a=>a.trim().toLowerCase()).filter(a=>/^rs[1-9][0-9]{0,15}$/.test(a)))];
}
export function decodePopulationEvidence(raw:unknown,id:string):PopulationObservation[]{
 if(!raw||typeof raw!=='object')throw Error('Invalid source');
 const r=raw as Record<string,unknown>;
 if(r.name!==id||!Array.isArray(r.populations)||r.populations.length>10000)throw Error('Unexpected variation response');
 const result:PopulationObservation[]=[];
 const seen=new Set<string>();
 for(const row of r.populations){
  if(!row||typeof row!=='object')continue;
  const {population,allele,count,frequency}=row;
  if(typeof population!=='string'||!/^1000GENOMES:phase_3:[A-Z]{3}$/.test(population))continue;
  if(typeof allele!=='string'||!/^[-ACGT]+$/.test(allele)||allele.length>200||typeof count!=='number'||!Number.isSafeInteger(count)||count<0||typeof frequency!=='number'||!Number.isFinite(frequency)||frequency<0||frequency>1)throw Error('Invalid population observation');
  const key=population+'|'+allele;
  if(seen.has(key))throw Error('Ambiguous duplicate population observation');
  seen.add(key);result.push({cohort:population.split(':')[2],allele,count,frequency});
 }
 return result.sort((a,b)=>a.cohort.localeCompare(b.cohort)||a.allele.localeCompare(b.allele));
}
export async function loadPopulationEvidence(id:string,signal:AbortSignal,transport:typeof fetch=fetch){
 if(recordedRsIds([id])[0]!==id)throw Error('Invalid rs identifier');
 const url='https://rest.ensembl.org/variation/human/'+id+'?pops=1;content-type=application/json';
 const response=await transport(url,{signal,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',redirect:'error',headers:{Accept:'application/json'}});
 if(!response.ok)throw Error('Population source unavailable');
 return decodePopulationEvidence(await response.json(),id);
}

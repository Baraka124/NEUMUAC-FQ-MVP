import {pairRecordId} from './pairSelection';
import {safeResearchReturnPath,variantJourneyPath,variantWorklistJourneyPath,workspaceJourneyPath} from './researchJourney';

/** Contextual navigation is derived exclusively from validated URL state.
 * No session persistence, free-form redirects, clinical assumptions or writes.
 */
type ResearchLocation={
 readonly path:string;
 readonly fullPath:string;
 readonly query:Readonly<Record<string,unknown>>;
};
type ResearchDestination=string|{readonly path:string;readonly query:Readonly<Record<string,string>>};
const FILTERS=['q','class','sort','mode','page'] as const;

function searchFilters(query:Readonly<Record<string,unknown>>):Record<string,string>{
 const result:Record<string,string>={};
 for(const key of FILTERS){
  const value=query[key];
  if(typeof value==='string'&&value!=='')result[key]=value;
 }
 return result;
}
function variantFromPath(path:string):string|null{
 const found=/^\/variants\/([1-9]\d{0,17})(?:\?|$)/.exec(path);
 return found?.[1]??null;
}
function originatingVariant(current:ResearchLocation):{id:string;returnPath:string}|null{
 const currentId=variantFromPath(current.path);
 if(currentId){
  const origin=variantJourneyPath(currentId,searchFilters(current.query))||variantJourneyPath(currentId);
  return origin?{id:currentId,returnPath:origin}:null;
 }
 let origin=safeResearchReturnPath(current.query.from,'variant');
 if(!origin){
  const source=safeResearchReturnPath(current.query.from,'research');
  if(source?.startsWith('/genotype?')){
   const query=new URLSearchParams(source.slice(source.indexOf('?')+1));
   origin=safeResearchReturnPath(query.get('from'),'variant');
  }
 }
 const id=origin?variantFromPath(origin):null;
 return id&&origin?{id,returnPath:origin}:null;
}
export function connectedResearchDestination(target:string,current:ResearchLocation):ResearchDestination{
 // Re-entering the same workspace must never reset its current search or pair.
 if(target===current.path)return current.fullPath;
 if(target==='/variants'&&variantFromPath(current.path)){
  return variantWorklistJourneyPath(searchFilters(current.query))||'/variants';
 }
 if(!['/evidence','/genotype','/intelligence'].includes(target))return target;
 const origin=originatingVariant(current);
 if(!origin)return target;
 if(target==='/genotype')return {path:'/genotype',query:{a:origin.id,from:origin.returnPath}};
 if(target==='/intelligence')return {path:'/intelligence',query:{variant:origin.id,from:origin.returnPath}};
 if(current.path==='/genotype'){
  const a=pairRecordId(current.query.a),b=pairRecordId(current.query.b);
  const comparison=workspaceJourneyPath('/genotype',{a:a||undefined,b:b||undefined,from:origin.returnPath});
  if(comparison)return {path:'/evidence',query:{variant:a||b||origin.id,from:comparison}};
 }
 return {path:'/evidence',query:{variant:origin.id,from:origin.returnPath}};
}

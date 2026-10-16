/**
 * 4F-7D: explicit, validated internal return paths for the three public
 * research workspaces. No local/session storage, telemetry or external URL
 * interpretation. This never changes variant identity or scientific data.
 */
type JourneyWorkspace='variant'|'evidence'|'intelligence';
type Params=Readonly<Record<string,unknown>>;
const OPTIONS:Record<JourneyWorkspace,Record<string,(value:string)=>boolean>>={
 variant:{
  q:v=>v.length>0&&v.length<=75,
  class:v=>['I','II','III','IV','V','VI','unclassified'].includes(v),
  mode:v=>['contains','exact-name'].includes(v),
  sort:v=>['name-asc','name-desc','recent-record','fewest-validations','most-validations'].includes(v),
  page:v=>/^\d{1,4}$/.test(v)&&Number(v)<=10000
 },
 evidence:{
  q:v=>v.length<=70&&/^[a-zA-Z0-9 _-]*$/.test(v),
  page:v=>/^\d{1,4}$/.test(v)&&Number(v)<=10000,
  variant:v=>/^[1-9]\d{0,17}$/.test(v)
 },
 intelligence:{
  q:v=>v.length<=75,
  group:v=>['none','single','multiple','all'].includes(v),
  shown:v=>/^\d{1,4}$/.test(v)&&Number(v)>=40&&Number(v)<=4000&&Number(v)%40===0,
  expanded:v=>/^\d{1,18}$/.test(v),
  variant:v=>/^[1-9]\d{0,17}$/.test(v)
 }
};
function workspace(path:string):JourneyWorkspace|null{
 if(/^\/variants\/(?:0|[1-9]\d{0,17})$/.test(path))return 'variant';
 if(path==='/evidence')return 'evidence';
 if(path==='/intelligence')return 'intelligence';
 return null;
}
function canonical(path:string,query:Params):string|null{
 const kind=workspace(path);if(!kind)return null;
 const params=new URLSearchParams();
 for(const [key,raw] of Object.entries(query)){
  if(raw===undefined||raw===null||raw==='')continue;
  if(typeof raw!=='string'||!OPTIONS[kind][key]?.(raw))return null;
  params.set(key,raw);
 }
 const text=params.toString();
 return path+(text?'?'+text:'');
}
export function variantJourneyPath(id:string,query:Params={}):string|null{
 if(!/^(?:0|[1-9]\d{0,17})$/.test(id))return null;
 return canonical('/variants/'+id,query);
}
export function workspaceJourneyPath(path:'/evidence'|'/intelligence',query:Params={}):string|null{
 return canonical(path,query);
}
export function safeResearchReturnPath(raw:unknown,expected:'variant'|'workspace'):string|null{
 if(typeof raw!=='string'||raw.length>800||!raw.startsWith('/')||
    raw.startsWith('//')||/[#\\\r\n]/.test(raw))return null;
 const mark=raw.indexOf('?');
 const path=mark<0?raw:raw.slice(0,mark);
 const kind=workspace(path);
 if(!kind||(expected==='variant'&&kind!=='variant')||(expected==='workspace'&&kind==='variant'))return null;
 const text=mark<0?'':raw.slice(mark+1);
 const query:Record<string,string>={};
 if(text){
  const params=new URLSearchParams(text);
  for(const [key,value] of params){
   if(Object.hasOwn(query,key))return null;
   query[key]=value;
  }
 }
 return canonical(path,query);
}

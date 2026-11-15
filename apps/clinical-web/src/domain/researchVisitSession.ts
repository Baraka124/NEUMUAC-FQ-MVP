import {reactive} from 'vue';
import type {RealVariant} from '../services/liveVariants';
import {variantDisplayName} from '../services/liveVariants';

/** Research work-session, inspired by the original in-memory sessionViews.
 * This is an EXPLICIT local tool, not search analytics or a server audit.
 * No local/session storage, identifiers for patients, raw queries or network writes.
 */
export const RESEARCH_SESSION_IDLE_MS=20*60*1000;
export const MAX_SESSION_VARIANTS=100;
type PauseReason='manual'|'idle'|'hidden'|null;
export interface SessionVisit{
 readonly id:string;
 readonly name:string;
 readonly protein:string|null;
 readonly cdna:string|null;
 readonly recordedClass:string|null;
 readonly subtype:string|null;
 readonly eti:string|null;
 readonly alyftrek:string|null;
 readonly validations:number|null;
 readonly firstViewedAt:string;
 readonly lastViewedAt:string;
 readonly views:number;
}
export interface VisitSessionState{
 phase:'off'|'active'|'paused'|'ended';
 startedAt:string|null;
 endedAt:string|null;
 pauseReason:PauseReason;
 lastActivityAt:string|null;
 totalOpens:number;
 visits:readonly SessionVisit[];
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const positive=/^[1-9][0-9]{0,17}$/;
const date=(now:number):string=>new Date(now).toISOString();
function safeText(value:string|null|undefined,max=125):string|null{
 if(typeof value!=='string')return null;
 const trimmed=value.trim().replace(/[\u0000-\u001f\u007f]/g,' ');
 return trimmed?trimmed.slice(0,max):null;
}
function csv(value:string|null|number):string{
 const text=String(value??'');
 const formula=/^[\s]*[=+\-@]/.test(text)?"'"+text:text;
 return '"'+formula.replace(/"/g,'""')+'"';
}
export function createResearchVisitSession(clock:()=>number=()=>Date.now()){
 let owner:string|null=null;
 let lastActivity=0;
 const state=reactive<VisitSessionState>({
  phase:'off',startedAt:null,endedAt:null,pauseReason:null,
  lastActivityAt:null,totalOpens:0,visits:[]
 });
 function clear():void{
  owner=null;lastActivity=0;
  Object.assign(state,{phase:'off',startedAt:null,endedAt:null,pauseReason:null,
   lastActivityAt:null,totalOpens:0,visits:[]});
 }
 function reconcile(phase:string,userId:string|null):void{
  if(phase!=='signed-in'||!userId||userId!==owner){
   // An unstarted session has no owner. Never inherit another identity.
   if(state.phase!=='off')clear();
  }
 }
 function start(userId:string|null,visible=true):boolean{
  if(!visible||!userId||!uuid.test(userId))return false;
  const now=clock();
  if(!Number.isFinite(now))return false;
  clear();owner=userId;lastActivity=now;
  state.phase='active';state.startedAt=date(now);state.lastActivityAt=date(now);
  return true;
 }
 function pause(reason:Exclude<PauseReason,null>='manual'):boolean{
  if(state.phase!=='active')return false;
  state.phase='paused';state.pauseReason=reason;return true;
 }
 function check(visible=true):boolean{
  if(state.phase!=='active')return false;
  const now=clock();
  if(!visible){pause('hidden');return false;}
  if(!Number.isFinite(now)||now<lastActivity||now-lastActivity>=RESEARCH_SESSION_IDLE_MS){
   pause('idle');return false;
  }
  return true;
 }
 function activity(visible=true):void{
  if(!check(visible))return;
  lastActivity=clock();
  state.lastActivityAt=date(lastActivity);
 }
 function resume(userId:string|null,visible=true):boolean{
  if(state.phase!=='paused'||!visible||!owner||owner!==userId)return false;
  const now=clock();
  if(!Number.isFinite(now))return false;
  lastActivity=now;state.phase='active';state.pauseReason=null;
  state.lastActivityAt=date(now);return true;
 }
 function end():boolean{
  if(state.phase!=='active'&&state.phase!=='paused')return false;
  state.phase='ended';state.pauseReason=null;state.endedAt=date(clock());return true;
 }
 function visit(userId:string|null,variant:RealVariant,visible=true):boolean{
  if(!userId||userId!==owner||!check(visible)||!positive.test(variant.id))return false;
  const now=clock(),ts=date(now);
  const current=[...state.visits];
  const found=current.findIndex(item=>item.id===variant.id);
  const old=found>=0?current.splice(found,1)[0]:null;
  const item:SessionVisit=Object.freeze({
   id:variant.id,name:safeText(variantDisplayName(variant))||'Recorded variant #'+variant.id,
   protein:safeText(variant.proteinName),cdna:safeText(variant.cdnaName),
   recordedClass:safeText(variant.recordedClass,30),subtype:safeText(variant.classSubtype,50),
   eti:safeText(variant.etiPrediction,50),alyftrek:safeText(variant.alyftrekPrediction,50),
   validations:typeof variant.validationCount==='number'&&Number.isSafeInteger(variant.validationCount)
    &&variant.validationCount>=0?variant.validationCount:null,
   firstViewedAt:old?.firstViewedAt??ts,lastViewedAt:ts,views:(old?.views??0)+1
  });
  state.visits=Object.freeze([item,...current].slice(0,MAX_SESSION_VARIANTS));
  state.totalOpens++;
  return true;
 }
 function exportCsv():string|null{
  if(!owner||!state.startedAt||state.phase==='off'||!state.visits.length)return null;
  const columns=['variant_id','recorded_name','protein_notation','cdna_notation','recorded_class','recorded_subtype',
   'recorded_eti','recorded_alyftrek','validation_count','first_viewed_utc','last_viewed_utc','visits','dossier_route',
   'session_started_utc','session_ended_utc','session_note'];
  const note='Private local working session; not a verified audit or clinical decision';
  const rows=state.visits.map(item=>[
   item.id,item.name,item.protein,item.cdna,item.recordedClass,item.subtype,item.eti,item.alyftrek,
   item.validations,item.firstViewedAt,item.lastViewedAt,item.views,'/#/variants/'+item.id,
   state.startedAt,state.endedAt,note
  ].map(x=>csv(x)).join(','));
  return '\uFEFF'+columns.join(',')+'\r\n'+rows.join('\r\n')+'\r\n';
 }
 return Object.freeze({state,start,pause,resume,end,clear,reconcile,check,activity,visit,exportCsv});
}
export const researchVisitSession=createResearchVisitSession();

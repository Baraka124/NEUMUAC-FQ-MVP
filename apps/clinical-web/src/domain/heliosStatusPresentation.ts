import type {HeliosReadState} from '../domain/heliosPublishedReview';

/** Explicit view language for the scientific review data boundary.
 * No authorization may be inferred from client state.
 */
export interface HeliosStatusPresentation {
 readonly label:string;
 readonly detail:string;
 readonly canDisplayRecords:boolean;
}
export function describeHeliosReadState(state:HeliosReadState):HeliosStatusPresentation {
 switch(state.kind){
  case 'not-connected':return {label:'Not connected',detail:'Authorized review data has not been connected.',canDisplayRecords:false};
  case 'access-denied':return {label:'Unavailable',detail:'Review records cannot be displayed. Access or data validation was unsuccessful.',canDisplayRecords:false};
  case 'empty':return {label:'No review records',detail:'The authorized source returned no review records.',canDisplayRecords:false};
  case 'ready':return {label:'Review records',detail:state.records.length===1?'1 authorized review record':state.records.length+' authorized review records',canDisplayRecords:true};
 }
}

/**
 * Phase 14H167 — source-reported experimental endpoint, not a generated
 * response score. One observation describes one source-reported measurement.
 * Never convert this to a therapy recommendation or a patient prediction.
 */
export type EndpointCode='sweat-chloride'|'ppfev1'|'cftr-current'|'organoid-fis'|'other'|'not-reported';
export type EndpointStatistic='absolute'|'change-from-baseline'|'relative-change'|'ratio-to-control'|'not-reported';
export type EndpointUnit='mmol/L'|'pp'|'%'|'uA/cm2'|'ratio'|'study-specific'|'not-reported';
export type EndpointModel='clinical'|'airway-epithelium'|'intestinal-organoid'|'cell-line'|'other'|'not-reported';
export type EndpointComparator='baseline'|'placebo'|'vehicle'|'untreated'|'wild-type'|'other'|'not-reported';
export interface ResearchEndpoint{
 readonly code:EndpointCode;
 readonly statistic:EndpointStatistic;
 readonly unit:EndpointUnit;
 /** Exact number reported by the original source, never an inference. */
 readonly value:number|null;
 readonly model:EndpointModel;
 readonly comparator:EndpointComparator;
 /** Author-described study timepoint; no calendar inference. */
 readonly timepoint:string;
}
export const ENDPOINTS:readonly {readonly code:EndpointCode;readonly label:string}[]=[
 {code:'not-reported',label:'Not extracted from source'},
 {code:'sweat-chloride',label:'Sweat chloride'},
 {code:'ppfev1',label:'Percent-predicted FEV₁'},
 {code:'cftr-current',label:'CFTR-mediated chloride current'},
 {code:'organoid-fis',label:'Organoid forskolin-induced swelling'},
 {code:'other',label:'Other reported outcome'}
];
export const ENDPOINT_STATISTICS:readonly {readonly code:EndpointStatistic;readonly label:string}[]=[
 {code:'not-reported',label:'Not reported'},
 {code:'absolute',label:'Absolute result'},
 {code:'change-from-baseline',label:'Change from baseline'},
 {code:'relative-change',label:'Relative percentage change'},
 {code:'ratio-to-control',label:'Ratio to control'}
];
export const ENDPOINT_MODELS:readonly {readonly code:EndpointModel;readonly label:string}[]=[
 {code:'not-reported',label:'Not reported'},
 {code:'clinical',label:'Clinical measurement'},
 {code:'airway-epithelium',label:'Airway epithelial model'},
 {code:'intestinal-organoid',label:'Intestinal organoid'},
 {code:'cell-line',label:'Cell-line assay'},
 {code:'other',label:'Other experimental model'}
];
export const ENDPOINT_COMPARATORS:readonly {readonly code:EndpointComparator;readonly label:string}[]=[
 {code:'not-reported',label:'Not reported'},
 {code:'baseline',label:'Baseline'},
 {code:'placebo',label:'Placebo'},
 {code:'vehicle',label:'Vehicle'},
 {code:'untreated',label:'Untreated'},
 {code:'wild-type',label:'Wild type'},
 {code:'other',label:'Other source comparator'}
];
export const UNEXTRACTED_ENDPOINT:ResearchEndpoint=Object.freeze({
 code:'not-reported',statistic:'not-reported',unit:'not-reported',
 value:null,model:'not-reported',comparator:'not-reported',timepoint:'not-reported'
});
const endpointCodes=new Set(ENDPOINTS.map(x=>x.code));
const statistics=new Set(ENDPOINT_STATISTICS.map(x=>x.code));
const models=new Set(ENDPOINT_MODELS.map(x=>x.code));
const comparators=new Set(ENDPOINT_COMPARATORS.map(x=>x.code));
const units=new Set<EndpointUnit>(['mmol/L','pp','%','uA/cm2','ratio','study-specific','not-reported']);
const unitByEndpoint:Record<Exclude<EndpointCode,'not-reported'>,Partial<Record<EndpointStatistic,readonly EndpointUnit[]>>>={
 'sweat-chloride':{'absolute':['mmol/L'],'change-from-baseline':['mmol/L'],'relative-change':['%']},
 'ppfev1':{'absolute':['%'],'change-from-baseline':['pp'],'relative-change':['%']},
 'cftr-current':{'absolute':['uA/cm2'],'change-from-baseline':['uA/cm2'],'relative-change':['%'],'ratio-to-control':['ratio']},
 'organoid-fis':{'absolute':['study-specific'],'change-from-baseline':['study-specific'],'relative-change':['%'],'ratio-to-control':['ratio']},
 'other':{'absolute':['study-specific'],'change-from-baseline':['study-specific'],'relative-change':['%'],'ratio-to-control':['ratio']}
};
/** Strictly match database validation: the contract verifies provenance and
 * representational consistency, NOT whether the publication actually supports
 * a finding; that still requires two independent scientific reviewers.
 */
export function validResearchEndpoint(value:ResearchEndpoint):boolean{
 if(!value||typeof value!=='object'||Array.isArray(value)||
  !endpointCodes.has(value.code)||!statistics.has(value.statistic)||
  !models.has(value.model)||!comparators.has(value.comparator)||
  !units.has(value.unit)||typeof value.timepoint!=='string'||
  value.timepoint.length<3||value.timepoint.length>80||
  value.timepoint.trim()!==value.timepoint||/[\u0000-\u001f\u007f]/.test(value.timepoint))return false;
 if(value.code==='not-reported')return JSON.stringify(value)===JSON.stringify(UNEXTRACTED_ENDPOINT);
 if(value.value===null)return value.statistic==='not-reported'&&value.unit==='not-reported'&&
  value.timepoint==='not-reported';
 if(typeof value.value!=='number'||!Number.isFinite(value.value)||Math.abs(value.value)>1e6||
  value.statistic==='not-reported'||value.unit==='not-reported'||
  value.model==='not-reported'||value.comparator==='not-reported'||
  value.timepoint==='not-reported')return false;
 return (unitByEndpoint[value.code][value.statistic]??[]).includes(value.unit);
}
export function endpointReadiness(endpoint:ResearchEndpoint|null):'unextracted'|'qualitative'|'numeric'{
 if(!endpoint||endpoint.code==='not-reported')return 'unextracted';
 if(!validResearchEndpoint(endpoint))throw new Error('Unverified endpoint context');
 return endpoint.value===null?'qualitative':'numeric';
}
/** Exact-context grouping only. This is not meta-analysis, effect pooling or
 * an assertion that different papers have statistically equivalent methods.
 */
export function endpointComparisonKey(endpoint:ResearchEndpoint|null,scope:string,
 genotypePair:readonly [string,string]|undefined,method:string):string|null{
 if(!endpoint||!validResearchEndpoint(endpoint)||endpoint.value===null||
  endpoint.code==='not-reported'||endpoint.code==='other'||
  endpoint.unit==='study-specific')return null;
 if(endpoint.model==='other'||endpoint.comparator==='other')return null;
 if(scope==='genotype-specific'&&(!genotypePair||genotypePair.length!==2))return null;
 if(scope!=='genotype-specific'&&scope!=='single-variant')return null;
 const pair=genotypePair?[...genotypePair].sort().join('+'):'';
 return [scope,pair,method,endpoint.code,endpoint.statistic,endpoint.unit,
  endpoint.model,endpoint.comparator,endpoint.timepoint.toLowerCase()].join('|');
}
export function endpointDisplayValue(endpoint:ResearchEndpoint):string{
 if(!validResearchEndpoint(endpoint)||endpoint.value===null)return 'No numeric endpoint recorded';
 return String(endpoint.value)+(endpoint.unit==='pp'?' percentage points':endpoint.unit==='uA/cm2'?' µA/cm²':
  endpoint.unit==='ratio'?' ratio':endpoint.unit==='study-specific'?' · study-specific scale':' '+endpoint.unit);
}

import type {ResearchEndpoint} from './researchEndpointNormalization';

/** Source-reported sampling and dispersion context for one reviewed
 * observation. No inferred participant totals, arm effects or SE conversion.
 */
export type AnalysisUnit=
 'participants'|'donors'|'biological-replicates'|'technical-replicates'|'not-reported';
export type DesignType='parallel'|'paired'|'single-arm'|'not-reported';
export type UncertaintyType='sd'|'sem'|'ci95'|'not-reported';
export type UncertaintyTarget=
 'reported-outcome'|'intervention-arm'|'between-group-contrast'|'not-reported';

export interface ReportedStudyStatistics {
 readonly analysisUnit:AnalysisUnit;
 readonly design:DesignType;
 readonly interventionN:number|null;
 readonly comparatorN:number|null;
 readonly uncertaintyType:UncertaintyType;
 readonly uncertaintyValue:number|null;
 readonly ciLower:number|null;
 readonly ciUpper:number|null;
 readonly uncertaintyTarget:UncertaintyTarget;
 readonly sourceLocator:string;
}
export const UNREPORTED_STUDY_STATISTICS:ReportedStudyStatistics=Object.freeze({
 analysisUnit:'not-reported',design:'not-reported',
 interventionN:null,comparatorN:null,uncertaintyType:'not-reported',
 uncertaintyValue:null,ciLower:null,ciUpper:null,
 uncertaintyTarget:'not-reported',sourceLocator:'not-reported'
});
export const ANALYSIS_UNITS:readonly {value:AnalysisUnit;label:string}[]=[
 {value:'not-reported',label:'Not reported'},
 {value:'participants',label:'Participants'},
 {value:'donors',label:'Biological donors'},
 {value:'biological-replicates',label:'Independent biological replicates'},
 {value:'technical-replicates',label:'Technical replicates'}
];
export const STUDY_DESIGNS:readonly {value:DesignType;label:string}[]=[
 {value:'not-reported',label:'Not reported'},
 {value:'single-arm',label:'Single arm'},
 {value:'parallel',label:'Parallel arms'},
 {value:'paired',label:'Paired / repeated measures'}
];
export const UNCERTAINTY_TYPES:readonly {value:UncertaintyType;label:string}[]=[
 {value:'not-reported',label:'Not extracted'},
 {value:'sd',label:'Standard deviation (SD)'},
 {value:'sem',label:'Standard error of the mean (SEM)'},
 {value:'ci95',label:'Reported 95% confidence interval'}
];
export const UNCERTAINTY_TARGETS:readonly {value:UncertaintyTarget;label:string}[]=[
 {value:'not-reported',label:'Not reported'},
 {value:'reported-outcome',label:'Reported endpoint estimate'},
 {value:'intervention-arm',label:'Intervention arm estimate'},
 {value:'between-group-contrast',label:'Between-group contrast'}
];
const units=new Set(ANALYSIS_UNITS.map(x=>x.value));
const designs=new Set(STUDY_DESIGNS.map(x=>x.value));
const errors=new Set(UNCERTAINTY_TYPES.map(x=>x.value));
const targets=new Set(UNCERTAINTY_TARGETS.map(x=>x.value));
const positiveInt=(v:unknown):v is number=>
 typeof v==='number'&&Number.isSafeInteger(v)&&v>=1&&v<=1_000_000;
const finiteBound=(v:unknown):v is number=>
 typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1_000_000;
const positiveError=(v:unknown):v is number=>
 finiteBound(v)&&v>0;
export function validStudyStatistics(
 input:ReportedStudyStatistics,endpoint:ResearchEndpoint|null
):boolean{
 if(!input||typeof input!=='object'||Array.isArray(input)||
  !units.has(input.analysisUnit)||!designs.has(input.design)||
  !errors.has(input.uncertaintyType)||!targets.has(input.uncertaintyTarget)||
  typeof input.sourceLocator!=='string'||input.sourceLocator.length>240||
  !input.sourceLocator.trim()||
  input.sourceLocator!==input.sourceLocator.trim()||
  /[\u0000-\u001f\u007f]/.test(input.sourceLocator))return false;
 if(input.interventionN!==null&&!positiveInt(input.interventionN)||
  input.comparatorN!==null&&!positiveInt(input.comparatorN))return false;
 const anyN=input.interventionN!==null||input.comparatorN!==null;
 if(anyN&&input.analysisUnit==='not-reported'||
  input.design==='single-arm'&&input.comparatorN!==null||
  input.comparatorN!==null&&input.interventionN===null)return false;
 const anyReported=anyN||input.analysisUnit!=='not-reported'||
  input.design!=='not-reported'||input.uncertaintyType!=='not-reported';
 if(anyReported&&(input.sourceLocator==='not-reported'||input.sourceLocator.length<8))return false;
 if(!anyReported&&input.sourceLocator!=='not-reported')return false;
 if(input.uncertaintyType==='not-reported')return input.uncertaintyValue===null&&
  input.ciLower===null&&input.ciUpper===null&&input.uncertaintyTarget==='not-reported';
 // Uncertainty must be tied to an actual measured source endpoint.
 if(endpoint===null||endpoint.value===null||
  input.uncertaintyTarget==='not-reported')return false;
 if(input.uncertaintyType==='ci95')return input.uncertaintyValue===null&&
  finiteBound(input.ciLower)&&finiteBound(input.ciUpper)&&input.ciLower<input.ciUpper;
 return positiveError(input.uncertaintyValue)&&input.ciLower===null&&input.ciUpper===null;
}
export function studyStatisticsReadiness(stats:ReportedStudyStatistics|null):
 'not-extracted'|'sampling-only'|'uncertainty-only'|'sampling-and-uncertainty'{
 if(stats===null||stats.analysisUnit==='not-reported'&&
  stats.design==='not-reported'&&stats.uncertaintyType==='not-reported')return 'not-extracted';
 const hasN=stats.interventionN!==null;
 const hasError=stats.uncertaintyType!=='not-reported';
 return hasN&&hasError?'sampling-and-uncertainty':hasN?'sampling-only':
  hasError?'uncertainty-only':'not-extracted';
}
/** Explicit quality limitations; neither n nor reported dispersion validates
 * sampling independence or establishes an analyzable effect-size estimate.
 */
export function studyStatisticsFlags(
 stats:ReportedStudyStatistics|null,endpoint:ResearchEndpoint|null
):readonly string[]{
 if(stats===null)return Object.freeze(['Historical claim predates study statistics extraction']);
 if(!validStudyStatistics(stats,endpoint))throw new Error('Invalid reported study statistics');
 const flags:string[]=[];
 if(stats.interventionN===null)flags.push('Intervention sample or replicate count not reported');
 if(stats.comparatorN===null&&stats.design==='parallel')
  flags.push('Parallel-arm comparator sample count not reported');
 if(stats.design==='not-reported')
  flags.push('Study arm structure not reported');
 if(stats.uncertaintyType==='not-reported')
  flags.push('Dispersion or confidence interval not reported');
 if(stats.analysisUnit==='technical-replicates')
  flags.push('Technical replicates are not independent biological samples');
 if(stats.uncertaintyType!=='not-reported'&&stats.interventionN===1)
  flags.push('Reported dispersion with single intervention unit needs verification');
 if(stats.uncertaintyType==='ci95'&&endpoint?.value!==null&&
  endpoint?.value!==undefined&&
  (endpoint.value<stats.ciLower!||endpoint.value>stats.ciUpper!))
  flags.push('Source endpoint value lies outside reported 95% CI; verify statistic and target');
 if(stats.uncertaintyTarget==='between-group-contrast'&&
  endpoint?.statistic==='absolute')
  flags.push('Contrast uncertainty and absolute endpoint statistic may describe different estimands');
 return Object.freeze(flags);
}
export function statisticsSummary(stats:ReportedStudyStatistics|null):string{
 if(!stats)return 'Legacy observation · not extracted';
 const samples=stats.interventionN===null?'n not reported':
  'n '+stats.interventionN+
  (stats.comparatorN===null?'':' / '+stats.comparatorN+' comparator');
 const uncertainty=stats.uncertaintyType==='not-reported'?'uncertainty not extracted':
  stats.uncertaintyType==='ci95'?
   '95% CI '+stats.ciLower+' to '+stats.ciUpper:
   stats.uncertaintyType.toUpperCase()+' '+stats.uncertaintyValue;
 return [stats.analysisUnit,samples,uncertainty].join(' · ');
}

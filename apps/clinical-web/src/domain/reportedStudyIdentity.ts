/** 14H172 · An independently reviewed observation's source-reported
 * study registration and aggregate population context. Not a patient record.
 */
export type RegistryType='not-reported'|'nct'|'isrctn'|'other';
export type PublicationRole='not-reported'|'primary-report'|'extension'|'secondary-analysis';
export type PopulationModel='not-reported'|'clinical-participants'|'patient-derived-organoids'|
 'primary-cells'|'cell-line'|'animal-model';
export type DiseaseGroup='not-reported'|'cystic-fibrosis'|'non-cf-control'|'heterologous-expression';
export type AgeGroup='not-reported'|'pediatric'|'adult'|'mixed';

export interface ReportedStudyIdentity {
 readonly registryType:RegistryType;
 readonly registryId:string|null;
 readonly publicationRole:PublicationRole;
 readonly populationModel:PopulationModel;
 readonly diseaseGroup:DiseaseGroup;
 readonly ageGroup:AgeGroup;
 readonly cohortLabel:string|null;
 readonly populationDescription:string|null;
 readonly sourceLocator:string;
}
export const UNREPORTED_STUDY_IDENTITY:ReportedStudyIdentity=Object.freeze({
 registryType:'not-reported',registryId:null,publicationRole:'not-reported',
 populationModel:'not-reported',diseaseGroup:'not-reported',ageGroup:'not-reported',
 cohortLabel:null,populationDescription:null,sourceLocator:'not-reported'
});
export const REGISTRY_TYPES:readonly {value:RegistryType;label:string}[]=[
 {value:'not-reported',label:'Not recorded'},
 {value:'nct',label:'ClinicalTrials.gov NCT'},
 {value:'isrctn',label:'ISRCTN registry'},
 {value:'other',label:'Other study accession'}
];
export const PUBLICATION_ROLES:readonly {value:PublicationRole;label:string}[]=[
 {value:'not-reported',label:'Not recorded'},
 {value:'primary-report',label:'Primary study report'},
 {value:'extension',label:'Follow-up or extension'},
 {value:'secondary-analysis',label:'Secondary or subgroup analysis'}
];
export const POPULATION_MODELS:readonly {value:PopulationModel;label:string}[]=[
 {value:'not-reported',label:'Not recorded'},
 {value:'clinical-participants',label:'Clinical participants'},
 {value:'patient-derived-organoids',label:'Patient-derived organoids'},
 {value:'primary-cells',label:'Primary cell cultures'},
 {value:'cell-line',label:'Cell lines'},
 {value:'animal-model',label:'Animal models'}
];
export const DISEASE_GROUPS:readonly {value:DiseaseGroup;label:string}[]=[
 {value:'not-reported',label:'Not recorded'},
 {value:'cystic-fibrosis',label:'Cystic fibrosis'},
 {value:'non-cf-control',label:'Non-CF comparison'},
 {value:'heterologous-expression',label:'Heterologous expression'}
];
export const AGE_GROUPS:readonly {value:AgeGroup;label:string}[]=[
 {value:'not-reported',label:'Not recorded'},
 {value:'pediatric',label:'Pediatric'},
 {value:'adult',label:'Adult'},
 {value:'mixed',label:'Mixed ages'}
];
const isOneOf=<T extends string>(value:unknown,items:readonly {value:T}[]):value is T=>
 typeof value==='string'&&items.some(x=>x.value===value);
const clean=(value:string|null,min:number,max:number)=>
 value===null||(value.length>=min&&value.length<=max&&
 value===value.trim()&&!/[\u0000-\u001f\u007f]/.test(value));
export function validReportedStudyIdentity(value:ReportedStudyIdentity):boolean{
 if(!value||typeof value!=='object'||Array.isArray(value)||
  !isOneOf(value.registryType,REGISTRY_TYPES)||
  !isOneOf(value.publicationRole,PUBLICATION_ROLES)||
  !isOneOf(value.populationModel,POPULATION_MODELS)||
  !isOneOf(value.diseaseGroup,DISEASE_GROUPS)||
  !isOneOf(value.ageGroup,AGE_GROUPS)||
  !clean(value.cohortLabel,3,100)||!clean(value.populationDescription,20,280)||
  typeof value.sourceLocator!=='string'||!clean(value.sourceLocator,1,240))return false;
 if(value.registryType==='not-reported'&&value.registryId!==null)return false;
 if(value.registryType!=='not-reported'){
  if(typeof value.registryId!=='string')return false;
  const valid=value.registryType==='nct'?/^NCT[0-9]{8}$/.test(value.registryId):
   value.registryType==='isrctn'?/^ISRCTN[0-9]{8}$/.test(value.registryId):
   /^[A-Za-z0-9][A-Za-z0-9._:-]{5,59}$/.test(value.registryId);
  if(!valid)return false;
 }
 const hasInformation=value.registryType!=='not-reported'||
  value.publicationRole!=='not-reported'||value.populationModel!=='not-reported'||
  value.diseaseGroup!=='not-reported'||value.ageGroup!=='not-reported'||
  value.cohortLabel!==null||value.populationDescription!==null;
 return hasInformation?
  value.sourceLocator!=='not-reported'&&value.sourceLocator.length>=8:
  value.sourceLocator==='not-reported';
}
/** A confirmed accession is one source-linked candidate for the SAME study.
 * Its use across papers is conservative deduplication, not evidence of
 * independent samples, experimental cohorts or identical outcomes.
 */
export function reportedRegistryKey(value:ReportedStudyIdentity|null):string|null{
 if(!value||value.registryType==='not-reported'||value.registryId===null)return null;
 if(!validReportedStudyIdentity(value))throw new Error('Invalid study registration');
 return 'registry:'+value.registryType+':'+value.registryId.toLowerCase();
}
export function populationFlags(value:ReportedStudyIdentity|null):readonly string[]{
 if(value===null)return Object.freeze(['Historical source claim has no linked population characterization']);
 if(!validReportedStudyIdentity(value))throw new Error('Invalid source population context');
 const flags:string[]=[];
 if(value.registryId===null)flags.push('Underlying study registration is not identified');
 if(value.populationModel==='not-reported')flags.push('Study population model is not recorded');
 if(value.diseaseGroup==='not-reported')flags.push('Disease/cohort group is not recorded');
 if(value.publicationRole==='extension'||value.publicationRole==='secondary-analysis')
  flags.push('Potentially overlapping report; verify underlying trial and publication linkage');
 return Object.freeze(flags);
}
export function populationSummary(value:ReportedStudyIdentity|null):string{
 if(!value)return 'Historical claim · study identity not extracted';
 return [
  value.registryId??'Registration not recorded',
  value.populationModel.replaceAll('-',' '),
  value.diseaseGroup.replaceAll('-',' '),
  value.ageGroup==='not-reported'?'Age not recorded':value.ageGroup
 ].join(' · ');
}

/** Build conservative source-study clusters from the WHOLE approved dataset.
 * Two approved sources with the same registration OR existing study-family
 * label are linked transitively; aliases never create extra independent
 * validation samples. Filtering subsequently cannot leak a linked article.
 */
export interface IdentityLinkRow {
 readonly claimId:string;
 readonly studyFamilyId:string;
 readonly studyIdentity:ReportedStudyIdentity|null;
}
export interface ResolvedStudyLink {
 readonly key:string;
 readonly registrationKeys:readonly string[];
 readonly identityConflict:boolean;
 readonly linkedPublications:number;
}
export function resolveStudyIdentityLinks(
 rows:readonly IdentityLinkRow[]
):ReadonlyMap<string,ResolvedStudyLink>{
 const ids=new Set<string>();
 const parent=new Map<string,string>();
 const registrations=new Map<string,Set<string>>();
 const labels=new Map<string,Set<string>>();
 const find=(key:string):string=>{
  const p=parent.get(key);
  if(!p){parent.set(key,key);return key;}
  if(p===key)return key;
  const resolved=find(p);parent.set(key,resolved);return resolved;
 };
 const join=(a:string,b:string)=>{
  const l=find(a),r=find(b);
  if(l!==r)parent.set(l<r?r:l,l<r?l:r);
 };
 for(const row of rows){
  if(!row.claimId||ids.has(row.claimId))throw new Error('Duplicate reviewed claim');
  ids.add(row.claimId);
  const label=row.studyFamilyId.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
  if(!label)throw new Error('Unidentified source study-family label');
  const labelNode='label:'+label;
  const sourceNode='claim:'+row.claimId;
  join(sourceNode,labelNode);
  const reg=reportedRegistryKey(row.studyIdentity);
  if(reg)join(sourceNode,reg);
 }
 const grouped=new Map<string,IdentityLinkRow[]>();
 for(const row of rows){
  const root=find('claim:'+row.claimId);
  const current=grouped.get(root)??[];current.push(row);grouped.set(root,current);
 }
 const result=new Map<string,ResolvedStudyLink>();
 for(const group of grouped.values()){
  const regs=[...new Set(group.map(x=>reportedRegistryKey(x.studyIdentity)).filter(
   (x):x is string=>x!==null))].sort();
  const uniqueLabels=[...new Set(group.map(x=>x.studyFamilyId.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase()))].sort();
  const key=regs.length===1?'linked:'+regs[0]:regs.length>1?
   'conflict:'+regs.join('|'):'family:'+uniqueLabels.join('|');
  const info=Object.freeze({
   key,registrationKeys:Object.freeze(regs),
   identityConflict:regs.length>1,linkedPublications:group.length
  });
  for(const row of group)result.set(row.claimId,info);
 }
 return result;
}

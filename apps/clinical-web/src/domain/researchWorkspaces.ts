/** One authoritative description of reachable modern research workspaces.
 * Planned/legacy-only functions must not masquerade as working shortcuts.
 */
export interface ResearchWorkspace {
  readonly id:string;
  readonly name:string;
  readonly path:string;
  readonly description:string;
  readonly keywords:readonly string[];
}
export const researchWorkspaces:readonly ResearchWorkspace[]=Object.freeze([
  {id:'overview',name:'Overview',path:'/workspace',description:'Research entry and available tools',keywords:['home','start']},
  {id:'variants',name:'Variants',path:'/variants',description:'Live CFTR nomenclature, classification and evidence',keywords:['search','hgvs','class','f508del']},
  {id:'evidence',name:'Evidence & Curation',path:'/evidence',description:'Recorded source links and scientific provenance',keywords:['literature','references','pubmed','sources']},
  {id:'genotype',name:'Genotype',path:'/genotype',description:'Exploratory comparison of two recorded variants',keywords:['pair','compare','compound']},
  {id:'intelligence',name:'Intelligence',path:'/intelligence',description:'Live recorded-link coverage and research documentation gaps',keywords:['coverage','gaps','analytics']},
  {id:'geography',name:'Geographic intelligence',path:'/geography',description:'Public Spain-first geographic reference and protected regional research activity',keywords:['map','spain','geography','galicia','regions','regional']}
]);
export interface ResearchShortcut {
  readonly id:string;
  readonly name:string;
  readonly path:string;
  readonly description:string;
  readonly keywords:readonly string[];
}
export const researchShortcuts:readonly ResearchShortcut[]=Object.freeze([
  {id:'class-i',name:'Class I worklist',path:'/variants?class=I',description:'Filter the live variant index by recorded functional class I',keywords:['class one','research','class 1']},
  {id:'staff',name:'Research administration',path:'/admin',description:'Staff identity and permission-readiness workspace',keywords:['staff','sign in','access']}
]);

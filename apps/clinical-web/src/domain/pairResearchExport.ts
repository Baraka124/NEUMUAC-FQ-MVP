import type {RealVariant} from '../services/liveVariants';
import type {LiveEvidenceReference} from '../services/liveEvidence';

/** Read-only research-record comparison. Not a patient genotype or a clinical report. */
export interface PairResearchSnapshot {
 readonly first:RealVariant;
 readonly second:RealVariant;
 /** Both collections must be complete, successfully fetched source reads. */
 readonly firstReferences:readonly LiveEvidenceReference[];
 readonly secondReferences:readonly LiveEvidenceReference[];
}
const canonical=(id:string)=>/^[1-9][0-9]{0,17}$/.test(id);
const text=(input:string|null|undefined)=> (input?.trim()||'Not recorded')
 .replace(/[\r\n\t]+/g,' ').replace(/\\/g,'\\\\').replace(/([\x60*_\[\]<>|#])/g,'\\$1');
const safeUrl=(input:string)=>{try{const u=new URL(input);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port;}catch{return false;}};
function verify(id:string,refs:readonly LiveEvidenceReference[]):boolean{
 if(!canonical(id)||refs.length>200)return false;
 const ids=new Set<number>();
 for(const ref of refs){
  if(!Number.isSafeInteger(ref.id)||ref.id<=0||ids.has(ref.id)||ref.variantId!==id||!safeUrl(ref.url))return false;
  ids.add(ref.id);
 }
 return true;
}
function part(title:string,variant:RealVariant,refs:readonly LiveEvidenceReference[]):string[]{
 const name=variant.legacyName||variant.proteinName||variant.cdnaName||variant.id;
 return [
  '## '+title,
  '- **Record ID:** '+variant.id,
  '- **Recorded name:** '+text(name),
  '- **Protein:** '+text(variant.proteinName),
  '- **cDNA:** '+text(variant.cdnaName),
  '- **Aliases:** '+text(variant.aliases.join(', ')),
  '',
  '### Recorded reference links ('+refs.length+')',
  ...(refs.length? [...refs].sort((a,b)=>a.id-b.id).map((ref,i)=>[
    String(i+1)+'. **'+text(ref.title)+'**',
    '   - Source: '+text(ref.source)+' | Reference ID: '+ref.id,
    '   - Year: '+(ref.year??'Not recorded')+' | PMID: '+text(ref.pmid)+' | DOI: '+text(ref.doi),
    '   - URL: <'+ref.url+'>'
   ].join('\n')):['No linked references returned in the accessible register.']),
  ''
 ];
}
/** Returns null instead of a partial/mislabeled comparison. Caller must also
 * verify both reference requests reached an explicit successful loaded state. */
export function pairResearchMarkdown(snapshot:PairResearchSnapshot):string|null{
 const {first,second,firstReferences,secondReferences}=snapshot;
 if(!verify(first.id,firstReferences)||!verify(second.id,secondReferences))return null;
 return [
  '# neumuacFQ | Two-record research comparison',
  '',
  '**Scope:** Two recorded CFTR research identities, not a patient genotype.',
  '**Sources:** Current accessible neumuacFQ research register; reference links are database-recorded, not independently adjudicated.',
  '',
  ...part('Record A',first,firstReferences),
  ...part('Record B',second,secondReferences),
  ...(first.id===second.id?['**Duplicate selection:** Same research record selected twice; this does not establish homozygosity.','']:[]),
  '## Limitations',
  'The sources and classifications have not been independently verified. Missing catalog links do not establish absence of published evidence.',
  'This comparison does not establish allelic phase, pathogenicity, clinical severity, modulator responsiveness or treatment eligibility.',
  'No patient or genotype information is included.',
  ''
 ].join('\n');
}

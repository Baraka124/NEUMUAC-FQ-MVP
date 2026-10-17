import {createReadOnlyRepository,variantDisplayName,type ReadOnlyConfig,type RealVariant} from './liveVariants';
import {createScientificDossierSource,type ScientificDossier} from './scientificDossier';
import {createLiveEvidenceSource,type LiveEvidenceReference} from './liveEvidence';

interface ResearchBriefSnapshot{
 readonly variant:RealVariant;
 readonly scientific:ScientificDossier;
 readonly references:readonly LiveEvidenceReference[];
}
const field=(value:string|null|undefined):string=>value?.trim()||'Not recorded';

/** Fetch every required source successfully before constructing either export. */
async function readBriefSnapshot(config:ReadOnlyConfig,id:string,transport:typeof fetch,signal?:AbortSignal):Promise<ResearchBriefSnapshot>{
 if(!/^[1-9]\d{0,17}$/.test(id))throw new Error('Invalid variant identifier');
 const variant=await createReadOnlyRepository(config,transport).get(id,signal);
 if(!variant||variant.id!==id)throw new Error('Requested variant record is unavailable');
 const [scientific,references]=await Promise.all([
  createScientificDossierSource(config,transport).get(id,signal),
  createLiveEvidenceSource(config,transport).forVariant(id,signal)
 ]);
 if(signal?.aborted)throw new Error('Research brief retrieval cancelled');
 if(!scientific||scientific.id!==id)throw new Error('Scientific record incomplete or inconsistent');
 // forVariant already checks complete bounds and variant identity; sorting ensures reproducibility.
 return {variant,scientific,references:[...references].sort((a,b)=>a.id-b.id)};
}

/** Existing plain-text copy stays available with its historical wording. */
export async function createVariantResearchBrief(config:ReadOnlyConfig,id:string,transport:typeof fetch=fetch,signal?:AbortSignal):Promise<string>{
 const {variant,scientific,references}=await readBriefSnapshot(config,id,transport,signal);
 return [
  'NEUMUACFQ · CFTR VARIANT RESEARCH BRIEF',
  'Source: live NeumuacFQ research register',
  'Scope: non-clinical scientific record summary',
  '',
  'VARIANT IDENTITY',
  'Database ID: '+variant.id,
  'Recorded name: '+variantDisplayName(variant),
  'Protein: '+field(variant.proteinName),
  'cDNA: '+field(variant.cdnaName),
  'Recorded aliases: '+(variant.aliases.join(', ')||'Not recorded'),
  '',
  'RECORDED SCIENTIFIC METADATA',
  'Functional class: '+field(scientific.functionalClass),
  'Class subtype: '+field(scientific.subtype),
  'Recorded determination: '+field(scientific.recordedDetermination),
  'Class confidence label: '+field(scientific.confidence),
  'Source summary: '+field(scientific.sourceSummary),
  'Data status: '+field(scientific.dataStatus),
  'Recorded validation count: '+(scientific.validationCount??'Not recorded'),
  'Last recorded validation: '+field(scientific.lastValidatedAt),
  'Last evidence update: '+field(scientific.lastEvidenceUpdate),
  '',
  'LINKED RESEARCH REFERENCES ('+references.length+')',
  ...(references.length?references.map((ref,i)=>[
   (i+1)+'. '+ref.title+' | '+ref.source+' | '+ref.url,
   '   Source record ID: '+ref.id+' | DOI: '+field(ref.doi)+' | PMID: '+field(ref.pmid)+' | Journal: '+field(ref.journal)+' | Year: '+(ref.year??'Not recorded')
  ].join('\n')):['No source links returned in the available register.']),
  '',
  'DATA INTERPRETATION',
  'Values are reproduced from existing database fields; classifications, provenance and citations have not been independently adjudicated.',
  'Absence of a linked reference does not establish absence of published evidence.',
  'This brief contains no patient information, clinical recommendation, genotype interpretation or treatment eligibility assessment.'
 ].join('\n');
}
function md(value:string|null|undefined):string{
 return field(value).replace(/\s+/g,' ').replace(/\\/g,'\\\\').replace(/([\`*_\[\]#|<>])/g,'\\$1');
}

/** Markdown is reproducible, portable and explicitly NOT a clinical report or PDF. */
export async function createVariantResearchBriefMarkdown(config:ReadOnlyConfig,id:string,transport:typeof fetch=fetch,signal?:AbortSignal):Promise<string>{
 const {variant,scientific,references}=await readBriefSnapshot(config,id,transport,signal);
 const items=[
  ['Record ID',variant.id],['Recorded name',variantDisplayName(variant)],
  ['Protein notation',field(variant.proteinName)],['cDNA notation',field(variant.cdnaName)],
  ['Aliases',variant.aliases.join(', ')||'Not recorded']
 ];
 const scientificRows=[
  ['Functional class',scientific.functionalClass],['Class subtype',scientific.subtype],
  ['Recorded determination',scientific.recordedDetermination],['Recorded confidence label',scientific.confidence],
  ['Source summary',scientific.sourceSummary],['Data status',scientific.dataStatus],
  ['Recorded validation count',scientific.validationCount===null?'Not recorded':String(scientific.validationCount)],
  ['Last recorded validation',scientific.lastValidatedAt],['Last evidence update',scientific.lastEvidenceUpdate]
 ] as const;
 return [
  '# neumuacFQ | CFTR variant research brief',
  '',
  '**Source:** NeumuacFQ live research register',
  '**Scope:** Read-only recorded data; not a clinical report',
  '',
  '## Variant identity',
  ...items.map(([name,value])=>'- **'+name+':** '+md(value)),
  '',
  '## Recorded scientific metadata',
  ...scientificRows.map(([name,value])=>'- **'+name+':** '+md(value)),
  '',
  '## Linked research references ('+references.length+')',
  ...(references.length?references.map((ref,i)=>[
   (i+1)+'. **'+md(ref.title)+'**',
   '   - Source: '+md(ref.source)+' | Reference record ID: '+ref.id,
   '   - Journal: '+md(ref.journal)+' | Year: '+(ref.year??'Not recorded'),
   '   - DOI: '+md(ref.doi)+' | PMID: '+md(ref.pmid),
   '   - Link: <'+ref.url+'>'
  ].join('\n')):['No source links returned in the accessible register.']),
  '',
  '## Interpretation and limitations',
  'All content above reflects database-recorded information. Labels, scientific classifications, reference metadata and provenance have not been independently adjudicated.',
  'Missing catalog links do not establish an absence of published research.',
  'This is not patient information, genotype interpretation, clinical advice, or evidence of treatment eligibility.',
  ''
 ].join('\n');
}

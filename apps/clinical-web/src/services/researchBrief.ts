import {createReadOnlyRepository,variantDisplayName,type ReadOnlyConfig} from './liveVariants';
import {createScientificDossierSource} from './scientificDossier';
import {createLiveEvidenceSource} from './liveEvidence';

/** Deterministic research-only summary, not clinical decision support. */
export async function createVariantResearchBrief(config:ReadOnlyConfig,id:string,transport:typeof fetch=fetch,signal?:AbortSignal):Promise<string>{
 if(!/^\d{1,18}$/.test(id))throw new Error('Invalid variant identifier');
 const variant=await createReadOnlyRepository(config,transport).get(id,signal);
 if(!variant)throw new Error('No matching variant is accessible');
 const [scientific,evidence]=await Promise.all([
  createScientificDossierSource(config,transport).get(id,signal),
  createLiveEvidenceSource(config,transport).forVariant(id,signal)
 ]);
 if(signal?.aborted)throw new Error('Research brief retrieval cancelled');
 const field=(v:string|null|undefined)=>v||'Not recorded';
 const result=[
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
  'Functional class: '+field(scientific?.functionalClass),
  'Class subtype: '+field(scientific?.subtype),
  'Recorded determination: '+field(scientific?.recordedDetermination),
  'Class confidence label: '+field(scientific?.confidence),
  'Source summary: '+field(scientific?.sourceSummary),
  'Data status: '+field(scientific?.dataStatus),
  'Recorded validation count: '+(scientific?.validationCount??'Not recorded'),
  'Last recorded validation: '+field(scientific?.lastValidatedAt),
  '',
  'LINKED RESEARCH REFERENCES ('+evidence.length+')',
  ...(evidence.length?evidence.map((ref,i)=>(i+1)+'. '+ref.title+' | '+ref.source+' | '+ref.url):['No source links returned in the available register.']),
  '',
  'DATA INTERPRETATION',
  'Values are reproduced from existing database fields; classifications, provenance and citations have not been independently adjudicated.',
  'Absence of a linked reference does not establish absence of published evidence.',
  'This brief contains no patient information, clinical recommendation, genotype interpretation or treatment eligibility assessment.'
 ];
 return result.join('\n');
}

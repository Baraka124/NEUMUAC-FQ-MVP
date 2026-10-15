import {VariantConnectionError} from '../services/liveVariants';

export interface ScientificDiscoveryAssessment {
  readonly blocked:boolean;
  readonly message:string|null;
  readonly sequenceQualified:boolean;
}

/**
 * An input-safety boundary, NOT an HGVS syntax validator or synonym resolver.
 * Allelic phase, uncertainty, predictions and other HGVS operators must not
 * be silently dropped or interpreted as a different recorded identity.
 */
export function assessScientificDiscovery(query:string):ScientificDiscoveryAssessment {
  const raw=query.trim();
  const allowed:ScientificDiscoveryAssessment={blocked:false,message:null,sequenceQualified:false};
  if(!raw)return allowed;
  const block=(message:string):ScientificDiscoveryAssessment=>({blocked:true,message,sequenceQualified:false});
  if(raw.length>303)
    return block('Enter up to four concise recorded variant identifiers.');
  // These constructs can encode cis/trans or other allele-level relationships.
  if(/[\[\]]/.test(raw)||raw.includes('(;)'))
    return block('Allele and phase expressions need separate scientific interpretation. Search each recorded variant individually.');
  // Parentheses, question marks and carets can indicate prediction,
  // unknown locations or alternate consequences; none is synonymous.
  if(/[()?^]/.test(raw))
    return block('Uncertain or predicted HGVS notation cannot be safely interpreted here. Use an exact recorded name or alias.');
  // A wildcard, reference-equivalence operator, mosaicism notation or
  // pipe must not be repurposed as a PostgREST pattern or guessed variant.
  if(/[*=/|]/.test(raw))
    return block('This scientific notation is not supported by recorded-identity search. No equivalent variant has been inferred.');
  const parts=raw.split(/[,;]/).map(x=>x.trim());
  if(parts.length>4||parts.some(x=>!x||x.length>75||
      !/^[a-zA-Z0-9 _.+>:\-]+$/.test(x)||
      /\b(?:id|variant_id)\.(?:eq|gt|lt)\./i.test(x)))
    return block('Enter one to four recorded identifiers separated by commas or semicolons.');
  const sequenceQualified=parts.some(x=>/^[A-Za-z]{1,5}_\d+\.\d+:[gcnrpm]\./i.test(x));
  return {
    blocked:false,sequenceQualified,
    message:sequenceQualified
      ? 'Reference sequence and version are kept exactly as typed; no transcript equivalence is assumed.'
      : null
  };
}

/** Textual multi-variant discovery (OR), not genotype or compound clinical inference. */
export function parseDiscoveryTerms(query:string):readonly string[]{
  const assessment=assessScientificDiscovery(query);
  if(assessment.blocked)
    throw new VariantConnectionError('request-failed',assessment.message||'Unsupported scientific search input.');
  return [...new Set(query.split(/[,;]/).map(x=>x.trim()))];
}
export function buildDiscoveryExpression(terms:readonly string[],exact:boolean):string{
  const clauses:string[]=[];
  for(const term of terms){
    const pattern=exact?term:'*'+term+'*';
    for(const column of exact?['legacy_name','protein_name','cdna_name']:['legacy_name','protein_name','cdna_name','alt_names']){
      clauses.push(column+'.ilike.'+pattern);
    }
  }
  return '('+clauses.join(',')+')';
}

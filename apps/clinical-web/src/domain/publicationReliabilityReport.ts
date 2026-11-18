import type {BenchmarkLedger} from './scientificBenchmarkLedger';
import type {ScientificComparisonStatus} from './scientificBenchmarkComparison';

/** 14H205: publication-level coverage and discrepancy accounting.
 * Every supplied case stays visible. No accuracy/sensitivity/specificity
 * is asserted without a prospectively adjudicated external reference set.
 */
export interface PublicationReliabilityRow {
 readonly caseId:string;
 readonly pmid:string;
 readonly challengeVariants:number;
 readonly reviewComplete:number;
 readonly agreement:number;
 readonly disagreement:number;
 readonly indeterminate:number;
 readonly unresolved:number;
 readonly missing:number;
 readonly incompatible:number;
 readonly externallyValidated:false;
}
export interface PublicationReliabilityReport {
 readonly source:'nfq-reliability-report-14h205';
 readonly bibliographySize:number;
 readonly observedChallenges:number;
 readonly publicationsWithChallenges:number;
 readonly statusCounts:Readonly<Record<ScientificComparisonStatus,number>>;
 readonly publicationRows:readonly PublicationReliabilityRow[];
 readonly accuracy:null;
 readonly sensitivity:null;
 readonly specificity:null;
 readonly clinicalDecisionSupport:false;
}
export function buildPublicationReliabilityReport(ledger:BenchmarkLedger):PublicationReliabilityReport {
 if(ledger.source!=='nfq-scientific-reproducibility-14h203'||
  ledger.scientificAccuracyValidated!==false||ledger.patientCareUse!==false||
  ledger.agreementRate!==null||ledger.includedCases!==ledger.evaluatedCases.length)
  throw new Error('Only unvalidated research benchmark ledgers are accepted');
 const rows=new Map<string,{pmid:string;counts:Record<ScientificComparisonStatus,number>;variants:Set<string>}>();
 const empty=():Record<ScientificComparisonStatus,number>=>({
  'missing-expert-reviews':0,'unresolved-disagreement':0,'missing-source-claim':0,
  'incompatible-evidence':0,'indeterminate':0,'agreement':0,'disagreement':0
 });
 const overall=empty();
 for(const entry of ledger.evaluatedCases){
  if(!Object.hasOwn(overall,entry.status))
   throw new Error('Unexpected scientific benchmark status');
  const row=rows.get(entry.caseId)??{pmid:entry.pmid,counts:empty(),variants:new Set<string>()};
  if(row.pmid!==entry.pmid||row.variants.has(entry.variantId))
   throw new Error('Duplicate case or inconsistent publication identity');
  row.variants.add(entry.variantId);
  ++row.counts[entry.status];
  ++overall[entry.status];
  rows.set(entry.caseId,row);
 }
 for(const key of Object.keys(overall) as ScientificComparisonStatus[]){
  if(ledger.counts[key]!==overall[key])
   throw new Error('Scientific reliability denominator does not match ledger');
 }
 const publicationRows=[...rows.entries()].map(([caseId,row])=>Object.freeze({
  caseId,pmid:row.pmid,challengeVariants:row.variants.size,
  reviewComplete:row.counts.agreement+row.counts.disagreement+row.counts.indeterminate,
  agreement:row.counts.agreement,disagreement:row.counts.disagreement,
  indeterminate:row.counts.indeterminate,unresolved:row.counts['unresolved-disagreement'],
  missing:row.counts['missing-expert-reviews']+row.counts['missing-source-claim'],
  incompatible:row.counts['incompatible-evidence'],
  externallyValidated:false as const
 })).sort((a,b)=>a.pmid.localeCompare(b.pmid)||a.caseId.localeCompare(b.caseId));
 if(publicationRows.reduce((n,r)=>n+r.challengeVariants,0)!==ledger.includedCases||
  rows.size>ledger.bibliographyCount)
  throw new Error('Publication reliability coverage inconsistency');
 return Object.freeze({
  source:'nfq-reliability-report-14h205' as const,
  bibliographySize:ledger.bibliographyCount,
  observedChallenges:ledger.includedCases,
  publicationsWithChallenges:rows.size,
  statusCounts:Object.freeze(overall),
  publicationRows:Object.freeze(publicationRows),
  accuracy:null,sensitivity:null,specificity:null,clinicalDecisionSupport:false as const
 });
}

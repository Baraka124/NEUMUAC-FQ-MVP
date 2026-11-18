import {PUBLISHED_CFTR_REFERENCE_CASES} from './publishedCftrReferenceCases';
import {compareExpertWithPlatform,type ScientificComparison,type ScientificComparisonStatus} from './scientificBenchmarkComparison';
import type {ExpertExtraction,ExpertAdjudication} from './expertBenchmarkAdjudication';
import type {AttestedBenchmarkMapping} from './scientificBenchmarkComparison';
import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {LiveEvidenceReference} from '../services/liveEvidence';

/** 14H203 · Deterministic, read-only real-bibliography challenge ledger.
 * Empty, missing and non-comparable cases remain in the denominator.
 * No accuracy percentage is calculated from unverified reviewer fixtures.
 */
export interface BenchmarkCaseInput {
 readonly caseId:string;
 readonly variantId:string;
 readonly references:readonly LiveEvidenceReference[];
 readonly claims:readonly CuratedSourceClaim[];
 readonly extracts:readonly ExpertExtraction[];
 readonly adjudication?:ExpertAdjudication|null;
 readonly mapping?:AttestedBenchmarkMapping|null;
}
export interface BenchmarkCaseResult {
 readonly caseId:string;
 readonly variantId:string;
 readonly pmid:string;
 readonly status:ScientificComparisonStatus;
 readonly claimId:string|null;
 readonly disagreements:readonly string[];
}
export interface BenchmarkLedger {
 readonly source:'nfq-scientific-reproducibility-14h203';
 readonly bibliographyCount:number;
 readonly includedCases:number;
 readonly evaluatedCases:readonly BenchmarkCaseResult[];
 readonly counts:Readonly<Record<ScientificComparisonStatus,number>>;
 readonly agreementRate:null;
 readonly scientificAccuracyValidated:false;
 readonly patientCareUse:false;
}
const canonical=/^[1-9][0-9]{0,17}$/;
const initial=():Record<ScientificComparisonStatus,number>=>({
 'missing-expert-reviews':0,'unresolved-disagreement':0,'missing-source-claim':0,
 'incompatible-evidence':0,'indeterminate':0,'agreement':0,'disagreement':0
});
export function buildScientificBenchmarkLedger(input:readonly BenchmarkCaseInput[]):BenchmarkLedger {
 if(input.length>100)throw new Error('Scientific benchmark case count exceeds supported limit');
 const keys=new Set<string>();
 const reports:BenchmarkCaseResult[]=[];
 const counts=initial();
 for(const row of input){
  const publication=PUBLISHED_CFTR_REFERENCE_CASES.find(c=>c.id===row.caseId);
  if(!publication||!canonical.test(row.variantId))
   throw new Error('Unknown published case or catalogue variant ID');
  const key=row.caseId+':'+row.variantId;
  if(keys.has(key))throw new Error('Duplicate bibliographic challenge/variant pairing');
  keys.add(key);
  const result:ScientificComparison=compareExpertWithPlatform(row);
  ++counts[result.status];
  reports.push(Object.freeze({
   caseId:row.caseId,variantId:row.variantId,pmid:publication.pmid,
   status:result.status,claimId:result.platformClaimId,
   disagreements:Object.freeze([...result.discrepancies])
  }));
 }
 reports.sort((a,b)=>a.caseId.localeCompare(b.caseId)||a.variantId.localeCompare(b.variantId));
 if(Object.values(counts).reduce((sum,v)=>sum+v,0)!==reports.length)
  throw new Error('Scientific benchmark denominator mismatch');
 return Object.freeze({
  source:'nfq-scientific-reproducibility-14h203' as const,
  bibliographyCount:PUBLISHED_CFTR_REFERENCE_CASES.length,
  includedCases:reports.length,
  evaluatedCases:Object.freeze(reports),counts:Object.freeze(counts),
  agreementRate:null,scientificAccuracyValidated:false as const,patientCareUse:false as const
 });
}

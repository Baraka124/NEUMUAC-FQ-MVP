import type {ResearchHistory} from '../services/liveResearchHistory';

/**
 * Compare non-identifying historical class snapshots from recorded VALIDATED
 * events. This does not compare independent clinicians or adjudicate the
 * current classification. The source interface intentionally excludes names,
 * roles, institutions, notes and other personal information.
 *
 * Original index (85)(1).html preserved snapshot_cftr_class during validation
 * (around lines 19652–19676). Current V6 exposes that one field read-only.
 */
export type RecordedClassSnapshotStatus =
 'no-recorded-validations'|'not-enough-class-snapshots'|
 'same-class-text-recorded'|'different-class-text-recorded';

export interface RecordedClassSnapshotComparison {
 readonly status:RecordedClassSnapshotStatus;
 readonly recordedValidationEvents:number;
 readonly recordedClassSnapshots:number;
 readonly withoutClassSnapshot:number;
 readonly distinctRecordedClasses:readonly string[];
 readonly independentValidatorsEstablished:false;
}
export function compareRecordedClassSnapshots(history:ResearchHistory):RecordedClassSnapshotComparison{
 const validations=history.validations.filter(entry=>
  entry.action.trim().toUpperCase()==='VALIDATED');
 const recorded=validations.map(entry=>entry.recordedClass?.trim()??'').filter(Boolean);
 const distinct=new Map<string,string>();
 for(const value of recorded){
  const normalized=value.toLocaleLowerCase('en');
  if(!distinct.has(normalized))distinct.set(normalized,value);
 }
 const status:RecordedClassSnapshotStatus=validations.length===0?
  'no-recorded-validations':recorded.length<2?
  'not-enough-class-snapshots':distinct.size>1?
  'different-class-text-recorded':'same-class-text-recorded';
 return Object.freeze({
  status,
  recordedValidationEvents:validations.length,
  recordedClassSnapshots:recorded.length,
  withoutClassSnapshot:validations.length-recorded.length,
  distinctRecordedClasses:Object.freeze([...distinct.values()]),
  independentValidatorsEstablished:false as const
 });
}

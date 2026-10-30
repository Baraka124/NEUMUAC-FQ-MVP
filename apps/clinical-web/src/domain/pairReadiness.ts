/** Pair data readiness, separate from the two restored variant identities. */
export type PairReadiness='loading'|'ready'|'error'|'unavailable';
export function pairReadinessText(state:PairReadiness):string{
 switch(state){
  case 'ready':return 'Five-regimen comparison ready';
  case 'loading':return 'Loading five-regimen comparison…';
  case 'error':return 'Therapy comparison failed · Retry in results';
  case 'unavailable':return 'Therapy comparison unavailable for this pair';
 }
}

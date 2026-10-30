/**
 * A deep-linked pair may be read before the staff session is restored.
 * Restore only missing identities after sign-in, never discard a valid
 * selected member or turn an anonymous catalog read into an authenticated one.
 */
export function pendingPairRestoration(
 requested:readonly [string|null,string|null],
 selected:readonly [string|null,string|null],
 phase:string|undefined,
 accessMode:'authenticated'|'anonymous'|undefined
):readonly (0|1)[]{
 if(accessMode!=='authenticated'||phase!=='signed-in')return [];
 return ([0,1] as const).filter(slot=>Boolean(requested[slot]&&requested[slot]!==selected[slot]));
}

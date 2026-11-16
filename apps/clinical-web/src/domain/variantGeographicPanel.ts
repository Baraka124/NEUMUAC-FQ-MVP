import {canonicalGeographyVariantId} from './variantGeographyContext';

/**
 * Controls only whether a variant's protected aggregate may be requested.
 * The database membership check and privacy suppression remain authoritative.
 */
export type VariantActivityGate='closed'|'checking'|'restricted'|'ready';
export function variantActivityGate(
 expanded:boolean,recordId:unknown,authPhase:string|undefined,rolePhase:string|undefined
):VariantActivityGate {
 if(!expanded||!canonicalGeographyVariantId(recordId))return 'closed';
 if(authPhase==='checking'||rolePhase==='checking')return 'checking';
 return authPhase==='signed-in'&&rolePhase==='verified'?'ready':'restricted';
}

import type {RealVariant} from '../services/liveVariants';
/** Search suggestions and URL IDs are not evidence of a retrieved dossier.
 * Only a fresh, independently fetched record matching the requested ID
 * may be rendered as a confirmed scientific canvas record.
 */
export function confirmedDossierRecord(requestedId:unknown,record:RealVariant|null|undefined):RealVariant|null{
 if(typeof requestedId!=='string'||!/^[1-9]\\d{0,17}$/.test(requestedId))return null;
 return record?.id===requestedId?record:null;
}

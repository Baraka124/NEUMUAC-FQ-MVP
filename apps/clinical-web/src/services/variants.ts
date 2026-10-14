import type {VariantPreview} from '../domain/variant';
import {fixtures} from '../fixtures/variants';
/** Deliberately read-only: no auth, database, write operation or production network connection. */
export interface VariantRepository{list():Promise<readonly VariantPreview[]>;get(id:string):Promise<VariantPreview|null>}
export const demoRepository:VariantRepository={async list(){return fixtures;},async get(id){return fixtures.find(x=>x.id===id)??null;}};

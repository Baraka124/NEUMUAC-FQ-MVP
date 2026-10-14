export type ReviewState='unreviewed'|'needs-evidence'|'review-planned';
export interface VariantPreview {readonly id:string;readonly name:string;readonly aliases:readonly string[];readonly evidenceCount:number;readonly reviewState:ReviewState;}
export const normalizeTerm=(x:string)=>x.normalize('NFKC').trim().toLocaleLowerCase('en-US');
export function searchFixtures(rows:readonly VariantPreview[],term:string):readonly VariantPreview[]{const q=normalizeTerm(term);return q?rows.filter(r=>[r.name,...r.aliases].some(x=>normalizeTerm(x).includes(q))):rows;}

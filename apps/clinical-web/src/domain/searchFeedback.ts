/**
 * A presentation-only decision from the current, completed server request.
 * Never deduce absence from stale results, a failed request or an incomplete query.
 * Counts refer only to the current page and are never population statistics.
 */
export type EmptySearchReason='no-match'|'restricted'|'empty-page'|'empty-worklist';
export interface SearchFeedbackInput {
 readonly query:string;
 readonly completed:boolean;
 readonly pending:boolean;
 readonly blocked:boolean;
 readonly error:boolean;
 readonly visibleCount:number;
 readonly restrictiveFilters:boolean;
 readonly page:number;
}
export function emptySearchReason(input:SearchFeedbackInput):EmptySearchReason|null{
 if(!input.completed||input.pending||input.blocked||input.error||input.visibleCount>0)return null;
 if(input.page>0)return 'empty-page';
 if(input.restrictiveFilters)return 'restricted';
 if(input.query.trim())return 'no-match';
 return 'empty-worklist';
}

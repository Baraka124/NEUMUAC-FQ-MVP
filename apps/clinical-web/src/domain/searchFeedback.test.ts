import {it,expect} from 'vitest';
import {emptySearchReason,type SearchFeedbackInput} from './searchFeedback';
const base:SearchFeedbackInput={query:'1001+11C/T',completed:true,pending:false,blocked:false,error:false,visibleCount:0,restrictiveFilters:false,page:0};
it('only reports absence after a successful completed request',()=>{
 for(const change of [{completed:false},{pending:true},{blocked:true},{error:true},{visibleCount:2}]){
  expect(emptySearchReason({...base,...change})).toBeNull();
 }
 expect(emptySearchReason(base)).toBe('no-match');
});
it('distinguishes restrictive filters, page boundaries and an empty source',()=>{
 expect(emptySearchReason({...base,restrictiveFilters:true})).toBe('restricted');
 expect(emptySearchReason({...base,page:2})).toBe('empty-page');
 expect(emptySearchReason({...base,query:''})).toBe('empty-worklist');
});

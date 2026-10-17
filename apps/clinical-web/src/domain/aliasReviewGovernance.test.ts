import {it,expect} from 'vitest';
import {assessAliasReviewTransition,verifyAliasReviewSequence,type AliasReviewEvent} from './aliasReviewGovernance';
import type {AliasReviewRecord} from './aliasReviewContract';
const proposed:AliasReviewRecord={variantId:'18',alias:'DF508',sourceUri:'https://example.org/record/18',sourceLabel:'Source record',submittedBy:'submitter',submittedAt:'2026-10-18T00:00:00Z',state:'proposed'};
const reviewer={id:'reviewer',mayReview:true,maySubmit:false};
it('prevents self approval, unauthorized review and premature decisions',()=>{
 expect(assessAliasReviewTransition(proposed,reviewer,'approve','2026-10-18T10:00:00Z','Reviewed').permitted).toBe(false);
 expect(assessAliasReviewTransition(proposed,{id:'submitter',mayReview:true,maySubmit:true},'begin-review','2026-10-18T10:00:00Z','Investigate').permitted).toBe(true);
 const reviewing={...proposed,state:'under-review' as const};
 expect(assessAliasReviewTransition(reviewing,{id:'submitter',mayReview:true,maySubmit:true},'approve','2026-10-18T11:00:00Z','Accept').permitted).toBe(false);
 expect(assessAliasReviewTransition(reviewing,{id:'guest',mayReview:false,maySubmit:true},'approve','2026-10-18T11:00:00Z','Accept').permitted).toBe(false);
});
it('records connected review events but rejects gaps and invalid chronology',()=>{
 const first=assessAliasReviewTransition(proposed,reviewer,'begin-review','2026-10-18T10:00:00Z','Check source').event!;
 const second=assessAliasReviewTransition({...proposed,state:'under-review'},reviewer,'approve','2026-10-18T11:00:00Z','Verified decision').event!;
 expect(verifyAliasReviewSequence([first,second])).toBe(true);
 expect(verifyAliasReviewSequence([second])).toBe(false);
 expect(verifyAliasReviewSequence([first,{...second,at:'2026-10-18T09:00:00Z'}])).toBe(false);
 expect(verifyAliasReviewSequence([first,{...second,proposalId:'another'}])).toBe(false);
});

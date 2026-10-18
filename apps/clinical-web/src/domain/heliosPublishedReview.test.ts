import {it,expect} from 'vitest';
import {decodePublishedReview} from './heliosPublishedReview';
it('decodes only narrow published scientific review fields',()=>{
 const input={reviewId:'19',variantId:'42',recordedValue:'recorded value',proposedValue:null,evidenceSummary:null,uncertaintyNote:'Uncertainty retained',sourceReferences:['https://example.org/evidence'],reviewerEmail:'private@example.org',claimedBy:'private'};
 const output=decodePublishedReview(input);
 expect(output.reviewId).toBe('19');
 expect(output).not.toHaveProperty('reviewerEmail');
 expect(output).not.toHaveProperty('claimedBy');
 expect(output.sourceReferences).toEqual(['https://example.org/evidence']);
});
it('rejects malformed identifiers and references',()=>{
 expect(()=>decodePublishedReview({reviewId:'NaN',variantId:'2',sourceReferences:[]})).toThrow();
 expect(()=>decodePublishedReview({reviewId:'2',variantId:'3',sourceReferences:['http://example.org']})).toThrow();
 expect(()=>decodePublishedReview({reviewId:'2',variantId:'3',sourceReferences:Array(21).fill('https://example.org')})).toThrow();
});
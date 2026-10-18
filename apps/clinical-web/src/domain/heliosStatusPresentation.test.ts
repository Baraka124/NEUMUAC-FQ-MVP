import {expect,it} from 'vitest';
import {describeHeliosReadState} from './heliosStatusPresentation';
it('does not confuse missing connections with unauthorized access',()=>{
 expect(describeHeliosReadState({kind:'not-connected'}).label).toBe('Not connected');
 expect(describeHeliosReadState({kind:'access-denied'}).label).toBe('Unavailable');
 expect(describeHeliosReadState({kind:'empty'}).label).toBe('No review records');
});
it('only shows record readiness for a valid published result',()=>{
 expect(describeHeliosReadState({kind:'not-connected'}).canDisplayRecords).toBe(false);
 expect(describeHeliosReadState({kind:'access-denied'}).canDisplayRecords).toBe(false);
 expect(describeHeliosReadState({kind:'ready',records:[]}).canDisplayRecords).toBe(true);
});

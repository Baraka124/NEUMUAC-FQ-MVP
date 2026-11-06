import {describe,it,expect,vi} from 'vitest';
import {parseProfessionalProfile,createProfessionalProfileClient} from './professionalProfile';
const uid='2b921eaf-983e-411c-93dc-cccbb4e6fa93';
const row={display_name:'Baraka Laiza',staff_type:'biomedical_engineer',department:'Department of Pulmonology',research_group:'neumACt',research_line:null,source_verified_at:'2026-11-06T20:00:00Z'};
const config={endpoint:'https://example.supabase.co',publishableKey:'test-publishable',enabled:true};
function session(){return {state:{phase:'signed-in',userId:uid},getAccessToken:vi.fn(async()=> 'jwt-token')};}
describe('FQ-only professional profile',()=>{
 it('parses verified minimal staff profile without fabricating research-line membership',()=>{
  expect(parseProfessionalProfile([row])).toEqual({name:'Baraka Laiza',staffType:'biomedical_engineer',department:'Department of Pulmonology',researchGroup:'neumACt',researchLine:null,sourceVerifiedAt:'2026-11-06T20:00:00Z'});
  expect(parseProfessionalProfile([])).toBeNull();
  expect(()=>parseProfessionalProfile([{...row,display_name:''}])).toThrow();
  expect(()=>parseProfessionalProfile([row,row])).toThrow();
 });
 it('reads only the current account using a bearer token and no neumDESK endpoint',async()=>{
  const fetcher=vi.fn(async()=>new Response(JSON.stringify([row]),{status:200}));
  const profile=await createProfessionalProfileClient(config,session() as any,fetcher as any).readOwn();
  expect(profile?.name).toBe('Baraka Laiza');
  const [url,opts]=fetcher.mock.calls[0] as any;
  expect(url).toContain('/rest/v1/nfq_professional_profiles');
  expect(url).toContain('user_id=eq.');
  expect(opts.method).toBe('GET');
  expect(opts.headers.Authorization).toBe('Bearer jwt-token');
  expect(url).not.toContain('vssmguzuvekkecbmwcjw');
 });
 it('rejects account switching and server denial',async()=>{
  const s=session();
  const f=vi.fn();
  s.getAccessToken.mockImplementation(async()=>{s.state.userId='11111111-1111-4111-8111-111111111111';return 'jwt';});
  await expect(createProfessionalProfileClient(config,s as any,f as any).readOwn()).rejects.toThrow(/Session changed/);
  expect(f).not.toHaveBeenCalled();
  const denied=vi.fn(async()=>new Response(null,{status:403}));
  await expect(createProfessionalProfileClient(config,session() as any,denied as any).readOwn()).rejects.toThrow(/unavailable/);
 });
});

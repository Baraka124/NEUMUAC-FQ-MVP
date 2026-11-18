import {describe,it,expect,vi} from 'vitest';
import {createExpertRegistryService} from './expertRegistryService';
import type {ReadOnlyConfig,ReadSessionProvider} from './liveVariants';

const config:ReadOnlyConfig={
 endpoint:'https://research-example.supabase.co',publishableKey:'research-publishable',
 enabled:true,accessMode:'authenticated'
};
const jwt='eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.c2lnbmF0dXJl';
const caseId='phe508del-mf-eti-2019',variantId='18';
describe('14H200 expert registry authenticated HTTP boundary',()=>{
 it('rejects anonymous research submissions before transport',async()=>{
  const transport=vi.fn();
  const session:ReadSessionProvider={getAccessToken:async()=>null};
  const service=createExpertRegistryService(config,session,transport as unknown as typeof fetch);
  await expect(service.list(caseId,variantId)).rejects.toMatchObject({
   code:'authentication-required'
  });
  expect(transport).not.toHaveBeenCalled();
 });
 it('rejects publishable key reused as bearer authorization',async()=>{
  const session:ReadSessionProvider={getAccessToken:async()=>config.publishableKey};
  const service=createExpertRegistryService(config,session,vi.fn() as unknown as typeof fetch);
  await expect(service.list(caseId,variantId)).rejects.toMatchObject({code:'authentication-required'});
 });
 it('sends only authenticated RPC requests without browser cookies',async()=>{
  const response={
   source:'nfq-authenticated-expert-registry-v1',caseId,variantId,
   extracts:[],adjudication:null,mapping:null,audit:[]
  };
  const transport=vi.fn().mockResolvedValue(new Response(JSON.stringify(response),{
   status:200,headers:{'content-type':'application/json'}
  }));
  const session:ReadSessionProvider={getAccessToken:async()=>jwt};
  const service=createExpertRegistryService(config,session,transport as unknown as typeof fetch);
  expect((await service.list(caseId,variantId)).extracts).toHaveLength(0);
  const [url,options]=transport.mock.calls[0]!;
  expect(url).toContain('/rest/v1/rpc/nfq_expert_reference_registry');
  expect(options.credentials).toBe('omit');
  expect(options.headers.Authorization).toBe('Bearer '+jwt);
 });
 it('refuses unauthorized results and misidentified source envelopes',async()=>{
  const session:ReadSessionProvider={getAccessToken:async()=>jwt};
  const denied=vi.fn().mockResolvedValue(new Response('{}',{status:403}));
  await expect(createExpertRegistryService(config,session,denied as unknown as typeof fetch)
   .list(caseId,variantId)).rejects.toMatchObject({code:'access-denied'});
  const wrong=vi.fn().mockResolvedValue(new Response(JSON.stringify({
   source:'untrusted',caseId,variantId,extracts:[],adjudication:null,mapping:null,audit:[]
  }),{status:200}));
  await expect(createExpertRegistryService(config,session,wrong as unknown as typeof fetch)
   .list(caseId,variantId)).rejects.toMatchObject({code:'schema-mismatch'});
 });
});

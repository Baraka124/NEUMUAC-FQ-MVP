import {describe,it,expect,vi} from 'vitest';
import {createScientificDossierSource} from './scientificDossier';
const config={endpoint:'https://example.supabase.co',publishableKey:'sb_publishable_testing_only',enabled:true,accessMode:'anonymous' as const};
describe('real scientific dossier',()=>{
 it('reads only scientific metadata and never requests names or notes',async()=>{
 const request=vi.fn(async()=>new Response(JSON.stringify([{id:18,cftr_class:'II',class_subtype:'standard',class_confidence:'high',final_determination:'CF-causing',source_summary:'CFTR2_2026',data_status:'complete_clinical',validation_count:2,last_validated_at:null,last_evidence_update:null}]),{status:200}));
 const dossier=await createScientificDossierSource(config,request as typeof fetch).get('18');
 expect(dossier?.functionalClass).toBe('II');expect(dossier?.validationCount).toBe(2);
 const [url,options]=request.mock.calls[0] as unknown as [string,RequestInit];
 expect(url).toContain('/rest/v1/variants?');expect(url).not.toContain('clinician_note');expect(url).not.toContain('last_validator_name');expect(options.method).toBe('GET');
 });
 it('rejects unsupported IDs before a network request',async()=>{const f=vi.fn();expect(await createScientificDossierSource(config,f as typeof fetch).get('1;DELETE')).toBeNull();expect(f).not.toHaveBeenCalled();});
});

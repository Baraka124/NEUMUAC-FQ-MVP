import {describe,it,expect,vi} from 'vitest';
import {createDrugReferenceSource,decodeRegulatoryRecord,decodeSafetyRecord} from './drugReferenceSource';
const cfg={endpoint:'https://example.supabase.co',publishableKey:'sb_publishable_example',enabled:true,accessMode:'anonymous' as const};
const rule=(id:number,drug_name:string)=>({id,drug_name,jurisdiction:'EU',regulator:'EMA',approval_date:null,eligible_rule:'Recorded research rule',is_active:true});
const alert=(id:number,drug_name:string)=>({id,drug_name,title:'Recorded safety notice',severity:'SERIOUS',jurisdiction:'EU',source_label:'Original register',is_active:true});
describe('14H16 preserved drug reference and source provenance',()=>{
 it('recognizes four stored EU regimens, without claiming Orkambi is in the rule table',()=>{
  expect(decodeRegulatoryRecord(rule(1,'Kaftrio (ETI)')).therapy).toBe('ETI');
  expect(decodeRegulatoryRecord(rule(2,'Alyftrek (VTD)')).therapy).toBe('ALYFTREK');
  expect(decodeRegulatoryRecord(rule(3,'Kalydeco (IVA)')).therapy).toBe('IVACAFTOR');
  expect(decodeRegulatoryRecord(rule(4,'Symkevi (TEZ/IVA)')).therapy).toBe('TEZACAFTOR_IVACAFTOR');
 });
 it('does not misattribute interacting drugs to a regimen',()=>{
  expect(decodeSafetyRecord(alert(1,'Alyftrek')).therapy).toBe('ALYFTREK');
  expect(decodeSafetyRecord(alert(2,'posaconazol')).therapy).toBeNull();
 });
 it('rejects inactive, malformed and unknown regulatory records',()=>{
  expect(()=>decodeRegulatoryRecord({...rule(1,'Alyftrek (VTD)'),is_active:false})).toThrow();
  expect(()=>decodeRegulatoryRecord(rule(2,'unmapped therapy'))).toThrow();
  expect(()=>decodeRegulatoryRecord({...rule(1,'Kaftrio (ETI)'),approval_date:'today'})).toThrow();
 });
 it('GETs narrow active register pages and reports cross-drug metadata faithfully',async()=>{
  const calls:string[]=[];
  const fetcher=vi.fn(async(u:string,opts:RequestInit)=>{
   expect(opts.method).toBe('GET');expect(opts.credentials).toBe('omit');
   calls.push(u);
   return new Response(JSON.stringify(u.includes('drug_jurisdiction_rules')?
    [rule(1,'Kaftrio (ETI)'),rule(2,'Alyftrek (VTD)'),rule(3,'Kalydeco (IVA)'),rule(4,'Symkevi (TEZ/IVA)')]:
    [alert(1,'Alyftrek'),alert(2,'posaconazol')]),{status:200});
  });
  const x=await createDrugReferenceSource(cfg,fetcher as typeof fetch).list();
  expect(x.rules).toHaveLength(4);
  expect(x.alerts).toHaveLength(2);
  expect(x.otherMedicationAlerts).toBe(1);
  for(const url of calls){const p=new URL(url);expect(p.searchParams.get('is_active')).toBe('eq.true');expect(p.searchParams.get('limit')).toBe('100');}
 });
 it('does not imply availability on authorization errors or truncated result pages',async()=>{
  const denied=vi.fn(async()=>new Response('[]',{status:403}));
  await expect(createDrugReferenceSource(cfg,denied as typeof fetch).list()).rejects.toMatchObject({code:'access-denied'});
  const tooMany=vi.fn(async()=>new Response(JSON.stringify(Array(100).fill(rule(1,'Kaftrio (ETI)'))),{status:200}));
  await expect(createDrugReferenceSource(cfg,tooMany as typeof fetch).list()).rejects.toMatchObject({code:'schema-mismatch'});
 });
});

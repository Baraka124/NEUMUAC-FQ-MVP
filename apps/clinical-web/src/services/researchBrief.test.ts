import {it,expect,vi} from 'vitest';
import {createVariantResearchBrief,createVariantResearchBriefMarkdown} from './researchBrief';
const cfg={endpoint:'https://test.supabase.co',publishableKey:'sb_publishable_testonly',enabled:true,readTable:'variants' as const,accessMode:'anonymous' as const};
it('builds a reproducible research summary from source fields, not invented findings',async()=>{
 const transport=vi.fn(async(url:string)=>{
  const p=new URL(url).pathname;
  let value:unknown=[];
  if(p.endsWith('/variants')){
   const selected=new URL(url).searchParams.get('select')||'';
   value=selected.includes('final_determination')
    ?[{id:18,cftr_class:'II',class_subtype:'standard',final_determination:'CF-causing',class_confidence:'high',source_summary:'CFTR2_2026',data_status:'partial_clinical',validation_count:2}]
    :[{id:18,legacy_name:'F508del',protein_name:'p.Phe508del',cdna_name:'c.1521_1523delCTT',alt_names:'DF508'}];
  }else if(p.endsWith('/evidence_links'))value=[{id:1,variant_id:18,title:'Published reference',url:'https://doi.org/10.1234/test',source:'DOI',type:'paper',category:null,journal:null,year:null,pmid:null,doi:null}];
  return new Response(JSON.stringify(value),{status:200});
 });
 const text=await createVariantResearchBrief(cfg,'18',transport as typeof fetch);
 expect(text).toContain('F508del');expect(text).toContain('Class confidence label: high');
 expect(text).toContain('https://doi.org/10.1234/test');
 expect(text).not.toContain('clinician_note');expect(text).toContain('have not been independently adjudicated');
 expect(transport).toHaveBeenCalledTimes(3);
});
it('never outputs incomplete summaries on source failure',async()=>{
 const transport=vi.fn(async()=>new Response('{}',{status:500}));
 await expect(createVariantResearchBrief(cfg,'18',transport as typeof fetch)).rejects.toThrow();
});

it('produces deterministic Markdown with source record IDs, citation metadata and escaped database text',async()=>{
 const reference=(id:number,title:string)=>({id,variant_id:18,title,url:'https://doi.org/10.1234/test',source:'DOI',journal:'Journal of research',year:2024,pmid:'12345',doi:'10.1234/test',type:'paper',category:null});
 const transport=vi.fn(async(url:string)=>{
  const u=new URL(url),isScientific=(u.searchParams.get('select')||'').includes('final_determination');
  if(u.pathname.endsWith('/evidence_links'))return new Response(JSON.stringify([
   reference(19,'Second study'),reference(5,'First *study* [draft]')
  ]),{status:200});
  return new Response(JSON.stringify(isScientific
   ?[{id:18,cftr_class:'II',final_determination:'Recorded only',validation_count:2,last_evidence_update:'2026-10-15'}]
   :[{id:18,legacy_name:'F508del',protein_name:'p.Phe508del',cdna_name:'c.1521_1523delCTT',alt_names:'DF508'}]),{status:200});
 });
 const brief=await createVariantResearchBriefMarkdown(cfg,'18',transport as typeof fetch);
 const again=await createVariantResearchBriefMarkdown(cfg,'18',transport as typeof fetch);
 expect(again).toBe(brief);
 expect(brief).toContain('Reference record ID: 5');
 expect(brief).toContain('DOI: 10.1234/test | PMID: 12345');
 expect(brief).toContain('Last evidence update:** 2026-10-15');
 expect(brief).toContain('First \\*study\\* \\[draft\\]');
 expect(brief.indexOf('First \\*study')).toBeLessThan(brief.indexOf('Second study'));
 expect(brief).toContain('not a clinical report');
 expect(transport).toHaveBeenCalledTimes(6);
});
it('does not create a complete-looking report if scientific details are missing or from another record',async()=>{
 const transport=vi.fn(async(url:string)=>{
  const u=new URL(url),scientific=(u.searchParams.get('select')||'').includes('final_determination');
  const body=u.pathname.endsWith('/evidence_links')?[]
   :scientific?[]
   :[{id:18,legacy_name:'F508del',protein_name:'p.Phe508del',cdna_name:'c.1521_1523delCTT',alt_names:null}];
  return new Response(JSON.stringify(body),{status:200});
 });
 await expect(createVariantResearchBriefMarkdown(cfg,'18',transport as typeof fetch)).rejects.toThrow('Scientific record incomplete');
 await expect(createVariantResearchBrief(cfg,'18',transport as typeof fetch)).rejects.toThrow('Scientific record incomplete');
 const wrong=vi.fn(async(url:string)=>{
  const u=new URL(url),scientific=(u.searchParams.get('select')||'').includes('final_determination');
  return new Response(JSON.stringify(u.pathname.endsWith('/evidence_links')?[]
   :scientific?[{id:19,cftr_class:'I'}]
   :[{id:18,legacy_name:'F508del',protein_name:null,cdna_name:null,alt_names:null}]),{status:200});
 });
 await expect(createVariantResearchBriefMarkdown(cfg,'18',wrong as typeof fetch)).rejects.toThrow('Scientific record incomplete');
 await expect(createVariantResearchBriefMarkdown(cfg,'0',transport as typeof fetch)).rejects.toThrow('Invalid variant identifier');
});
it('never exports an incomplete research brief when reference retrieval fails',async()=>{
 const transport=vi.fn(async(url:string)=>{
  const u=new URL(url);
  if(u.pathname.endsWith('/evidence_links'))return new Response('{}',{status:500});
  const scientific=(u.searchParams.get('select')||'').includes('final_determination');
  return new Response(JSON.stringify(scientific?[{id:18,cftr_class:'II'}]:[{id:18,legacy_name:'F508del',protein_name:null,cdna_name:null,alt_names:null}]),{status:200});
 });
 await expect(createVariantResearchBriefMarkdown(cfg,'18',transport as typeof fetch)).rejects.toThrow();
});

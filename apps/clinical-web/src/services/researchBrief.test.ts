import {it,expect,vi} from 'vitest';
import {createVariantResearchBrief} from './researchBrief';
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

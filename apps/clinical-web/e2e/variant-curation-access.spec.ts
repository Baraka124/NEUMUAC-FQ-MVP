import {test,expect} from '@playwright/test';
test('14H122 public dossier shows sign-in guidance instead of a silent missing editor',async({page})=>{
 await page.route('https://example.supabase.co/**',route=>{
  const url=new URL(route.request().url());
  const data=url.pathname.endsWith('/variants')
   ? [{id:1,legacy_name:'E831X',protein_name:'p.Glu831X',cdna_name:'c.2491G>T',alt_names:null,cftr_class:'I',validation_count:1}]
   : [];
  return route.fulfill({status:200,contentType:'application/json',
   headers:{'access-control-allow-origin':'*'},body:JSON.stringify(data)});
 });
 await page.goto('/#/variants/1');
 await expect(page.getByRole('heading',{name:'E831X'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Curate variant'})).toHaveCount(0);
 await expect(page.getByTestId('variant-curation-access').getByRole('link',{name:'Sign in'})).toBeVisible();
});

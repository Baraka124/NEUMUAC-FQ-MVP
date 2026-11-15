import {describe,it,expect} from 'vitest';
import type {RealVariant,RealVariantSource} from '../services/liveVariants';
import {readSavedResearchSnapshot,savedResearchSnapshotCsv} from './savedResearchSnapshot';

const URL='https://fq.neumact.org/?query=do-not-export#/variants/1';
const record:RealVariant={
 id:'1',legacyName:'E831X',proteinName:'p.Glu831Ter',cdnaName:null,
 aliases:[],recordedClass:'I',classSubtype:'exceptional',
 etiPrediction:'responsive',alyftrekPrediction:'unknown',validationCount:3
};
const other:RealVariant={...record,id:'18',legacyName:'=HYPERLINK("untrusted")',
 proteinName:'p.Arg117His',recordedClass:'IV',classSubtype:'atypical',
 etiPrediction:'non_responsive',alyftrekPrediction:null,validationCount:0};
const source=(get:RealVariantSource['get']):Pick<RealVariantSource,'get'>=>({get});

describe('14H152 live saved worklist research snapshot',()=>{
 it('independently fetches each canonical ID and exports only source-returned fields, preserving order',async()=>{
  const requests:string[]=[],progress:number[]=[];
  const rows=await readSavedResearchSnapshot(source(async id=>{
   requests.push(id);return id==='1'?record:id==='18'?other:null;
  }),['18','1'],URL,new AbortController().signal,(n)=>progress.push(n));
  expect(requests).toEqual(['18','1']);
  expect(progress).toEqual([1,2]);
  expect(rows.map(x=>x.id)).toEqual(['18','1']);
  expect(rows[1].recordedClass).toBe('I');
  expect(rows[1].recordedEti).toBe('responsive');
  expect(rows[0].recordedAlyftrek).toBeNull();
  const csv=savedResearchSnapshotCsv(rows,'2026-11-15T13:00:00.000Z')!;
  expect(csv).toContain('recorded_alyftrek');
  expect(csv).toContain('"responsive"');
  expect(csv).toContain('"non_responsive"');
  expect(csv).toContain("'=HYPERLINK");
  expect(csv).toContain('https://fq.neumact.org/#/variants/18');
  expect(csv).not.toContain('do-not-export');
  expect(csv).not.toContain('patient');
 });
 it('refuses stale, missing, malformed and mismatched records rather than exporting incomplete snapshots',async()=>{
  for(const invalid of ['0','01','1234567890123456789','=2+2']){
   let calls=0;
   await expect(readSavedResearchSnapshot(source(async()=>{calls++;return record;}),[invalid],URL,
    new AbortController().signal)).rejects.toThrow();
   expect(calls).toBe(0);
  }
  await expect(readSavedResearchSnapshot(source(async()=>record),['1','1'],URL,
   new AbortController().signal)).rejects.toThrow();
  await expect(readSavedResearchSnapshot(source(async()=>record),Array.from({length:41},(_,i)=>String(i+1)),
   URL,new AbortController().signal)).rejects.toThrow();
  await expect(readSavedResearchSnapshot(source(async()=>null),['1'],URL,
   new AbortController().signal)).rejects.toThrow();
  await expect(readSavedResearchSnapshot(source(async()=>other),['1'],URL,
   new AbortController().signal)).rejects.toThrow();
  await expect(readSavedResearchSnapshot(source(async()=>({...record,legacyName:null,proteinName:null,cdnaName:null})),
   ['1'],URL,new AbortController().signal)).rejects.toThrow();
  await expect(readSavedResearchSnapshot(source(async()=>({...record,etiPrediction:'fabricated'} as unknown as RealVariant)),
   ['1'],URL,new AbortController().signal)).rejects.toThrow();
  await expect(readSavedResearchSnapshot(source(async()=>record),['1'],'file:///private',
   new AbortController().signal)).rejects.toThrow();
 });
 it('caps simultaneous source requests at three and declines cancellation without publishing rows',async()=>{
  let active=0,peak=0;
  const rows=await readSavedResearchSnapshot(source(async id=>{
   active++;peak=Math.max(peak,active);
   await new Promise(resolve=>setTimeout(resolve,1));
   active--;return {...record,id};
  }),Array.from({length:17},(_,i)=>String(i+1)),URL,new AbortController().signal);
  expect(rows).toHaveLength(17);
  expect(peak).toBeLessThanOrEqual(3);
  const cancelled=new AbortController();cancelled.abort();
  let network=0;
  await expect(readSavedResearchSnapshot(source(async()=>{network++;return record}),['1'],URL,
   cancelled.signal)).rejects.toThrow();
  expect(network).toBe(0);
 });
 it('rejects malformed exports and neutralizes spreadsheet formulas without recording search context',async()=>{
  expect(savedResearchSnapshotCsv([],'2026-11-15T13:00:00Z')).toBeNull();
  expect(savedResearchSnapshotCsv([{id:'01',recordUrl:'https://fq.neumact.org',legacyName:'x',
   proteinName:null,cdnaName:null,recordedClass:null,classSubtype:null,
   recordedEti:null,recordedAlyftrek:null,validationCount:null}],'2026-11-15T13:00:00Z')).toBeNull();
  const rows=await readSavedResearchSnapshot(source(async()=>other),['18'],URL,new AbortController().signal);
  const csv=savedResearchSnapshotCsv(rows,'2026-11-15T13:00:00Z')!;
  expect(csv).toContain('"'+ "'=HYPERLINK" +'');
  expect(csv).not.toContain('?query=');
 });
});

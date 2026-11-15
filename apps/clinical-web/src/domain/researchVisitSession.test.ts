import {describe,it,expect} from 'vitest';
import type {RealVariant} from '../services/liveVariants';
import {createResearchVisitSession,RESEARCH_SESSION_IDLE_MS,MAX_SESSION_VARIANTS} from './researchVisitSession';
const USER='11111111-1111-4111-8111-111111111111';
const OTHER='22222222-2222-4222-8222-222222222222';
const variant:RealVariant={
 id:'18',legacyName:'R117H',proteinName:'p.Arg117His',cdnaName:null,
 aliases:['R117H'],recordedClass:'IV',classSubtype:'atypical',
 etiPrediction:'unknown',alyftrekPrediction:'responsive',validationCount:3
};
describe('original-workflow parity · explicit clinician local session',()=>{
 it('never collects before opt-in or for an unverified actor; records only confirmed dossier visits',()=>{
  let now=Date.parse('2026-11-15T12:00:00Z');
  const s=createResearchVisitSession(()=>now);
  expect(s.visit(USER,variant)).toBe(false);
  expect(s.start('not-a-uuid')).toBe(false);
  expect(s.start(USER)).toBe(true);
  expect(s.visit(OTHER,variant)).toBe(false);
  expect(s.visit(USER,{...variant,id:'0'})).toBe(false);
  expect(s.visit(USER,variant)).toBe(true);
  now+=3500;s.activity();expect(s.visit(USER,variant)).toBe(true);
  expect(s.state.visits).toHaveLength(1);
  expect(s.state.totalOpens).toBe(2);
  expect(s.state.visits[0].views).toBe(2);
  expect(s.state.visits[0].name).toBe('R117H');
  expect(s.state.visits[0].recordedClass).toBe('IV');
  expect(s.state.visits[0].alyftrek).toBe('responsive');
  expect(s.state.visits[0].firstViewedAt).toBe('2026-11-15T12:00:00.000Z');
  expect(s.state.visits[0].lastViewedAt).toBe('2026-11-15T12:00:03.500Z');
  const csv=s.exportCsv()!;
  expect(csv).toContain('recorded_eti');
  expect(csv).toContain('/#/variants/18');
  expect(csv).toContain('Private local working session');
  expect(csv).not.toContain(USER);
 });
 it('auto-pauses idle/hidden and does not silently resume when user interacts',()=>{
  let now=Date.parse('2026-11-15T12:00:00Z');
  const s=createResearchVisitSession(()=>now);
  s.start(USER);s.visit(USER,variant);
  now+=RESEARCH_SESSION_IDLE_MS+1;
  expect(s.visit(USER,variant)).toBe(false);
  expect(s.state.phase).toBe('paused');
  expect(s.state.pauseReason).toBe('idle');
  s.activity();expect(s.state.phase).toBe('paused');
  expect(s.resume(OTHER)).toBe(false);
  expect(s.resume(USER,false)).toBe(false);
  expect(s.resume(USER)).toBe(true);
  expect(s.visit(USER,variant,false)).toBe(false);
  expect(s.state.pauseReason).toBe('hidden');
  expect(s.visit(USER,variant)).toBe(false);
  expect(s.resume(USER)).toBe(true);
  expect(s.visit(USER,variant)).toBe(true);
 });
 it('manual pause, end and sign-out stop recording; identity changes erase all retained data',()=>{
  let now=Date.parse('2026-11-15T12:00:00Z');
  const s=createResearchVisitSession(()=>now);
  s.start(USER);s.visit(USER,variant);
  s.pause('manual');expect(s.visit(USER,variant)).toBe(false);
  expect(s.resume(USER)).toBe(true);
  now+=1000;
  expect(s.end()).toBe(true);
  expect(s.visit(USER,variant)).toBe(false);
  expect(s.exportCsv()).toContain('2026-11-15T12:00:01.000Z');
  s.reconcile('signed-in',OTHER);
  expect(s.state.phase).toBe('off');
  expect(s.state.visits).toHaveLength(0);
  expect(s.exportCsv()).toBeNull();
  s.start(USER);s.visit(USER,variant);
  s.reconcile('signed-out',null);
  expect(s.state.visits).toHaveLength(0);
  expect(s.state.phase).toBe('off');
 });
 it('only retains the latest 100 unique research records and protects CSV formula content',()=>{
  let now=Date.parse('2026-11-15T12:00:00Z');
  const s=createResearchVisitSession(()=>now);
  s.start(USER);
  for(let id=1;id<=MAX_SESSION_VARIANTS+2;id++){
   s.visit(USER,{...variant,id:String(id),legacyName:id===1?'=HYPERLINK("bad")':'R'+id});
  }
  expect(s.state.visits).toHaveLength(MAX_SESSION_VARIANTS);
  expect(s.state.visits[0].id).toBe('102');
  expect(s.state.visits.at(-1)?.id).toBe('3');
  expect(s.exportCsv()).not.toContain('=HYPERLINK');
  s.visit(USER,{...variant,id:'1',legacyName:'=HYPERLINK("bad")'});
  expect(s.state.visits[0].name).toContain('=HYPERLINK');
  expect(s.exportCsv()).toContain("'=HYPERLINK");
 });
 it('cannot start while hidden and a cleared session cannot export retained data',()=>{
  const s=createResearchVisitSession(()=>Date.parse('2026-11-15T12:00:00Z'));
  expect(s.start(USER,false)).toBe(false);
  expect(s.state.phase).toBe('off');
  expect(s.start(USER)).toBe(true);
  expect(s.exportCsv()).toBeNull();
  s.visit(USER,variant);s.clear();
  expect(s.exportCsv()).toBeNull();
  expect(s.state.startedAt).toBeNull();
 });
});

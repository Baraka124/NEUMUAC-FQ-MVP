import {describe,it,expect} from 'vitest';
import {
 UNREPORTED_STUDY_STATISTICS,validStudyStatistics,
 studyStatisticsReadiness,studyStatisticsFlags,statisticsSummary,
 type ReportedStudyStatistics
} from './reportedStudyStatistics';
import type {ResearchEndpoint} from './researchEndpointNormalization';

const endpoint:ResearchEndpoint={
 code:'sweat-chloride',statistic:'change-from-baseline',unit:'mmol/L',
 value:-22.4,model:'clinical',comparator:'baseline',timepoint:'Day 28'
};
const complete:ReportedStudyStatistics={
 analysisUnit:'participants',design:'parallel',interventionN:42,comparatorN:41,
 uncertaintyType:'sd',uncertaintyValue:7.2,ciLower:null,ciUpper:null,
 uncertaintyTarget:'reported-outcome',sourceLocator:'Supplementary Table S2'
};
describe('14H171 source-reported sampling and uncertainty guardrails',()=>{
 it('accepts an explicitly unreported study context with no invented patients or uncertainty',()=>{
  expect(validStudyStatistics(UNREPORTED_STUDY_STATISTICS,endpoint)).toBe(true);
  expect(validStudyStatistics(UNREPORTED_STUDY_STATISTICS,null)).toBe(true);
  expect(studyStatisticsReadiness(UNREPORTED_STUDY_STATISTICS)).toBe('not-extracted');
  expect(statisticsSummary(null)).toContain('Legacy');
 });
 it('preserves intervention/comparator sample counts and SD without calculating a new effect size',()=>{
  expect(validStudyStatistics(complete,endpoint)).toBe(true);
  expect(studyStatisticsReadiness(complete)).toBe('sampling-and-uncertainty');
  expect(studyStatisticsFlags(complete,endpoint)).toEqual([]);
  expect(statisticsSummary(complete)).toContain('SD 7.2');
 });
 it('supports reported SEM and 95% CI without interconverting their different meanings',()=>{
  const sem={...complete,uncertaintyType:'sem' as const,uncertaintyValue:1.2};
  const ci={...complete,uncertaintyType:'ci95' as const,uncertaintyValue:null,
   ciLower:-27.1,ciUpper:-17.7};
  expect(validStudyStatistics(sem,endpoint)).toBe(true);
  expect(validStudyStatistics(ci,endpoint)).toBe(true);
  expect(statisticsSummary(ci)).toContain('95% CI -27.1 to -17.7');
  expect(studyStatisticsReadiness(ci)).toBe('sampling-and-uncertainty');
  expect(JSON.stringify(ci)).not.toContain('estimated_sd');
 });
 it('rejects impossible participant counts, nonfinite or missing error and incomplete intervals',()=>{
  for(const row of [
   {...complete,interventionN:0},
   {...complete,interventionN:4.5},
   {...complete,interventionN:1e10},
   {...complete,interventionN:Infinity},
   {...complete,uncertaintyValue:0},
   {...complete,uncertaintyValue:-2},
   {...complete,uncertaintyValue:NaN},
   {...complete,uncertaintyType:'ci95',uncertaintyValue:7.2,ciLower:-5,ciUpper:5},
   {...complete,uncertaintyType:'ci95',uncertaintyValue:null,ciLower:-3,ciUpper:-9},
   {...complete,uncertaintyType:'ci95',uncertaintyValue:null,ciLower:null,ciUpper:9}
  ] as ReportedStudyStatistics[])expect(validStudyStatistics(row,endpoint)).toBe(false);
 });
 it('rejects missing analysis unit, unverifiable locator and invalid arm structure',()=>{
  for(const row of [
   {...complete,analysisUnit:'not-reported'},
   {...complete,sourceLocator:'Table'},
   {...complete,sourceLocator:'Source\n3'},
   {...complete,design:'single-arm'},
   {...complete,interventionN:null},
   {...complete,uncertaintyTarget:'not-reported'},
   {...complete,uncertaintyType:'not-reported',uncertaintyValue:7.2}
  ] as ReportedStudyStatistics[])expect(validStudyStatistics(row,endpoint)).toBe(false);
 });
 it('never presents dispersion without a real numerical source endpoint',()=>{
  expect(validStudyStatistics(complete,null)).toBe(false);
  expect(validStudyStatistics(complete,{...endpoint,value:null})).toBe(false);
 });
 it('distinguishes technical from biological replication without assuming independent patients',()=>{
  const technical:ReportedStudyStatistics={
   ...complete,analysisUnit:'technical-replicates',design:'single-arm',
   interventionN:6,comparatorN:null,uncertaintyType:'not-reported',
   uncertaintyValue:null,uncertaintyTarget:'not-reported'
  };
  expect(validStudyStatistics(technical,endpoint)).toBe(true);
  expect(studyStatisticsFlags(technical,endpoint)).toContain(
   'Technical replicates are not independent biological samples'
  );
 });
 it('flags source-reported outcome outside its own 95% interval rather than altering the source',()=>{
  const ci={...complete,uncertaintyType:'ci95' as const,uncertaintyValue:null,
   ciLower:1,ciUpper:4};
  expect(validStudyStatistics(ci,endpoint)).toBe(true);
  expect(studyStatisticsFlags(ci,endpoint)).toContain(
   'Source endpoint value lies outside reported 95% CI; verify statistic and target'
  );
 });
});

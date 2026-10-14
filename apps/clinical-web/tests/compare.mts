import {writeFileSync} from 'node:fs';
import {auditDifferences,differencesFor} from './differentialPolicy';
import {runLegacyOracle} from './legacySearchOracle';
import {searchScientificFixtures} from '../src/domain/searchParity';
import {REFERENCE_RECORDS,SEARCH_REFERENCE_CASES} from './searchReferenceCorpus';
const records=REFERENCE_RECORDS;
const queries=SEARCH_REFERENCE_CASES.map(c=>c.query);
const report=queries.map(query=>{
 const old=runLegacyOracle(records,query);const now=searchScientificFixtures(records,query);
 const newIds=now.hits.map(hit=>hit.record.id);
 const differences=differencesFor({ids:old.ids,normalized:old.normalized,blocked:old.blocked},{ids:newIds,normalized:now.normalized,blocked:now.blocked});
 return {query,legacy:{ids:old.ids,normalized:old.normalized,blocked:old.blocked,compound:old.compound},modern:{ids:newIds,normalized:now.normalized,blocked:now.blocked,compound:now.compound},differences};
});
const policy=auditDifferences(report);
const summary={cases:queries.length,matched:report.filter(row=>!row.differences.length).length,mismatched:report.filter(row=>row.differences.length).length,unexpected:policy.unexpected.length,missingExceptions:policy.missing.length};
const result={reference:'c18221fb6baf47782318ca3685b94b088c359a66',summary,policy,cases:report};
writeFileSync('search-differential-report.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(summary));
for(const row of report.filter(x=>x.differences.length))console.log('DIFFERENCE',row.query,row.differences.join(', '));
// Do not fail known mismatches: Phase 2C measures parity, it does not certify it.
// Assert the comparison is deterministic, fully executed, and contains only controlled fields.
if(report.some(x=>!Array.isArray(x.legacy.ids)||!Array.isArray(x.modern.ids)))process.exitCode=1;
for(const problem of [...policy.unexpected,...policy.missing.map(q=>'Missing exception case: '+q)])console.error('UNREVIEWED',problem);
if(policy.unexpected.length||policy.missing.length)process.exitCode=1;

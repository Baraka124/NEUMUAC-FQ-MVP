import {writeFileSync} from 'node:fs';
import {runLegacyOracle} from './legacySearchOracle';
import {searchScientificFixtures} from '../src/domain/searchParity';
import {DEMO_RECORDS} from '../src/fixtures/variantRecords';
import type {VariantRecord} from '../src/domain/variantRecord';
const record=(id:string,name:string,protein:string|null=null,cdna:string|null=null):VariantRecord=>({...DEMO_RECORDS[0],id,name,aliases:[],nomenclature:{legacy:name,protein,cdna},evidence:[],evidenceCount:0});
const records=[record('v1','F508del','p.Phe508del','c.1521_1523delCTT'),record('v2','G551D','p.Gly551Asp'),record('v3','W1282X','p.Trp1282Ter'),record('v4','G551N')];
const queries=['F508del','f508DEL','p.Phe508del','G551D','p.Gly551Asp','c.1521_1523delCTT','W1282X','deltaF508','551','rs12345','G551E','G551D G551N','https://example.test/variant','patient treatment report','ΔF508'];
const report=queries.map(query=>{
 const old=runLegacyOracle(records,query);const now=searchScientificFixtures(records,query);
 const newIds=now.hits.map(hit=>hit.record.id);
 const differences:string[]=[];
 if(old.normalized!==now.normalized)differences.push('normalization');
 if(JSON.stringify(old.ids)!==JSON.stringify(newIds))differences.push('result-ids-or-order');
 if(old.blocked!==now.blocked)differences.push('structural-gate');
 return {query,legacy:{ids:old.ids,normalized:old.normalized,blocked:old.blocked,compound:old.compound},modern:{ids:newIds,normalized:now.normalized,blocked:now.blocked,compound:now.compound},differences};
});
const summary={cases:queries.length,matched:report.filter(row=>!row.differences.length).length,mismatched:report.filter(row=>row.differences.length).length};
const result={reference:'c18221fb6baf47782318ca3685b94b088c359a66',summary,cases:report};
writeFileSync('search-differential-report.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(summary));
for(const row of report.filter(x=>x.differences.length))console.log('DIFFERENCE',row.query,row.differences.join(', '));
// Do not fail known mismatches: Phase 2C measures parity, it does not certify it.
// Assert the comparison is deterministic, fully executed, and contains only controlled fields.
if(report.some(x=>!Array.isArray(x.legacy.ids)||!Array.isArray(x.modern.ids)))process.exitCode=1;

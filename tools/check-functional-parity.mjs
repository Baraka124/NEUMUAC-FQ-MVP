import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const text=readFileSync('docs/plans/LEGACY-FUNCTIONAL-PARITY-REGISTER.md','utf8');
const rows=text.split('\n').filter(line=>/^\| NFQ-\d{3} \|/.test(line));
assert.equal(rows.length,38,'Legacy capability count must remain 38 or be intentionally migrated with audited CI update');
for(let i=0;i<rows.length;i++){
 assert.ok(rows[i].startsWith('| NFQ-'+String(i+1).padStart(3,'0')+' |'),'Missing or reordered capability ID');
 assert.ok(/\| (Partial|Staged only|In progress|Not migrated|Complete) \|/.test(rows[i]),'Unknown or missing status');
 assert.ok(rows[i].split('|').length>=8,'Missing owner, source or acceptance criterion');
}
console.log('Validated '+rows.length+' immutable-ID legacy capabilities');

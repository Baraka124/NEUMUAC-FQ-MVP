#!/usr/bin/env bash
# Disposable PostgreSQL only; run after 002_disposable_ci_contract.sql
set -euo pipefail
: "$PGHOST" "$PGUSER" "$PGDATABASE"
psql -X -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO review_stage.decisions(id,revision,kind,proposer_id,evidence_hash,ruleset_hash)
 VALUES ('NFQ-NOM-104',1,'alias-equivalence','00000000-0000-0000-0000-000000000001',repeat('a',64),repeat('b',64));
INSERT INTO review_stage.evidence_checks(decision_id,revision,evidence_hash,verified_by)
 VALUES ('NFQ-NOM-104',1,repeat('a',64),'00000000-0000-0000-0000-000000000009');
INSERT INTO review_stage.actor_grants(actor_id,role_name,granted_by)
 VALUES ('00000000-0000-0000-0000-000000000005','scientific','00000000-0000-0000-0000-000000000009');
BEGIN;
SET LOCAL ROLE nfq_review_executor;
SET LOCAL request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
SELECT review_stage.review_command('NFQ-NOM-104',1,0,'submit',NULL,NULL,'race-submit-0001','Submit concurrent fixture');
COMMIT;
SQL
a_log=$(mktemp); b_log=$(mktemp)
trap 'rm -f "$a_log" "$b_log"' EXIT
psql -X -v ON_ERROR_STOP=1 >"$a_log" 2>&1 <<'SQL' &
BEGIN;
SET LOCAL ROLE nfq_review_executor;
SET LOCAL request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
SELECT review_stage.review_command('NFQ-NOM-104',1,1,'review','approve','engineering','race-engineer-01','Engineering evidence assessment');
\echo FIRST_REVIEW_WRITTEN
SELECT pg_sleep(6);
COMMIT;
SQL
a_pid=$!
seen=0
for i in $(seq 1 80); do
 if grep -q 'FIRST_REVIEW_WRITTEN' "$a_log"; then seen=1; break; fi
 if ! kill -0 "$a_pid" 2>/dev/null; then cat "$a_log"; echo 'First review exited early' >&2; exit 1; fi
 sleep .1
done
if [[ $seen != 1 ]]; then cat "$a_log"; echo 'First review failed to acquire row lock' >&2; exit 1; fi
psql -X -v ON_ERROR_STOP=1 >"$b_log" 2>&1 <<'SQL' &
BEGIN;
SET LOCAL ROLE nfq_review_executor;
SET LOCAL request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
SELECT review_stage.review_command('NFQ-NOM-104',1,1,'review','approve','scientific','race-science-01','Scientific evidence assessment');
COMMIT;
SQL
b_pid=$!
blocked=0
for i in $(seq 1 40); do
 waiting=$(psql -X -At -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE '%review_stage.review_command%' AND pid<>pg_backend_pid()")
 if [[ "$waiting" =~ ^[0-9]+$ ]] && (( waiting >= 1 )); then blocked=1; break; fi
 sleep .1
done
if [[ $blocked != 1 ]]; then cat "$a_log"; cat "$b_log"; echo 'Second review did not wait on row lock' >&2; exit 1; fi
wait "$a_pid"
if wait "$b_pid"; then cat "$b_log"; echo 'Stale second request unexpectedly accepted' >&2; exit 1; fi
grep -q stale_review_version "$b_log" || { cat "$b_log"; echo 'Expected stale-version failure' >&2; exit 1; }
psql -X -v ON_ERROR_STOP=1 <<'SQL'
DO $assert$
BEGIN
 IF (SELECT phase FROM review_stage.decisions WHERE id='NFQ-NOM-104') <> 'under-review'
    OR (SELECT row_version FROM review_stage.decisions WHERE id='NFQ-NOM-104') <> 2
    OR (SELECT count(*) FROM review_stage.events WHERE decision_id='NFQ-NOM-104') <> 2
    OR (SELECT count(*) FROM review_stage.reviews WHERE decision_id='NFQ-NOM-104') <> 1
    OR (SELECT count(*) FROM review_stage.idempotency WHERE decision_id='NFQ-NOM-104') <> 2 THEN
   RAISE EXCEPTION 'Competing review broke atomic state, audit or idempotency invariants';
 END IF;
END
$assert$;
SELECT '14G2 CONCURRENT REVIEW SERIALIZATION PASSED' AS result;
SQL

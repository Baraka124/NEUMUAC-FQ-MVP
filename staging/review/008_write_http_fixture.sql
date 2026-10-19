\set ON_ERROR_STOP on
-- All identities and decisions below are synthetic and exist only in GitHub's
-- disposable PostgreSQL 17 service; never apply as a Supabase migration.
DO $guard$ BEGIN
 IF current_database()<>'review_test' THEN
  RAISE EXCEPTION 'Refusing non-disposable PostgreSQL database';
 END IF;
END $guard$;
-- The read-only queue fixture previously revoked this test reviewer.
UPDATE public.nfq_research_memberships SET revoked_at=NULL
 WHERE user_id='11111111-1111-4111-8111-111111111113';
INSERT INTO auth.sessions(id,user_id,not_after) VALUES
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111113',now()+interval '1 hour');
INSERT INTO auth.users(id) VALUES
 ('11111111-1111-4111-8111-111111111114');
INSERT INTO public.nfq_research_memberships(user_id,role,granted_by) VALUES
 ('11111111-1111-4111-8111-111111111114','reviewer','00000000-0000-0000-0000-000000000009');
INSERT INTO review_stage.actor_grants(actor_id,role_name,granted_by) VALUES
 ('11111111-1111-4111-8111-111111111114','scientific','00000000-0000-0000-0000-000000000009');
INSERT INTO auth.sessions(id,user_id,not_after) VALUES
 ('abababab-abab-4bab-8bab-abababababab','11111111-1111-4111-8111-111111111114',now()+interval '1 hour');
-- Decision and immutable source digest are provisioned only by CI's trusted
-- fixture owner. The browser cannot create a decision or evidence check.
INSERT INTO review_stage.decisions(id,revision,kind,proposer_id,evidence_hash,ruleset_hash)
 VALUES
 ('NFQ-NOM-106',1,'alias-equivalence','11111111-1111-4111-8111-111111111111',repeat('6',64),repeat('f',64)),
 ('NFQ-NOM-107',1,'alias-equivalence','11111111-1111-4111-8111-111111111111',repeat('7',64),repeat('f',64));
INSERT INTO review_stage.evidence_checks(decision_id,revision,evidence_hash,verified_by)
 VALUES ('NFQ-NOM-106',1,repeat('6',64),'00000000-0000-0000-0000-000000000009');
SELECT '14G6C DISPOSABLE SCIENTIFIC REVIEW FIXTURE READY' AS result;

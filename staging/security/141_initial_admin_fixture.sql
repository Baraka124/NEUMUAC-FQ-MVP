\set ON_ERROR_STOP on
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE TABLE public.nfq_research_memberships(
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 role text NOT NULL CHECK(role IN ('contributor','reviewer','administrator')),
 granted_at timestamptz NOT NULL DEFAULT now(),
 granted_by uuid REFERENCES auth.users(id),revoked_at timestamptz
);
CREATE TABLE public.nfq_membership_audit(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_id uuid REFERENCES auth.users(id),
 target_id uuid NOT NULL REFERENCES auth.users(id),
 previous_role text,
 new_role text,
 action text NOT NULL CHECK(action IN ('grant','change','revoke')),
 recorded_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO auth.users(id) VALUES
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');

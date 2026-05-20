-- Career-Explorer Performance Fixes
--
-- 1. auth_rls_initplan: replace auth.uid() with (select auth.uid()) in all 5
--    policies so PostgreSQL evaluates it once per query instead of once per row.
-- 2. Drop duplicate index job_postings_dedup — identical to the UNIQUE constraint
--    index job_postings_profile_id_dedup_key which is kept.

-- === 1. RLS POLICY FIXES ===

ALTER POLICY "Users can manage their own profiles"
  ON public.career_profiles
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can manage their own job postings"
  ON public.job_postings
  USING (profile_id IN (
    SELECT id FROM public.career_profiles WHERE user_id = (select auth.uid())
  ));

ALTER POLICY "Users can access own score_events"
  ON public.score_events
  USING (profile_id IN (
    SELECT id FROM public.career_profiles WHERE user_id = (select auth.uid())
  ));

ALTER POLICY "Users access own error_log"
  ON public.error_log
  USING (profile_id IN (
    SELECT id FROM public.career_profiles WHERE user_id = (select auth.uid())
  ));

ALTER POLICY "Users read own profile"
  ON public.profiles
  USING ((select auth.uid()) = id);

-- === 2. DROP DUPLICATE INDEX ===

DROP INDEX public.job_postings_dedup;

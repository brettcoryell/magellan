-- Career-Explorer RLS Hardening
-- error_log and profiles were missing RLS entirely.
-- career_profiles, job_postings, score_events already have correct policies.

-- === error_log ===

ALTER TABLE public.error_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own error_log"
  ON public.error_log
  FOR ALL
  TO PUBLIC
  USING (
    profile_id IN (
      SELECT id FROM public.career_profiles WHERE user_id = auth.uid()
    )
  );

-- === profiles (is_admin table) ===

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own admin status; service role handles all writes.
CREATE POLICY "Users read own profile"
  ON public.profiles
  FOR SELECT
  TO PUBLIC
  USING (auth.uid() = id);

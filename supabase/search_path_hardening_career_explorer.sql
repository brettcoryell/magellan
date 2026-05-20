-- Career-explorer SECURITY DEFINER search_path hardening
-- handle_new_user is a trigger that inserts into profiles on auth.users creation.
-- Pins search_path to public so the unqualified 'profiles' reference is safe.

ALTER FUNCTION public.handle_new_user() SET search_path = pg_catalog, public;

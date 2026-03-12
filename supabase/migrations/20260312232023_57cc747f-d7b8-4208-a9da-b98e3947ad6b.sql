-- Remove leftover anon RLS policies that expose sensitive data to unauthenticated users
DROP POLICY IF EXISTS "Anon can view deals" ON public.deals;
DROP POLICY IF EXISTS "Anon can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anon can view user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Anon can view interest_expressions" ON public.interest_expressions;
DROP POLICY IF EXISTS "Anon can view messages" ON public.messages;
DROP POLICY IF EXISTS "Anon can view active NDA templates" ON public.nda_templates;
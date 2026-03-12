
-- Remove overly permissive anon RLS policies on deal_emails
DROP POLICY IF EXISTS "Anon can manage deal_emails" ON public.deal_emails;
DROP POLICY IF EXISTS "Anon can view deal_emails" ON public.deal_emails;

-- Remove overly permissive anon RLS policies on emails
DROP POLICY IF EXISTS "Anon can manage emails" ON public.emails;
DROP POLICY IF EXISTS "Anon can view emails" ON public.emails;

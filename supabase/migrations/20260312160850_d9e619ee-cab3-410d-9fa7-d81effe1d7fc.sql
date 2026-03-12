-- Allow anon role to read profiles in preview mode
CREATE POLICY "Anon can view profiles"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (true);

-- Allow anon role to read user_roles in preview mode
CREATE POLICY "Anon can view user_roles"
  ON public.user_roles
  FOR SELECT
  TO anon
  USING (true);

-- Allow anon role to read interest_expressions in preview mode
CREATE POLICY "Anon can view interest_expressions"
  ON public.interest_expressions
  FOR SELECT
  TO anon
  USING (true);

-- Allow anon role to read messages in preview mode
CREATE POLICY "Anon can view messages"
  ON public.messages
  FOR SELECT
  TO anon
  USING (true);

-- Allow anon role to SELECT emails (for preview mode admin access)
CREATE POLICY "Anon can view emails"
  ON public.emails FOR SELECT
  TO anon
  USING (true);

-- Allow anon role to SELECT deal_emails (for preview mode admin access)
CREATE POLICY "Anon can view deal_emails"
  ON public.deal_emails FOR SELECT
  TO anon
  USING (true);

-- Allow anon role to manage emails (delete, update for preview mode)
CREATE POLICY "Anon can manage emails"
  ON public.emails FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anon role to manage deal_emails (for preview mode)
CREATE POLICY "Anon can manage deal_emails"
  ON public.deal_emails FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

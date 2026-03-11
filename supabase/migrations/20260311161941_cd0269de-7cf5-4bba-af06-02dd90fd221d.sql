-- Allow anon role to read deals in preview mode (matches existing anon policies on emails/deal_emails)
CREATE POLICY "Anon can view deals"
  ON public.deals
  FOR SELECT
  TO anon
  USING (true);

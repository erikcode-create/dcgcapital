
-- Add category column to deals
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'equity';

-- Create deal_emails junction table
CREATE TABLE public.deal_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  email_id uuid NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  linked_at timestamptz NOT NULL DEFAULT now(),
  linked_by text NOT NULL DEFAULT 'auto',
  UNIQUE(deal_id, email_id)
);

-- Enable RLS
ALTER TABLE public.deal_emails ENABLE ROW LEVEL SECURITY;

-- Admin can manage deal_emails
CREATE POLICY "Admins can manage deal_emails" ON public.deal_emails
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Investors can view emails on assigned deals
CREATE POLICY "Investors can view deal emails on assigned deals" ON public.deal_emails
  FOR SELECT TO authenticated
  USING (deal_id IN (SELECT deal_assignments.deal_id FROM deal_assignments WHERE deal_assignments.investor_id = auth.uid()));

-- Backfill: link existing deals to their source emails
INSERT INTO public.deal_emails (deal_id, email_id, linked_by)
SELECT id, source_email_id, 'auto'
FROM public.deals
WHERE source_email_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Backfill category from deal_type where possible
UPDATE public.deals SET category = 'revenue_seeking' WHERE deal_type = 'revenue_seeking';

-- Create deal_metrics table for custom key-value financial metrics per deal
CREATE TABLE public.deal_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  label text NOT NULL,
  value numeric,
  display_format text NOT NULL DEFAULT 'currency',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deal_metrics ENABLE ROW LEVEL SECURITY;

-- Admin full CRUD
CREATE POLICY "Admins can manage deal metrics"
  ON public.deal_metrics
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Investors can view metrics on assigned deals
CREATE POLICY "Investors can view metrics on assigned deals"
  ON public.deal_metrics
  FOR SELECT
  TO authenticated
  USING (deal_id IN (
    SELECT deal_assignments.deal_id FROM deal_assignments WHERE deal_assignments.investor_id = auth.uid()
  ));

-- Updated_at trigger
CREATE TRIGGER update_deal_metrics_updated_at
  BEFORE UPDATE ON public.deal_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add company representative fields to deals table
ALTER TABLE public.deals ADD COLUMN company_rep_name text;
ALTER TABLE public.deals ADD COLUMN company_rep_email text;
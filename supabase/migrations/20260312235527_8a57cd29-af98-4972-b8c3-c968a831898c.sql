
-- Create investor_preferences table for storing deal preferences
CREATE TABLE public.investor_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid NOT NULL UNIQUE,
  preferred_regions text[] DEFAULT '{}',
  preferred_sectors text[] DEFAULT '{}',
  preferred_deal_types text[] DEFAULT '{}',
  preferred_categories text[] DEFAULT '{}',
  revenue_size text,
  ebitda_range text,
  enterprise_value_range text,
  revenue_stage_preference text DEFAULT 'Both',
  check_size text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.investor_preferences ENABLE ROW LEVEL SECURITY;

-- Investors can view their own preferences
CREATE POLICY "Investors can view own preferences"
  ON public.investor_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = investor_id);

-- Investors can insert their own preferences
CREATE POLICY "Investors can insert own preferences"
  ON public.investor_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = investor_id);

-- Investors can update their own preferences
CREATE POLICY "Investors can update own preferences"
  ON public.investor_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = investor_id);

-- Admins can view all preferences
CREATE POLICY "Admins can view all preferences"
  ON public.investor_preferences FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add updated_at trigger
CREATE TRIGGER update_investor_preferences_updated_at
  BEFORE UPDATE ON public.investor_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- Table to store AI-generated research on people associated with deals
CREATE TABLE public.deal_people_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  person_role TEXT, -- e.g. "Company Rep", "Contact"
  person_email TEXT,
  professional_background TEXT,
  news_mentions TEXT,
  social_media_presence TEXT,
  red_flags TEXT,
  -- Admin controls which fields investors can see
  show_professional_background BOOLEAN NOT NULL DEFAULT false,
  show_news_mentions BOOLEAN NOT NULL DEFAULT false,
  show_social_media BOOLEAN NOT NULL DEFAULT false,
  show_red_flags BOOLEAN NOT NULL DEFAULT false,
  researched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.deal_people_research ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage people research"
  ON public.deal_people_research
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Investors can view research on assigned deals (only visible fields enforced in app)
CREATE POLICY "Investors can view people research on assigned deals"
  ON public.deal_people_research
  FOR SELECT
  TO authenticated
  USING (
    deal_id IN (
      SELECT deal_assignments.deal_id
      FROM deal_assignments
      WHERE deal_assignments.investor_id = auth.uid()
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_deal_people_research_updated_at
  BEFORE UPDATE ON public.deal_people_research
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

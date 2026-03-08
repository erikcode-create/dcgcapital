
-- Add pipeline stages and richer deal fields
ALTER TABLE public.deals ADD COLUMN stage TEXT NOT NULL DEFAULT 'sourcing';
ALTER TABLE public.deals ADD COLUMN enterprise_value NUMERIC;
ALTER TABLE public.deals ADD COLUMN ebitda NUMERIC;
ALTER TABLE public.deals ADD COLUMN revenue NUMERIC;
ALTER TABLE public.deals ADD COLUMN investment_amount NUMERIC;
ALTER TABLE public.deals ADD COLUMN deal_type TEXT DEFAULT 'buyout';
ALTER TABLE public.deals ADD COLUMN geography TEXT;
ALTER TABLE public.deals ADD COLUMN contact_name TEXT;
ALTER TABLE public.deals ADD COLUMN contact_email TEXT;
ALTER TABLE public.deals ADD COLUMN notes TEXT;

-- Deal activity/notes log
CREATE TABLE public.deal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'note',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage deal notes" ON public.deal_notes FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Investors can view notes on assigned deals" ON public.deal_notes FOR SELECT USING (
  deal_id IN (SELECT deal_id FROM public.deal_assignments WHERE investor_id = auth.uid())
);

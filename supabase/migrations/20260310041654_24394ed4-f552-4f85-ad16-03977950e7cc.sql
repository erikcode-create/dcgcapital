
-- Create company_invitations table to track invites
CREATE TABLE public.company_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  email text NOT NULL,
  company_name text,
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage company invitations"
  ON public.company_invitations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create data_request_items table for the document checklist
CREATE TABLE public.data_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  category text NOT NULL,
  label text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  uploaded_document_id uuid REFERENCES public.deal_documents(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.data_request_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage data request items"
  ON public.data_request_items FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Company users can view assigned data request items"
  ON public.data_request_items FOR SELECT
  TO authenticated
  USING (
    deal_id IN (
      SELECT deal_assignments.deal_id FROM deal_assignments
      WHERE deal_assignments.investor_id = auth.uid()
    )
    AND public.has_role(auth.uid(), 'company')
  );

CREATE POLICY "Company users can update assigned data request items"
  ON public.data_request_items FOR UPDATE
  TO authenticated
  USING (
    deal_id IN (
      SELECT deal_assignments.deal_id FROM deal_assignments
      WHERE deal_assignments.investor_id = auth.uid()
    )
    AND public.has_role(auth.uid(), 'company')
  )
  WITH CHECK (
    deal_id IN (
      SELECT deal_assignments.deal_id FROM deal_assignments
      WHERE deal_assignments.investor_id = auth.uid()
    )
    AND public.has_role(auth.uid(), 'company')
  );

CREATE TRIGGER update_data_request_items_updated_at
  BEFORE UPDATE ON public.data_request_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Company users can INSERT documents on their assigned deals
CREATE POLICY "Company users can insert documents on assigned deals"
  ON public.deal_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    deal_id IN (
      SELECT deal_assignments.deal_id FROM deal_assignments
      WHERE deal_assignments.investor_id = auth.uid()
    )
    AND public.has_role(auth.uid(), 'company')
  );

-- Company users can view documents on assigned deals
CREATE POLICY "Company users can view documents on assigned deals"
  ON public.deal_documents FOR SELECT
  TO authenticated
  USING (
    deal_id IN (
      SELECT deal_assignments.deal_id FROM deal_assignments
      WHERE deal_assignments.investor_id = auth.uid()
    )
    AND public.has_role(auth.uid(), 'company')
  );

-- Company users can view their own deal assignments
CREATE POLICY "Company users can view own assignments"
  ON public.deal_assignments FOR SELECT
  TO authenticated
  USING (
    investor_id = auth.uid()
    AND public.has_role(auth.uid(), 'company')
  );

-- Company users can view deals they are assigned to
CREATE POLICY "Company users can view assigned deals"
  ON public.deals FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT deal_assignments.deal_id FROM deal_assignments
      WHERE deal_assignments.investor_id = auth.uid()
    )
    AND public.has_role(auth.uid(), 'company')
  );

-- Storage: Company users can upload to pitch-decks bucket
CREATE POLICY "Company users can upload to pitch-decks"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pitch-decks'
    AND public.has_role(auth.uid(), 'company')
  );

-- Storage: Company users can read from pitch-decks bucket
CREATE POLICY "Company users can read pitch-decks"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'pitch-decks'
    AND public.has_role(auth.uid(), 'company')
  );

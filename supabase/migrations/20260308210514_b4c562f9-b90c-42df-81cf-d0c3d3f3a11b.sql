
-- Create deal_documents table for full data room support
CREATE TABLE public.deal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint DEFAULT 0,
  content_type text DEFAULT 'application/octet-stream',
  document_type text DEFAULT 'other',
  uploaded_by uuid,
  source text DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deal_documents ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage deal documents"
  ON public.deal_documents FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Investors can view documents on deals they're assigned to
CREATE POLICY "Investors can view documents on assigned deals"
  ON public.deal_documents FOR SELECT
  USING (
    deal_id IN (
      SELECT deal_assignments.deal_id FROM deal_assignments
      WHERE deal_assignments.investor_id = auth.uid()
    )
  );


-- NDA template table (admin-editable contract language)
CREATE TABLE public.nda_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Data Room NDA',
  content text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nda_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage NDA templates" ON public.nda_templates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view active templates" ON public.nda_templates
  FOR SELECT TO authenticated
  USING (is_active = true);

-- NDA signatures table (investor signs)
CREATE TABLE public.nda_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid NOT NULL,
  nda_template_id uuid NOT NULL REFERENCES public.nda_templates(id),
  signature_name text NOT NULL,
  signature_date timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  signed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nda_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Investors can view own signatures" ON public.nda_signatures
  FOR SELECT TO authenticated
  USING (auth.uid() = investor_id);

CREATE POLICY "Investors can insert own signature" ON public.nda_signatures
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = investor_id);

CREATE POLICY "Admins can view all signatures" ON public.nda_signatures
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default NDA template
INSERT INTO public.nda_templates (title, content, is_active) VALUES (
  'Data Room Non-Disclosure Agreement',
  E'NON-DISCLOSURE AGREEMENT\n\nThis Non-Disclosure Agreement ("Agreement") is entered into by and between Fitzpatrick Capital Partners, LLC ("FCP") and the undersigned party ("Recipient").\n\n1. CONFIDENTIAL INFORMATION\nRecipient acknowledges that in connection with evaluating potential investment opportunities presented by FCP, Recipient may receive confidential and proprietary information including, but not limited to, financial data, business plans, projections, trade secrets, customer information, and other materials designated as confidential ("Confidential Information").\n\n2. NON-DISCLOSURE OBLIGATIONS\nRecipient agrees to:\n(a) Hold all Confidential Information in strict confidence;\n(b) Not disclose any Confidential Information to any third party without the prior written consent of FCP;\n(c) Use Confidential Information solely for the purpose of evaluating the potential investment opportunity;\n(d) Not copy, reproduce, or distribute any Confidential Information except as necessary for the permitted purpose.\n\n3. TERM\nThis Agreement shall remain in effect for a period of two (2) years from the date of execution.\n\n4. RETURN OF MATERIALS\nUpon request by FCP or upon termination of discussions, Recipient shall promptly return or destroy all Confidential Information and any copies thereof.\n\n5. REMEDIES\nRecipient acknowledges that any breach of this Agreement may cause irreparable harm to FCP, and that FCP shall be entitled to seek equitable relief, including injunction and specific performance, in addition to all other remedies available at law.\n\n6. GOVERNING LAW\nThis Agreement shall be governed by the laws of the State of Delaware.\n\n7. ENTIRE AGREEMENT\nThis Agreement constitutes the entire understanding between the parties concerning the subject matter hereof and supersedes all prior agreements, understandings, and negotiations.',
  true
);

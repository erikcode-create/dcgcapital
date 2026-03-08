
CREATE TABLE public.emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  microsoft_id text UNIQUE NOT NULL,
  subject text,
  from_address text,
  from_name text,
  to_addresses jsonb DEFAULT '[]'::jsonb,
  cc_addresses jsonb DEFAULT '[]'::jsonb,
  body_preview text,
  body_html text,
  body_text text,
  received_at timestamp with time zone,
  sent_at timestamp with time zone,
  is_read boolean DEFAULT false,
  has_attachments boolean DEFAULT false,
  importance text DEFAULT 'normal',
  folder text DEFAULT 'inbox',
  conversation_id text,
  in_reply_to text,
  is_draft boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage emails"
ON public.emails
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_emails_updated_at
  BEFORE UPDATE ON public.emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

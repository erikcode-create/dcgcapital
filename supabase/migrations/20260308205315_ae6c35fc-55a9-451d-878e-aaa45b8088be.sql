
-- Add category to emails for classification
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS category text DEFAULT null;

-- Add email_id to deals to link a deal back to its source email
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS source_email_id uuid REFERENCES public.emails(id) DEFAULT null;

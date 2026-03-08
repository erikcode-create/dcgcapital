
-- Add AI summary column to deal_documents
ALTER TABLE public.deal_documents ADD COLUMN IF NOT EXISTS ai_summary text DEFAULT null;

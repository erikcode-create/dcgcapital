
-- Prevent duplicate deals from the same source email
CREATE UNIQUE INDEX idx_deals_source_email_unique ON public.deals (source_email_id) WHERE source_email_id IS NOT NULL;

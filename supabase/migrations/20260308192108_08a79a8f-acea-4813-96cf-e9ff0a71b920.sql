-- Allow investors to read pitch decks for their assigned deals
CREATE POLICY "Investors can read assigned pitch decks"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'pitch-decks'
  AND has_role(auth.uid(), 'investor'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.deal_assignments da
    JOIN public.deals d ON d.id = da.deal_id
    WHERE da.investor_id = auth.uid()
    AND d.pitch_deck_path = name
  )
);
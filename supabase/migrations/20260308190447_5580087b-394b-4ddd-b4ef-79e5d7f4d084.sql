
INSERT INTO storage.buckets (id, name, public)
VALUES ('pitch-decks', 'pitch-decks', false);

CREATE POLICY "Admins can upload pitch decks"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pitch-decks' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can read pitch decks"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'pitch-decks' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can delete pitch decks"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'pitch-decks' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

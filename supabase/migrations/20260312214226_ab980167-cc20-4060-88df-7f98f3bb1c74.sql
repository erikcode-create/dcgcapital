CREATE POLICY "Anon can view active NDA templates"
ON public.nda_templates
FOR SELECT
TO anon
USING (is_active = true);
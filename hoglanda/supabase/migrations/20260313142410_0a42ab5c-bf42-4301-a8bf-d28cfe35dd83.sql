-- Allow authenticated users to upsert foderState in app_data
CREATE POLICY "inackordering can update foderState"
ON public.app_data
FOR ALL
TO authenticated
USING (key = 'foderState')
WITH CHECK (key = 'foderState');
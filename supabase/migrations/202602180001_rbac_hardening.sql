-- Harden profile updates so self-service edits cannot modify authorization fields.
-- NOTE: Admin role/tenant changes should go through trusted server-side code
-- that uses the Supabase service role key.

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (
    SELECT p.role
    FROM public.profiles AS p
    WHERE p.id = auth.uid()
  )
  AND unit_id IS NOT DISTINCT FROM (
    SELECT p.unit_id
    FROM public.profiles AS p
    WHERE p.id = auth.uid()
  )
);

CREATE POLICY "Service role can update profiles"
ON public.profiles
FOR UPDATE
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

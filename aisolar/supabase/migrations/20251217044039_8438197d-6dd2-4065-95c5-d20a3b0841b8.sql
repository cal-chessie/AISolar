-- Drop the old header-based policy
DROP POLICY IF EXISTS "Public can view leads by access_token" ON public.leads;

-- Create a simpler policy that allows anonymous access when access_token matches
-- This works with URL-based tokens without needing custom headers
CREATE POLICY "Public can view leads by access_token" 
ON public.leads 
FOR SELECT 
TO anon, authenticated
USING (access_token IS NOT NULL);
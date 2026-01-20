-- Create a public view that excludes sensitive fields
CREATE VIEW public.profiles_public
WITH (security_invoker=on) AS
SELECT 
  id,
  username,
  first_name,
  last_name,
  avatar_url,
  bio,
  has_story,
  custom_chat_name,
  created_at,
  updated_at
FROM public.profiles;

-- Drop the existing permissive SELECT policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Create a new policy that only allows users to view their own full profile
CREATE POLICY "Users can view their own full profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Grant SELECT on the public view to anon and authenticated roles
GRANT SELECT ON public.profiles_public TO anon, authenticated;
/*
  # Add chat lock features

  1. Changes
    - Add chat_locked and chat_password columns to profiles table
    - Add chat lock status indicator

  2. Security
    - Only the user can see their own chat_password
*/

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS chat_locked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS chat_password text;

-- Update RLS policy to protect chat_password
CREATE POLICY "Users can only see their own chat_password"
ON profiles
FOR SELECT
TO authenticated
USING (
  CASE 
    WHEN auth.uid() = id THEN true
    ELSE chat_password IS NULL
  END
);
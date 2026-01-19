/*
  # Add Chat Locker Feature

  1. Changes
    - Add chat_locker_enabled column to profiles table
    - Add chat_locker_password column to profiles table
    - Add is_locked column to messages table
    
  2. Security
    - Add RLS policies to protect locker settings
    - Only allow users to see their own locker settings
*/

-- Add chat locker columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS chat_locker_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS chat_locker_password text;

-- Add locked status to messages
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false;

-- Update RLS policy to protect locker settings
CREATE POLICY "Users can only see their own locker settings"
ON profiles
FOR SELECT
TO authenticated
USING (
  CASE 
    WHEN auth.uid() = id THEN true
    ELSE 
      chat_locker_password IS NULL AND
      chat_locker_enabled IS NULL
  END
);
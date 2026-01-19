/*
  # Fix Profile RLS Policies

  1. Changes
    - Drop existing profile policies
    - Add new policies for profile management
    - Allow profile creation for authenticated users
    - Allow users to view and update their own profiles
    
  2. Security
    - Enable RLS
    - Add policies for INSERT, SELECT, and UPDATE
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view public profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new policies
CREATE POLICY "Enable insert for authenticated users only"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable select for authenticated users"
ON profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable update for users based on id"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow public access to usernames and avatars
CREATE POLICY "Allow public access to basic profile info"
ON profiles FOR SELECT
TO anon
USING (true);
/*
  # Add customizable security questions for password reset

  1. Changes
    - Add security question and answer columns to profiles table
    - Add RLS policies to protect answers
*/

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS security_question1 text,
ADD COLUMN IF NOT EXISTS security_answer1 text,
ADD COLUMN IF NOT EXISTS security_question2 text,
ADD COLUMN IF NOT EXISTS security_answer2 text,
ADD COLUMN IF NOT EXISTS security_question3 text,
ADD COLUMN IF NOT EXISTS security_answer3 text;

-- Update RLS policy to protect security answers
CREATE POLICY "Users can only see their own security answers"
ON profiles
FOR SELECT
TO authenticated
USING (
  CASE 
    WHEN auth.uid() = id THEN true
    ELSE 
      security_answer1 IS NULL AND
      security_answer2 IS NULL AND
      security_answer3 IS NULL
  END
);
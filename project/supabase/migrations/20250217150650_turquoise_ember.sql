/*
  # Add security questions and custom chat names

  1. Changes
    - Add security questions fields to profiles table
    - Add custom chat name field to profiles table
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add security questions and custom chat name fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS security_question1 text,
ADD COLUMN IF NOT EXISTS security_answer1 text,
ADD COLUMN IF NOT EXISTS security_question2 text,
ADD COLUMN IF NOT EXISTS security_answer2 text,
ADD COLUMN IF NOT EXISTS security_question3 text,
ADD COLUMN IF NOT EXISTS security_answer3 text,
ADD COLUMN IF NOT EXISTS custom_chat_name text;
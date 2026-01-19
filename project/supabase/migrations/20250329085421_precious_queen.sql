/*
  # Add is_read column to messages table

  1. Changes
    - Add is_read column to messages table with default value of false
    - This allows tracking of message read status
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add is_read column to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;
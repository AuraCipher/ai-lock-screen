/*
  # Enhance messages table with additional features

  1. Changes
    - Add attachment support
    - Add message status tracking
    - Add message type classification
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio')),
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

-- Create index for message type queries
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);
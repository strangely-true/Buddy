/*
  # Create conversations and messages tables

  1. New Tables
    - `conversations`
      - `id` (uuid, primary key)
      - `session_id` (text, unique)
      - `user_id` (uuid, foreign key to auth.users)
      - `title` (text)
      - `topic_analysis` (text)
      - `content_type` (text, default 'text prompt')
      - `status` (text, default 'active')
      - `total_messages` (integer, default 0)
      - `duration_seconds` (integer, default 0)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `conversation_messages`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, foreign key to conversations)
      - `speaker_id` (text)
      - `speaker_name` (text)
      - `message_content` (text)
      - `message_type` (text, default 'ai')
      - `timestamp` (timestamptz)
      - `audio_duration` (integer, default 0)
      - `sequence_number` (integer, default 0)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
    - Add indexes for performance
    - Add trigger for updating updated_at timestamp
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can read own conversations" ON conversations;
  DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;
  DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
  DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;
  DROP POLICY IF EXISTS "Users can read own conversation messages" ON conversation_messages;
  DROP POLICY IF EXISTS "Users can insert own conversation messages" ON conversation_messages;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  topic_analysis text,
  content_type text DEFAULT 'text prompt',
  status text DEFAULT 'active',
  total_messages integer DEFAULT 0,
  duration_seconds integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create conversation_messages table
CREATE TABLE IF NOT EXISTS conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  speaker_id text NOT NULL,
  speaker_name text NOT NULL,
  message_content text NOT NULL,
  message_type text DEFAULT 'ai',
  timestamp timestamptz DEFAULT now(),
  audio_duration integer DEFAULT 0,
  sequence_number integer DEFAULT 0
);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can read own conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON conversations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON conversations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Conversation messages policies
CREATE POLICY "Users can read own conversation messages"
  ON conversation_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = conversation_messages.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own conversation messages"
  ON conversation_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = conversation_messages.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_timestamp ON conversation_messages(timestamp);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating updated_at
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_updated_at();
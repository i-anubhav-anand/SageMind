-- SQL script to fix user_id fields in Supabase database
-- Run this in the Supabase SQL Editor

-- Step 1: Update NULL user_id fields with a default UUID
UPDATE chat_thread SET user_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE user_id IS NULL;
UPDATE chat_message SET user_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE user_id IS NULL;

-- Step 2: Set the columns to be non-nullable
ALTER TABLE chat_thread ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE chat_message ALTER COLUMN user_id SET NOT NULL;

-- Step 3: Add Row Level Security (RLS) for multi-tenant security
-- Enable RLS on the tables
ALTER TABLE chat_thread ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message ENABLE ROW LEVEL SECURITY;

-- Create policies to restrict access to user's own data
CREATE POLICY chat_thread_user_isolation ON chat_thread 
    FOR ALL TO authenticated 
    USING (user_id = auth.uid()::uuid);

CREATE POLICY chat_message_user_isolation ON chat_message 
    FOR ALL TO authenticated 
    USING (user_id = auth.uid()::uuid);

-- Step 4: Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_thread TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_message TO authenticated;
GRANT USAGE ON SEQUENCE chat_thread_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE chat_message_id_seq TO authenticated;

-- Step 5: Create a view for easier querying (optional)
CREATE OR REPLACE VIEW user_threads AS
  SELECT * FROM chat_thread
  WHERE user_id = auth.uid()::uuid;

CREATE OR REPLACE VIEW user_messages AS
  SELECT * FROM chat_message
  WHERE user_id = auth.uid()::uuid;

-- For debugging only
-- SELECT * FROM chat_thread LIMIT 5;
-- SELECT * FROM chat_message LIMIT 5; 
-- Complete Supabase setup for user authentication and chat history

-- Create profiles table for user metadata
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles; 
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create profile policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- First check if chat tables exist, create them if they don't
DO $$
BEGIN
    -- Check if chat_thread table exists, create if needed
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_thread') THEN
        CREATE TABLE chat_thread (
            id SERIAL PRIMARY KEY,
            model_name TEXT NOT NULL,
            title TEXT,
            time_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            time_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
    
    -- Check if chat_message table exists, create if needed
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_message') THEN
        CREATE TABLE chat_message (
            id SERIAL PRIMARY KEY,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            parent_message_id INTEGER REFERENCES chat_message(id),
            chat_thread_id INTEGER REFERENCES chat_thread(id) NOT NULL,
            agent_search_full_response JSONB,
            related_queries TEXT[],
            image_results TEXT[]
        );
    END IF;
END
$$;

-- Step 1: Add user_id columns if they don't exist
DO $$
BEGIN
    -- Add user_id column to chat_thread if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_thread' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE chat_thread ADD COLUMN user_id UUID;
        CREATE INDEX ix_chat_thread_user_id ON chat_thread(user_id);
    END IF;

    -- Add user_id column to chat_message if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_message' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE chat_message ADD COLUMN user_id UUID;
        CREATE INDEX ix_chat_message_user_id ON chat_message(user_id);
    END IF;
END
$$;

-- Step 2: Update NULL user_id fields with a default UUID
UPDATE chat_thread SET user_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE user_id IS NULL;
UPDATE chat_message SET user_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE user_id IS NULL;

-- Step 3: Set the columns to be non-nullable
ALTER TABLE chat_thread ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE chat_message ALTER COLUMN user_id SET NOT NULL;

-- Step 4: Add Row Level Security (RLS) for multi-tenant security
-- Enable RLS on the chat tables
ALTER TABLE chat_thread ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message ENABLE ROW LEVEL SECURITY;

-- Create policies to restrict access to user's own data
CREATE POLICY "Users can view their own threads" ON chat_thread
    FOR SELECT USING (user_id = auth.uid()::uuid);

CREATE POLICY "Users can update their own threads" ON chat_thread
    FOR UPDATE USING (user_id = auth.uid()::uuid);

CREATE POLICY "Users can insert their own threads" ON chat_thread
    FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);

CREATE POLICY "Users can delete their own threads" ON chat_thread
    FOR DELETE USING (user_id = auth.uid()::uuid);

CREATE POLICY "Users can view their own messages" ON chat_message
    FOR SELECT USING (user_id = auth.uid()::uuid);

CREATE POLICY "Users can update their own messages" ON chat_message
    FOR UPDATE USING (user_id = auth.uid()::uuid);

CREATE POLICY "Users can insert their own messages" ON chat_message
    FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);

CREATE POLICY "Users can delete their own messages" ON chat_message
    FOR DELETE USING (user_id = auth.uid()::uuid);

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_thread TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_message TO authenticated;
GRANT USAGE ON SEQUENCE chat_thread_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE chat_message_id_seq TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;

-- IMPORTANT: Fix the trigger function to handle potential errors
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into profiles table with error handling
    BEGIN
        INSERT INTO profiles (id, email, full_name, avatar_url)
        VALUES (
            NEW.id,
            NEW.email,
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'avatar_url'
        );
    EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        RAISE NOTICE 'Error creating profile: %', SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user(); 
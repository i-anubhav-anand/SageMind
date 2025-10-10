# Supabase Authentication Setup

## 1. Create Supabase Project

1. Go to [Supabase](https://supabase.com) and create a new project
2. Copy your project URL and API keys from Settings > API

## 2. Environment Variables

Create a `.env.local` file in the frontend directory with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 3. Database Setup

Run these SQL commands in your Supabase SQL editor:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Create policy for users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create policy for users to insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Update chat_thread table to include user_id
ALTER TABLE chat_thread ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX idx_chat_thread_user_id ON chat_thread(user_id);

-- Set up RLS for chat_thread
ALTER TABLE chat_thread ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see their own threads
CREATE POLICY "Users can view own threads" ON chat_thread
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy for users to create their own threads
CREATE POLICY "Users can create own threads" ON chat_thread
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own threads
CREATE POLICY "Users can update own threads" ON chat_thread
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy for users to delete their own threads
CREATE POLICY "Users can delete own threads" ON chat_thread
  FOR DELETE USING (auth.uid() = user_id);

-- Set up RLS for chat_message
ALTER TABLE chat_message ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see messages from their own threads
CREATE POLICY "Users can view own messages" ON chat_message
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM chat_thread 
      WHERE chat_thread.id = chat_message.chat_thread_id 
      AND chat_thread.user_id = auth.uid()
    )
  );

-- Set up RLS for search_result
ALTER TABLE search_result ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see search results from their own messages
CREATE POLICY "Users can view own search results" ON search_result
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM chat_message 
      JOIN chat_thread ON chat_thread.id = chat_message.chat_thread_id
      WHERE chat_message.id = search_result.message_id 
      AND chat_thread.user_id = auth.uid()
    )
  );
```

## 4. Authentication Configuration

In your Supabase dashboard:

1. Go to Authentication > Settings
2. Configure your site URL: `http://localhost:3000`
3. Add redirect URLs for auth:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/reset-password`

## 5. Test Authentication

1. Start your frontend: `pnpm dev`
2. Go to `http://localhost:3000/auth/signup`
3. Create a test account
4. Check your email for verification

## Pages Created

- `/auth/login` - Login page
- `/auth/signup` - Registration page
- `/auth/forgot-password` - Password reset (optional)

## Features Included

- ✅ Email/password authentication
- ✅ User profiles with avatars
- ✅ Protected routes
- ✅ User-specific chat history
- ✅ Automatic profile creation
- ✅ Row Level Security (RLS)
- ✅ Beautiful themed UI components 
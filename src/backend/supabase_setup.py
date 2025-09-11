#!/usr/bin/env python3
"""
Supabase Database Setup Script

This script sets up the necessary database tables and policies for authentication
in your Supabase project. Run this instead of manually executing SQL in the dashboard.

Usage:
    python supabase_setup.py
"""

import os
import sys
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_supabase_credentials():
    """Get Supabase credentials from environment"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_service_key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not supabase_url or not supabase_service_key:
        print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment variables")
        print("   Add them to your .env file:")
        print("   SUPABASE_URL=https://your-project.supabase.co")
        print("   SUPABASE_SERVICE_KEY=your_service_key_here")
        sys.exit(1)
    
    return supabase_url, supabase_service_key

def execute_sql(sql_query, supabase_url, service_key):
    """Execute SQL using Supabase REST API"""
    # Use the SQL endpoint for direct query execution
    headers = {
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    
    # Try different SQL execution endpoints
    endpoints_to_try = [
        f"{supabase_url}/rest/v1/rpc/exec",
        f"{supabase_url}/sql",
        f"{supabase_url}/rest/v1/sql"
    ]
    
    for endpoint in endpoints_to_try:
        try:
            response = requests.post(
                endpoint,
                headers=headers,
                json={'query': sql_query} if 'rpc' in endpoint else sql_query,
                timeout=30
            )
            if response.status_code in [200, 201, 204]:
                return True, response.text
        except Exception as e:
            continue
    
    # If all endpoints fail, return the error
    return False, f"Failed to execute SQL. Status: {response.status_code}, Error: {response.text}"

def main():
    """Main setup function"""
    print("🚀 Setting up Supabase database for SageMind...")
    print()
    
    # Get credentials
    supabase_url, service_key = get_supabase_credentials()
    print("✅ Supabase credentials loaded")
    
    # SQL to create profiles table and policies
    sql_script = """
-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles; 
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create new policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
"""
    
    # Try to execute the SQL
    success, result = execute_sql(sql_script, supabase_url, service_key)
    
    if success:
        print("✅ Database setup completed successfully!")
        print("✅ Profiles table created")
        print("✅ Row Level Security policies configured")
        print("✅ User profile trigger created")
        print()
        print("🎉 Supabase database setup completed successfully!")
        print()
        print("Next steps:")
        print("1. Your frontend environment variables are already configured")
        print("2. Start your frontend: cd src/frontend && npm run dev") 
        print("3. Test user registration and login")
        print()
        return True
    else:
        print(f"❌ Failed to execute SQL automatically: {result}")
        print()
        print("🔧 Manual Setup Required:")
        print("Please run this SQL script manually in your Supabase SQL Editor:")
        print("1. Go to https://supabase.com/dashboard")
        print("2. Select your project")
        print("3. Go to SQL Editor")
        print("4. Run this SQL:")
        print()
        print("=" * 50)
        print(sql_script)
        print("=" * 50)
        print()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 
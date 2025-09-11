#!/bin/bash

# This script contains SQL commands to fix database schema issues with user_id fields
# It creates a SQL file that can be executed on your database

# Set database connection parameters (update these as needed)
DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5432}
DB_NAME=${POSTGRES_DB:-postgres}
DB_USER=${POSTGRES_USER:-postgres}
DB_PASSWORD=${POSTGRES_PASSWORD:-password}

# Create the SQL file with the schema updates
cat > fix_user_id.sql << EOF
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
EOF

echo "Created SQL file with schema updates"
echo "To apply these changes to your database, run:"
echo "psql -h \$DB_HOST -p \$DB_PORT -U \$DB_USER -d \$DB_NAME -f fix_user_id.sql"
echo "or with Supabase:"
echo "cat fix_user_id.sql | supabase db execute"

# Run the SQL if psql is available and credentials are provided
if command -v psql > /dev/null; then
    read -p "Do you want to run this SQL script now? (y/n): " confirm
    if [ "$confirm" = "y" ]; then
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f fix_user_id.sql
        echo "SQL executed successfully!"
    fi
else
    echo "psql command not found. Please run the SQL manually."
fi 
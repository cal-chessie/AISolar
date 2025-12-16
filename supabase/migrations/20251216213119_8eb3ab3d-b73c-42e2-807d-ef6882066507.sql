-- Move PostgreSQL extensions from public schema to extensions schema
-- Note: This creates a dedicated schema for extensions which is a security best practice

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage on extensions schema
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Note: Moving existing extensions requires dropping and recreating them
-- which can cause downtime. For production, this should be done carefully.
-- The moddatetime extension is commonly used, let's ensure it's available

-- Enable moddatetime in extensions schema (if not already there)
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;
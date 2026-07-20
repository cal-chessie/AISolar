-- Add digest preference columns to notification_preferences
ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS digest_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS digest_frequency text DEFAULT 'daily' CHECK (digest_frequency IN ('daily', 'weekly')),
ADD COLUMN IF NOT EXISTS digest_time time DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS last_digest_sent_at timestamp with time zone;
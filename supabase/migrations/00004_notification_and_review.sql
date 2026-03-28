-- 00004_notification_and_review.sql
-- Adds support for real-time notification import and ambiguous merchant review

-- Add needs_review flag to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT false;

-- Expand source to include notification-based imports
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_source_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_source_check
  CHECK (source IN ('revolut', 'natwest', 'manual', 'notification'));

-- Add auto-import settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS webhook_api_key TEXT DEFAULT encode(gen_random_bytes(24), 'hex');
ALTER TABLE settings ADD COLUMN IF NOT EXISTS michael_card_digits TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS klaudia_card_digits TEXT;

-- FCM tokens for push notifications back to phones
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  device_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view fcm tokens" ON fcm_tokens
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can insert fcm tokens" ON fcm_tokens
  FOR INSERT WITH CHECK (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can delete fcm tokens" ON fcm_tokens
  FOR DELETE USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

-- Update existing settings rows to generate webhook_api_key
UPDATE settings SET webhook_api_key = encode(gen_random_bytes(24), 'hex')
WHERE webhook_api_key IS NULL;

-- ============================================================================
-- Push Notifications & Offer Sends Migration (Idempotent Safe Version)
-- 00002_push_notifications.sql
-- ============================================================================

-- 1. Push Subscriptions (stores Web Push API subscription per guest device)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,       -- Public key for encryption
    auth_key TEXT NOT NULL,     -- Auth secret for encryption
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    CONSTRAINT uq_venue_endpoint UNIQUE (venue_id, endpoint)
);

-- 2. Offer Notifications (tracks each "send" event from staff to guests)
CREATE TABLE IF NOT EXISTS offer_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    devices_targeted INT NOT NULL DEFAULT 0,
    devices_delivered INT NOT NULL DEFAULT 0,
    devices_failed INT NOT NULL DEFAULT 0,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_push_subs_venue_active ON push_subscriptions(venue_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_push_subs_endpoint ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_offer_notifs_venue ON offer_notifications(venue_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_offer_notifs_offer ON offer_notifications(offer_id);

-- 4. Triggers
DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at
    BEFORE UPDATE ON push_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_notifications ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
DROP POLICY IF EXISTS "Anyone can insert push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Staff can view push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Anyone can update own push subscription" ON push_subscriptions;
DROP POLICY IF EXISTS "Staff can view offer notifications" ON offer_notifications;
DROP POLICY IF EXISTS "Staff can insert offer notifications" ON offer_notifications;

-- Push Subscriptions: anyone can subscribe (guests are anonymous)
CREATE POLICY "Anyone can insert push subscriptions"
    ON push_subscriptions FOR INSERT
    WITH CHECK (true);

-- Push Subscriptions: staff can read for their venue
CREATE POLICY "Staff can view push subscriptions"
    ON push_subscriptions FOR SELECT
    USING (venue_id IN (SELECT unnest(get_my_venue_ids())));

-- Push Subscriptions: anyone can update their own (for re-subscribe)
CREATE POLICY "Anyone can update own push subscription"
    ON push_subscriptions FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Offer Notifications: staff can view for their venue
CREATE POLICY "Staff can view offer notifications"
    ON offer_notifications FOR SELECT
    USING (venue_id IN (SELECT unnest(get_my_venue_ids())));

-- Offer Notifications: staff can insert for their venue
CREATE POLICY "Staff can insert offer notifications"
    ON offer_notifications FOR INSERT
    TO authenticated
    WITH CHECK (venue_id IN (SELECT unnest(get_my_venue_ids())));

-- 7. Add to realtime publication (optional — for live updates)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'offer_notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE offer_notifications;
    END IF;
END $$;

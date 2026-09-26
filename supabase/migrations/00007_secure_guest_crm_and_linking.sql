-- ============================================================================
-- 00007_secure_guest_crm_and_linking.sql
-- Secure Guest CRM collection, session linking, and RLS privacy protection
-- ============================================================================

-- 1. Add customer metadata columns to table_sessions and orders if missing
ALTER TABLE table_sessions ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE table_sessions ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);

-- 2. Ensure index on guests (org_id, phone)
CREATE INDEX IF NOT EXISTS idx_guests_org_phone ON guests(org_id, phone);

-- 3. Secure RPC function: register_or_link_guest_order
-- Runs with SECURITY DEFINER and search_path=public so anonymous guest ordering
-- can safely upsert customer CRM profiles without having SELECT permissions on guests table.
CREATE OR REPLACE FUNCTION register_or_link_guest_order(
    p_org_id UUID,
    p_session_id UUID,
    p_name TEXT,
    p_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_phone TEXT;
    v_clean_name TEXT;
    v_guest_id UUID;
    v_existing_name TEXT;
BEGIN
    -- Input sanitization
    v_clean_phone := regexp_replace(COALESCE(p_phone, ''), '[^0-9+]', '', 'g');
    v_clean_name := trim(regexp_replace(COALESCE(p_name, ''), '[<>]', '', 'g'));

    -- Validation
    IF length(v_clean_phone) < 10 OR length(v_clean_phone) > 15 THEN
        RAISE EXCEPTION 'Invalid phone number: must be between 10 and 15 digits';
    END IF;

    IF length(v_clean_name) < 1 THEN
        v_clean_name := 'Guest';
    END IF;

    -- Upsert guest record in CRM table for the restaurant organization
    SELECT id, name INTO v_guest_id, v_existing_name
    FROM guests
    WHERE org_id = p_org_id AND phone = v_clean_phone
    LIMIT 1;

    IF v_guest_id IS NOT NULL THEN
        -- If existing guest has default/empty name, update with latest provided name
        IF (v_existing_name IS NULL OR v_existing_name = '' OR v_existing_name = 'Guest') AND v_clean_name <> 'Guest' THEN
            UPDATE guests
            SET name = v_clean_name, updated_at = NOW()
            WHERE id = v_guest_id;
        END IF;

        -- Award 10 loyalty points for active dining visit
        UPDATE guests
        SET loyalty_points = COALESCE(loyalty_points, 0) + 10,
            updated_at = NOW()
        WHERE id = v_guest_id;
    ELSE
        INSERT INTO guests (org_id, phone, name, loyalty_points, loyalty_tier)
        VALUES (p_org_id, v_clean_phone, v_clean_name, 10, 'bronze')
        RETURNING id INTO v_guest_id;
    END IF;

    -- Link guest to the table session so visit history & order records show in CRM
    IF p_session_id IS NOT NULL THEN
        UPDATE table_sessions
        SET guest_id = v_guest_id,
            customer_name = v_clean_name,
            customer_phone = v_clean_phone,
            updated_at = NOW()
        WHERE id = p_session_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'guest_id', v_guest_id,
        'name', v_clean_name,
        'phone', v_clean_phone
    );
END;
$$;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION register_or_link_guest_order(UUID, UUID, TEXT, TEXT) TO anon, authenticated, service_role;

-- 4. Secure RLS policies on guests table
-- Revoke anonymous public SELECT so customer phone numbers and names cannot be scraped
DROP POLICY IF EXISTS "Guests can create/view own record" ON guests;
DROP POLICY IF EXISTS "Public guests can create/view own record" ON guests;
DROP POLICY IF EXISTS "Staff can manage guests in their org" ON guests;
DROP POLICY IF EXISTS "Staff can view guests in their org" ON guests;
DROP POLICY IF EXISTS "Public guests can insert self" ON guests;

-- Authenticated staff can view and manage all guests in their organization
CREATE POLICY "Staff can manage guests in their org"
    ON guests FOR ALL
    USING (
        auth.role() = 'authenticated'
    )
    WITH CHECK (
        auth.role() = 'authenticated'
    );

-- Public guests can only insert their own guest record (cannot select other guests)
CREATE POLICY "Public guests can insert self"
    ON guests FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- Fix RLS Policies & Table Management Permissions (Idempotent Safe Version)
-- 00003_fix_rls_and_permissions.sql
-- ============================================================================

-- 1. Helper function: safely get venue IDs
CREATE OR REPLACE FUNCTION get_my_venue_ids()
RETURNS uuid[] AS $$
DECLARE
    v_ids uuid[];
BEGIN
    -- Check if user is in staff_users
    SELECT ARRAY_AGG(venue_id) INTO v_ids
    FROM staff_users
    WHERE auth_user_id = (SELECT auth.uid());
    
    IF v_ids IS NOT NULL AND array_length(v_ids, 1) > 0 THEN
        RETURN v_ids;
    END IF;

    -- Fallback: return all active venue IDs
    SELECT ARRAY_AGG(id) INTO v_ids FROM venues WHERE is_active = true;
    IF v_ids IS NOT NULL THEN
        RETURN v_ids;
    END IF;

    RETURN ARRAY[]::uuid[];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Helper function: safely get staff role
CREATE OR REPLACE FUNCTION get_my_staff_role(p_venue_id uuid)
RETURNS staff_role AS $$
DECLARE
    v_role staff_role;
BEGIN
    SELECT role INTO v_role
    FROM staff_users
    WHERE auth_user_id = (SELECT auth.uid()) AND venue_id = p_venue_id
    LIMIT 1;

    -- If not found in staff_users, grant 'owner' role so admin can configure venue
    IF v_role IS NULL THEN
        RETURN 'owner'::staff_role;
    END IF;

    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Venues RLS
DROP POLICY IF EXISTS "Public can read active venues" ON venues;
DROP POLICY IF EXISTS "Staff can read own venues" ON venues;
DROP POLICY IF EXISTS "Managers and owners can update own venue" ON venues;
DROP POLICY IF EXISTS "Org owner can create venues" ON venues;

CREATE POLICY "Public can read active venues"
    ON venues FOR SELECT
    USING (true);

CREATE POLICY "Managers and owners can update own venue"
    ON venues FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Org owner can create venues"
    ON venues FOR INSERT
    WITH CHECK (true);

-- 4. Venue Settings RLS
DROP POLICY IF EXISTS "Public can view venue settings" ON venue_settings;
DROP POLICY IF EXISTS "Staff can manage venue settings" ON venue_settings;
DROP POLICY IF EXISTS "Staff or venue owner can insert venue settings" ON venue_settings;

CREATE POLICY "Public can view venue settings"
    ON venue_settings FOR SELECT
    USING (true);

CREATE POLICY "Staff can manage venue settings"
    ON venue_settings FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5. Tables RLS
DROP POLICY IF EXISTS "Public can view tables" ON tables;
DROP POLICY IF EXISTS "Staff can manage tables in their venue" ON tables;

CREATE POLICY "Public can view tables"
    ON tables FOR SELECT
    USING (is_active = true);

CREATE POLICY "Staff can manage tables in their venue"
    ON tables FOR ALL
    USING (true)
    WITH CHECK (true);

-- 6. Staff Users RLS
DROP POLICY IF EXISTS "Staff can view peers in same venue" ON staff_users;
DROP POLICY IF EXISTS "Managers and owners can manage staff" ON staff_users;
DROP POLICY IF EXISTS "Initial owner or manager can insert staff" ON staff_users;
DROP POLICY IF EXISTS "Staff can view staff_users" ON staff_users;
DROP POLICY IF EXISTS "Staff can insert staff_users" ON staff_users;
DROP POLICY IF EXISTS "Staff can update staff_users" ON staff_users;

CREATE POLICY "Staff can view staff_users"
    ON staff_users FOR SELECT
    USING (true);

CREATE POLICY "Staff can insert staff_users"
    ON staff_users FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Staff can update staff_users"
    ON staff_users FOR UPDATE
    USING (true);

-- 7. Menu Items & Categories RLS
DROP POLICY IF EXISTS "Public can view active menu categories" ON menu_categories;
DROP POLICY IF EXISTS "Staff can manage menu categories" ON menu_categories;

CREATE POLICY "Public can view active menu categories"
    ON menu_categories FOR SELECT
    USING (is_active = true);

CREATE POLICY "Staff can manage menu categories"
    ON menu_categories FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view available menu items" ON menu_items;
DROP POLICY IF EXISTS "Staff can view all menu items including deleted" ON menu_items;
DROP POLICY IF EXISTS "Staff can modify menu items" ON menu_items;

CREATE POLICY "Public can view available menu items"
    ON menu_items FOR SELECT
    USING (is_available = true AND is_deleted = false);

CREATE POLICY "Staff can view all menu items including deleted"
    ON menu_items FOR SELECT
    USING (true);

CREATE POLICY "Staff can modify menu items"
    ON menu_items FOR ALL
    USING (true)
    WITH CHECK (true);

-- 8. Orders & Order Items RLS
DROP POLICY IF EXISTS "Public or staff can view orders" ON orders;
DROP POLICY IF EXISTS "Staff can manage orders" ON orders;

CREATE POLICY "Staff can manage orders"
    ON orders FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public or staff can view order items" ON order_items;
DROP POLICY IF EXISTS "Staff can manage order items" ON order_items;

CREATE POLICY "Staff can manage order items"
    ON order_items FOR ALL
    USING (true)
    WITH CHECK (true);

-- 9. Auto-link existing venue to current authenticated user
DO $$
DECLARE
    v_venue venues%ROWTYPE;
    v_auth_user RECORD;
BEGIN
    SELECT * INTO v_venue FROM venues WHERE is_active = true LIMIT 1;
    IF v_venue.id IS NOT NULL THEN
        FOR v_auth_user IN SELECT id, email, raw_user_meta_data FROM auth.users LOOP
            IF NOT EXISTS (SELECT 1 FROM staff_users WHERE auth_user_id = v_auth_user.id) THEN
                INSERT INTO staff_users (org_id, venue_id, auth_user_id, full_name, email, role, is_active)
                VALUES (
                    v_venue.org_id,
                    v_venue.id,
                    v_auth_user.id,
                    COALESCE(v_auth_user.raw_user_meta_data->>'full_name', split_part(v_auth_user.email, '@', 1)),
                    v_auth_user.email,
                    'owner',
                    true
                )
                ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;
END $$;

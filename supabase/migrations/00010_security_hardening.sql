-- ============================================================================
-- Security Hardening Migration
-- 00010_security_hardening.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. HARDEN SECURITY DEFINER HELPER FUNCTIONS (ELIMINATE INSECURE FALLBACKS)
-- ----------------------------------------------------------------------------

-- Helper 1: Get organization IDs the authenticated user belongs to or owns
CREATE OR REPLACE FUNCTION get_my_org_ids()
RETURNS uuid[] AS $$
DECLARE
    v_org_ids uuid[];
    v_uid uuid;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RETURN ARRAY[]::uuid[];
    END IF;

    SELECT ARRAY_AGG(DISTINCT org_id) INTO v_org_ids
    FROM (
        -- Orgs directly owned
        SELECT id AS org_id FROM organizations WHERE owner_auth_id = v_uid
        UNION
        -- Orgs where user is an active staff member
        SELECT org_id FROM staff_users WHERE auth_user_id = v_uid AND is_active = true
    ) sub;

    RETURN COALESCE(v_org_ids, ARRAY[]::uuid[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper 2: Safely get venue IDs for authenticated user (NO insecure fallback!)
CREATE OR REPLACE FUNCTION get_my_venue_ids()
RETURNS uuid[] AS $$
DECLARE
    v_ids uuid[];
    v_uid uuid;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RETURN ARRAY[]::uuid[];
    END IF;

    SELECT ARRAY_AGG(DISTINCT venue_id) INTO v_ids
    FROM (
        -- Venues where user is an active staff member
        SELECT venue_id FROM staff_users WHERE auth_user_id = v_uid AND is_active = true
        UNION
        -- Venues belonging to an organization owned by the user
        SELECT v.id AS venue_id 
        FROM venues v
        JOIN organizations o ON v.org_id = o.id
        WHERE o.owner_auth_id = v_uid
    ) sub;

    RETURN COALESCE(v_ids, ARRAY[]::uuid[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper 3: Safely get staff role in venue (NO default 'owner' fallback!)
CREATE OR REPLACE FUNCTION get_my_staff_role(p_venue_id uuid)
RETURNS staff_role AS $$
DECLARE
    v_role staff_role;
    v_uid uuid;
    v_is_owner boolean;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RETURN NULL;
    END IF;

    -- Check if user is organization owner of the venue
    SELECT EXISTS (
        SELECT 1 FROM venues v
        JOIN organizations o ON v.org_id = o.id
        WHERE v.id = p_venue_id AND o.owner_auth_id = v_uid
    ) INTO v_is_owner;

    IF v_is_owner THEN
        RETURN 'owner'::staff_role;
    END IF;

    -- Look up active role in staff_users
    SELECT role INTO v_role
    FROM staff_users
    WHERE auth_user_id = v_uid 
      AND venue_id = p_venue_id 
      AND is_active = true
    LIMIT 1;

    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ----------------------------------------------------------------------------
-- 2. HARDEN STAFF_USERS RLS POLICIES (ELIMINATE ARBITRARY ESCALATION & DUMPS)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can view staff_users" ON staff_users;
DROP POLICY IF EXISTS "Staff can insert staff_users" ON staff_users;
DROP POLICY IF EXISTS "Staff can update staff_users" ON staff_users;
DROP POLICY IF EXISTS "Staff can delete staff_users" ON staff_users;
DROP POLICY IF EXISTS "Managers and owners can manage staff" ON staff_users;
DROP POLICY IF EXISTS "Staff can view peers in same venue" ON staff_users;
DROP POLICY IF EXISTS "Initial owner or manager can insert staff" ON staff_users;
DROP POLICY IF EXISTS "Staff can view peers in same venue or own profile" ON staff_users;
DROP POLICY IF EXISTS "Allow staff signup or manager creation" ON staff_users;
DROP POLICY IF EXISTS "Managers can update staff or staff can update own profile" ON staff_users;
DROP POLICY IF EXISTS "Managers and owners can delete staff" ON staff_users;

-- SELECT: Authenticated staff can view their own profile and active colleagues in their venue
CREATE POLICY "Staff can view peers in same venue or own profile"
    ON staff_users FOR SELECT
    TO authenticated
    USING (
        auth_user_id = auth.uid()
        OR venue_id IN (SELECT unnest(get_my_venue_ids()))
    );

-- INSERT: Only owners/managers can add staff, or new users registering as pending staff
CREATE POLICY "Allow staff signup or manager creation"
    ON staff_users FOR INSERT
    TO authenticated
    WITH CHECK (
        -- 1. Org owner or venue manager adding a staff member
        (
            venue_id IN (SELECT unnest(get_my_venue_ids()))
            AND get_my_staff_role(venue_id) IN ('owner', 'manager')
        )
        -- 2. New staff registration (self signup): must be linked to own auth.uid(), created pending
        OR (
            auth_user_id = auth.uid()
            AND is_active = false
            AND role IN ('waiter', 'kitchen', 'manager')
        )
        -- 3. Initial owner creation during restaurant signup
        OR (
            auth_user_id = auth.uid()
            AND role = 'owner'
            AND org_id IN (SELECT id FROM organizations WHERE owner_auth_id = auth.uid())
        )
    );

-- UPDATE: Managers/owners can update staff in their venue, or staff can update their own basic profile (without elevating role)
CREATE POLICY "Managers can update staff or staff can update own profile"
    ON staff_users FOR UPDATE
    TO authenticated
    USING (
        (venue_id IN (SELECT unnest(get_my_venue_ids())) AND get_my_staff_role(venue_id) IN ('owner', 'manager'))
        OR auth_user_id = auth.uid()
    )
    WITH CHECK (
        (venue_id IN (SELECT unnest(get_my_venue_ids())) AND get_my_staff_role(venue_id) IN ('owner', 'manager'))
        OR (
            auth_user_id = auth.uid()
            AND role = (SELECT su.role FROM staff_users su WHERE su.id = staff_users.id)
            AND venue_id = (SELECT su.venue_id FROM staff_users su WHERE su.id = staff_users.id)
        )
    );

-- DELETE: Only managers/owners can delete staff (and cannot delete the organization owner)
CREATE POLICY "Managers and owners can delete staff"
    ON staff_users FOR DELETE
    TO authenticated
    USING (
        venue_id IN (SELECT unnest(get_my_venue_ids()))
        AND get_my_staff_role(venue_id) IN ('owner', 'manager')
        AND auth_user_id NOT IN (
            SELECT o.owner_auth_id FROM organizations o
            JOIN venues v ON v.org_id = o.id
            WHERE v.id = staff_users.venue_id
        )
    );


-- ----------------------------------------------------------------------------
-- 3. HARDEN ORDERS & ORDER_ITEMS RLS POLICIES (ELIMINATE TAMPERING & DELETION)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public guests can create/view orders" ON orders;
DROP POLICY IF EXISTS "Public or staff can view orders" ON orders;
DROP POLICY IF EXISTS "Staff can manage orders" ON orders;
DROP POLICY IF EXISTS "Staff can view and update orders in their venue" ON orders;
DROP POLICY IF EXISTS "Public guests can view and create order items" ON order_items;
DROP POLICY IF EXISTS "Public or staff can view order items" ON order_items;
DROP POLICY IF EXISTS "Staff can manage order items" ON order_items;
DROP POLICY IF EXISTS "Staff can manage order items in their venue" ON order_items;

DROP POLICY IF EXISTS "View orders" ON orders;
DROP POLICY IF EXISTS "Insert orders" ON orders;
DROP POLICY IF EXISTS "Staff can update venue orders" ON orders;
DROP POLICY IF EXISTS "Managers can delete orders" ON orders;

DROP POLICY IF EXISTS "View order items" ON order_items;
DROP POLICY IF EXISTS "Insert order items" ON order_items;
DROP POLICY IF EXISTS "Staff can update order items" ON order_items;
DROP POLICY IF EXISTS "Managers can delete order items" ON order_items;

-- ORDERS: SELECT
CREATE POLICY "View orders"
    ON orders FOR SELECT
    USING (
        -- Staff of this venue
        venue_id IN (SELECT unnest(get_my_venue_ids()))
        -- Public guests viewing orders for active sessions
        OR EXISTS (
            SELECT 1 FROM table_sessions ts
            WHERE ts.id = orders.table_session_id
              AND (ts.status IN ('open', 'active') OR ts.closed_at IS NULL)
        )
    );

-- ORDERS: INSERT
CREATE POLICY "Insert orders"
    ON orders FOR INSERT
    WITH CHECK (
        venue_id IN (SELECT unnest(get_my_venue_ids()))
        OR EXISTS (
            SELECT 1 FROM table_sessions ts
            WHERE ts.id = orders.table_session_id
              AND (ts.status IN ('open', 'active') OR ts.closed_at IS NULL)
        )
    );

-- ORDERS: UPDATE (Restricted to authenticated staff members)
CREATE POLICY "Staff can update venue orders"
    ON orders FOR UPDATE
    TO authenticated
    USING (venue_id IN (SELECT unnest(get_my_venue_ids())))
    WITH CHECK (venue_id IN (SELECT unnest(get_my_venue_ids())));

-- ORDERS: DELETE (Restricted to managers/owners)
CREATE POLICY "Managers can delete orders"
    ON orders FOR DELETE
    TO authenticated
    USING (
        venue_id IN (SELECT unnest(get_my_venue_ids()))
        AND get_my_staff_role(venue_id) IN ('owner', 'manager')
    );

-- ORDER_ITEMS: SELECT
CREATE POLICY "View order items"
    ON order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_items.order_id
              AND (
                  o.venue_id IN (SELECT unnest(get_my_venue_ids()))
                  OR EXISTS (
                      SELECT 1 FROM table_sessions ts
                      WHERE ts.id = o.table_session_id AND (ts.status IN ('open', 'active') OR ts.closed_at IS NULL)
                  )
              )
        )
    );

-- ORDER_ITEMS: INSERT
CREATE POLICY "Insert order items"
    ON order_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_items.order_id
        )
    );

-- ORDER_ITEMS: UPDATE
CREATE POLICY "Staff can update order items"
    ON order_items FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_items.order_id
              AND o.venue_id IN (SELECT unnest(get_my_venue_ids()))
        )
    );

-- ORDER_ITEMS: DELETE
CREATE POLICY "Managers can delete order items"
    ON order_items FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_items.order_id
              AND o.venue_id IN (SELECT unnest(get_my_venue_ids()))
              AND get_my_staff_role(o.venue_id) IN ('owner', 'manager')
        )
    );


-- ----------------------------------------------------------------------------
-- 4. HARDEN VENUES & VENUE_SETTINGS (PROTECT FINANCIAL & BRAND CONFIG)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Managers and owners can update own venue" ON venues;
DROP POLICY IF EXISTS "Staff can manage venue settings" ON venue_settings;
DROP POLICY IF EXISTS "Staff or venue owner can insert venue settings" ON venue_settings;
DROP POLICY IF EXISTS "Managers and owners can update venue settings" ON venue_settings;
DROP POLICY IF EXISTS "Managers and owners can insert venue settings" ON venue_settings;

CREATE POLICY "Managers and owners can update own venue"
    ON venues FOR UPDATE
    TO authenticated
    USING (
        id IN (SELECT unnest(get_my_venue_ids()))
        AND get_my_staff_role(id) IN ('owner', 'manager')
    )
    WITH CHECK (
        id IN (SELECT unnest(get_my_venue_ids()))
        AND get_my_staff_role(id) IN ('owner', 'manager')
    );

CREATE POLICY "Managers and owners can update venue settings"
    ON venue_settings FOR UPDATE
    TO authenticated
    USING (
        venue_id IN (SELECT unnest(get_my_venue_ids()))
        AND get_my_staff_role(venue_id) IN ('owner', 'manager')
    )
    WITH CHECK (
        venue_id IN (SELECT unnest(get_my_venue_ids()))
        AND get_my_staff_role(venue_id) IN ('owner', 'manager')
    );

CREATE POLICY "Managers and owners can insert venue settings"
    ON venue_settings FOR INSERT
    TO authenticated
    WITH CHECK (
        venue_id IN (SELECT unnest(get_my_venue_ids()))
        AND get_my_staff_role(venue_id) IN ('owner', 'manager')
    );


-- ----------------------------------------------------------------------------
-- 5. HARDEN GUESTS CRM (FIX MULTI-TENANT ISOLATION LEAK)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can manage guests in their org" ON guests;
DROP POLICY IF EXISTS "Staff can view and manage guests in own org" ON guests;

CREATE POLICY "Staff can view and manage guests in own org"
    ON guests FOR ALL
    TO authenticated
    USING (
        org_id IN (SELECT unnest(get_my_org_ids()))
    )
    WITH CHECK (
        org_id IN (SELECT unnest(get_my_org_ids()))
    );


-- ----------------------------------------------------------------------------
-- 6. HARDEN STAFF ATTENDANCE (FIX ATTENDANCE SPOOFING & FORGERY)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can clock in" ON staff_attendance;
DROP POLICY IF EXISTS "Staff can update own attendance" ON staff_attendance;
DROP POLICY IF EXISTS "Staff can update attendance" ON staff_attendance;
DROP POLICY IF EXISTS "Managers can manage venue attendance" ON staff_attendance;
DROP POLICY IF EXISTS "Managers can delete attendance" ON staff_attendance;

-- Clock In: Staff can only clock in for themselves, or managers can clock in for venue staff
CREATE POLICY "Staff can clock in"
    ON staff_attendance FOR INSERT
    TO authenticated
    WITH CHECK (
        venue_id IN (SELECT unnest(get_my_venue_ids()))
        AND (
            staff_user_id IN (SELECT id FROM staff_users WHERE auth_user_id = auth.uid())
            OR get_my_staff_role(venue_id) IN ('owner', 'manager')
        )
    );

-- Clock Out / Update: Staff can update their own clock-out, or managers can update all attendance
CREATE POLICY "Staff can update attendance"
    ON staff_attendance FOR UPDATE
    TO authenticated
    USING (
        venue_id IN (SELECT unnest(get_my_venue_ids()))
        AND (
            staff_user_id IN (SELECT id FROM staff_users WHERE auth_user_id = auth.uid())
            OR get_my_staff_role(venue_id) IN ('owner', 'manager')
        )
    )
    WITH CHECK (
        venue_id IN (SELECT unnest(get_my_venue_ids()))
        AND (
            staff_user_id IN (SELECT id FROM staff_users WHERE auth_user_id = auth.uid())
            OR get_my_staff_role(venue_id) IN ('owner', 'manager')
        )
    );

-- Delete: Only managers/owners can delete attendance records
CREATE POLICY "Managers can delete attendance"
    ON staff_attendance FOR DELETE
    TO authenticated
    USING (
        venue_id IN (SELECT unnest(get_my_venue_ids()))
        AND get_my_staff_role(venue_id) IN ('owner', 'manager')
    );


-- ----------------------------------------------------------------------------
-- 7. HARDEN STAFF_CALLS (PREVENT PUBLIC SCRAPING OF SERVICE CALLS)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view staff calls" ON staff_calls;
DROP POLICY IF EXISTS "View staff calls" ON staff_calls;

-- Staff can view all calls for their venue; guests can only check calls created in the last 2 hours
CREATE POLICY "View staff calls"
    ON staff_calls FOR SELECT
    USING (
        venue_id IN (SELECT unnest(get_my_venue_ids()))
        OR (
            created_at > (NOW() - INTERVAL '2 hours')
            AND short_code IS NOT NULL
        )
    );

-- Ensure Realtime publications are clean and complete
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'staff_calls'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE staff_calls;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'staff_attendance'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE staff_attendance;
    END IF;
END $$;

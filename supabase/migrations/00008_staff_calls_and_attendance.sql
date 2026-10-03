-- ============================================================================
-- Staff Calls & Attendance Migration
-- 00008_staff_calls_and_attendance.sql
-- ============================================================================

-- ============================================================================
-- 1. ENUMS
-- ============================================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_call_status') THEN
        CREATE TYPE staff_call_status AS ENUM ('pending', 'acknowledged', 'resolved');
    END IF;
END $$;

-- ============================================================================
-- 2. STAFF CALLS TABLE (Guest → Staff service requests)
-- ============================================================================
CREATE TABLE IF NOT EXISTS staff_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    table_number VARCHAR(50) NOT NULL,
    short_code VARCHAR(20),
    reason VARCHAR(100) NOT NULL,
    notes TEXT,
    status staff_call_status NOT NULL DEFAULT 'pending',
    resolved_by UUID REFERENCES staff_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ
);

-- ============================================================================
-- 3. STAFF ATTENDANCE TABLE (Clock-in / Clock-out records)
-- ============================================================================
CREATE TABLE IF NOT EXISTS staff_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_user_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    clock_in TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    clock_out TIMESTAMPTZ,
    duration_minutes INT,
    work_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ============================================================================
-- 4. PERFORMANCE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_staff_calls_venue_status ON staff_calls(venue_id, status);
CREATE INDEX IF NOT EXISTS idx_staff_calls_venue_created ON staff_calls(venue_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_date ON staff_attendance(staff_user_id, work_date);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_venue_date ON staff_attendance(venue_id, work_date);

-- ============================================================================
-- 5. UPDATE TRIGGERS
-- ============================================================================
DROP TRIGGER IF EXISTS update_staff_attendance_updated_at ON staff_attendance;
CREATE TRIGGER update_staff_attendance_updated_at
    BEFORE UPDATE ON staff_attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. ENABLE RLS
-- ============================================================================
ALTER TABLE staff_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. RLS POLICIES — Staff Calls
-- ============================================================================

-- Public (guests) can insert service calls without authentication
DROP POLICY IF EXISTS "Public guests can create staff calls" ON staff_calls;
CREATE POLICY "Public guests can create staff calls"
    ON staff_calls FOR INSERT
    WITH CHECK (true);

-- Public can read their own call status (for confirmation on guest side)
DROP POLICY IF EXISTS "Public can view staff calls" ON staff_calls;
CREATE POLICY "Public can view staff calls"
    ON staff_calls FOR SELECT
    USING (true);

-- Staff can read calls for their venue
DROP POLICY IF EXISTS "Staff can view venue calls" ON staff_calls;
CREATE POLICY "Staff can view venue calls"
    ON staff_calls FOR SELECT
    USING (venue_id IN (SELECT unnest(get_my_venue_ids())));

-- Staff can update (acknowledge / resolve) calls for their venue
DROP POLICY IF EXISTS "Staff can update venue calls" ON staff_calls;
CREATE POLICY "Staff can update venue calls"
    ON staff_calls FOR UPDATE
    USING (venue_id IN (SELECT unnest(get_my_venue_ids())));

-- ============================================================================
-- 8. RLS POLICIES — Staff Attendance
-- ============================================================================

-- Staff can view attendance for their venue
DROP POLICY IF EXISTS "Staff can view venue attendance" ON staff_attendance;
CREATE POLICY "Staff can view venue attendance"
    ON staff_attendance FOR SELECT
    USING (venue_id IN (SELECT unnest(get_my_venue_ids())));

-- Staff can insert their own attendance records
DROP POLICY IF EXISTS "Staff can clock in" ON staff_attendance;
CREATE POLICY "Staff can clock in"
    ON staff_attendance FOR INSERT
    TO authenticated
    WITH CHECK (
        venue_id IN (SELECT unnest(get_my_venue_ids()))
    );

-- Staff can update their own attendance (clock out)
DROP POLICY IF EXISTS "Staff can update own attendance" ON staff_attendance;
CREATE POLICY "Staff can update own attendance"
    ON staff_attendance FOR UPDATE
    USING (
        venue_id IN (SELECT unnest(get_my_venue_ids()))
    );

-- Managers/owners can manage all attendance for their venue
DROP POLICY IF EXISTS "Managers can manage venue attendance" ON staff_attendance;
CREATE POLICY "Managers can manage venue attendance"
    ON staff_attendance FOR ALL
    USING (
        venue_id IN (SELECT unnest(get_my_venue_ids())) AND
        get_my_staff_role(venue_id) IN ('owner', 'manager')
    );

-- ============================================================================
-- 9. REALTIME PUBLICATION & REPLICA IDENTITY
-- ============================================================================
ALTER TABLE staff_calls REPLICA IDENTITY FULL;
ALTER TABLE staff_attendance REPLICA IDENTITY FULL;

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


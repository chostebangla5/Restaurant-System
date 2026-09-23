-- ============================================================================
-- 00005_staff_delete_and_approval_rls.sql
-- Fix DELETE and UPDATE permissions on staff_users and support pending approvals
-- ============================================================================

-- 1. Drop existing restrictive staff_users policies
DROP POLICY IF EXISTS "Staff can delete staff_users" ON staff_users;
DROP POLICY IF EXISTS "Staff can view staff_users" ON staff_users;
DROP POLICY IF EXISTS "Staff can insert staff_users" ON staff_users;
DROP POLICY IF EXISTS "Staff can update staff_users" ON staff_users;
DROP POLICY IF EXISTS "Managers and owners can manage staff" ON staff_users;
DROP POLICY IF EXISTS "Staff can view peers in same venue" ON staff_users;
DROP POLICY IF EXISTS "Initial owner or manager can insert staff" ON staff_users;

-- 2. Comprehensive policies for staff_users:
-- Allow SELECT for all authenticated and anon staff operations
CREATE POLICY "Staff can view staff_users"
    ON staff_users FOR SELECT
    USING (true);

-- Allow INSERT for new registrations / team invitations
CREATE POLICY "Staff can insert staff_users"
    ON staff_users FOR INSERT
    WITH CHECK (true);

-- Allow UPDATE for role changes, activation, duty toggling
CREATE POLICY "Staff can update staff_users"
    ON staff_users FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Allow DELETE for staff removal / request rejection
CREATE POLICY "Staff can delete staff_users"
    ON staff_users FOR DELETE
    USING (true);

-- Enable Realtime for staff_users so role and status changes reflect instantly across devices
ALTER PUBLICATION supabase_realtime ADD TABLE staff_users;

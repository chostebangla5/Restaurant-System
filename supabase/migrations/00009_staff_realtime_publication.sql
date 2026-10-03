-- ============================================================================
-- Enable Supabase Realtime & Replica Identity for Staff Calls & Attendance
-- 00009_staff_realtime_publication.sql
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

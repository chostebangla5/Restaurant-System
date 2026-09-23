-- ============================================================================
-- Migration: Add 'active' to session_status enum if not already present
-- 00004_allow_active_session_status.sql
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'session_status' AND e.enumlabel = 'active'
    ) THEN
        ALTER TYPE session_status ADD VALUE 'active';
    END IF;
END $$;

-- ============================================================================
-- 00006_auto_confirm_staff_users.sql
-- Auto-confirm all unconfirmed auth users and automatically confirm staff on sign-up
-- ============================================================================

-- 1. Immediately confirm all existing unconfirmed accounts in auth.users
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- 2. Trigger function to auto-confirm new staff accounts in auth.users
CREATE OR REPLACE FUNCTION auto_confirm_staff_user()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = NEW.auth_user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach trigger to staff_users on insert and update
DROP TRIGGER IF EXISTS trigger_auto_confirm_staff ON staff_users;
CREATE TRIGGER trigger_auto_confirm_staff
    AFTER INSERT OR UPDATE ON staff_users
    FOR EACH ROW
    EXECUTE FUNCTION auto_confirm_staff_user();

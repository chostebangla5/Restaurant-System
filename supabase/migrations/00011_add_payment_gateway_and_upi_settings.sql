-- ============================================================================
-- Payment Gateway & UPI Settings Migration
-- 00011_add_payment_gateway_and_upi_settings.sql
-- ============================================================================

-- Add UPI configuration fields to venues table
ALTER TABLE venues ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS upi_merchant_name VARCHAR(255);

-- Add UPI & Gateway configuration fields to venue_settings table
ALTER TABLE venue_settings ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);
ALTER TABLE venue_settings ADD COLUMN IF NOT EXISTS upi_merchant_name VARCHAR(255);
ALTER TABLE venue_settings ADD COLUMN IF NOT EXISTS razorpay_key_id VARCHAR(100);
ALTER TABLE venue_settings ADD COLUMN IF NOT EXISTS enable_upi_intent BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE venue_settings ADD COLUMN IF NOT EXISTS enable_online_payment BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE venue_settings ADD COLUMN IF NOT EXISTS fallback_to_counter_on_failure BOOLEAN NOT NULL DEFAULT true;

-- Comment on columns for clear documentation
COMMENT ON COLUMN venue_settings.upi_id IS 'Virtual Payment Address (VPA) for receiving direct UPI payments (e.g. restaurant@okaxis)';
COMMENT ON COLUMN venue_settings.upi_merchant_name IS 'Business / Restaurant display name shown inside GPay, PhonePe, and Paytm';
COMMENT ON COLUMN venue_settings.razorpay_key_id IS 'Optional Razorpay Key ID for automated payment verification';
COMMENT ON COLUMN venue_settings.enable_upi_intent IS 'When true, mobile browsers will launch UPI apps directly on payment attempt';
COMMENT ON COLUMN venue_settings.fallback_to_counter_on_failure IS 'When true, orders that fail online payment will automatically convert to Pay at Counter and succeed';

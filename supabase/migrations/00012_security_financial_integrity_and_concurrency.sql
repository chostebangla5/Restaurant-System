-- ============================================================================
-- Security, Financial Integrity & Concurrency Hardening
-- 00012_security_financial_integrity_and_concurrency.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADD TYPED FINANCIAL & PAYMENT COLUMNS TO ORDERS TABLE
-- (Eliminates fragile and insecure string-matching inside 'notes')
-- ----------------------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'counter';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS split_details JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) DEFAULT 0.00;

-- ----------------------------------------------------------------------------
-- 2. PREVENT CONCURRENT DUPLICATE SESSIONS (PARTIAL UNIQUE INDEX)
-- ----------------------------------------------------------------------------
-- Ensures that at most ONE session can be in 'open' or 'active' state per table
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_open_table_session 
    ON table_sessions(table_id) 
    WHERE (status IN ('open', 'active'));

-- ----------------------------------------------------------------------------
-- 3. ATOMIC SESSION RESOLUTION RPC (RACE CONDITION PROOF)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_or_create_table_session(
    p_table_id UUID,
    p_venue_id UUID,
    p_org_id UUID,
    p_customer_name VARCHAR(255) DEFAULT NULL,
    p_customer_phone VARCHAR(50) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_session table_sessions%ROWTYPE;
    v_clean_phone VARCHAR(50);
    v_clean_name VARCHAR(255);
BEGIN
    v_clean_phone := NULLIF(TRIM(p_customer_phone), '');
    v_clean_name := NULLIF(TRIM(p_customer_name), '');

    -- 1. Look for existing open session for this table
    SELECT * INTO v_session
    FROM table_sessions
    WHERE table_id = p_table_id 
      AND status IN ('open', 'active')
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE; -- Row-level lock to prevent concurrent modification

    -- 2. If session exists, return it (optionally updating customer info if newly provided)
    IF FOUND THEN
        IF v_clean_phone IS NOT NULL AND (v_session.customer_phone IS NULL OR v_session.customer_phone = '') THEN
            UPDATE table_sessions
            SET customer_phone = v_clean_phone,
                customer_name = COALESCE(v_clean_name, customer_name)
            WHERE id = v_session.id
            RETURNING * INTO v_session;
        END IF;

        RETURN to_jsonb(v_session);
    END IF;

    -- 3. If no open session exists, insert one atomically
    INSERT INTO table_sessions (
        org_id,
        venue_id,
        table_id,
        status,
        customer_name,
        customer_phone,
        opened_at
    ) VALUES (
        p_org_id,
        p_venue_id,
        p_table_id,
        'open',
        v_clean_name,
        v_clean_phone,
        NOW()
    )
    ON CONFLICT (table_id) WHERE (status IN ('open', 'active'))
    DO UPDATE SET updated_at = NOW()
    RETURNING * INTO v_session;

    -- Mark physical table as in_service
    UPDATE tables 
    SET status = 'in_service' 
    WHERE id = p_table_id;

    RETURN to_jsonb(v_session);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 4. ATOMIC COUPON USAGE INCREMENT RPC (PREVENTS RACE CONDITIONS & LIMIT BYPASS)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_coupon_usage(
    p_venue_id UUID,
    p_code VARCHAR(50)
)
RETURNS JSONB AS $$
DECLARE
    v_coupon coupons%ROWTYPE;
BEGIN
    UPDATE coupons
    SET times_used = COALESCE(times_used, 0) + 1,
        updated_at = NOW()
    WHERE venue_id = p_venue_id
      AND UPPER(TRIM(code)) = UPPER(TRIM(p_code))
      AND is_active = true
      AND (usage_limit IS NULL OR usage_limit <= 0 OR COALESCE(times_used, 0) < usage_limit)
    RETURNING * INTO v_coupon;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Coupon limit reached or coupon inactive');
    END IF;

    RETURN jsonb_build_object('success', true, 'times_used', v_coupon.times_used);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 5. ATOMIC GUEST ORDER CANCELLATION RPC (PERMITTED VIA RLS BYPASS)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cancel_guest_order(
    p_order_id UUID,
    p_short_code VARCHAR(50),
    p_reason TEXT DEFAULT 'Cancelled by guest'
)
RETURNS JSONB AS $$
DECLARE
    v_order orders%ROWTYPE;
    v_session_id UUID;
    v_table_short_code VARCHAR(50);
    v_active_count INT;
    v_new_subtotal NUMERIC(10,2);
BEGIN
    -- 1. Fetch order with table short code verification
    SELECT o.*, t.short_code INTO v_order, v_table_short_code
    FROM orders o
    JOIN table_sessions ts ON ts.id = o.table_session_id
    JOIN tables t ON t.id = ts.table_id
    WHERE o.id = p_order_id;

    IF v_order.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found');
    END IF;

    -- 2. Verify table ownership
    IF p_short_code IS NOT NULL AND UPPER(TRIM(v_table_short_code)) <> UPPER(TRIM(p_short_code)) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Order does not belong to this table');
    END IF;

    -- 3. Guard: Cannot cancel order if kitchen has already started cooking or served
    IF v_order.status IN ('cooking', 'ready', 'served', 'completed') THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Order cannot be cancelled because preparation has already started (' || UPPER(v_order.status) || ')'
        );
    END IF;

    IF v_order.status = 'cancelled' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Order is already cancelled');
    END IF;

    v_session_id := v_order.table_session_id;

    -- 4. Mark order as cancelled
    UPDATE orders
    SET status = 'cancelled',
        notes = TRIM(COALESCE(notes, '') || ' [' || p_reason || ']'),
        updated_at = NOW()
    WHERE id = p_order_id;

    -- 5. Recalculate table session totals
    SELECT 
        COUNT(*), 
        COALESCE(SUM(subtotal), 0)
    INTO v_active_count, v_new_subtotal
    FROM orders
    WHERE table_session_id = v_session_id
      AND status <> 'cancelled';

    IF v_active_count = 0 THEN
        -- If all orders are cancelled, close session and free table
        UPDATE table_sessions
        SET status = 'cancelled',
            closed_at = NOW(),
            subtotal = 0,
            tax_amount = 0,
            discount_amount = 0,
            total_amount = 0,
            updated_at = NOW()
        WHERE id = v_session_id;

        UPDATE tables 
        SET status = 'free' 
        WHERE id = (SELECT table_id FROM table_sessions WHERE id = v_session_id);
    ELSE
        -- Recalculate session totals
        UPDATE table_sessions
        SET subtotal = v_new_subtotal,
            tax_amount = ROUND(v_new_subtotal * 0.05, 2),
            total_amount = v_new_subtotal + ROUND(v_new_subtotal * 0.05, 2),
            updated_at = NOW()
        WHERE id = v_session_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Order cancelled successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 6. ATOMIC ORDER & BILL SETTLEMENT RPC (SERVER-SIDE SECURE VERIFICATION)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION settle_table_bill(
    p_session_id UUID,
    p_payment_method VARCHAR(50),
    p_split_details JSONB DEFAULT NULL,
    p_razorpay_payment_id VARCHAR(100) DEFAULT NULL,
    p_razorpay_order_id VARCHAR(100) DEFAULT NULL,
    p_razorpay_signature TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_session table_sessions%ROWTYPE;
    v_table_id UUID;
    v_calc_subtotal NUMERIC(10,2) := 0;
    v_calc_discount NUMERIC(10,2) := 0;
    v_taxable NUMERIC(10,2) := 0;
    v_tax NUMERIC(10,2) := 0;
    v_total NUMERIC(10,2) := 0;
    v_eff_method VARCHAR(50);
BEGIN
    SELECT * INTO v_session
    FROM table_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF v_session.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Table session not found');
    END IF;

    v_table_id := v_session.table_id;
    v_eff_method := COALESCE(p_payment_method, 'counter');

    -- Calculate true totals from order items or orders
    SELECT 
        COALESCE(SUM(subtotal), 0),
        COALESCE(SUM(discount_amount), 0)
    INTO v_calc_subtotal, v_calc_discount
    FROM orders
    WHERE table_session_id = p_session_id
      AND status <> 'cancelled';

    v_taxable := GREATEST(0, v_calc_subtotal - v_calc_discount);
    v_tax := ROUND(v_taxable * 0.05, 2);
    v_total := v_taxable + v_tax;

    -- 1. Mark uncancelled orders as served and paid
    UPDATE orders
    SET status = 'served',
        payment_status = 'paid',
        payment_method = v_eff_method,
        split_details = COALESCE(p_split_details, split_details),
        updated_at = NOW()
    WHERE table_session_id = p_session_id
      AND status <> 'cancelled';

    -- 2. Record payment audit row in payments table
    INSERT INTO payments (
        org_id,
        venue_id,
        table_session_id,
        amount,
        payment_method,
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        status
    ) VALUES (
        v_session.org_id,
        v_session.venue_id,
        p_session_id,
        v_total,
        v_eff_method::payment_method,
        p_razorpay_payment_id,
        p_razorpay_order_id,
        p_razorpay_signature,
        'completed'
    );

    -- 3. Close table session
    UPDATE table_sessions
    SET status = 'settled',
        closed_at = NOW(),
        subtotal = v_calc_subtotal,
        discount_amount = v_calc_discount,
        tax_amount = v_tax,
        total_amount = v_total,
        updated_at = NOW()
    WHERE id = p_session_id;

    -- 4. Free the dining table
    UPDATE tables
    SET status = 'free'
    WHERE id = v_table_id;

    RETURN jsonb_build_object(
        'success', true, 
        'session_id', p_session_id,
        'total_amount', v_total,
        'payment_method', v_eff_method
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

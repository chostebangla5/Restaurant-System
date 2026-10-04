-- ============================================================================
-- Migration: 00014_performance_indexes_and_batch_rpcs.sql
-- Description: Adds high-performance composite indexes for order queries,
--              invoice lookups, guest history scans, and atomic RPCs for
--              batch reordering and single-transaction table settlement.
-- ============================================================================

-- ─── 1. PERFORMANCE INDEXES ───────────────────────────────────────────────────

-- 1a. Fast lookup and sorting for active & historical orders by venue
CREATE INDEX IF NOT EXISTS idx_orders_venue_created
    ON public.orders (venue_id, created_at DESC);

-- 1b. Fast lookup of previous orders by customer phone in guest portal
CREATE INDEX IF NOT EXISTS idx_orders_venue_customer_phone
    ON public.orders (venue_id, customer_phone);

-- 1c. Fast lookup and sorting for invoices list and stats
CREATE INDEX IF NOT EXISTS idx_invoices_venue_created
    ON public.invoices (venue_id, created_at DESC);

-- 1d. Fast lookup for guest CRM session history
CREATE INDEX IF NOT EXISTS idx_table_sessions_guest_id
    ON public.table_sessions (guest_id);

-- 1e. Fast lookup for guest CRM directory sorting
CREATE INDEX IF NOT EXISTS idx_guests_org_created
    ON public.guests (org_id, created_at DESC);

-- 1f. Foreign key index on order_items(menu_item_id) for item analytics
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id
    ON public.order_items (menu_item_id);

-- 1g. Fast sorting of feedback reviews
CREATE INDEX IF NOT EXISTS idx_feedback_venue_created
    ON public.feedback (venue_id, created_at DESC);


-- ─── 2. BATCH REORDER RPC ────────────────────────────────────────────────────
-- Reorders menu categories in a single atomic transaction instead of N round-trips
CREATE OR REPLACE FUNCTION public.batch_reorder_categories(
    p_category_ids UUID[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    i INT;
BEGIN
    IF p_category_ids IS NULL OR array_length(p_category_ids, 1) = 0 THEN
        RETURN jsonb_build_object('success', true, 'updated', 0);
    END IF;

    FOR i IN 1 .. array_length(p_category_ids, 1) LOOP
        UPDATE public.menu_categories
        SET sort_order = i - 1,
            updated_at = TIMEZONE('utc'::text, NOW())
        WHERE id = p_category_ids[i];
    END LOOP;

    RETURN jsonb_build_object('success', true, 'updated', array_length(p_category_ids, 1));
END;
$$;


-- ─── 3. ATOMIC TABLE SESSION SETTLEMENT RPC ──────────────────────────────────
-- Consolidates up to 10 sequential client-side HTTP calls into 1 atomic DB transaction
CREATE OR REPLACE FUNCTION public.settle_table_session(
    p_order_id UUID,
    p_payment_method VARCHAR DEFAULT 'cash',
    p_split_online NUMERIC DEFAULT 0,
    p_split_cash NUMERIC DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order public.orders%ROWTYPE;
    v_session public.table_sessions%ROWTYPE;
    v_invoice public.invoices%ROWTYPE;
    v_invoice_num TEXT;
    v_date_str TEXT;
    v_seq_count INT;
    v_seq_str TEXT;
    v_rand_str TEXT;
    v_subtotal NUMERIC := 0;
    v_tax NUMERIC := 0;
    v_discount NUMERIC := 0;
    v_total NUMERIC := 0;
    v_order_count INT := 0;
BEGIN
    -- 1. Fetch target order
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found');
    END IF;

    -- 2. Fetch associated table session
    IF v_order.table_session_id IS NOT NULL THEN
        SELECT * INTO v_session
        FROM public.table_sessions
        WHERE id = v_order.table_session_id
        FOR UPDATE;
    END IF;

    -- 3. Mark all orders in this session as completed & paid
    IF v_session.id IS NOT NULL THEN
        -- Calculate totals across non-cancelled orders
        SELECT 
            COALESCE(SUM(subtotal), 0),
            COALESCE(SUM(tax_amount), 0),
            COALESCE(SUM(discount_amount), 0),
            COALESCE(SUM(total_amount), 0),
            COUNT(*)
        INTO v_subtotal, v_tax, v_discount, v_total, v_order_count
        FROM public.orders
        WHERE table_session_id = v_session.id
          AND status != 'cancelled';

        -- Update all orders in the session
        UPDATE public.orders
        SET status = 'completed',
            payment_status = 'paid',
            updated_at = TIMEZONE('utc'::text, NOW())
        WHERE table_session_id = v_session.id
          AND status != 'cancelled';

        -- Update session status
        UPDATE public.table_sessions
        SET status = 'settled',
            subtotal = v_subtotal,
            tax_amount = v_tax,
            discount_amount = v_discount,
            total_amount = v_total,
            closed_at = TIMEZONE('utc'::text, NOW()),
            updated_at = TIMEZONE('utc'::text, NOW())
        WHERE id = v_session.id;

        -- Free the table
        IF v_session.table_id IS NOT NULL THEN
            UPDATE public.tables
            SET status = 'free',
                updated_at = TIMEZONE('utc'::text, NOW())
            WHERE id = v_session.table_id;
        END IF;
    ELSE
        -- Fallback if order has no session
        v_subtotal := COALESCE(v_order.subtotal, 0);
        v_tax := COALESCE(v_order.tax_amount, 0);
        v_discount := COALESCE(v_order.discount_amount, 0);
        v_total := COALESCE(v_order.total_amount, v_subtotal + v_tax - v_discount);

        UPDATE public.orders
        SET status = 'completed',
            payment_status = 'paid',
            updated_at = TIMEZONE('utc'::text, NOW())
        WHERE id = v_order.id;
    END IF;

    -- 4. Idempotently generate invoice
    IF v_session.id IS NOT NULL THEN
        SELECT * INTO v_invoice
        FROM public.invoices
        WHERE table_session_id = v_session.id;

        IF NOT FOUND THEN
            v_date_str := to_char(CURRENT_DATE, 'YYYYMMDD');
            SELECT COUNT(*) INTO v_seq_count
            FROM public.invoices
            WHERE venue_id = v_order.venue_id
              AND created_at >= CURRENT_DATE::TIMESTAMPTZ;

            v_seq_str := lpad((v_seq_count + 1)::TEXT, 4, '0');
            v_rand_str := upper(substr(md5(random()::TEXT), 1, 3));
            v_invoice_num := 'INV-' || v_date_str || '-' || v_seq_str || '-' || v_rand_str;

            INSERT INTO public.invoices (
                org_id,
                venue_id,
                table_session_id,
                invoice_number,
                subtotal,
                tax_amount,
                discount_amount,
                total_amount,
                issued_at
            ) VALUES (
                COALESCE(v_session.org_id, v_order.org_id),
                v_order.venue_id,
                v_session.id,
                v_invoice_num,
                v_subtotal,
                v_tax,
                v_discount,
                v_total,
                TIMEZONE('utc'::text, NOW())
            )
            RETURNING * INTO v_invoice;
        END IF;
    END IF;

    -- 5. Record payment
    IF p_payment_method = 'split' THEN
        IF p_split_online > 0 THEN
            INSERT INTO public.payments (
                org_id, venue_id, table_session_id, amount, payment_method, status
            ) VALUES (
                COALESCE(v_session.org_id, v_order.org_id),
                v_order.venue_id,
                v_session.id,
                p_split_online,
                'upi',
                'completed'
            );
        END IF;
        IF p_split_cash > 0 THEN
            INSERT INTO public.payments (
                org_id, venue_id, table_session_id, amount, payment_method, status
            ) VALUES (
                COALESCE(v_session.org_id, v_order.org_id),
                v_order.venue_id,
                v_session.id,
                p_split_cash,
                'cash',
                'completed'
            );
        END IF;
    ELSE
        INSERT INTO public.payments (
            org_id, venue_id, table_session_id, amount, payment_method, status
        ) VALUES (
            COALESCE(v_session.org_id, v_order.org_id),
            v_order.venue_id,
            v_session.id,
            v_total,
            COALESCE(NULLIF(p_payment_method, ''), 'cash'),
            'completed'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order.id,
        'session_id', v_session.id,
        'invoice_number', v_invoice.invoice_number,
        'total', v_total
    );
END;
$$;

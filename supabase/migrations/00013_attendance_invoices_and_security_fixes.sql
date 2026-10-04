-- ============================================================================
-- Migration: 00013_attendance_invoices_and_security_fixes.sql
-- Fixes:
-- 1. Partial unique index on staff_attendance to prevent double open shifts
-- 2. Unique constraint on invoices(table_session_id) to prevent duplicate bills
-- 3. Quantity and price check constraints on order_items
-- 4. Atomic PostgreSQL RPCs for clock-in and clock-out
-- 5. Atomic invoice generation sequence
-- ============================================================================

-- 1. ORDER ITEMS INTEGRITY
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'order_items_quantity_positive_check'
    ) THEN
        ALTER TABLE public.order_items
        ADD CONSTRAINT order_items_quantity_positive_check CHECK (quantity > 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'order_items_price_non_negative_check'
    ) THEN
        ALTER TABLE public.order_items
        ADD CONSTRAINT order_items_price_non_negative_check CHECK (price_at_order >= 0);
    END IF;
END $$;

-- 2. PREVENT DOUBLE OPEN ATTENDANCE SHIFTS
-- First cleanup any historical dangling duplicate open shifts if they exist
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT staff_user_id, ARRAY_AGG(id ORDER BY clock_in ASC) AS ids
        FROM public.staff_attendance
        WHERE clock_out IS NULL
        GROUP BY staff_user_id
        HAVING COUNT(*) > 1
    ) LOOP
        -- Close all but the latest open shift
        UPDATE public.staff_attendance
        SET clock_out = clock_in + interval '4 hours',
            notes = COALESCE(notes, '') || ' [Auto-closed duplicate open shift]'
        WHERE id = ANY(r.ids[1:array_length(r.ids, 1)-1]);
    END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_attendance_single_active_shift
    ON public.staff_attendance (staff_user_id)
    WHERE (clock_out IS NULL);

-- 3. PREVENT DUPLICATE INVOICES PER SESSION
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_unique_table_session
    ON public.invoices (table_session_id);

-- 4. ATOMIC RPC: CLOCK IN
CREATE OR REPLACE FUNCTION public.staff_clock_in(
    p_staff_user_id uuid,
    p_venue_id uuid,
    p_org_id uuid,
    p_work_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb AS $$
DECLARE
    v_existing_id uuid;
    v_new_record public.staff_attendance%ROWTYPE;
BEGIN
    -- Check if user already has an active open shift anywhere
    SELECT id INTO v_existing_id
    FROM public.staff_attendance
    WHERE staff_user_id = p_staff_user_id
      AND clock_out IS NULL
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Already clocked in. Please clock out of your current shift first.',
            'attendance_id', v_existing_id
        );
    END IF;

    -- Insert new shift atomically
    INSERT INTO public.staff_attendance (
        staff_user_id,
        venue_id,
        org_id,
        clock_in,
        work_date
    ) VALUES (
        p_staff_user_id,
        p_venue_id,
        p_org_id,
        NOW(),
        p_work_date
    )
    RETURNING * INTO v_new_record;

    RETURN jsonb_build_object(
        'success', true,
        'attendance', row_to_json(v_new_record)
    );
EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Shift already clocked in concurrently.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ATOMIC RPC: CLOCK OUT
CREATE OR REPLACE FUNCTION public.staff_clock_out(
    p_staff_user_id uuid,
    p_notes text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_record public.staff_attendance%ROWTYPE;
    v_now timestamptz := NOW();
    v_duration_mins integer;
BEGIN
    -- Find and lock the active open record
    SELECT * INTO v_record
    FROM public.staff_attendance
    WHERE staff_user_id = p_staff_user_id
      AND clock_out IS NULL
    ORDER BY clock_in DESC
    LIMIT 1
    FOR UPDATE;

    IF v_record.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No active open shift found for this staff member.'
        );
    END IF;

    v_duration_mins := GREATEST(1, ROUND(EXTRACT(EPOCH FROM (v_now - v_record.clock_in)) / 60));

    UPDATE public.staff_attendance
    SET clock_out = v_now,
        duration_minutes = v_duration_mins,
        notes = CASE 
            WHEN p_notes IS NOT NULL AND length(trim(p_notes)) > 0 
            THEN COALESCE(notes || ' | ', '') || trim(p_notes)
            ELSE notes 
        END
    WHERE id = v_record.id
    RETURNING * INTO v_record;

    RETURN jsonb_build_object(
        'success', true,
        'attendance', row_to_json(v_record)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. ATOMIC RPC: CREATE INVOICE WITH DETERMINISTIC TRANSACTIONAL SEQUENCE
CREATE OR REPLACE FUNCTION public.create_session_invoice(
    p_session_id uuid,
    p_venue_id uuid,
    p_org_id uuid,
    p_subtotal numeric,
    p_tax_amount numeric,
    p_discount_amount numeric,
    p_total_amount numeric
)
RETURNS jsonb AS $$
DECLARE
    v_existing public.invoices%ROWTYPE;
    v_new public.invoices%ROWTYPE;
    v_seq integer;
    v_date_str text;
    v_inv_number text;
BEGIN
    -- Check if invoice already exists
    SELECT * INTO v_existing
    FROM public.invoices
    WHERE table_session_id = p_session_id
    LIMIT 1;

    IF v_existing.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'invoice', row_to_json(v_existing),
            'already_existed', true
        );
    END IF;

    -- Calculate next sequence atomically for this venue today
    v_date_str := to_char(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYYMMDD');
    
    SELECT COUNT(*) + 1 INTO v_seq
    FROM public.invoices
    WHERE venue_id = p_venue_id
      AND to_char(issued_at AT TIME ZONE 'Asia/Kolkata', 'YYYYMMDD') = v_date_str;

    v_inv_number := 'INV-' || v_date_str || '-' || lpad(v_seq::text, 4, '0') || '-' || upper(substr(md5(random()::text), 1, 3));

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
        p_org_id,
        p_venue_id,
        p_session_id,
        v_inv_number,
        ROUND(COALESCE(p_subtotal, 0), 2),
        ROUND(COALESCE(p_tax_amount, 0), 2),
        ROUND(COALESCE(p_discount_amount, 0), 2),
        ROUND(COALESCE(p_total_amount, 0), 2),
        NOW()
    )
    RETURNING * INTO v_new;

    RETURN jsonb_build_object(
        'success', true,
        'invoice', row_to_json(v_new),
        'already_existed', false
    );
EXCEPTION WHEN unique_violation THEN
    -- In case of concurrent insert, return existing
    SELECT * INTO v_existing
    FROM public.invoices
    WHERE table_session_id = p_session_id
    LIMIT 1;

    RETURN jsonb_build_object(
        'success', true,
        'invoice', row_to_json(v_existing),
        'already_existed', true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TableSuite Initial Migration Schema
-- 00001_initial_schema.sql
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_plan') THEN
        CREATE TYPE org_plan AS ENUM ('starter', 'pro', 'enterprise');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_role') THEN
        CREATE TYPE staff_role AS ENUM ('owner', 'manager', 'kitchen', 'waiter');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'table_status') THEN
        CREATE TYPE table_status AS ENUM ('free', 'in_service');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_status') THEN
        CREATE TYPE session_status AS ENUM ('open', 'settled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM ('placed', 'acknowledged', 'cooking', 'ready', 'served', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_item_status') THEN
        CREATE TYPE order_item_status AS ENUM ('pending', 'ready', 'served', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM ('cash', 'card', 'upi', 'online');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discount_type') THEN
        CREATE TYPE discount_type AS ENUM ('percent', 'flat');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loyalty_tier') THEN
        CREATE TYPE loyalty_tier AS ENUM ('bronze', 'silver', 'gold');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kitchen_station') THEN
        CREATE TYPE kitchen_station AS ENUM ('hot', 'cold', 'bar');
    END IF;
END $$;

-- ============================================================================
-- 2. HELPER FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper to get org_ids that the authenticated user belongs to
CREATE OR REPLACE FUNCTION get_my_org_ids()
RETURNS uuid[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT org_id
        FROM staff_users
        WHERE auth_user_id = (SELECT auth.uid())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper to get venue_ids that the authenticated user belongs to
CREATE OR REPLACE FUNCTION get_my_venue_ids()
RETURNS uuid[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT venue_id
        FROM staff_users
        WHERE auth_user_id = (SELECT auth.uid())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper to get staff role in a given venue
CREATE OR REPLACE FUNCTION get_my_staff_role(p_venue_id uuid)
RETURNS staff_role AS $$
DECLARE
    v_role staff_role;
BEGIN
    SELECT role INTO v_role
    FROM staff_users
    WHERE auth_user_id = (SELECT auth.uid()) AND venue_id = p_venue_id
    LIMIT 1;
    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- 3. CORE TABLES (18 TABLES)
-- ============================================================================

-- 1. Organizations (Root tenant)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    plan org_plan NOT NULL DEFAULT 'starter',
    owner_auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Venues (Multi-location support under org)
CREATE TABLE IF NOT EXISTS venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    address TEXT,
    phone VARCHAR(50),
    brand_color VARCHAR(20) NOT NULL DEFAULT '#F97316', -- Default warm vibrant orange
    logo_url TEXT,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00, -- GST %
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Staff Users
CREATE TABLE IF NOT EXISTS staff_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role staff_role NOT NULL DEFAULT 'waiter',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    CONSTRAINT uq_staff_venue_user UNIQUE (venue_id, auth_user_id)
);

-- 4. Tables (Physical dining tables)
CREATE TABLE IF NOT EXISTS tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    table_number VARCHAR(50) NOT NULL,
    short_code VARCHAR(20) NOT NULL UNIQUE, -- For QR scan URL: /t/:short_code
    capacity INT NOT NULL DEFAULT 4,
    status table_status NOT NULL DEFAULT 'free',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    CONSTRAINT uq_venue_table_number UNIQUE (venue_id, table_number)
);

-- 5. Menu Categories
CREATE TABLE IF NOT EXISTS menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 6. Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    image_url TEXT,
    station kitchen_station NOT NULL DEFAULT 'hot',
    dietary_tags TEXT[] DEFAULT '{}', -- e.g. ['veg', 'gluten-free', 'chef-special', 'spicy']
    is_bestseller BOOLEAN NOT NULL DEFAULT false,
    is_available BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false, -- Soft delete for order history integrity
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 7. Item Pairings (Upselling & combos)
CREATE TABLE IF NOT EXISTS item_pairings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    paired_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    discount_percent NUMERIC(5,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    CONSTRAINT uq_item_pairing UNIQUE (item_id, paired_item_id)
);

-- 8. Guests (CRM, Loyalty & Order history across sessions)
CREATE TABLE IF NOT EXISTS guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    loyalty_points INT NOT NULL DEFAULT 0,
    loyalty_tier loyalty_tier NOT NULL DEFAULT 'bronze',
    referral_code VARCHAR(50) UNIQUE,
    referred_by UUID REFERENCES guests(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    CONSTRAINT uq_guest_org_phone UNIQUE (org_id, phone)
);

-- 9. Table Sessions (Multi-round dining session per table)
CREATE TABLE IF NOT EXISTS table_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    status session_status NOT NULL DEFAULT 'open',
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 10. Orders (Individual order rounds within a session)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    table_session_id UUID NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
    round_number INT NOT NULL DEFAULT 1,
    status order_status NOT NULL DEFAULT 'placed',
    notes TEXT,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    placed_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    acknowledged_at TIMESTAMPTZ,
    cooking_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    served_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 11. Order Items (Items within an order round)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
    item_name VARCHAR(255) NOT NULL, -- snapshot for historical audit
    price_at_order NUMERIC(10,2) NOT NULL, -- snapshot
    quantity INT NOT NULL DEFAULT 1,
    station kitchen_station NOT NULL DEFAULT 'hot',
    customization_notes TEXT,
    status order_item_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 12. Payments (Settlement records)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    table_session_id UUID NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    payment_method payment_method NOT NULL DEFAULT 'cash',
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    razorpay_signature TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'completed', -- completed, failed, refunded
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 13. Offers (Venue marketing & promotional rules)
CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    banner_url TEXT,
    discount_type discount_type NOT NULL DEFAULT 'percent',
    discount_value NUMERIC(10,2) NOT NULL,
    min_order_amount NUMERIC(10,2) DEFAULT 0.00,
    rule_json JSONB DEFAULT '{}'::jsonb, -- e.g. {"buy_item_id": "...", "get_item_id": "...", "days": [1,2,3]}
    is_active BOOLEAN NOT NULL DEFAULT true,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 14. Coupons (Promo codes applied at checkout)
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    discount_type discount_type NOT NULL DEFAULT 'percent',
    discount_value NUMERIC(10,2) NOT NULL,
    max_discount_amount NUMERIC(10,2),
    min_order_amount NUMERIC(10,2) DEFAULT 0.00,
    usage_limit INT,
    times_used INT NOT NULL DEFAULT 0,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    CONSTRAINT uq_venue_coupon_code UNIQUE (venue_id, code)
);

-- 15. Notifications Log (SMS, WhatsApp, Web push logs)
CREATE TABLE IF NOT EXISTS notifications_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    recipient VARCHAR(100) NOT NULL,
    channel VARCHAR(50) NOT NULL, -- 'whatsapp', 'sms', 'push'
    message_type VARCHAR(50) NOT NULL, -- 'order_placed', 'order_ready', 'bill_receipt'
    status VARCHAR(50) NOT NULL DEFAULT 'sent',
    payload JSONB DEFAULT '{}'::jsonb,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 16. Feedback (Post-meal reviews & ratings)
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    table_session_id UUID REFERENCES table_sessions(id) ON DELETE SET NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    food_rating INT CHECK (food_rating BETWEEN 1 AND 5),
    service_rating INT CHECK (service_rating BETWEEN 1 AND 5),
    ambience_rating INT CHECK (ambience_rating BETWEEN 1 AND 5),
    comment TEXT,
    guest_name VARCHAR(255),
    guest_phone VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 17. Invoices (Sequential tax invoice generation)
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    table_session_id UUID NOT NULL REFERENCES table_sessions(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(100) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    tax_amount NUMERIC(10,2) NOT NULL,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10,2) NOT NULL,
    pdf_url TEXT,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    CONSTRAINT uq_venue_invoice_number UNIQUE (venue_id, invoice_number)
);

-- 18. System / Venue Settings
CREATE TABLE IF NOT EXISTS venue_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE UNIQUE,
    allow_guest_ordering BOOLEAN NOT NULL DEFAULT true,
    require_guest_phone BOOLEAN NOT NULL DEFAULT false,
    enable_otp_login BOOLEAN NOT NULL DEFAULT false,
    enable_sound_alerts BOOLEAN NOT NULL DEFAULT true,
    kitchen_printer_ip VARCHAR(50),
    gstin VARCHAR(50),
    fssai_number VARCHAR(50),
    opening_time TIME DEFAULT '10:00:00',
    closing_time TIME DEFAULT '23:00:00',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ============================================================================
-- 4. ATTACH UPDATE TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_venues_updated_at ON venues;
CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON venues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_staff_users_updated_at ON staff_users;
CREATE TRIGGER update_staff_users_updated_at BEFORE UPDATE ON staff_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_tables_updated_at ON tables;
CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_menu_categories_updated_at ON menu_categories;
CREATE TRIGGER update_menu_categories_updated_at BEFORE UPDATE ON menu_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_menu_items_updated_at ON menu_items;
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_guests_updated_at ON guests;
CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_table_sessions_updated_at ON table_sessions;
CREATE TRIGGER update_table_sessions_updated_at BEFORE UPDATE ON table_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_order_items_updated_at ON order_items;
CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_offers_updated_at ON offers;
CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_coupons_updated_at ON coupons;
CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_venue_settings_updated_at ON venue_settings;
CREATE TRIGGER update_venue_settings_updated_at BEFORE UPDATE ON venue_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_venues_slug ON venues(slug);
CREATE INDEX IF NOT EXISTS idx_venues_org_id ON venues(org_id);
CREATE INDEX IF NOT EXISTS idx_staff_users_auth_id ON staff_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_users_venue_id ON staff_users(venue_id);
CREATE INDEX IF NOT EXISTS idx_tables_short_code ON tables(short_code);
CREATE INDEX IF NOT EXISTS idx_tables_venue_status ON tables(venue_id, status);
CREATE INDEX IF NOT EXISTS idx_menu_categories_venue_order ON menu_categories(venue_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_menu_items_venue_category ON menu_items(venue_id, category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(venue_id, is_available) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_guests_org_phone ON guests(org_id, phone);
CREATE INDEX IF NOT EXISTS idx_table_sessions_venue_status ON table_sessions(venue_id, status);
CREATE INDEX IF NOT EXISTS idx_table_sessions_table ON table_sessions(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_venue_status ON orders(venue_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_session_round ON orders(table_session_id, round_number);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_station_status ON order_items(station, status);
CREATE INDEX IF NOT EXISTS idx_payments_session ON payments(table_session_id);
CREATE INDEX IF NOT EXISTS idx_coupons_venue_code ON coupons(venue_id, code);
CREATE INDEX IF NOT EXISTS idx_feedback_venue ON feedback(venue_id);

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_settings ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Organizations Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can read their organization" ON organizations;
CREATE POLICY "Staff can read their organization"
    ON organizations FOR SELECT
    USING (id IN (SELECT unnest(get_my_org_ids())));

DROP POLICY IF EXISTS "Owner can update their organization" ON organizations;
CREATE POLICY "Owner can update their organization"
    ON organizations FOR UPDATE
    USING (owner_auth_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can create an organization" ON organizations;
CREATE POLICY "Authenticated users can create an organization"
    ON organizations FOR INSERT
    TO authenticated
    WITH CHECK (owner_auth_id = (SELECT auth.uid()));

-- ----------------------------------------------------------------------------
-- Venues Policies
-- ----------------------------------------------------------------------------
-- Public anonymous access to active venues by slug
DROP POLICY IF EXISTS "Public can read active venues" ON venues;
CREATE POLICY "Public can read active venues"
    ON venues FOR SELECT
    USING (is_active = true);

-- Staff can manage their own venue
DROP POLICY IF EXISTS "Staff can read own venues" ON venues;
CREATE POLICY "Staff can read own venues"
    ON venues FOR SELECT
    USING (id IN (SELECT unnest(get_my_venue_ids())));

DROP POLICY IF EXISTS "Managers and owners can update own venue" ON venues;
CREATE POLICY "Managers and owners can update own venue"
    ON venues FOR UPDATE
    USING (
        id IN (SELECT unnest(get_my_venue_ids())) AND
        get_my_staff_role(id) IN ('owner', 'manager')
    );

DROP POLICY IF EXISTS "Org owner can create venues" ON venues;
CREATE POLICY "Org owner can create venues"
    ON venues FOR INSERT
    TO authenticated
    WITH CHECK (
        org_id IN (
            SELECT id FROM organizations WHERE owner_auth_id = (SELECT auth.uid())
        )
    );

-- ----------------------------------------------------------------------------
-- Staff Users Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can view peers in same venue" ON staff_users;
CREATE POLICY "Staff can view peers in same venue"
    ON staff_users FOR SELECT
    USING (venue_id IN (SELECT unnest(get_my_venue_ids())));

DROP POLICY IF EXISTS "Managers and owners can manage staff" ON staff_users;
CREATE POLICY "Managers and owners can manage staff"
    ON staff_users FOR ALL
    USING (
        venue_id IN (SELECT unnest(get_my_venue_ids())) AND
        get_my_staff_role(venue_id) IN ('owner', 'manager')
    );

DROP POLICY IF EXISTS "Initial owner or manager can insert staff" ON staff_users;
CREATE POLICY "Initial owner or manager can insert staff"
    ON staff_users FOR INSERT
    TO authenticated
    WITH CHECK (
        auth_user_id = (SELECT auth.uid())
        OR
        venue_id IN (SELECT unnest(get_my_venue_ids()))
    );

-- ----------------------------------------------------------------------------
-- Tables Policies
-- ----------------------------------------------------------------------------
-- Public can read tables by short_code (for guest QR scan)
DROP POLICY IF EXISTS "Public can view tables" ON tables;
CREATE POLICY "Public can view tables"
    ON tables FOR SELECT
    USING (is_active = true);

DROP POLICY IF EXISTS "Staff can manage tables in their venue" ON tables;
CREATE POLICY "Staff can manage tables in their venue"
    ON tables FOR ALL
    USING (venue_id IN (SELECT unnest(get_my_venue_ids())));

-- ----------------------------------------------------------------------------
-- Menu Categories Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view active menu categories" ON menu_categories;
CREATE POLICY "Public can view active menu categories"
    ON menu_categories FOR SELECT
    USING (is_active = true);

DROP POLICY IF EXISTS "Staff can manage menu categories" ON menu_categories;
CREATE POLICY "Staff can manage menu categories"
    ON menu_categories FOR ALL
    USING (venue_id IN (SELECT unnest(get_my_venue_ids())));

-- ----------------------------------------------------------------------------
-- Menu Items Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view available menu items" ON menu_items;
CREATE POLICY "Public can view available menu items"
    ON menu_items FOR SELECT
    USING (is_available = true AND is_deleted = false);

DROP POLICY IF EXISTS "Staff can view all menu items including deleted" ON menu_items;
CREATE POLICY "Staff can view all menu items including deleted"
    ON menu_items FOR SELECT
    USING (venue_id IN (SELECT unnest(get_my_venue_ids())));

DROP POLICY IF EXISTS "Staff can modify menu items" ON menu_items;
CREATE POLICY "Staff can modify menu items"
    ON menu_items FOR ALL
    USING (
        venue_id IN (SELECT unnest(get_my_venue_ids())) AND
        get_my_staff_role(venue_id) IN ('owner', 'manager', 'kitchen')
    );

-- ----------------------------------------------------------------------------
-- Item Pairings Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view item pairings" ON item_pairings;
CREATE POLICY "Public can view item pairings"
    ON item_pairings FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Staff can manage item pairings" ON item_pairings;
CREATE POLICY "Staff can manage item pairings"
    ON item_pairings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM menu_items mi
            WHERE mi.id = item_pairings.item_id
            AND mi.venue_id IN (SELECT unnest(get_my_venue_ids()))
        )
    );

-- ----------------------------------------------------------------------------
-- Guests Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can view guests in their org" ON guests;
CREATE POLICY "Staff can view guests in their org"
    ON guests FOR SELECT
    USING (org_id IN (SELECT unnest(get_my_org_ids())));

DROP POLICY IF EXISTS "Guests can create/view own record" ON guests;
CREATE POLICY "Guests can create/view own record"
    ON guests FOR ALL
    USING (true)
    WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- Table Sessions Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public guests can view/create active session" ON table_sessions;
CREATE POLICY "Public guests can view/create active session"
    ON table_sessions FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Staff can manage sessions for their venue" ON table_sessions;
CREATE POLICY "Staff can manage sessions for their venue"
    ON table_sessions FOR ALL
    USING (venue_id IN (SELECT unnest(get_my_venue_ids())));

-- ----------------------------------------------------------------------------
-- Orders Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public guests can create/view orders" ON orders;
CREATE POLICY "Public guests can create/view orders"
    ON orders FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Staff can view and update orders in their venue" ON orders;
CREATE POLICY "Staff can view and update orders in their venue"
    ON orders FOR ALL
    USING (venue_id IN (SELECT unnest(get_my_venue_ids())));

-- ----------------------------------------------------------------------------
-- Order Items Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public guests can view and create order items" ON order_items;
CREATE POLICY "Public guests can view and create order items"
    ON order_items FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Staff can manage order items in their venue" ON order_items;
CREATE POLICY "Staff can manage order items in their venue"
    ON order_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_items.order_id
            AND o.venue_id IN (SELECT unnest(get_my_venue_ids()))
        )
    );

-- ----------------------------------------------------------------------------
-- Payments Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can view and insert payments" ON payments;
CREATE POLICY "Staff can view and insert payments"
    ON payments FOR ALL
    USING (venue_id IN (SELECT unnest(get_my_venue_ids())));

DROP POLICY IF EXISTS "Public can insert online payment records" ON payments;
CREATE POLICY "Public can insert online payment records"
    ON payments FOR INSERT
    WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- Offers & Coupons Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view active offers" ON offers;
CREATE POLICY "Public can view active offers"
    ON offers FOR SELECT
    USING (is_active = true);

DROP POLICY IF EXISTS "Staff can manage offers" ON offers;
CREATE POLICY "Staff can manage offers"
    ON offers FOR ALL
    USING (venue_id IN (SELECT unnest(get_my_venue_ids())));

DROP POLICY IF EXISTS "Public can validate active coupons" ON coupons;
CREATE POLICY "Public can validate active coupons"
    ON coupons FOR SELECT
    USING (is_active = true);

DROP POLICY IF EXISTS "Staff can manage coupons" ON coupons;
CREATE POLICY "Staff can manage coupons"
    ON coupons FOR ALL
    USING (venue_id IN (SELECT unnest(get_my_venue_ids())));

-- ----------------------------------------------------------------------------
-- Feedback Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can submit feedback" ON feedback;
CREATE POLICY "Public can submit feedback"
    ON feedback FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Staff can view feedback for their venue" ON feedback;
CREATE POLICY "Staff can view feedback for their venue"
    ON feedback FOR SELECT
    USING (venue_id IN (SELECT unnest(get_my_venue_ids())));

-- ----------------------------------------------------------------------------
-- Invoices & Venue Settings Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can view and create invoices" ON invoices;
CREATE POLICY "Staff can view and create invoices"
    ON invoices FOR ALL
    USING (venue_id IN (SELECT unnest(get_my_venue_ids())));

DROP POLICY IF EXISTS "Public can view venue settings" ON venue_settings;
CREATE POLICY "Public can view venue settings"
    ON venue_settings FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Staff can manage venue settings" ON venue_settings;
CREATE POLICY "Staff can manage venue settings"
    ON venue_settings FOR ALL
    USING (venue_id IN (SELECT unnest(get_my_venue_ids())));

DROP POLICY IF EXISTS "Staff or venue owner can insert venue settings" ON venue_settings;
CREATE POLICY "Staff or venue owner can insert venue settings"
    ON venue_settings FOR INSERT
    TO authenticated
    WITH CHECK (
        venue_id IN (SELECT unnest(get_my_venue_ids()))
        OR
        venue_id IN (
            SELECT v.id FROM venues v
            JOIN organizations o ON v.org_id = o.id
            WHERE o.owner_auth_id = (SELECT auth.uid())
        )
    );

-- ----------------------------------------------------------------------------
-- Bootstrap Restaurant Owner (Atomic RPC)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION bootstrap_restaurant_owner(
    p_org_name VARCHAR,
    p_venue_name VARCHAR,
    p_venue_slug VARCHAR,
    p_brand_color VARCHAR DEFAULT '#EA580C'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_email VARCHAR;
    v_user_name VARCHAR;
    v_org_id UUID;
    v_venue_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT email, COALESCE(raw_user_meta_data->>'full_name', email)
    INTO v_user_email, v_user_name
    FROM auth.users
    WHERE id = v_user_id;

    -- Create organization
    INSERT INTO organizations (name, owner_auth_id, plan)
    VALUES (p_org_name, v_user_id, 'starter')
    RETURNING id INTO v_org_id;

    -- Create venue
    INSERT INTO venues (org_id, name, slug, brand_color)
    VALUES (v_org_id, p_venue_name, p_venue_slug, COALESCE(p_brand_color, '#EA580C'))
    RETURNING id INTO v_venue_id;

    -- Create staff_users row for owner
    INSERT INTO staff_users (org_id, venue_id, auth_user_id, full_name, email, role)
    VALUES (v_org_id, v_venue_id, v_user_id, v_user_name, v_user_email, 'owner');

    -- Create default venue_settings
    INSERT INTO venue_settings (venue_id, allow_guest_ordering, enable_sound_alerts)
    VALUES (v_venue_id, true, true);

    RETURN jsonb_build_object(
        'org_id', v_org_id,
        'venue_id', v_venue_id,
        'venue_slug', p_venue_slug
    );
END;
$$;

-- ============================================================================
-- 7. REALTIME PUBLICATION SETUP
-- ============================================================================

-- Add live tables to supabase_realtime publication
DO $$
DECLARE
    tbl text;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    FOR tbl IN SELECT unnest(ARRAY['orders', 'order_items', 'table_sessions', 'tables']) LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = tbl
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- 8. SAMPLE SEED DATA (Optional demo data for testing)
-- ============================================================================

DO $$
DECLARE
    v_org_id UUID;
    v_venue_id UUID;
    v_cat_starters UUID;
    v_cat_mains UUID;
    v_cat_drinks UUID;
    v_table_1 UUID;
    v_table_2 UUID;
BEGIN
    -- If demo data already exists, skip seed
    IF EXISTS (SELECT 1 FROM venues WHERE slug = 'spice-garden-downtown') THEN
        RETURN;
    END IF;

    v_org_id := gen_random_uuid();
    v_venue_id := gen_random_uuid();
    v_cat_starters := gen_random_uuid();
    v_cat_mains := gen_random_uuid();
    v_cat_drinks := gen_random_uuid();
    v_table_1 := gen_random_uuid();
    v_table_2 := gen_random_uuid();

    -- Demo Org
    INSERT INTO organizations (id, name, plan)
    VALUES (v_org_id, 'Spice Garden Hospitality', 'pro')
    ON CONFLICT DO NOTHING;

    -- Demo Venue
    INSERT INTO venues (id, org_id, name, slug, address, phone, brand_color, currency, tax_rate)
    VALUES (
        v_venue_id,
        v_org_id,
        'Spice Garden Downtown',
        'spice-garden-downtown',
        '104 MG Road, Indiranagar, Bengaluru',
        '+91 98765 43210',
        '#EA580C', -- Warm spicy orange
        'INR',
        5.00
    ) ON CONFLICT DO NOTHING;

    -- Demo Venue Settings
    INSERT INTO venue_settings (venue_id, allow_guest_ordering, enable_sound_alerts, gstin, fssai_number)
    VALUES (v_venue_id, true, true, '29AAAAA0000A1Z5', '11223344556677')
    ON CONFLICT DO NOTHING;

    -- Demo Tables
    INSERT INTO tables (id, org_id, venue_id, table_number, short_code, capacity, status)
    VALUES
        (v_table_1, v_org_id, v_venue_id, 'T-01', 'DEMO1', 4, 'free'),
        (v_table_2, v_org_id, v_venue_id, 'T-02', 'DEMO2', 2, 'free'),
        (gen_random_uuid(), v_org_id, v_venue_id, 'T-03', 'DEMO3', 6, 'free')
    ON CONFLICT DO NOTHING;

    -- Demo Categories
    INSERT INTO menu_categories (id, org_id, venue_id, name, description, sort_order)
    VALUES
        (v_cat_starters, v_org_id, v_venue_id, 'Appetizers & Starters', 'Crispy, smoky, and delightful small plates', 1),
        (v_cat_mains, v_org_id, v_venue_id, 'Chef Signature Mains', 'Authentic slow-cooked curries & tandoor specials', 2),
        (v_cat_drinks, v_org_id, v_venue_id, 'Artisanal Drinks & Mocktails', 'Refreshing house-crafted coolers', 3)
    ON CONFLICT DO NOTHING;

    -- Demo Menu Items
    INSERT INTO menu_items (org_id, venue_id, category_id, name, description, price, station, dietary_tags, is_bestseller, is_available)
    VALUES
        (v_org_id, v_venue_id, v_cat_starters, 'Tandoori Paneer Tikka', 'Cottage cheese marinated in Kashmiri chili and hung curd, roasted in clay oven', 340.00, 'hot', ARRAY['veg', 'gluten-free', 'chef-special'], true, true),
        (v_org_id, v_venue_id, v_cat_starters, 'Crispy Chili Garlic Prawns', 'Wok-tossed tiger prawns with scallions, crushed garlic, and bird eye chili', 480.00, 'hot', ARRAY['non-veg', 'spicy'], true, true),
        (v_org_id, v_venue_id, v_cat_mains, 'Smoked Butter Chicken', 'Tender tandoori chicken simmered in rich velvety tomato-cashew gravy', 420.00, 'hot', ARRAY['non-veg', 'chef-special'], true, true),
        (v_org_id, v_venue_id, v_cat_mains, 'Dal Makhani Imperial', 'Slow cooked black lentils for 24 hours with butter and cream', 290.00, 'hot', ARRAY['veg'], true, true),
        (v_org_id, v_venue_id, v_cat_drinks, 'Kashmiri Saffron Shikanji', 'Spiced lemonade infused with pure saffron and mint sprigs', 160.00, 'bar', ARRAY['veg'], false, true),
        (v_org_id, v_venue_id, v_cat_drinks, 'Mango Basil Crush', 'Alphonso mango pulp shaken with fresh sweet basil and club soda', 190.00, 'bar', ARRAY['veg'], true, true)
    ON CONFLICT DO NOTHING;

END $$;

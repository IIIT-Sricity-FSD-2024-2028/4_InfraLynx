-- ==============================================================================
-- TIMS (Township Infrastructure Management System) - PostgreSQL Database Schema
-- Multi-Tenant Architecture for Express.js + PostgreSQL (Raw SQL / node-postgres)
-- ==============================================================================

-- Enable UUID extension for secure, distributed primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. ENUM TYPES
-- ------------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM (
    'RWA',
    'DESK_CLERK',
    'FIELD_CONTRACTOR',
    'DEPARTMENT_HEAD',
    'FINANCE_CLERK',
    'TOWNSHIP_COO'
);

CREATE TYPE complaint_severity AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'EMERGENCY'
);

CREATE TYPE complaint_status AS ENUM (
    'REPORTED',
    'UNDER_REVIEW',
    'VALIDATED',
    'WORK_ORDER_CREATED',
    'IN_PROGRESS',
    'PENDING_VERIFICATION',
    'DISPUTED',
    'VERIFIED',
    'CLOSED',
    'REJECTED'
);

CREATE TYPE work_order_status AS ENUM (
    'ASSIGNED',
    'INSPECTION_PENDING',
    'ESTIMATE_SUBMITTED',
    'PENDING_APPROVAL',
    'APPROVED',
    'IN_PROGRESS',
    'COMPLETED',
    'REWORK_REQUESTED',
    'CLOSED'
);

CREATE TYPE evidence_type AS ENUM (
    'BEFORE',
    'AFTER',
    'DISPUTE',
    'OTHER'
);

CREATE TYPE verification_status AS ENUM (
    'PENDING',
    'CONFIRMED',
    'DISPUTED'
);

CREATE TYPE estimate_status AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'REVISION_REQUESTED'
);

CREATE TYPE approval_level AS ENUM (
    'DEPT_HEAD',
    'COO_JOINT',
    'SYSTEM_AUTO'
);

CREATE TYPE approval_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);

CREATE TYPE invoice_status AS ENUM (
    'PENDING_AUDIT',
    'VARIANCE_FLAGGED',
    'AUTHORIZED',
    'PAID',
    'REJECTED'
);

CREATE TYPE payment_status AS ENUM (
    'SCHEDULED',
    'PROCESSING',
    'DISBURSED',
    'FAILED'
);

-- ------------------------------------------------------------------------------
-- 2. PLATFORM-LEVEL MULTI-TENANT TABLES
-- ------------------------------------------------------------------------------

CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    billing_cycle VARCHAR(50) NOT NULL DEFAULT 'MONTHLY',
    max_users INT NOT NULL DEFAULT 50,
    max_departments INT NOT NULL DEFAULT 10,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE townships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    subscription_plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
    subscription_start TIMESTAMP WITH TIME ZONE,
    subscription_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE township_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    township_id UUID NOT NULL REFERENCES townships(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 3. ORGANIZATIONS & USERS
-- ------------------------------------------------------------------------------

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    township_id UUID NOT NULL REFERENCES townships(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    department_head_id UUID, -- Foreign key to users(id) added via alter table below
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(township_id, name)
);

CREATE TABLE contractors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    township_id UUID NOT NULL REFERENCES townships(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT,
    gstin VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    township_id UUID NOT NULL REFERENCES townships(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
    phone VARCHAR(50),
    sector VARCHAR(100), -- For RWA representatives
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(township_id, email),
    UNIQUE(township_id, username)
);

-- Establish circular foreign key from departments to department_head_id
ALTER TABLE departments
    ADD CONSTRAINT fk_departments_head
    FOREIGN KEY (department_head_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE contractor_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
    service_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(contractor_id, service_type)
);

-- ------------------------------------------------------------------------------
-- 4. INFRASTRUCTURE ASSETS & SLA
-- ------------------------------------------------------------------------------

CREATE TABLE slas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    township_id UUID NOT NULL REFERENCES townships(id) ON DELETE CASCADE,
    severity complaint_severity NOT NULL,
    response_time_hours INT NOT NULL,
    resolution_time_hours INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(township_id, severity)
);

CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    township_id UUID NOT NULL REFERENCES townships(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    asset_type VARCHAR(100) NOT NULL, -- 'Streetlight', 'Transformer', 'Water Valve', etc.
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    sector VARCHAR(100) NOT NULL,
    block VARCHAR(100),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    status VARCHAR(50) NOT NULL DEFAULT 'OPERATIONAL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 5. COMPLAINTS & GRIEVANCE INTAKE
-- ------------------------------------------------------------------------------

CREATE TABLE complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_code VARCHAR(50) NOT NULL, -- e.g. CMP-2026-0101
    township_id UUID NOT NULL REFERENCES townships(id) ON DELETE CASCADE,
    reported_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    category VARCHAR(100) NOT NULL, -- 'Civil', 'Electrical', 'Water'
    subcategory VARCHAR(150),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity complaint_severity NOT NULL DEFAULT 'MEDIUM',
    sector VARCHAR(100) NOT NULL,
    block VARCHAR(100),
    street VARCHAR(150),
    location_details TEXT,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    status complaint_status NOT NULL DEFAULT 'REPORTED',
    sla_id UUID REFERENCES slas(id) ON DELETE SET NULL,
    sla_deadline TIMESTAMP WITH TIME ZONE,
    is_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
    master_complaint_id UUID REFERENCES complaints(id) ON DELETE SET NULL,
    validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    validated_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(township_id, complaint_code)
);

CREATE TABLE complaint_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50) DEFAULT 'image/jpeg',
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 6. ANNUAL MAINTENANCE CONTRACTS (AMC) & SCHEDULE OF RATES
-- ------------------------------------------------------------------------------

CREATE TABLE amcs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    township_id UUID NOT NULL REFERENCES townships(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE RESTRICT,
    contract_number VARCHAR(100) NOT NULL, -- e.g. AMC-ELE-2025-03
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(township_id, contract_number)
);

CREATE TABLE amc_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amc_id UUID NOT NULL REFERENCES amcs(id) ON DELETE CASCADE,
    item_code VARCHAR(50) NOT NULL, -- e.g. RATE-01
    item_name VARCHAR(255) NOT NULL, -- e.g. 'Electrician', 'Cable Work'
    service_type VARCHAR(100) NOT NULL,
    unit VARCHAR(50) NOT NULL, -- 'Hour', 'Meter', 'Sq.Meter', 'Unit'
    rate NUMERIC(12, 2) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(amc_id, item_code)
);

-- ------------------------------------------------------------------------------
-- 7. WORK ORDERS & CONTRACTOR ESTIMATES
-- ------------------------------------------------------------------------------

CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_number VARCHAR(50) NOT NULL, -- e.g. WO-2026-088
    township_id UUID NOT NULL REFERENCES townships(id) ON DELETE CASCADE,
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE RESTRICT,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'NORMAL',
    status work_order_status NOT NULL DEFAULT 'ASSIGNED',
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    due_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(township_id, work_order_number),
    UNIQUE(complaint_id)
);

CREATE TABLE work_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    type evidence_type NOT NULL,
    file_url TEXT NOT NULL,
    remarks TEXT,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE RESTRICT,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status estimate_status NOT NULL DEFAULT 'SUBMITTED',
    inspection_notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE estimate_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    amc_rate_id UUID REFERENCES amc_rates(id) ON DELETE RESTRICT,
    description VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    rate_snapshot NUMERIC(12, 2) NOT NULL, -- Preserves rate at estimate time
    amount NUMERIC(12, 2) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 8. APPROVAL RULES & 3-TIER MONETARY GATES
-- ------------------------------------------------------------------------------

CREATE TABLE approval_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    township_id UUID NOT NULL REFERENCES townships(id) ON DELETE CASCADE,
    min_amount NUMERIC(12, 2) NOT NULL,
    max_amount NUMERIC(12, 2), -- NULL means infinite / above threshold
    required_role user_role NOT NULL,
    approval_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    township_id UUID NOT NULL REFERENCES townships(id) ON DELETE CASCADE,
    estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    approval_level approval_level NOT NULL,
    status approval_status NOT NULL DEFAULT 'APPROVED',
    remarks TEXT,
    approved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 9. WORK COMPLETION & RWA VERIFICATION
-- ------------------------------------------------------------------------------

CREATE TABLE work_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    remarks TEXT NOT NULL,
    actual_amount NUMERIC(12, 2) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(work_order_id)
);

CREATE TABLE work_completion_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_completion_id UUID NOT NULL REFERENCES work_completions(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    rate NUMERIC(12, 2) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL
);

CREATE TABLE verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    verified_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status verification_status NOT NULL DEFAULT 'PENDING',
    rating INT CHECK (rating >= 1 AND rating <= 5),
    remarks TEXT,
    dispute_reason TEXT,
    reopen_count INT NOT NULL DEFAULT 0,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(work_order_id)
);

-- ------------------------------------------------------------------------------
-- 10. FINANCE, INVOICES & PAYMENT RELEASES
-- ------------------------------------------------------------------------------

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_code VARCHAR(50) NOT NULL, -- e.g. INV-2026-088
    township_id UUID NOT NULL REFERENCES townships(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE RESTRICT,
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(100) NOT NULL, -- Contractor's document number (e.g. VT-INV/2026/041)
    invoice_date DATE NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    tax NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL,
    approved_estimate_amount NUMERIC(12, 2) NOT NULL,
    variance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    rate_card_match BOOLEAN NOT NULL DEFAULT TRUE,
    variance_reason TEXT,
    status invoice_status NOT NULL DEFAULT 'PENDING_AUDIT',
    authorized_by UUID REFERENCES users(id) ON DELETE SET NULL,
    authorized_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(township_id, invoice_code)
);

CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    rate NUMERIC(12, 2) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    township_id UUID NOT NULL REFERENCES townships(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL,
    status payment_status NOT NULL DEFAULT 'SCHEDULED',
    payment_mode VARCHAR(50) NOT NULL DEFAULT 'RTGS / Township Escrow',
    payment_reference VARCHAR(100), -- Bank UTR Ref
    authorized_by UUID REFERENCES users(id) ON DELETE SET NULL,
    authorized_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 11. SUPPORTING TABLES: AUDIT LOGS, NOTIFICATIONS & SETTINGS
-- ------------------------------------------------------------------------------

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    township_id UUID NOT NULL REFERENCES townships(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE township_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    township_id UUID NOT NULL REFERENCES townships(id) ON DELETE CASCADE,
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    default_sla_hours INT NOT NULL DEFAULT 48,
    auto_close_hours INT NOT NULL DEFAULT 72,
    major_expenditure_threshold NUMERIC(12, 2) NOT NULL DEFAULT 200000.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(township_id)
);

-- ------------------------------------------------------------------------------
-- 12. PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------

CREATE INDEX idx_users_township_role ON users(township_id, role);
CREATE INDEX idx_complaints_township_status ON complaints(township_id, status);
CREATE INDEX idx_complaints_sector ON complaints(township_id, sector);
CREATE INDEX idx_complaints_master ON complaints(master_complaint_id);
CREATE INDEX idx_work_orders_contractor ON work_orders(contractor_id, status);
CREATE INDEX idx_work_orders_complaint ON work_orders(complaint_id);
CREATE INDEX idx_invoices_township_status ON invoices(township_id, status);
CREATE INDEX idx_invoices_work_order ON invoices(work_order_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);

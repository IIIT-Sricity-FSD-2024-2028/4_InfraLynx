-- ==============================================================================
-- City Resource and Infrastructure Management System (CRIMS)
-- ==============================================================================


-- 1. Enumerated Types

CREATE TYPE user_role AS ENUM ('ADMINISTRATOR', 'CFO', 'OFFICER', 'ENGINEER', 'QC_REVIEWER');

CREATE TYPE priority_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY');

CREATE TYPE wo_status AS ENUM (
    'DRAFT',
    'PENDING_OFFICER_APPROVAL',
    'PENDING_ADMIN_APPROVAL',
    'APPROVED',
    'IN_PROGRESS',
    'PENDING_QC',
    'COMPLETED',
    'REJECTED'
);

CREATE TYPE task_status AS ENUM (
    'PENDING',
    'ASSIGNED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);

CREATE TYPE fund_quarter AS ENUM ('Q1', 'Q2', 'Q3', 'Q4');

CREATE TYPE infra_status AS ENUM ('OPERATIONAL', 'UNDER_MAINTENANCE', 'DECOMMISSIONED');

CREATE TYPE notification_type AS ENUM (
    'TASK_ASSIGNED',
    'WORK_ORDER_APPROVED',
    'WORK_ORDER_REJECTED',
    'COMPLETION_REPORT',
    'ESCALATION',
    'QC_PASSED',
    'QC_FAILED'
);

CREATE TYPE resource_request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED');
CREATE TYPE quotation_status AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED');
CREATE TYPE inspection_severity AS ENUM ('LOW', 'MODERATE', 'SEVERE', 'CRITICAL');
CREATE TYPE schedule_frequency AS ENUM ('ONE_TIME', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL');
CREATE TYPE sensor_status AS ENUM ('ACTIVE', 'INACTIVE', 'FAULTY', 'DECOMMISSIONED');

CREATE TYPE budget_stage AS ENUM (
    'DRAFT',
    'PENDING_ADMIN_FORWARD',
    'PENDING_OFFICER_VERIFICATION',
    'PENDING_CFO_REVIEW',
    'APPROVED',
    'PARTIALLY_RELEASED',
    'FULLY_RELEASED',
    'REJECTED'
);

CREATE TYPE approval_action AS ENUM (
    'FORWARDED',
    'VERIFIED',
    'APPROVED',
    'REJECTED',
    'RETURNED'
);

CREATE TYPE issue_status AS ENUM (
    'OPEN',
    'UNDER_REVIEW',
    'RESOLVED',
    'CLOSED',
    'REJECTED'
);

CREATE TYPE report_status AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'ACKNOWLEDGED'
);

CREATE TYPE request_source AS ENUM (
    'CITIZEN',
    'PUBLIC_REPRESENTATIVE',
    'SENSOR_ALERT',
    'INTERNAL_AUDIT'
);

CREATE TYPE request_status AS ENUM (
    'RECEIVED',
    'UNDER_REVIEW',
    'APPROVED_FOR_PLANNING',
    'CONVERTED_TO_WORK_ORDER',
    'REJECTED',
    'CLOSED'
);

CREATE TYPE bill_status AS ENUM (
    'SUBMITTED',
    'UNDER_VERIFICATION',
    'APPROVED',
    'REJECTED',
    'PAID'
);

CREATE TYPE resource_type AS ENUM ('ELECTRICITY', 'WATER');

CREATE TYPE project_outcome_status AS ENUM ('SUCCESS', 'PARTIAL_SUCCESS', 'FAILED');

CREATE TYPE generated_report_type AS ENUM (
    'DEPARTMENT_PERFORMANCE',
    'BUDGET_UTILIZATION',
    'PROJECT_COMPLETION',
    'RESOURCE_USAGE',
    'KPI_SUMMARY'
);

CREATE TYPE generated_report_status AS ENUM ('PENDING', 'GENERATED', 'FAILED');

CREATE TYPE export_format_type AS ENUM ('PDF', 'EXCEL', 'CSV');


-- 2. Departments

CREATE TABLE departments (
    department_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(150) NOT NULL UNIQUE,
    description   TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 2A. Annual Department Budget Cycles

CREATE TABLE department_budget_cycles (
    cycle_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id       UUID NOT NULL REFERENCES departments(department_id),
    fiscal_year         INT NOT NULL CHECK (fiscal_year >= 2024),
    annual_budget_cap   NUMERIC(15, 2) NOT NULL CHECK (annual_budget_cap > 0),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (department_id, fiscal_year),
    UNIQUE (cycle_id, department_id)
);


-- 3. System Users

CREATE TABLE users (
    user_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name      VARCHAR(150) NOT NULL,
    email          VARCHAR(150) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    phone_number   VARCHAR(20),
    role           user_role NOT NULL,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 4. Role-specific identity tables
-- These tables make role-based foreign keys possible without triggers.

CREATE TABLE administrators (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE cfos (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE officers (
    user_id       UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(department_id),
    UNIQUE (user_id, department_id)
);

CREATE TABLE engineers (
    user_id       UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(department_id),
    UNIQUE (user_id, department_id)
);

CREATE TABLE qc_units (
    qc_unit_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(150) NOT NULL UNIQUE,
    description  TEXT,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE qc_reviewers (
    user_id     UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    qc_unit_id  UUID NOT NULL REFERENCES qc_units(qc_unit_id)
);


-- 5. Citizen Request Intake

CREATE TABLE citizen_requests (
    request_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id         UUID NOT NULL REFERENCES departments(department_id),
    public_reference_no   VARCHAR(30) NOT NULL UNIQUE,
    source                request_source NOT NULL DEFAULT 'CITIZEN',
    requester_name        VARCHAR(150),
    requester_contact     VARCHAR(100),
    title                 VARCHAR(200) NOT NULL,
    description           TEXT NOT NULL,
    location_tag          VARCHAR(150) NOT NULL,
    latitude              NUMERIC(9, 6),
    longitude             NUMERIC(9, 6),
    priority              priority_level NOT NULL DEFAULT 'MEDIUM',
    status                request_status NOT NULL DEFAULT 'RECEIVED',
    received_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at             TIMESTAMP,

    CONSTRAINT uq_citizen_requests_request_department UNIQUE (request_id, department_id),

    CONSTRAINT chk_citizen_requests_geo_pair CHECK (
        (latitude IS NULL AND longitude IS NULL) OR
        (latitude IS NOT NULL AND longitude IS NOT NULL)
    ),

    CONSTRAINT chk_citizen_requests_latitude_range CHECK (
        latitude IS NULL OR latitude BETWEEN -90 AND 90
    ),

    CONSTRAINT chk_citizen_requests_longitude_range CHECK (
        longitude IS NULL OR longitude BETWEEN -180 AND 180
    ),

    CONSTRAINT chk_citizen_requests_closed_pair CHECK (
        status NOT IN ('REJECTED', 'CLOSED') OR closed_at IS NOT NULL
    )
);

CREATE TABLE request_assessments (
    assessment_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id          UUID NOT NULL UNIQUE,
    department_id       UUID NOT NULL REFERENCES departments(department_id),
    evaluated_by        UUID NOT NULL REFERENCES administrators(user_id),
    is_feasible         BOOLEAN NOT NULL,
    impact_assessment   TEXT NOT NULL,
    evaluation_notes    TEXT NOT NULL,
    evaluated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_request_assessments_request
        FOREIGN KEY (request_id, department_id)
        REFERENCES citizen_requests(request_id, department_id)
        ON DELETE CASCADE
);


-- 6. Infrastructure

CREATE TABLE infrastructure (
    infra_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id            UUID NOT NULL REFERENCES departments(department_id),
    name                     VARCHAR(200) NOT NULL,
    type                     VARCHAR(100) NOT NULL,
    location_description     VARCHAR(150) NOT NULL,
    latitude                 NUMERIC(9, 6),
    longitude                NUMERIC(9, 6),
    status                   infra_status NOT NULL DEFAULT 'OPERATIONAL',
    created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_infrastructure_latitude_range CHECK (
        latitude IS NULL OR latitude BETWEEN -90 AND 90
    ),

    CONSTRAINT chk_infrastructure_longitude_range CHECK (
        longitude IS NULL OR longitude BETWEEN -180 AND 180
    ),

    UNIQUE (infra_id, department_id)
);


-- 7. Work Orders

CREATE TABLE work_orders (
    wo_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_code    VARCHAR(20) UNIQUE,
    department_id   UUID NOT NULL REFERENCES departments(department_id),
    request_id      UUID,
    infra_id        UUID,
    created_by      UUID NOT NULL,
    approved_by     UUID,
    approved_at     TIMESTAMP,
    title           VARCHAR(200) NOT NULL,
    description     TEXT NOT NULL,
    priority        priority_level NOT NULL DEFAULT 'MEDIUM',
    -- priority captures urgency; is_emergency marks formal fast-track handling.
    is_emergency    BOOLEAN NOT NULL DEFAULT FALSE,
    emergency_reason TEXT,
    status          wo_status NOT NULL DEFAULT 'DRAFT',
    qc_passed       BOOLEAN NOT NULL DEFAULT FALSE,
    deadline        TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_work_orders_wo_department UNIQUE (wo_id, department_id),

    CONSTRAINT fk_work_orders_request
        FOREIGN KEY (request_id, department_id)
        REFERENCES citizen_requests(request_id, department_id),

    CONSTRAINT fk_work_orders_infrastructure
        FOREIGN KEY (infra_id, department_id)
        REFERENCES infrastructure(infra_id, department_id),

    CONSTRAINT fk_work_orders_created_by_officer
        FOREIGN KEY (created_by, department_id)
        REFERENCES officers(user_id, department_id),

    CONSTRAINT fk_work_orders_approved_by_admin
        FOREIGN KEY (approved_by)
        REFERENCES administrators(user_id),

    CONSTRAINT chk_work_orders_approval_pair CHECK (
        (approved_by IS NULL AND approved_at IS NULL) OR
        (approved_by IS NOT NULL AND approved_at IS NOT NULL)
    ),

    CONSTRAINT chk_work_orders_approved_by_required CHECK (
        status NOT IN ('APPROVED', 'IN_PROGRESS', 'PENDING_QC', 'COMPLETED') OR approved_by IS NOT NULL
    ),

    CONSTRAINT chk_work_orders_emergency_reason CHECK (
        (is_emergency = FALSE AND emergency_reason IS NULL) OR
        (is_emergency = TRUE AND priority = 'EMERGENCY' AND emergency_reason IS NOT NULL)
    ),

    CONSTRAINT chk_work_orders_qc_required_for_closure CHECK (
        status != 'COMPLETED' OR qc_passed = TRUE
    )
);


-- 7A. Department Officer Planning

CREATE TABLE work_order_plans (
    plan_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_id                    UUID NOT NULL UNIQUE,
    department_id            UUID NOT NULL REFERENCES departments(department_id),
    planned_by               UUID NOT NULL,
    execution_strategy       TEXT NOT NULL,
    resource_plan            TEXT NOT NULL,
    impact_assessment        TEXT NOT NULL,
    estimated_duration_days  INT NOT NULL CHECK (estimated_duration_days > 0),
    planned_start_date       DATE,
    planned_end_date         DATE,
    planned_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_work_order_plans_work_order
        FOREIGN KEY (wo_id, department_id)
        REFERENCES work_orders(wo_id, department_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_work_order_plans_officer
        FOREIGN KEY (planned_by, department_id)
        REFERENCES officers(user_id, department_id),

    CONSTRAINT chk_work_order_plans_date_range CHECK (
        planned_start_date IS NULL OR
        planned_end_date IS NULL OR
        planned_end_date >= planned_start_date
    )
);


-- 8. Tasks

CREATE TABLE tasks (
    task_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_id             UUID NOT NULL,
    department_id     UUID NOT NULL REFERENCES departments(department_id),
    assigned_to       UUID NOT NULL,
    assigned_by       UUID NOT NULL,
    title             VARCHAR(200) NOT NULL,
    description       TEXT NOT NULL,
    priority          priority_level NOT NULL DEFAULT 'MEDIUM',
    status            task_status NOT NULL DEFAULT 'PENDING',
    deadline          TIMESTAMP,
    completion_notes  TEXT,
    actual_hours      NUMERIC(5, 2),
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_tasks_task_department UNIQUE (task_id, department_id),

    CONSTRAINT fk_tasks_work_order
        FOREIGN KEY (wo_id, department_id)
        REFERENCES work_orders(wo_id, department_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_tasks_assigned_to_engineer
        FOREIGN KEY (assigned_to, department_id)
        REFERENCES engineers(user_id, department_id),

    CONSTRAINT fk_tasks_assigned_by_officer
        FOREIGN KEY (assigned_by, department_id)
        REFERENCES officers(user_id, department_id),

    CONSTRAINT chk_tasks_deadline_required CHECK (
        status IN ('PENDING', 'CANCELLED') OR deadline IS NOT NULL
    )
);


-- 8A. Budget Estimates
-- Captures the explicit engineer estimate step before admin forwarding.

CREATE TABLE budget_estimates (
    estimate_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_id                     UUID NOT NULL UNIQUE,
    department_id             UUID NOT NULL REFERENCES departments(department_id),
    estimated_by              UUID NOT NULL,
    estimated_base_amount     NUMERIC(15, 2) NOT NULL CHECK (estimated_base_amount > 0),
    estimated_gst_amount      NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (estimated_gst_amount >= 0),
    estimated_total_amount    NUMERIC(15, 2) GENERATED ALWAYS AS (
                                estimated_base_amount + estimated_gst_amount
                              ) STORED,
    technical_justification   TEXT NOT NULL,
    financial_justification   TEXT NOT NULL,
    general_notes             TEXT,
    prepared_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_budget_estimates_estimate_department UNIQUE (estimate_id, department_id),

    CONSTRAINT fk_budget_estimates_work_order
        FOREIGN KEY (wo_id, department_id)
        REFERENCES work_orders(wo_id, department_id),

    CONSTRAINT fk_budget_estimates_engineer
        FOREIGN KEY (estimated_by, department_id)
        REFERENCES engineers(user_id, department_id)
);


-- 9. Budget Allocations

CREATE TABLE budget_allocations (
    budget_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_id                 UUID NOT NULL UNIQUE,
    estimate_id           UUID NOT NULL UNIQUE,
    department_id         UUID NOT NULL REFERENCES departments(department_id),
    budget_cycle_id       UUID NOT NULL,
    project_name          VARCHAR(255) NOT NULL,
    base_amount           NUMERIC(15, 2) NOT NULL CHECK (base_amount > 0),
    gst_amount            NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (gst_amount >= 0),
    total_amount          NUMERIC(15, 2) GENERATED ALWAYS AS (base_amount + gst_amount) STORED,
    stage                 budget_stage NOT NULL DEFAULT 'DRAFT',
    admin_forwarded_by    UUID,
    admin_forwarded_at    TIMESTAMP,
    verified_by           UUID,
    verified_at           TIMESTAMP,
    cfo_approved_by       UUID,
    cfo_approved_at       TIMESTAMP,
    cfo_adjustment_reason TEXT,
    admin_approved_by     UUID,
    admin_approved_at     TIMESTAMP,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_budget_allocations_budget_department UNIQUE (budget_id, department_id),

    CONSTRAINT fk_budget_allocations_work_order
        FOREIGN KEY (wo_id, department_id)
        REFERENCES work_orders(wo_id, department_id),

    CONSTRAINT fk_budget_allocations_estimate
        FOREIGN KEY (estimate_id, department_id)
        REFERENCES budget_estimates(estimate_id, department_id),

    CONSTRAINT fk_budget_allocations_cycle
        FOREIGN KEY (budget_cycle_id, department_id)
        REFERENCES department_budget_cycles(cycle_id, department_id),

    CONSTRAINT fk_budget_allocations_admin_forward
        FOREIGN KEY (admin_forwarded_by)
        REFERENCES administrators(user_id),

    CONSTRAINT fk_budget_allocations_officer_verification
        FOREIGN KEY (verified_by, department_id)
        REFERENCES officers(user_id, department_id),

    CONSTRAINT fk_budget_allocations_cfo_approval
        FOREIGN KEY (cfo_approved_by)
        REFERENCES cfos(user_id),

    CONSTRAINT fk_budget_allocations_admin_approval
        FOREIGN KEY (admin_approved_by)
        REFERENCES administrators(user_id),

    CONSTRAINT chk_budget_admin_forward_pair CHECK (
        (admin_forwarded_by IS NULL AND admin_forwarded_at IS NULL) OR
        (admin_forwarded_by IS NOT NULL AND admin_forwarded_at IS NOT NULL)
    ),

    CONSTRAINT chk_budget_verified_pair CHECK (
        (verified_by IS NULL AND verified_at IS NULL) OR
        (verified_by IS NOT NULL AND verified_at IS NOT NULL)
    ),

    CONSTRAINT chk_budget_cfo_pair CHECK (
        (cfo_approved_by IS NULL AND cfo_approved_at IS NULL) OR
        (cfo_approved_by IS NOT NULL AND cfo_approved_at IS NOT NULL)
    ),

    CONSTRAINT chk_budget_admin_approval_pair CHECK (
        (admin_approved_by IS NULL AND admin_approved_at IS NULL) OR
        (admin_approved_by IS NOT NULL AND admin_approved_at IS NOT NULL)
    ),

    CONSTRAINT chk_budget_forward_required_after_forward_stage CHECK (
        stage IN ('DRAFT', 'PENDING_ADMIN_FORWARD', 'REJECTED') OR admin_forwarded_by IS NOT NULL
    ),

    CONSTRAINT chk_budget_officer_required_after_verification_stage CHECK (
        stage IN ('DRAFT', 'PENDING_ADMIN_FORWARD', 'PENDING_OFFICER_VERIFICATION', 'REJECTED')
        OR verified_by IS NOT NULL
    ),

    CONSTRAINT chk_budget_cfo_required_after_cfo_stage CHECK (
        stage IN ('DRAFT', 'PENDING_ADMIN_FORWARD', 'PENDING_OFFICER_VERIFICATION', 'PENDING_CFO_REVIEW', 'REJECTED')
        OR cfo_approved_by IS NOT NULL
    ),

    CONSTRAINT chk_budget_admin_required_after_approval_stage CHECK (
        stage NOT IN ('APPROVED', 'PARTIALLY_RELEASED', 'FULLY_RELEASED') OR admin_approved_by IS NOT NULL
    )
);


-- 10. Vendor Quotations

CREATE TABLE vendor_quotations (
    quotation_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id             UUID NOT NULL,
    department_id         UUID NOT NULL REFERENCES departments(department_id),
    vendor_name           VARCHAR(200) NOT NULL,
    vendor_gstin          VARCHAR(20) NOT NULL,
    is_government_vendor  BOOLEAN NOT NULL DEFAULT FALSE,
    description           TEXT NOT NULL,
    quoted_amount         NUMERIC(15, 2) NOT NULL CHECK (quoted_amount > 0),
    status                quotation_status NOT NULL DEFAULT 'SUBMITTED',
    submitted_by          UUID NOT NULL,
    officer_verified_by   UUID,
    officer_verified_at   TIMESTAMP,
    cfo_reviewed_by       UUID,
    cfo_reviewed_at       TIMESTAMP,
    review_notes          TEXT,
    submitted_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_vendor_quotations_quotation_department UNIQUE (quotation_id, department_id),
    CONSTRAINT uq_vendor_quotations_budget_vendor UNIQUE (budget_id, vendor_gstin),

    CONSTRAINT fk_vendor_quotations_budget
        FOREIGN KEY (budget_id, department_id)
        REFERENCES budget_allocations(budget_id, department_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_vendor_quotations_submitted_by_officer
        FOREIGN KEY (submitted_by, department_id)
        REFERENCES officers(user_id, department_id),

    CONSTRAINT fk_vendor_quotations_verified_by_officer
        FOREIGN KEY (officer_verified_by, department_id)
        REFERENCES officers(user_id, department_id),

    CONSTRAINT fk_vendor_quotations_cfo_review
        FOREIGN KEY (cfo_reviewed_by)
        REFERENCES cfos(user_id),

    CONSTRAINT chk_vendor_quotation_officer_pair CHECK (
        (officer_verified_by IS NULL AND officer_verified_at IS NULL) OR
        (officer_verified_by IS NOT NULL AND officer_verified_at IS NOT NULL)
    ),

    CONSTRAINT chk_vendor_quotation_cfo_pair CHECK (
        (cfo_reviewed_by IS NULL AND cfo_reviewed_at IS NULL) OR
        (cfo_reviewed_by IS NOT NULL AND cfo_reviewed_at IS NOT NULL)
    ),

    CONSTRAINT chk_vendor_quotation_gstin_format CHECK (
        vendor_gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'
    ),

    CONSTRAINT chk_vendor_quotation_final_review_metadata CHECK (
        status IN ('SUBMITTED', 'UNDER_REVIEW') OR cfo_reviewed_by IS NOT NULL
    )
);


-- 11. Procurement Bills

CREATE TABLE procurement_bills (
    bill_id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id                  UUID NOT NULL,
    quotation_id               UUID NOT NULL,
    department_id              UUID NOT NULL REFERENCES departments(department_id),
    bill_number                VARCHAR(50) NOT NULL,
    vendor_gstin               VARCHAR(20) NOT NULL,
    bill_amount                NUMERIC(15, 2) NOT NULL CHECK (bill_amount > 0),
    bill_date                  DATE NOT NULL,
    technical_justification    TEXT NOT NULL,
    financial_justification    TEXT NOT NULL,
    submitted_by               UUID NOT NULL,
    verified_by                UUID,
    verified_at                TIMESTAMP,
    approved_by                UUID,
    approved_at                TIMESTAMP,
    status                     bill_status NOT NULL DEFAULT 'SUBMITTED',
    payment_due_date           DATE,
    paid_at                    TIMESTAMP,
    submitted_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_procurement_bills_bill_department UNIQUE (bill_id, department_id),
    CONSTRAINT uq_procurement_bills_number_vendor UNIQUE (department_id, bill_number, vendor_gstin),

    CONSTRAINT fk_procurement_bills_budget
        FOREIGN KEY (budget_id, department_id)
        REFERENCES budget_allocations(budget_id, department_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_procurement_bills_quotation
        FOREIGN KEY (quotation_id, department_id)
        REFERENCES vendor_quotations(quotation_id, department_id),

    CONSTRAINT fk_procurement_bills_submitted_by
        FOREIGN KEY (submitted_by, department_id)
        REFERENCES officers(user_id, department_id),

    CONSTRAINT fk_procurement_bills_verified_by
        FOREIGN KEY (verified_by, department_id)
        REFERENCES officers(user_id, department_id),

    CONSTRAINT fk_procurement_bills_approved_by
        FOREIGN KEY (approved_by)
        REFERENCES cfos(user_id),

    CONSTRAINT chk_procurement_bills_verify_pair CHECK (
        (verified_by IS NULL AND verified_at IS NULL) OR
        (verified_by IS NOT NULL AND verified_at IS NOT NULL)
    ),

    CONSTRAINT chk_procurement_bills_approve_pair CHECK (
        (approved_by IS NULL AND approved_at IS NULL) OR
        (approved_by IS NOT NULL AND approved_at IS NOT NULL)
    ),

    CONSTRAINT chk_procurement_bills_gstin_format CHECK (
        vendor_gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'
    ),

    CONSTRAINT chk_procurement_bills_status_requires_approval CHECK (
        status IN ('SUBMITTED', 'UNDER_VERIFICATION', 'REJECTED') OR approved_by IS NOT NULL
    ),

    CONSTRAINT chk_procurement_bills_paid_pair CHECK (
        status <> 'PAID' OR paid_at IS NOT NULL
    )
);


-- 12. Fund Release Plans
-- Planned quarterly release allocations; actual release events are stored separately.

CREATE TABLE fund_release_plans (
    release_plan_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id               UUID NOT NULL UNIQUE,
    department_id           UUID NOT NULL REFERENCES departments(department_id),
    release_year            INT NOT NULL CHECK (release_year >= 2024),
    milestone_name          VARCHAR(150),
    milestone_verified_by   UUID NOT NULL,
    milestone_verified_at   TIMESTAMP NOT NULL,
    authorized_by           UUID NOT NULL,
    authorized_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_budget_amount  NUMERIC(15, 2) NOT NULL CHECK (approved_budget_amount > 0),
    q1_amount               NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (q1_amount >= 0),
    q2_amount               NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (q2_amount >= 0),
    q3_amount               NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (q3_amount >= 0),
    q4_amount               NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (q4_amount >= 0),
    total_released          NUMERIC(15, 2) GENERATED ALWAYS AS (
                              q1_amount + q2_amount + q3_amount + q4_amount
                            ) STORED,

    CONSTRAINT uq_fund_release_plans_release_department UNIQUE (release_plan_id, department_id),

    CONSTRAINT fk_fund_release_plans_budget
        FOREIGN KEY (budget_id, department_id)
        REFERENCES budget_allocations(budget_id, department_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_fund_release_plans_milestone_officer
        FOREIGN KEY (milestone_verified_by, department_id)
        REFERENCES officers(user_id, department_id),

    CONSTRAINT fk_fund_release_plans_authorized_by_officer
        FOREIGN KEY (authorized_by, department_id)
        REFERENCES officers(user_id, department_id),

    CONSTRAINT chk_fund_release_plan_totals CHECK (
        q1_amount + q2_amount + q3_amount + q4_amount <= approved_budget_amount
    )
);


-- 12A. Actual Quarterly Fund Releases

CREATE TABLE quarterly_fund_releases (
    release_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    release_plan_id          UUID NOT NULL,
    budget_id                UUID NOT NULL,
    approved_bill_id         UUID NOT NULL,
    department_id            UUID NOT NULL REFERENCES departments(department_id),
    release_quarter          fund_quarter NOT NULL,
    milestone_name           VARCHAR(150) NOT NULL,
    milestone_verified_by    UUID NOT NULL,
    released_by              UUID NOT NULL,
    released_amount          NUMERIC(15, 2) NOT NULL CHECK (released_amount > 0),
    release_notes            TEXT,
    released_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_quarterly_fund_releases_budget_quarter UNIQUE (budget_id, department_id, release_quarter),

    CONSTRAINT fk_quarterly_fund_releases_plan
        FOREIGN KEY (release_plan_id, department_id)
        REFERENCES fund_release_plans(release_plan_id, department_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_quarterly_fund_releases_budget
        FOREIGN KEY (budget_id, department_id)
        REFERENCES budget_allocations(budget_id, department_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_quarterly_fund_releases_bill
        FOREIGN KEY (approved_bill_id, department_id)
        REFERENCES procurement_bills(bill_id, department_id),

    CONSTRAINT fk_quarterly_fund_releases_milestone_officer
        FOREIGN KEY (milestone_verified_by, department_id)
        REFERENCES officers(user_id, department_id),

    CONSTRAINT fk_quarterly_fund_releases_released_by
        FOREIGN KEY (released_by, department_id)
        REFERENCES officers(user_id, department_id)
);


-- 13. Maintenance and Execution Logs

CREATE TABLE maintenance_logs (
    log_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_id              UUID NOT NULL,
    task_id            UUID,
    department_id      UUID NOT NULL REFERENCES departments(department_id),
    engineer_id        UUID NOT NULL,
    log_description    TEXT NOT NULL,
    before_image_url   VARCHAR(500),
    after_image_url    VARCHAR(500),
    logged_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_maintenance_logs_work_order
        FOREIGN KEY (wo_id, department_id)
        REFERENCES work_orders(wo_id, department_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_maintenance_logs_task
        FOREIGN KEY (task_id, department_id)
        REFERENCES tasks(task_id, department_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_maintenance_logs_engineer
        FOREIGN KEY (engineer_id, department_id)
        REFERENCES engineers(user_id, department_id)
);


-- 13A. Structured Material Usage

CREATE TABLE task_material_logs (
    material_log_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id           UUID NOT NULL,
    department_id     UUID NOT NULL REFERENCES departments(department_id),
    logged_by         UUID NOT NULL,
    material_name     VARCHAR(150) NOT NULL,
    quantity          NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
    unit              VARCHAR(50) NOT NULL,
    notes             TEXT,
    logged_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_task_material_logs_task
        FOREIGN KEY (task_id, department_id)
        REFERENCES tasks(task_id, department_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_task_material_logs_engineer
        FOREIGN KEY (logged_by, department_id)
        REFERENCES engineers(user_id, department_id)
);


-- 14. Administrator Validation Before QC

CREATE TABLE work_validation_reviews (
    validation_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_id           UUID NOT NULL,
    department_id   UUID NOT NULL REFERENCES departments(department_id),
    validated_by    UUID NOT NULL REFERENCES administrators(user_id),
    is_validated    BOOLEAN NOT NULL,
    comments        TEXT,
    validated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_work_validation_reviews_work_order
        FOREIGN KEY (wo_id, department_id)
        REFERENCES work_orders(wo_id, department_id)
        ON DELETE CASCADE
);


-- 15. Quality Control Reviews

CREATE TABLE qc_reviews (
    qc_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_id           UUID NOT NULL,
    department_id   UUID NOT NULL REFERENCES departments(department_id),
    reviewed_by     UUID NOT NULL REFERENCES qc_reviewers(user_id),
    is_approved     BOOLEAN NOT NULL,
    comments        TEXT,
    reviewed_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_qc_reviews_work_order
        FOREIGN KEY (wo_id, department_id)
        REFERENCES work_orders(wo_id, department_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_qc_comments_required_on_fail CHECK (
        is_approved = TRUE OR comments IS NOT NULL
    )
);


-- 16. Inspection Reports

CREATE TABLE inspection_reports (
    inspection_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    infra_id           UUID NOT NULL,
    wo_id              UUID,
    department_id      UUID NOT NULL REFERENCES departments(department_id),
    engineer_id        UUID NOT NULL,
    condition_rating   INT NOT NULL CHECK (condition_rating BETWEEN 1 AND 5),
    severity           inspection_severity NOT NULL DEFAULT 'LOW',
    description        TEXT NOT NULL,
    location_tag       VARCHAR(100),
    latitude           NUMERIC(9, 6),
    longitude          NUMERIC(9, 6),
    photo_url          VARCHAR(500),
    inspected_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_inspection_reports_infrastructure
        FOREIGN KEY (infra_id, department_id)
        REFERENCES infrastructure(infra_id, department_id),

    CONSTRAINT fk_inspection_reports_engineer
        FOREIGN KEY (engineer_id, department_id)
        REFERENCES engineers(user_id, department_id),

    CONSTRAINT fk_inspection_reports_work_order
        FOREIGN KEY (wo_id, department_id)
        REFERENCES work_orders(wo_id, department_id)
        ON DELETE SET NULL,

    CONSTRAINT chk_inspection_reports_geo_pair CHECK (
        (latitude IS NULL AND longitude IS NULL) OR
        (latitude IS NOT NULL AND longitude IS NOT NULL)
    ),

    CONSTRAINT chk_inspection_reports_latitude_range CHECK (
        latitude IS NULL OR latitude BETWEEN -90 AND 90
    ),

    CONSTRAINT chk_inspection_reports_longitude_range CHECK (
        longitude IS NULL OR longitude BETWEEN -180 AND 180
    ),

    CONSTRAINT chk_inspection_reports_location_present CHECK (
        location_tag IS NOT NULL OR latitude IS NOT NULL
    ),

    CONSTRAINT uq_inspection_reports_exact_event UNIQUE (
        infra_id,
        engineer_id,
        inspected_at
    )
);


-- 17. Issue Reports

CREATE TABLE issue_reports (
    issue_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id     UUID NOT NULL REFERENCES departments(department_id),
    infra_id          UUID,
    related_wo_id     UUID,
    engineer_reported_by UUID,
    officer_reported_by  UUID,
    category          VARCHAR(100) NOT NULL,
    title             VARCHAR(200) NOT NULL,
    description       TEXT NOT NULL,
    severity          inspection_severity NOT NULL,
    location_tag      VARCHAR(100),
    latitude          NUMERIC(9, 6),
    longitude         NUMERIC(9, 6),
    photo_url         VARCHAR(500),
    status            issue_status NOT NULL DEFAULT 'OPEN',
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_issue_reports_infrastructure
        FOREIGN KEY (infra_id, department_id)
        REFERENCES infrastructure(infra_id, department_id),

    CONSTRAINT fk_issue_reports_work_order
        FOREIGN KEY (related_wo_id, department_id)
        REFERENCES work_orders(wo_id, department_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_issue_reports_engineer
        FOREIGN KEY (engineer_reported_by, department_id)
        REFERENCES engineers(user_id, department_id),

    CONSTRAINT fk_issue_reports_officer
        FOREIGN KEY (officer_reported_by, department_id)
        REFERENCES officers(user_id, department_id),

    CONSTRAINT chk_issue_reports_geo_pair CHECK (
        (latitude IS NULL AND longitude IS NULL) OR
        (latitude IS NOT NULL AND longitude IS NOT NULL)
    ),

    CONSTRAINT chk_issue_reports_latitude_range CHECK (
        latitude IS NULL OR latitude BETWEEN -90 AND 90
    ),

    CONSTRAINT chk_issue_reports_longitude_range CHECK (
        longitude IS NULL OR longitude BETWEEN -180 AND 180
    ),

    CONSTRAINT chk_issue_reports_location_present CHECK (
        location_tag IS NOT NULL OR latitude IS NOT NULL
    ),

    CONSTRAINT chk_issue_reports_single_reporter CHECK (
        num_nonnulls(engineer_reported_by, officer_reported_by) = 1
    )
);


-- 18. Progress / Field Reports

CREATE TABLE progress_reports (
    report_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_id             UUID NOT NULL,
    task_id           UUID,
    department_id     UUID NOT NULL REFERENCES departments(department_id),
    engineer_id       UUID NOT NULL,
    title             VARCHAR(200) NOT NULL,
    summary           TEXT NOT NULL,
    attachment_url    VARCHAR(500),
    status            report_status NOT NULL DEFAULT 'DRAFT',
    acknowledged_by   UUID,
    acknowledged_at   TIMESTAMP,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at      TIMESTAMP,

    CONSTRAINT fk_progress_reports_work_order
        FOREIGN KEY (wo_id, department_id)
        REFERENCES work_orders(wo_id, department_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_progress_reports_task
        FOREIGN KEY (task_id, department_id)
        REFERENCES tasks(task_id, department_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_progress_reports_engineer
        FOREIGN KEY (engineer_id, department_id)
        REFERENCES engineers(user_id, department_id),

    CONSTRAINT fk_progress_reports_ack_officer
        FOREIGN KEY (acknowledged_by, department_id)
        REFERENCES officers(user_id, department_id),

    CONSTRAINT chk_progress_reports_ack_pair CHECK (
        (acknowledged_by IS NULL AND acknowledged_at IS NULL) OR
        (acknowledged_by IS NOT NULL AND acknowledged_at IS NOT NULL)
    ),

    CONSTRAINT chk_progress_reports_submit_pair CHECK (
        status = 'DRAFT' OR submitted_at IS NOT NULL
    )
);


-- 18A. Project Outcome and Accountability Reports

CREATE TABLE project_outcome_reports (
    outcome_report_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_id                UUID NOT NULL UNIQUE,
    department_id        UUID NOT NULL REFERENCES departments(department_id),
    prepared_by          UUID NOT NULL,
    outcome_status       project_outcome_status NOT NULL,
    success_analysis     TEXT NOT NULL,
    failure_analysis     TEXT,
    lessons_learned      TEXT NOT NULL,
    accountability_notes TEXT NOT NULL,
    submitted_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_project_outcome_reports_work_order
        FOREIGN KEY (wo_id, department_id)
        REFERENCES work_orders(wo_id, department_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_project_outcome_reports_officer
        FOREIGN KEY (prepared_by, department_id)
        REFERENCES officers(user_id, department_id),

    CONSTRAINT chk_project_outcome_reports_failure_notes CHECK (
        outcome_status <> 'FAILED' OR failure_analysis IS NOT NULL
    )
);


-- 19. Maintenance Schedules

CREATE TABLE maintenance_schedules (
    schedule_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    infra_id          UUID NOT NULL,
    department_id     UUID NOT NULL REFERENCES departments(department_id),
    assigned_to       UUID,
    scheduled_by      UUID NOT NULL,
    title             VARCHAR(200) NOT NULL,
    description       TEXT,
    frequency         schedule_frequency NOT NULL DEFAULT 'ONE_TIME',
    scheduled_date    TIMESTAMP NOT NULL,
    checklist_items   INT NOT NULL DEFAULT 0 CHECK (checklist_items >= 0),
    is_completed      BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at      TIMESTAMP,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_maintenance_schedules_infrastructure
        FOREIGN KEY (infra_id, department_id)
        REFERENCES infrastructure(infra_id, department_id),

    CONSTRAINT fk_maintenance_schedules_engineer
        FOREIGN KEY (assigned_to, department_id)
        REFERENCES engineers(user_id, department_id),

    CONSTRAINT fk_maintenance_schedules_officer
        FOREIGN KEY (scheduled_by, department_id)
        REFERENCES officers(user_id, department_id),

    CONSTRAINT chk_maintenance_schedules_completion_pair CHECK (
        is_completed = FALSE OR completed_at IS NOT NULL
    )
);


-- 20. Sensor Deployments

CREATE TABLE sensor_deployments (
    sensor_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    infra_id          UUID NOT NULL,
    department_id     UUID NOT NULL REFERENCES departments(department_id),
    deployed_by       UUID NOT NULL,
    resource_type     resource_type NOT NULL,
    sensor_type       VARCHAR(100) NOT NULL,
    location_tag      VARCHAR(100) NOT NULL,
    status            sensor_status NOT NULL DEFAULT 'ACTIVE',
    commissioned_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_reading_at   TIMESTAMP,
    notes             TEXT,

    CONSTRAINT uq_sensor_deployments_sensor_department UNIQUE (sensor_id, department_id),

    CONSTRAINT fk_sensor_deployments_infrastructure
        FOREIGN KEY (infra_id, department_id)
        REFERENCES infrastructure(infra_id, department_id),

    CONSTRAINT fk_sensor_deployments_engineer
        FOREIGN KEY (deployed_by, department_id)
        REFERENCES engineers(user_id, department_id)
);


-- 20A. Sensor Readings for Dashboards and Trends

CREATE TABLE sensor_readings (
    reading_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sensor_id         UUID NOT NULL,
    department_id     UUID NOT NULL REFERENCES departments(department_id),
    resource_type     resource_type NOT NULL,
    reading_value     NUMERIC(15, 4) NOT NULL CHECK (reading_value >= 0),
    reading_unit      VARCHAR(30) NOT NULL,
    quality_flag      VARCHAR(30) NOT NULL DEFAULT 'VALID',
    recorded_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sensor_readings_sensor
        FOREIGN KEY (sensor_id, department_id)
        REFERENCES sensor_deployments(sensor_id, department_id)
        ON DELETE CASCADE
);


-- 21. Utilization Reviews

CREATE TABLE utilization_reviews (
    review_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id             UUID NOT NULL,
    department_id         UUID NOT NULL REFERENCES departments(department_id),
    review_quarter        fund_quarter NOT NULL,
    review_year           INT NOT NULL CHECK (review_year >= 2024),
    planned_amount        NUMERIC(15, 2) NOT NULL CHECK (planned_amount > 0),
    actual_spent          NUMERIC(15, 2) NOT NULL CHECK (actual_spent >= 0),
    utilization_percent   NUMERIC(5, 2) GENERATED ALWAYS AS (
                             CASE
                                 WHEN planned_amount > 0
                                 THEN ROUND((actual_spent / planned_amount) * 100, 2)
                                 ELSE 0
                             END
                           ) STORED,
    reviewed_by           UUID NOT NULL,
    notes                 TEXT,
    reviewed_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_utilization_reviews UNIQUE (budget_id, department_id, review_quarter, review_year),

    CONSTRAINT fk_utilization_reviews_budget
        FOREIGN KEY (budget_id, department_id)
        REFERENCES budget_allocations(budget_id, department_id),

    CONSTRAINT fk_utilization_reviews_officer
        FOREIGN KEY (reviewed_by, department_id)
        REFERENCES officers(user_id, department_id)
);


-- 21A. Department KPI Snapshots

CREATE TABLE department_kpi_snapshots (
    snapshot_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id                UUID NOT NULL REFERENCES departments(department_id),
    snapshot_year                INT NOT NULL CHECK (snapshot_year >= 2024),
    snapshot_month               INT NOT NULL CHECK (snapshot_month BETWEEN 1 AND 12),
    work_orders_completed        INT NOT NULL DEFAULT 0 CHECK (work_orders_completed >= 0),
    average_resolution_hours     NUMERIC(10, 2) CHECK (average_resolution_hours >= 0),
    budget_utilization_percent   NUMERIC(5, 2) CHECK (
        budget_utilization_percent IS NULL OR
        budget_utilization_percent BETWEEN 0 AND 100
    ),
    infrastructure_health_score  NUMERIC(5, 2) CHECK (
        infrastructure_health_score IS NULL OR
        infrastructure_health_score BETWEEN 0 AND 100
    ),
    generated_at                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_department_kpi_snapshots_period UNIQUE (
        department_id,
        snapshot_year,
        snapshot_month
    )
);


-- 22. Generated Reports

CREATE TABLE generated_reports (
    report_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generated_by     UUID NOT NULL REFERENCES administrators(user_id),
    department_id    UUID REFERENCES departments(department_id),
    report_type      generated_report_type NOT NULL,
    parameters       JSONB NOT NULL DEFAULT '{}'::jsonb,
    generation_status generated_report_status NOT NULL DEFAULT 'PENDING',
    export_format    export_format_type NOT NULL,
    file_url         VARCHAR(500),
    failure_reason   TEXT,
    generated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_generated_reports_file_ready CHECK (
        generation_status <> 'GENERATED' OR file_url IS NOT NULL
    ),

    CONSTRAINT chk_generated_reports_failure_reason CHECK (
        generation_status <> 'FAILED' OR failure_reason IS NOT NULL
    )
);


-- 23. Resource Requests

CREATE TABLE resource_requests (
    request_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_id                 UUID NOT NULL,
    task_id               UUID,
    department_id         UUID NOT NULL REFERENCES departments(department_id),
    requested_by          UUID NOT NULL,
    category              VARCHAR(100) NOT NULL,
    resource_description  TEXT NOT NULL,
    quantity              INT NOT NULL CHECK (quantity > 0),
    unit                  VARCHAR(50) NOT NULL,
    justification         TEXT NOT NULL,
    required_by_date      DATE,
    urgency               priority_level NOT NULL DEFAULT 'MEDIUM',
    estimated_cost        NUMERIC(15, 2) CHECK (
        estimated_cost IS NULL OR estimated_cost > 0
    ),
    status                resource_request_status NOT NULL DEFAULT 'PENDING',
    reviewed_by           UUID,
    review_notes          TEXT,
    requested_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at           TIMESTAMP,

    CONSTRAINT fk_resource_requests_work_order
        FOREIGN KEY (wo_id, department_id)
        REFERENCES work_orders(wo_id, department_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_resource_requests_task
        FOREIGN KEY (task_id, department_id)
        REFERENCES tasks(task_id, department_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_resource_requests_engineer
        FOREIGN KEY (requested_by, department_id)
        REFERENCES engineers(user_id, department_id),

    CONSTRAINT fk_resource_requests_officer
        FOREIGN KEY (reviewed_by, department_id)
        REFERENCES officers(user_id, department_id),

    CONSTRAINT chk_resource_requests_review_pair CHECK (
        (reviewed_by IS NULL AND reviewed_at IS NULL) OR
        (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
    ),

    CONSTRAINT chk_resource_requests_review_required_for_decision CHECK (
        status = 'PENDING' OR reviewed_by IS NOT NULL
    )
);


-- 24. Notifications

CREATE TABLE notifications (
    notification_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id       UUID NOT NULL REFERENCES users(user_id),
    sender_id          UUID REFERENCES users(user_id),
    department_id      UUID REFERENCES departments(department_id),
    wo_id              UUID,
    task_id            UUID,
    notification_type  notification_type NOT NULL,
    message            TEXT NOT NULL,
    is_read            BOOLEAN NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notifications_work_order
        FOREIGN KEY (wo_id, department_id)
        REFERENCES work_orders(wo_id, department_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_notifications_task
        FOREIGN KEY (task_id, department_id)
        REFERENCES tasks(task_id, department_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_notifications_department_scope CHECK (
        (wo_id IS NULL AND task_id IS NULL) OR department_id IS NOT NULL
    ),

    CONSTRAINT chk_notifications_sender_not_self CHECK (
        sender_id IS NULL OR sender_id <> recipient_id
    )
);


-- 25. Budget Approval History
-- Uses exactly-one actor columns to keep history role-safe without triggers.

CREATE TABLE budget_approval_history (
    history_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id          UUID NOT NULL,
    department_id      UUID NOT NULL REFERENCES departments(department_id),
    admin_actor_id     UUID,
    cfo_actor_id       UUID,
    officer_actor_id   UUID,
    stage              budget_stage NOT NULL,
    action             approval_action NOT NULL,
    comments           TEXT,
    actioned_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_budget_history_budget
        FOREIGN KEY (budget_id, department_id)
        REFERENCES budget_allocations(budget_id, department_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_budget_history_admin
        FOREIGN KEY (admin_actor_id)
        REFERENCES administrators(user_id),

    CONSTRAINT fk_budget_history_cfo
        FOREIGN KEY (cfo_actor_id)
        REFERENCES cfos(user_id),

    CONSTRAINT fk_budget_history_officer
        FOREIGN KEY (officer_actor_id, department_id)
        REFERENCES officers(user_id, department_id),

    CONSTRAINT chk_budget_history_single_actor CHECK (
        num_nonnulls(admin_actor_id, cfo_actor_id, officer_actor_id) = 1
    )
);


-- 26. Work Order Approval History

CREATE TABLE wo_approval_history (
    history_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_id              UUID NOT NULL,
    department_id      UUID NOT NULL REFERENCES departments(department_id),
    admin_actor_id     UUID,
    officer_actor_id   UUID,
    from_status        wo_status NOT NULL,
    to_status          wo_status NOT NULL,
    action             approval_action NOT NULL,
    comments           TEXT,
    actioned_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_wo_history_work_order
        FOREIGN KEY (wo_id, department_id)
        REFERENCES work_orders(wo_id, department_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_wo_history_admin
        FOREIGN KEY (admin_actor_id)
        REFERENCES administrators(user_id),

    CONSTRAINT fk_wo_history_officer
        FOREIGN KEY (officer_actor_id, department_id)
        REFERENCES officers(user_id, department_id),

    CONSTRAINT chk_wo_history_single_actor CHECK (
        num_nonnulls(admin_actor_id, officer_actor_id) = 1
    )
);


-- 27. Supporting Indexes

CREATE INDEX idx_work_orders_department_status
    ON work_orders (department_id, status);

CREATE INDEX idx_tasks_department_assigned_to
    ON tasks (department_id, assigned_to);

CREATE INDEX idx_sensor_readings_sensor_recorded_at
    ON sensor_readings (sensor_id, recorded_at DESC);

CREATE INDEX idx_vendor_quotations_budget_status
    ON vendor_quotations (budget_id, status);

CREATE INDEX idx_budget_allocations_cycle_dept_stage
    ON budget_allocations (budget_cycle_id, department_id, stage);

CREATE INDEX idx_notifications_recipient_read
    ON notifications (recipient_id, is_read);

CREATE INDEX idx_tasks_wo_id
    ON tasks (wo_id);

CREATE UNIQUE INDEX idx_qc_reviews_one_approved_per_work_order
    ON qc_reviews (wo_id, department_id)
    WHERE is_approved = TRUE;

CREATE UNIQUE INDEX idx_work_validation_reviews_one_approved_per_work_order
    ON work_validation_reviews (wo_id, department_id)
    WHERE is_validated = TRUE;


-- END OF BASE SCHEMA
-- Tables: 39 | ENUMs: 24 | Indexes: 9 | Triggers: defined separately

-- ==============================================================================
-- MERGED: schema.sql + triggers/trigger_rules.sql
-- This file can be executed in one run.
-- ==============================================================================

-- ==============================================================================
-- City Resource and Infrastructure Management System (CRIMS)
-- Trigger rules for Database/trigger_enabled/schema.sql
-- Run this file after the base schema has been created.
-- ==============================================================================


-- 1. Role membership enforcement for subtype tables

CREATE OR REPLACE FUNCTION crims_validate_role_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    actual_role user_role;
BEGIN
    SELECT role
    INTO actual_role
    FROM users
    WHERE user_id = NEW.user_id;

    IF actual_role IS NULL THEN
        RAISE EXCEPTION 'User % does not exist in users', NEW.user_id;
    END IF;

    IF TG_TABLE_NAME = 'administrators' AND actual_role <> 'ADMINISTRATOR' THEN
        RAISE EXCEPTION 'User % must have role ADMINISTRATOR to be inserted into administrators', NEW.user_id;
    ELSIF TG_TABLE_NAME = 'cfos' AND actual_role <> 'CFO' THEN
        RAISE EXCEPTION 'User % must have role CFO to be inserted into cfos', NEW.user_id;
    ELSIF TG_TABLE_NAME = 'officers' AND actual_role <> 'OFFICER' THEN
        RAISE EXCEPTION 'User % must have role OFFICER to be inserted into officers', NEW.user_id;
    ELSIF TG_TABLE_NAME = 'engineers' AND actual_role <> 'ENGINEER' THEN
        RAISE EXCEPTION 'User % must have role ENGINEER to be inserted into engineers', NEW.user_id;
    ELSIF TG_TABLE_NAME = 'qc_reviewers' AND actual_role <> 'QC_REVIEWER' THEN
        RAISE EXCEPTION 'User % must have role QC_REVIEWER to be inserted into qc_reviewers', NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$;


-- 2. Auto-touch updated_at columns

CREATE OR REPLACE FUNCTION crims_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


-- 3. Budget estimate and work order consistency

CREATE OR REPLACE FUNCTION crims_validate_budget_allocation_links()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    estimate_work_order_id UUID;
    estimate_total_amount  NUMERIC(15, 2);
BEGIN
    SELECT wo_id, estimated_total_amount
    INTO estimate_work_order_id, estimate_total_amount
    FROM budget_estimates
    WHERE estimate_id = NEW.estimate_id
      AND department_id = NEW.department_id;

    IF estimate_work_order_id IS NULL THEN
        RAISE EXCEPTION 'Budget estimate % was not found for department %', NEW.estimate_id, NEW.department_id;
    END IF;

    IF estimate_work_order_id <> NEW.wo_id THEN
        RAISE EXCEPTION 'Budget allocation work order % does not match estimate work order %', NEW.wo_id, estimate_work_order_id;
    END IF;

    IF (NEW.base_amount + NEW.gst_amount) > estimate_total_amount THEN
        RAISE EXCEPTION 'Budget allocation total (%) cannot exceed engineer estimate total (%)',
            (NEW.base_amount + NEW.gst_amount),
            estimate_total_amount;
    END IF;

    IF (NEW.base_amount + NEW.gst_amount) < estimate_total_amount
       AND NEW.stage IN ('PENDING_CFO_REVIEW', 'APPROVED', 'PARTIALLY_RELEASED', 'FULLY_RELEASED')
       AND NULLIF(BTRIM(COALESCE(NEW.cfo_adjustment_reason, '')), '') IS NULL THEN
        RAISE EXCEPTION 'A CFO adjustment reason is required when the sanctioned budget is lower than the engineer estimate';
    END IF;

    RETURN NEW;
END;
$$;


-- 4. Budget stage workflow, quotation, and annual-cap validation

CREATE OR REPLACE FUNCTION crims_validate_budget_allocation_stage()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    quotation_count       INT;
    accepted_quote_count  INT;
    emergency_flag        BOOLEAN;
    cycle_cap             NUMERIC(15, 2);
    other_approved_total  NUMERIC(15, 2);
    has_release_plan      BOOLEAN;
    released_total        NUMERIC(15, 2);
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.stage <> OLD.stage THEN
        CASE OLD.stage
            WHEN 'DRAFT' THEN
                IF NEW.stage NOT IN ('PENDING_ADMIN_FORWARD', 'REJECTED') THEN
                    RAISE EXCEPTION 'Budget stage cannot move directly from % to %', OLD.stage, NEW.stage;
                END IF;
            WHEN 'PENDING_ADMIN_FORWARD' THEN
                IF NEW.stage NOT IN ('PENDING_OFFICER_VERIFICATION', 'REJECTED') THEN
                    RAISE EXCEPTION 'Budget stage cannot move directly from % to %', OLD.stage, NEW.stage;
                END IF;
            WHEN 'PENDING_OFFICER_VERIFICATION' THEN
                IF NEW.stage NOT IN ('PENDING_CFO_REVIEW', 'REJECTED') THEN
                    RAISE EXCEPTION 'Budget stage cannot move directly from % to %', OLD.stage, NEW.stage;
                END IF;
            WHEN 'PENDING_CFO_REVIEW' THEN
                IF NEW.stage NOT IN ('APPROVED', 'REJECTED') THEN
                    RAISE EXCEPTION 'Budget stage cannot move directly from % to %', OLD.stage, NEW.stage;
                END IF;
            WHEN 'APPROVED' THEN
                IF NEW.stage NOT IN ('PARTIALLY_RELEASED', 'FULLY_RELEASED') THEN
                    RAISE EXCEPTION 'Budget stage cannot move directly from % to %', OLD.stage, NEW.stage;
                END IF;
            WHEN 'PARTIALLY_RELEASED' THEN
                IF NEW.stage <> 'FULLY_RELEASED' THEN
                    RAISE EXCEPTION 'Budget stage cannot move directly from % to %', OLD.stage, NEW.stage;
                END IF;
            WHEN 'FULLY_RELEASED' THEN
                RAISE EXCEPTION 'A fully released budget cannot transition to another stage';
            WHEN 'REJECTED' THEN
                IF NEW.stage <> 'DRAFT' THEN
                    RAISE EXCEPTION 'A rejected budget can only be revised by moving back to DRAFT';
                END IF;
        END CASE;
    END IF;

    SELECT is_emergency
    INTO emergency_flag
    FROM work_orders
    WHERE wo_id = NEW.wo_id
      AND department_id = NEW.department_id;

    IF NEW.stage IN ('PENDING_CFO_REVIEW', 'APPROVED', 'PARTIALLY_RELEASED', 'FULLY_RELEASED') THEN
        SELECT COUNT(*)
        INTO quotation_count
        FROM vendor_quotations
        WHERE budget_id = NEW.budget_id
          AND department_id = NEW.department_id;

        IF quotation_count < CASE WHEN COALESCE(emergency_flag, FALSE) THEN 1 ELSE 2 END THEN
            RAISE EXCEPTION 'Budget % requires % vendor quotation(s) before CFO review',
                NEW.budget_id,
                CASE WHEN COALESCE(emergency_flag, FALSE) THEN 1 ELSE 2 END;
        END IF;
    END IF;

    IF NEW.stage IN ('APPROVED', 'PARTIALLY_RELEASED', 'FULLY_RELEASED') THEN
        SELECT COUNT(*)
        INTO accepted_quote_count
        FROM vendor_quotations
        WHERE budget_id = NEW.budget_id
          AND department_id = NEW.department_id
          AND status = 'ACCEPTED';

        IF accepted_quote_count <> 1 THEN
            RAISE EXCEPTION 'Budget % must have exactly one accepted vendor quotation before approval', NEW.budget_id;
        END IF;

        SELECT annual_budget_cap
        INTO cycle_cap
        FROM department_budget_cycles
        WHERE cycle_id = NEW.budget_cycle_id
          AND department_id = NEW.department_id;

        SELECT COALESCE(SUM(base_amount + gst_amount), 0)
        INTO other_approved_total
        FROM budget_allocations
        WHERE budget_cycle_id = NEW.budget_cycle_id
          AND department_id = NEW.department_id
          AND stage IN ('APPROVED', 'PARTIALLY_RELEASED', 'FULLY_RELEASED')
          AND budget_id <> NEW.budget_id;

        IF other_approved_total + (NEW.base_amount + NEW.gst_amount) > cycle_cap THEN
            RAISE EXCEPTION 'Approving budget % would exceed the annual department budget cap', NEW.budget_id;
        END IF;
    END IF;

    IF NEW.stage IN ('PARTIALLY_RELEASED', 'FULLY_RELEASED') THEN
        SELECT EXISTS (
            SELECT 1
            FROM fund_release_plans
            WHERE budget_id = NEW.budget_id
              AND department_id = NEW.department_id
        )
        INTO has_release_plan;

        IF NOT has_release_plan THEN
            RAISE EXCEPTION 'Budget % requires a fund release plan before staged release', NEW.budget_id;
        END IF;

        SELECT COALESCE(SUM(released_amount), 0)
        INTO released_total
        FROM quarterly_fund_releases
        WHERE budget_id = NEW.budget_id
          AND department_id = NEW.department_id;

        IF NEW.stage = 'PARTIALLY_RELEASED'
           AND (released_total <= 0 OR released_total >= (NEW.base_amount + NEW.gst_amount)) THEN
            RAISE EXCEPTION 'Budget % can only be marked PARTIALLY_RELEASED when released funds are greater than 0 and lower than the sanctioned total', NEW.budget_id;
        END IF;

        IF NEW.stage = 'FULLY_RELEASED'
           AND released_total <> (NEW.base_amount + NEW.gst_amount) THEN
            RAISE EXCEPTION 'Budget % can only be marked FULLY_RELEASED when released funds equal the sanctioned total', NEW.budget_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


-- 5. Release plan must match approved budget and fiscal cycle

CREATE OR REPLACE FUNCTION crims_validate_fund_release_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    budget_total       NUMERIC(15, 2);
    budget_stage_value budget_stage;
    budget_cycle_year  INT;
BEGIN
    SELECT (ba.base_amount + ba.gst_amount), ba.stage, dbc.fiscal_year
    INTO budget_total, budget_stage_value, budget_cycle_year
    FROM budget_allocations ba
    JOIN department_budget_cycles dbc
      ON dbc.cycle_id = ba.budget_cycle_id
     AND dbc.department_id = ba.department_id
    WHERE ba.budget_id = NEW.budget_id
      AND ba.department_id = NEW.department_id;

    IF budget_total IS NULL THEN
        RAISE EXCEPTION 'Budget % was not found for department %', NEW.budget_id, NEW.department_id;
    END IF;

    IF budget_stage_value NOT IN ('APPROVED', 'PARTIALLY_RELEASED', 'FULLY_RELEASED') THEN
        RAISE EXCEPTION 'Fund release plans can only be created after budget approval. Current stage is %', budget_stage_value;
    END IF;

    IF NEW.approved_budget_amount <> budget_total THEN
        RAISE EXCEPTION 'approved_budget_amount (%) must match budget total_amount (%)', NEW.approved_budget_amount, budget_total;
    END IF;

    IF NEW.release_year <> budget_cycle_year THEN
        RAISE EXCEPTION 'Fund release year % must match the department fiscal year %', NEW.release_year, budget_cycle_year;
    END IF;

    RETURN NEW;
END;
$$;


-- 6. Optional task references must belong to the same work order

CREATE OR REPLACE FUNCTION crims_validate_task_work_order_link()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    linked_work_order_id UUID;
BEGIN
    IF NEW.task_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT wo_id
    INTO linked_work_order_id
    FROM tasks
    WHERE task_id = NEW.task_id
      AND department_id = NEW.department_id;

    IF linked_work_order_id IS NULL THEN
        RAISE EXCEPTION 'Task % was not found for department %', NEW.task_id, NEW.department_id;
    END IF;

    IF linked_work_order_id <> NEW.wo_id THEN
        RAISE EXCEPTION 'Task % belongs to work order %, not work order %', NEW.task_id, linked_work_order_id, NEW.wo_id;
    END IF;

    RETURN NEW;
END;
$$;


-- 7. Work order lifecycle validation

CREATE OR REPLACE FUNCTION crims_validate_work_order_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    has_plan                BOOLEAN;
    has_request_assessment  BOOLEAN;
    has_admin_validation    BOOLEAN;
    has_qc_approval         BOOLEAN;
    has_outcome_report      BOOLEAN;
BEGIN
    IF NEW.status = OLD.status THEN
        RETURN NEW;
    END IF;

    CASE OLD.status
        WHEN 'DRAFT' THEN
            IF NEW.status NOT IN ('PENDING_OFFICER_APPROVAL', 'PENDING_ADMIN_APPROVAL', 'REJECTED')
               AND NOT (NEW.is_emergency = TRUE AND NEW.status = 'APPROVED') THEN
                RAISE EXCEPTION 'Work order stage cannot move directly from % to %', OLD.status, NEW.status;
            END IF;
        WHEN 'PENDING_OFFICER_APPROVAL' THEN
            IF NEW.status NOT IN ('PENDING_ADMIN_APPROVAL', 'REJECTED') THEN
                RAISE EXCEPTION 'Work order stage cannot move directly from % to %', OLD.status, NEW.status;
            END IF;
        WHEN 'PENDING_ADMIN_APPROVAL' THEN
            IF NEW.status NOT IN ('APPROVED', 'REJECTED') THEN
                RAISE EXCEPTION 'Work order stage cannot move directly from % to %', OLD.status, NEW.status;
            END IF;
        WHEN 'APPROVED' THEN
            IF NEW.status NOT IN ('IN_PROGRESS', 'REJECTED') THEN
                RAISE EXCEPTION 'Work order stage cannot move directly from % to %', OLD.status, NEW.status;
            END IF;
        WHEN 'IN_PROGRESS' THEN
            IF NEW.status NOT IN ('PENDING_QC', 'REJECTED') THEN
                RAISE EXCEPTION 'Work order stage cannot move directly from % to %', OLD.status, NEW.status;
            END IF;
        WHEN 'PENDING_QC' THEN
            IF NEW.status NOT IN ('IN_PROGRESS', 'COMPLETED', 'REJECTED') THEN
                RAISE EXCEPTION 'Work order stage cannot move directly from % to %', OLD.status, NEW.status;
            END IF;
        WHEN 'COMPLETED' THEN
            RAISE EXCEPTION 'A completed work order cannot transition to another stage';
        WHEN 'REJECTED' THEN
            IF NEW.status <> 'DRAFT' THEN
                RAISE EXCEPTION 'A rejected work order can only be revised by moving back to DRAFT';
            END IF;
    END CASE;

    IF NEW.status IN ('PENDING_ADMIN_APPROVAL', 'APPROVED', 'IN_PROGRESS', 'PENDING_QC', 'COMPLETED') THEN
        IF NOT (OLD.status = 'DRAFT' AND NEW.status = 'APPROVED' AND NEW.is_emergency = TRUE) THEN
            SELECT EXISTS (
                SELECT 1
                FROM work_order_plans
                WHERE wo_id = NEW.wo_id
                  AND department_id = NEW.department_id
            )
            INTO has_plan;

            IF NOT has_plan THEN
                RAISE EXCEPTION 'Work order % requires a department officer planning record before moving to %', NEW.wo_id, NEW.status;
            END IF;
        END IF;

        IF NEW.request_id IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1
                FROM request_assessments
                WHERE request_id = NEW.request_id
                  AND department_id = NEW.department_id
                  AND is_feasible = TRUE
            )
            INTO has_request_assessment;

            IF NOT has_request_assessment THEN
                RAISE EXCEPTION 'Work order % requires a feasible administrator assessment for the linked citizen request before moving to %', NEW.wo_id, NEW.status;
            END IF;
        END IF;
    END IF;

    IF NEW.status IN ('PENDING_QC', 'COMPLETED') THEN
        SELECT EXISTS (
            SELECT 1
            FROM work_validation_reviews
            WHERE wo_id = NEW.wo_id
              AND department_id = NEW.department_id
              AND is_validated = TRUE
        )
        INTO has_admin_validation;

        IF NOT has_admin_validation THEN
            RAISE EXCEPTION 'Work order % requires an approved administrator validation before moving to %', NEW.wo_id, NEW.status;
        END IF;
    END IF;

    IF NEW.status = 'COMPLETED' THEN
        SELECT EXISTS (
            SELECT 1
            FROM qc_reviews
            WHERE wo_id = NEW.wo_id
              AND department_id = NEW.department_id
              AND is_approved = TRUE
        )
        INTO has_qc_approval;

        IF NOT has_qc_approval THEN
            RAISE EXCEPTION 'Work order % requires an approved QC review before completion', NEW.wo_id;
        END IF;

        SELECT EXISTS (
            SELECT 1
            FROM project_outcome_reports
            WHERE wo_id = NEW.wo_id
              AND department_id = NEW.department_id
        )
        INTO has_outcome_report;

        IF NOT has_outcome_report THEN
            RAISE EXCEPTION 'Work order % requires an officer accountability report before completion', NEW.wo_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


-- 8. Vendor quotation policy validation

CREATE OR REPLACE FUNCTION crims_validate_vendor_quotation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    accepted_quote_count  INT;
    government_available  BOOLEAN;
BEGIN
    IF NEW.status IN ('ACCEPTED', 'REJECTED') AND NEW.officer_verified_by IS NULL THEN
        RAISE EXCEPTION 'Vendor quotation % requires officer verification before final decision', NEW.quotation_id;
    END IF;

    IF NEW.status = 'ACCEPTED' THEN
        SELECT COUNT(*)
        INTO accepted_quote_count
        FROM vendor_quotations
        WHERE budget_id = NEW.budget_id
          AND department_id = NEW.department_id
          AND status = 'ACCEPTED'
          AND quotation_id <> NEW.quotation_id;

        IF accepted_quote_count > 0 THEN
            RAISE EXCEPTION 'Budget % already has an accepted vendor quotation', NEW.budget_id;
        END IF;

        IF NEW.officer_verified_by IS NULL OR NEW.cfo_reviewed_by IS NULL THEN
            RAISE EXCEPTION 'Accepted quotations require both officer verification and CFO review metadata';
        END IF;

        IF NOT NEW.is_government_vendor THEN
            SELECT EXISTS (
                SELECT 1
                FROM vendor_quotations
                WHERE budget_id = NEW.budget_id
                  AND department_id = NEW.department_id
                  AND is_government_vendor = TRUE
                  AND status <> 'REJECTED'
                  AND quotation_id <> NEW.quotation_id
            )
            INTO government_available;

            IF government_available THEN
                RAISE EXCEPTION 'A non-government vendor cannot be accepted while a government vendor quotation is still available for budget %', NEW.budget_id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


-- 9. Procurement bill validation

CREATE OR REPLACE FUNCTION crims_validate_procurement_bill()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    quotation_budget_id  UUID;
    quotation_gstin      VARCHAR(20);
    quotation_amount     NUMERIC(15, 2);
    quotation_stage      quotation_status;
BEGIN
    SELECT budget_id, vendor_gstin, quoted_amount, status
    INTO quotation_budget_id, quotation_gstin, quotation_amount, quotation_stage
    FROM vendor_quotations
    WHERE quotation_id = NEW.quotation_id
      AND department_id = NEW.department_id;

    IF quotation_budget_id IS NULL THEN
        RAISE EXCEPTION 'Vendor quotation % was not found for department %', NEW.quotation_id, NEW.department_id;
    END IF;

    IF quotation_budget_id <> NEW.budget_id THEN
        RAISE EXCEPTION 'Procurement bill % must reference a quotation from the same budget', NEW.bill_id;
    END IF;

    IF quotation_gstin <> NEW.vendor_gstin THEN
        RAISE EXCEPTION 'Procurement bill % GSTIN must match the accepted vendor quotation GSTIN', NEW.bill_id;
    END IF;

    IF NEW.bill_amount > quotation_amount THEN
        RAISE EXCEPTION 'Procurement bill % amount cannot exceed the approved quotation amount', NEW.bill_id;
    END IF;

    IF NEW.status IN ('APPROVED', 'PAID') THEN
        IF quotation_stage <> 'ACCEPTED' THEN
            RAISE EXCEPTION 'Only accepted vendor quotations can be converted into approved bills';
        END IF;

        IF NEW.verified_by IS NULL OR NEW.approved_by IS NULL THEN
            RAISE EXCEPTION 'Approved procurement bills require officer verification and CFO approval';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


-- 10. Actual quarterly fund release validation

CREATE OR REPLACE FUNCTION crims_validate_quarterly_fund_release()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    plan_budget_id         UUID;
    approved_bill_budget   UUID;
    approved_bill_status   bill_status;
    planned_quarter_amount NUMERIC(15, 2);
    budget_total_amount    NUMERIC(15, 2);
    prior_release_total    NUMERIC(15, 2);
BEGIN
    SELECT budget_id,
           CASE NEW.release_quarter
               WHEN 'Q1' THEN q1_amount
               WHEN 'Q2' THEN q2_amount
               WHEN 'Q3' THEN q3_amount
               WHEN 'Q4' THEN q4_amount
           END
    INTO plan_budget_id, planned_quarter_amount
    FROM fund_release_plans
    WHERE release_plan_id = NEW.release_plan_id
      AND department_id = NEW.department_id;

    IF plan_budget_id IS NULL THEN
        RAISE EXCEPTION 'Fund release plan % was not found for department %', NEW.release_plan_id, NEW.department_id;
    END IF;

    IF plan_budget_id <> NEW.budget_id THEN
        RAISE EXCEPTION 'Fund release % must reference a release plan for the same budget', NEW.release_id;
    END IF;

    SELECT budget_id, status
    INTO approved_bill_budget, approved_bill_status
    FROM procurement_bills
    WHERE bill_id = NEW.approved_bill_id
      AND department_id = NEW.department_id;

    IF approved_bill_budget IS NULL THEN
        RAISE EXCEPTION 'Approved bill % was not found for department %', NEW.approved_bill_id, NEW.department_id;
    END IF;

    IF approved_bill_budget <> NEW.budget_id THEN
        RAISE EXCEPTION 'Fund release % must reference a bill from the same budget', NEW.release_id;
    END IF;

    IF approved_bill_status NOT IN ('APPROVED', 'PAID') THEN
        RAISE EXCEPTION 'Funds can only be released against a CFO-approved procurement bill';
    END IF;

    SELECT (base_amount + gst_amount)
    INTO budget_total_amount
    FROM budget_allocations
    WHERE budget_id = NEW.budget_id
      AND department_id = NEW.department_id;

    SELECT COALESCE(SUM(released_amount), 0)
    INTO prior_release_total
    FROM quarterly_fund_releases
    WHERE budget_id = NEW.budget_id
      AND department_id = NEW.department_id
      AND release_id <> NEW.release_id;

    IF NEW.released_amount > planned_quarter_amount THEN
        RAISE EXCEPTION 'Fund release % exceeds the planned amount for quarter %', NEW.release_id, NEW.release_quarter;
    END IF;

    IF prior_release_total + NEW.released_amount > budget_total_amount THEN
        RAISE EXCEPTION 'Fund release % would exceed the sanctioned budget total', NEW.release_id;
    END IF;

    RETURN NEW;
END;
$$;


-- 11. Synchronize budget stage with actual quarterly releases

CREATE OR REPLACE FUNCTION crims_sync_budget_release_stage()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    target_budget_id      UUID;
    target_department_id  UUID;
    budget_total_amount   NUMERIC(15, 2);
    released_total        NUMERIC(15, 2);
    derived_stage         budget_stage;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_budget_id := OLD.budget_id;
        target_department_id := OLD.department_id;
    ELSE
        target_budget_id := NEW.budget_id;
        target_department_id := NEW.department_id;
    END IF;

    SELECT (base_amount + gst_amount)
    INTO budget_total_amount
    FROM budget_allocations
    WHERE budget_id = target_budget_id
      AND department_id = target_department_id;

    IF budget_total_amount IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT COALESCE(SUM(released_amount), 0)
    INTO released_total
    FROM quarterly_fund_releases
    WHERE budget_id = target_budget_id
      AND department_id = target_department_id;

    IF released_total = 0 THEN
        derived_stage := 'APPROVED';
    ELSIF released_total < budget_total_amount THEN
        derived_stage := 'PARTIALLY_RELEASED';
    ELSE
        derived_stage := 'FULLY_RELEASED';
    END IF;

    UPDATE budget_allocations
    SET stage = derived_stage
    WHERE budget_id = target_budget_id
      AND department_id = target_department_id
      AND stage IS DISTINCT FROM derived_stage;

    RETURN NULL;
END;
$$;


-- 12. Sensor reading validation and roll-up

CREATE OR REPLACE FUNCTION crims_validate_sensor_reading()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    deployed_resource_type resource_type;
BEGIN
    SELECT resource_type
    INTO deployed_resource_type
    FROM sensor_deployments
    WHERE sensor_id = NEW.sensor_id
      AND department_id = NEW.department_id;

    IF deployed_resource_type IS NULL THEN
        RAISE EXCEPTION 'Sensor % was not found for department %', NEW.sensor_id, NEW.department_id;
    END IF;

    IF deployed_resource_type <> NEW.resource_type THEN
        RAISE EXCEPTION 'Sensor reading resource type % does not match deployed sensor resource type %',
            NEW.resource_type,
            deployed_resource_type;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION crims_sync_sensor_last_reading()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    target_sensor_id       UUID;
    target_department_id   UUID;
    latest_reading_at      TIMESTAMP;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_sensor_id := OLD.sensor_id;
        target_department_id := OLD.department_id;
    ELSE
        target_sensor_id := NEW.sensor_id;
        target_department_id := NEW.department_id;
    END IF;

    SELECT MAX(recorded_at)
    INTO latest_reading_at
    FROM sensor_readings
    WHERE sensor_id = target_sensor_id
      AND department_id = target_department_id;

    UPDATE sensor_deployments
    SET last_reading_at = latest_reading_at
    WHERE sensor_id = target_sensor_id
      AND department_id = target_department_id;

    RETURN NULL;
END;
$$;


-- 13. Synchronize qc_passed with qc_reviews

CREATE OR REPLACE FUNCTION crims_sync_work_order_qc_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    target_wo_id UUID;
    target_department_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_wo_id := OLD.wo_id;
        target_department_id := OLD.department_id;
    ELSE
        target_wo_id := NEW.wo_id;
        target_department_id := NEW.department_id;
    END IF;

    UPDATE work_orders
    SET qc_passed = EXISTS (
            SELECT 1
            FROM qc_reviews
            WHERE wo_id = target_wo_id
              AND department_id = target_department_id
              AND is_approved = TRUE
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE wo_id = target_wo_id
      AND department_id = target_department_id;

    RETURN NULL;
END;
$$;


-- 14. Trigger bindings

CREATE TRIGGER trg_administrators_validate_role
BEFORE INSERT OR UPDATE ON administrators
FOR EACH ROW
EXECUTE FUNCTION crims_validate_role_membership();

CREATE TRIGGER trg_cfos_validate_role
BEFORE INSERT OR UPDATE ON cfos
FOR EACH ROW
EXECUTE FUNCTION crims_validate_role_membership();

CREATE TRIGGER trg_officers_validate_role
BEFORE INSERT OR UPDATE ON officers
FOR EACH ROW
EXECUTE FUNCTION crims_validate_role_membership();

CREATE TRIGGER trg_engineers_validate_role
BEFORE INSERT OR UPDATE ON engineers
FOR EACH ROW
EXECUTE FUNCTION crims_validate_role_membership();

CREATE TRIGGER trg_qc_reviewers_validate_role
BEFORE INSERT OR UPDATE ON qc_reviewers
FOR EACH ROW
EXECUTE FUNCTION crims_validate_role_membership();

CREATE TRIGGER trg_work_orders_touch_updated_at
BEFORE UPDATE ON work_orders
FOR EACH ROW
EXECUTE FUNCTION crims_touch_updated_at();

CREATE TRIGGER trg_tasks_touch_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION crims_touch_updated_at();

CREATE TRIGGER trg_budget_allocations_validate_links
BEFORE INSERT OR UPDATE ON budget_allocations
FOR EACH ROW
EXECUTE FUNCTION crims_validate_budget_allocation_links();

CREATE TRIGGER trg_budget_allocations_validate_stage
BEFORE INSERT OR UPDATE ON budget_allocations
FOR EACH ROW
EXECUTE FUNCTION crims_validate_budget_allocation_stage();

CREATE TRIGGER trg_fund_release_plans_validate
BEFORE INSERT OR UPDATE ON fund_release_plans
FOR EACH ROW
EXECUTE FUNCTION crims_validate_fund_release_plan();

CREATE TRIGGER trg_maintenance_logs_validate_task_link
BEFORE INSERT OR UPDATE ON maintenance_logs
FOR EACH ROW
EXECUTE FUNCTION crims_validate_task_work_order_link();

CREATE TRIGGER trg_progress_reports_validate_task_link
BEFORE INSERT OR UPDATE ON progress_reports
FOR EACH ROW
EXECUTE FUNCTION crims_validate_task_work_order_link();

CREATE TRIGGER trg_resource_requests_validate_task_link
BEFORE INSERT OR UPDATE ON resource_requests
FOR EACH ROW
EXECUTE FUNCTION crims_validate_task_work_order_link();

CREATE TRIGGER trg_work_orders_validate_transition
BEFORE UPDATE ON work_orders
FOR EACH ROW
EXECUTE FUNCTION crims_validate_work_order_transition();

CREATE TRIGGER trg_vendor_quotations_validate
BEFORE INSERT OR UPDATE ON vendor_quotations
FOR EACH ROW
EXECUTE FUNCTION crims_validate_vendor_quotation();

CREATE TRIGGER trg_procurement_bills_validate
BEFORE INSERT OR UPDATE ON procurement_bills
FOR EACH ROW
EXECUTE FUNCTION crims_validate_procurement_bill();

CREATE TRIGGER trg_quarterly_fund_releases_validate
BEFORE INSERT OR UPDATE ON quarterly_fund_releases
FOR EACH ROW
EXECUTE FUNCTION crims_validate_quarterly_fund_release();

CREATE TRIGGER trg_quarterly_fund_releases_sync_budget_stage_ins_upd
AFTER INSERT OR UPDATE ON quarterly_fund_releases
FOR EACH ROW
EXECUTE FUNCTION crims_sync_budget_release_stage();

CREATE TRIGGER trg_quarterly_fund_releases_sync_budget_stage_del
AFTER DELETE ON quarterly_fund_releases
FOR EACH ROW
EXECUTE FUNCTION crims_sync_budget_release_stage();

CREATE TRIGGER trg_sensor_readings_validate
BEFORE INSERT OR UPDATE ON sensor_readings
FOR EACH ROW
EXECUTE FUNCTION crims_validate_sensor_reading();

CREATE TRIGGER trg_sensor_readings_sync_sensor_ins_upd
AFTER INSERT OR UPDATE ON sensor_readings
FOR EACH ROW
EXECUTE FUNCTION crims_sync_sensor_last_reading();

CREATE TRIGGER trg_sensor_readings_sync_sensor_del
AFTER DELETE ON sensor_readings
FOR EACH ROW
EXECUTE FUNCTION crims_sync_sensor_last_reading();

CREATE TRIGGER trg_qc_reviews_sync_work_order_flag_ins_upd
AFTER INSERT OR UPDATE ON qc_reviews
FOR EACH ROW
EXECUTE FUNCTION crims_sync_work_order_qc_flag();

CREATE TRIGGER trg_qc_reviews_sync_work_order_flag_del
AFTER DELETE ON qc_reviews
FOR EACH ROW
EXECUTE FUNCTION crims_sync_work_order_qc_flag();

-- ==============================================================================
-- City Resource and Infrastructure Management System (CRIMS)
-- ==============================================================================

-- 1. Enumerated Types

CREATE TYPE user_role AS ENUM ('ADMINISTRATOR', 'CFO', 'OFFICER', 'ENGINEER');

CREATE TYPE priority_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY');

-- Work Order status lifecycle
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

-- Budget workflow stages (with CFO review)
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


-- 2. Departments
-- "An organizational unit responsible for a class of infrastructure (e.g., Roads, Water, Electrical)."

CREATE TABLE departments (
    department_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(150) NOT NULL UNIQUE,
    description   TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 3. System Users
-- Represents the three-tier administrative hierarchy.

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


-- 5. Infrastructure
-- "A physical infrastructure item referenced by WorkOrders and Tasks."

CREATE TABLE infrastructure (
    infra_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id            UUID NOT NULL REFERENCES departments(department_id),
    name                     VARCHAR(200) NOT NULL,
    type                     VARCHAR(100) NOT NULL,
    location_coordinates     VARCHAR(100) NOT NULL,
    latitude                 NUMERIC(9, 6),
    longitude                NUMERIC(9, 6),
    status                   infra_status NOT NULL DEFAULT 'OPERATIONAL',
    created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (infra_id, department_id)
);


-- 6. Work Orders
-- "A formal request to investigate, repair, or maintain a specific infrastructure asset."
-- Multi-stage approval.

CREATE TABLE work_orders (
    wo_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_code    VARCHAR(20) UNIQUE,
    department_id   UUID NOT NULL REFERENCES departments(department_id),
    infra_id        UUID,
    created_by      UUID NOT NULL,
    approved_by     UUID,
    approved_at     TIMESTAMP,
    title           VARCHAR(200) NOT NULL,
    description     TEXT NOT NULL,
    priority        priority_level NOT NULL DEFAULT 'MEDIUM',
    status          wo_status NOT NULL DEFAULT 'DRAFT',
    qc_passed       BOOLEAN NOT NULL DEFAULT FALSE,
    deadline        TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_work_orders_wo_department UNIQUE (wo_id, department_id),

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

    CONSTRAINT chk_work_orders_qc_required_for_closure CHECK (
        status != 'COMPLETED' OR qc_passed = TRUE
    )
);


-- 7. Tasks
-- "A specific actionable unit derived from a WorkOrder and assigned to a Field Engineer."

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
    completion_notes  VARCHAR(500),
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
        status = 'PENDING' OR deadline IS NOT NULL
    )
);


-- 8. Budget Estimates
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
    justification             TEXT NOT NULL,
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

    CONSTRAINT chk_budget_gst_required_after_forward CHECK (
        stage IN ('DRAFT', 'PENDING_ADMIN_FORWARD') OR gst_amount > 0
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
-- 1: "Competitive price proposals from vendors used to justify procurement and budget decisions."
-- 2: "Multiple vendor quotations are collected"

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

    CONSTRAINT chk_vendor_quotation_final_review_metadata CHECK (
        status IN ('SUBMITTED', 'UNDER_REVIEW') OR cfo_reviewed_by IS NOT NULL
    )
);


-- 11. Fund Release Plans
-- "Funds are released on a quarterly basis"

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


-- 12. Maintenance and Execution Logs
-- Stores proof of execution from Field Engineers.

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


-- 13. Structured Material Usage

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
-- "QC department performs quality verification"

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
-- Covers "Inspect Infrastructure" screen with condition rating, GPS tag, photo, and severity.

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
        ON DELETE SET NULL
);


-- 17. Issue Reports

CREATE TABLE issue_reports (
    issue_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id     UUID NOT NULL REFERENCES departments(department_id),
    infra_id          UUID,
    related_wo_id     UUID,
    reported_by       UUID NOT NULL,
    title             VARCHAR(200) NOT NULL,
    description       TEXT NOT NULL,
    severity          inspection_severity NOT NULL,
    location_tag      VARCHAR(100),
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
        FOREIGN KEY (reported_by, department_id)
        REFERENCES engineers(user_id, department_id)
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


-- 19. Maintenance Schedules
-- Covers calendar-based scheduling screen with assigned engineer, scheduled date, checklist count, and recurrence.

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
-- Covers "Deploy Sensors/Equipment" screen with location mapping and commissioning status.

CREATE TABLE sensor_deployments (
    sensor_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    infra_id          UUID NOT NULL,
    department_id     UUID NOT NULL REFERENCES departments(department_id),
    deployed_by       UUID NOT NULL,
    sensor_type       VARCHAR(100) NOT NULL,
    location_tag      VARCHAR(100) NOT NULL,
    status            sensor_status NOT NULL DEFAULT 'ACTIVE',
    commissioned_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_reading_at   TIMESTAMP,
    notes             TEXT,

    CONSTRAINT fk_sensor_deployments_infrastructure
        FOREIGN KEY (infra_id, department_id)
        REFERENCES infrastructure(infra_id, department_id),

    CONSTRAINT fk_sensor_deployments_engineer
        FOREIGN KEY (deployed_by, department_id)
        REFERENCES engineers(user_id, department_id)
);


-- 21. Utilization Reviews
-- "Periodic evaluation of how allocated funds were used against planned outcomes."

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


-- 22. Resource Requests
-- "Any consumable or assignable input required to execute a Task or WorkOrder."

CREATE TABLE resource_requests (
    request_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_id                 UUID NOT NULL,
    task_id               UUID,
    department_id         UUID NOT NULL REFERENCES departments(department_id),
    requested_by          UUID NOT NULL,
    category              VARCHAR(100),
    resource_description  TEXT NOT NULL,
    quantity              INT NOT NULL CHECK (quantity > 0),
    unit                  VARCHAR(50),
    justification         TEXT,
    required_by_date      DATE,
    urgency               priority_level,
    estimated_cost        NUMERIC(15, 2) CHECK (estimated_cost > 0),
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


-- 23. Notifications
-- "Send Task Notification", "Send Rejection Notification",
-- "Send Completion Report", "Send Escalation Notification"

CREATE TABLE notifications (
    notification_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id       UUID NOT NULL REFERENCES users(user_id),
    sender_id          UUID REFERENCES users(user_id),
    wo_id              UUID REFERENCES work_orders(wo_id) ON DELETE SET NULL,
    task_id            UUID REFERENCES tasks(task_id) ON DELETE SET NULL,
    notification_type  notification_type NOT NULL,
    message            TEXT NOT NULL,
    is_read            BOOLEAN NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 24. Budget Approval History
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


-- 25. Work Order Approval History

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


-- END OF BASE SCHEMA
-- Tables: 25 | ENUMs: 16 |
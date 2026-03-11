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



-- 2. Departments
-- "An organizational unit responsible for a class of infrastructure (e.g., Roads, Water, Electrical)."


CREATE TABLE departments (
    department_id   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150) NOT NULL UNIQUE,
    description     TEXT,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);



-- 3. System Users
-- Represents the three-tier administrative hierarchy.


CREATE TABLE users (
    user_id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       VARCHAR(150) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    phone_number    VARCHAR(20),
    role            user_role    NOT NULL,
    department_id   UUID         REFERENCES departments(department_id), -- NULL for ADMINISTRATOR
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

    -- Administrators and CFOs are city-wide; Officers and Engineers must belong to a department
    CONSTRAINT chk_department_required_for_staff CHECK (
        role IN ('ADMINISTRATOR', 'CFO') OR department_id IS NOT NULL
    )
);



-- 4. Infrastructure
-- Asset = "A physical infrastructure item referenced by WorkOrders and Tasks."


CREATE TABLE infrastructure (
    infra_id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(200) NOT NULL,
    type                    VARCHAR(100) NOT NULL,
    location_coordinates    VARCHAR(100) NOT NULL,
    latitude                NUMERIC(9, 6),
    longitude               NUMERIC(9, 6),
    status                  infra_status NOT NULL DEFAULT 'OPERATIONAL',
    department_id           UUID         REFERENCES departments(department_id),
    created_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);



-- 5. Budget Allocations


CREATE TABLE budget_allocations (
    budget_id        UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    project_name     VARCHAR(255)    NOT NULL,
    department_id    UUID            REFERENCES departments(department_id),
    base_amount      NUMERIC(15, 2)  NOT NULL CHECK (base_amount > 0),
    gst_amount       NUMERIC(15, 2)  NOT NULL DEFAULT 0,
    total_amount     NUMERIC(15, 2)  GENERATED ALWAYS AS (base_amount + gst_amount) STORED,
    stage            budget_stage    NOT NULL DEFAULT 'DRAFT',
    approved_by      UUID            REFERENCES users(user_id),
    verified_by      UUID            REFERENCES users(user_id),
    verified_at      TIMESTAMP,
    cfo_approved_by  UUID            REFERENCES users(user_id),
    cfo_approved_at  TIMESTAMP,
    created_at       TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    -- GST mandatory only at approval stage, not creation
    CONSTRAINT chk_gst_mandatory CHECK (
        stage IN ('DRAFT', 'PENDING_ADMIN_FORWARD') OR gst_amount > 0
    ),

    CONSTRAINT chk_approved_requires_approver CHECK (
        stage NOT IN ('APPROVED', 'PARTIALLY_RELEASED', 'FULLY_RELEASED') OR approved_by IS NOT NULL
    ),

    -- Officer must verify before CFO can review
    CONSTRAINT chk_officer_verification_before_cfo CHECK (
        stage != 'PENDING_CFO_REVIEW' OR verified_by IS NOT NULL
    ),

    -- CFO must approve before final approval
    CONSTRAINT chk_cfo_required_for_final_approval CHECK (
        stage != 'APPROVED' OR cfo_approved_by IS NOT NULL
    )
);



-- 6. Vendor Quotations
-- 1: "Competitive price proposals from vendors used to justify procurement and budget decisions."
-- 2: "Multiple vendor quotations are collected"


CREATE TABLE vendor_quotations (
    quotation_id         UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id            UUID             NOT NULL REFERENCES budget_allocations(budget_id) ON DELETE CASCADE,
    vendor_name          VARCHAR(200)     NOT NULL,
    vendor_gstin         VARCHAR(20)      NOT NULL,
    is_government_vendor BOOLEAN          NOT NULL DEFAULT FALSE,
    description          TEXT             NOT NULL,
    quoted_amount        NUMERIC(15, 2)   NOT NULL CHECK (quoted_amount > 0),
    status               quotation_status NOT NULL DEFAULT 'SUBMITTED',
    verified_by_officer  UUID             REFERENCES users(user_id),
    verified_at_officer  TIMESTAMP,
    reviewed_by          UUID             REFERENCES users(user_id),
    review_notes         TEXT,
    submitted_at         TIMESTAMP        DEFAULT CURRENT_TIMESTAMP,
    reviewed_at          TIMESTAMP,

    CONSTRAINT chk_quotation_review_required CHECK (
        status = 'SUBMITTED' OR status = 'UNDER_REVIEW' OR
        (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
    )
);



-- 7. Quarterly Fund Releases
-- "Funds are released on a quarterly basis"


CREATE TABLE fund_releases (
    release_id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id             UUID            NOT NULL REFERENCES budget_allocations(budget_id) ON DELETE CASCADE,
    release_quarter       fund_quarter    NOT NULL,
    release_year          INT             NOT NULL CHECK (release_year >= 2024),
    amount_released       NUMERIC(15, 2)  NOT NULL CHECK (amount_released > 0),
    release_notes         TEXT,
    milestone_name        VARCHAR(150),
    milestone_verified_by UUID            REFERENCES users(user_id),
    milestone_verified_at TIMESTAMP,
    released_by           UUID            REFERENCES users(user_id),
    released_on           TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (budget_id, release_quarter, release_year)
);



-- 8. Work Orders
-- "A formal request to investigate, repair, or maintain a specific infrastructure asset."
-- Multi-stage approval.


CREATE TABLE work_orders (
    wo_id           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    display_code    VARCHAR(20)     UNIQUE,
    infra_id        UUID            REFERENCES infrastructure(infra_id),
    budget_id       UUID            REFERENCES budget_allocations(budget_id),
    department_id   UUID            REFERENCES departments(department_id),
    created_by      UUID            REFERENCES users(user_id),
    approved_by     UUID            REFERENCES users(user_id),
    approved_at     TIMESTAMP,
    title           VARCHAR(200)    NOT NULL,
    description     TEXT            NOT NULL,
    priority        priority_level  NOT NULL DEFAULT 'MEDIUM',
    status          wo_status       NOT NULL DEFAULT 'DRAFT',
    qc_passed       BOOLEAN         NOT NULL DEFAULT FALSE,
    deadline        TIMESTAMP,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    -- QC certification mandatory for closure
    CONSTRAINT chk_qc_mandatory_for_closure CHECK (
        status != 'COMPLETED' OR qc_passed = TRUE
    ),

    -- Budget must be linked before approval
    CONSTRAINT chk_budget_required_for_approval CHECK (
        status NOT IN ('APPROVED', 'IN_PROGRESS', 'PENDING_QC', 'COMPLETED') OR budget_id IS NOT NULL
    ),

    -- approved_by must be set when status is APPROVED or beyond
    CONSTRAINT chk_approved_by_required CHECK (
        status NOT IN ('APPROVED', 'IN_PROGRESS', 'PENDING_QC', 'COMPLETED') OR approved_by IS NOT NULL
    )
);



-- 9. Tasks
-- "A specific actionable unit derived from a WorkOrder and assigned to a Field Engineer."


CREATE TABLE tasks (
    task_id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_id             UUID           NOT NULL REFERENCES work_orders(wo_id) ON DELETE CASCADE,
    assigned_to       UUID           NOT NULL REFERENCES users(user_id),  -- Field Engineer
    assigned_by       UUID           NOT NULL REFERENCES users(user_id),  -- Department Officer
    title             VARCHAR(200)   NOT NULL,
    description       TEXT           NOT NULL,
    priority          priority_level NOT NULL DEFAULT 'MEDIUM',
    status            task_status    NOT NULL DEFAULT 'PENDING',
    deadline          TIMESTAMP,
    completion_notes  VARCHAR(500),
    actual_hours      NUMERIC(5, 2),
    created_at        TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_deadline_required_for_assigned CHECK (
        status = 'PENDING' OR deadline IS NOT NULL
    )
);



-- 10. Maintenance and Execution Logs
-- Stores proof of execution from Field Engineers.


CREATE TABLE maintenance_logs (
    log_id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_id             UUID         NOT NULL REFERENCES work_orders(wo_id) ON DELETE CASCADE,
    task_id           UUID         REFERENCES tasks(task_id) ON DELETE SET NULL,
    engineer_id       UUID         NOT NULL REFERENCES users(user_id),
    log_description   TEXT         NOT NULL,
    before_image_url  VARCHAR(500),
    after_image_url   VARCHAR(500),
    logged_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);



-- 11. Quality Control (QC) Reviews
-- "QC department performs quality verification"


CREATE TABLE qc_reviews (
    qc_id        UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_id        UUID      NOT NULL REFERENCES work_orders(wo_id) ON DELETE CASCADE,
    reviewed_by  UUID      NOT NULL REFERENCES users(user_id), -- must be OFFICER or ADMINISTRATOR
    is_approved  BOOLEAN   NOT NULL,
    comments     TEXT,
    reviewed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_qc_comments_required_on_fail CHECK (
        is_approved = TRUE OR comments IS NOT NULL
    )
);



-- 12. Inspection Reports
-- Covers "Inspect Infrastructure" screen with condition rating, GPS tag, photo, and severity.


CREATE TABLE inspection_reports (
    inspection_id    UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    infra_id         UUID                NOT NULL REFERENCES infrastructure(infra_id),
    engineer_id      UUID                NOT NULL REFERENCES users(user_id),
    condition_rating INT                 NOT NULL CHECK (condition_rating BETWEEN 1 AND 5),
    severity         inspection_severity NOT NULL DEFAULT 'LOW',
    description      TEXT                NOT NULL,
    location_tag     VARCHAR(100),
    photo_url        VARCHAR(500),
    wo_id            UUID                REFERENCES work_orders(wo_id) ON DELETE SET NULL,
    inspected_at     TIMESTAMP           DEFAULT CURRENT_TIMESTAMP
);



-- 13. Maintenance Schedules
-- Covers calendar-based scheduling screen with assigned engineer, scheduled date, checklist count, and recurrence.


CREATE TABLE maintenance_schedules (
    schedule_id     UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
    infra_id        UUID               NOT NULL REFERENCES infrastructure(infra_id),
    department_id   UUID               NOT NULL REFERENCES departments(department_id),
    assigned_to     UUID               REFERENCES users(user_id),
    scheduled_by    UUID               REFERENCES users(user_id),
    title           VARCHAR(200)       NOT NULL,
    description     TEXT,
    frequency       schedule_frequency NOT NULL DEFAULT 'ONE_TIME',
    scheduled_date  TIMESTAMP          NOT NULL,
    checklist_items INT                NOT NULL DEFAULT 0,
    is_completed    BOOLEAN            NOT NULL DEFAULT FALSE,
    completed_at    TIMESTAMP,
    created_at      TIMESTAMP          DEFAULT CURRENT_TIMESTAMP
);



-- 14. Sensor Deployments
-- Covers "Deploy Sensors/Equipment" screen with location mapping and commissioning status.


CREATE TABLE sensor_deployments (
    sensor_id        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    infra_id         UUID          NOT NULL REFERENCES infrastructure(infra_id),
    deployed_by      UUID          NOT NULL REFERENCES users(user_id),
    sensor_type      VARCHAR(100)  NOT NULL,
    location_tag     VARCHAR(100)  NOT NULL,
    status           sensor_status NOT NULL DEFAULT 'ACTIVE',
    commissioned_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    last_reading_at  TIMESTAMP,
    notes            TEXT
);



-- 15. Utilization Reviews
-- "Periodic evaluation of how allocated funds were used against planned outcomes."


CREATE TABLE utilization_reviews (
    review_id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id           UUID           NOT NULL REFERENCES budget_allocations(budget_id),
    department_id       UUID           NOT NULL REFERENCES departments(department_id),
    review_quarter      fund_quarter   NOT NULL,
    review_year         INT            NOT NULL CHECK (review_year >= 2024),
    planned_amount      NUMERIC(15, 2) NOT NULL CHECK (planned_amount > 0),
    actual_spent        NUMERIC(15, 2) NOT NULL CHECK (actual_spent >= 0),
    utilization_percent NUMERIC(5, 2)  GENERATED ALWAYS AS (
                            CASE WHEN planned_amount > 0
                            THEN ROUND((actual_spent / planned_amount) * 100, 2)
                            ELSE 0 END
                        ) STORED,
    reviewed_by         UUID           REFERENCES users(user_id),
    notes               TEXT,
    reviewed_at         TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (budget_id, department_id, review_quarter, review_year)
);



-- 16. Resource Requests
-- "Any consumable or assignable input required to execute a Task or WorkOrder."


CREATE TABLE resource_requests (
    request_id           UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_id                UUID                    NOT NULL REFERENCES work_orders(wo_id) ON DELETE CASCADE,
    task_id              UUID                    REFERENCES tasks(task_id) ON DELETE SET NULL,
    requested_by         UUID                    NOT NULL REFERENCES users(user_id),
    resource_description TEXT                    NOT NULL,
    quantity             INT                     NOT NULL CHECK (quantity > 0),
    estimated_cost       NUMERIC(15, 2)          CHECK (estimated_cost > 0),
    status               resource_request_status NOT NULL DEFAULT 'PENDING',
    reviewed_by          UUID                    REFERENCES users(user_id),
    review_notes         TEXT,
    requested_at         TIMESTAMP               DEFAULT CURRENT_TIMESTAMP,
    reviewed_at          TIMESTAMP,

    CONSTRAINT chk_review_required_for_decision CHECK (
        status = 'PENDING' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
    )
);



-- 17. Notifications
-- "Send Task Notification", "Send Rejection Notification",
-- "Send Completion Report", "Send Escalation Notification"


CREATE TABLE notifications (
    notification_id   UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id      UUID              NOT NULL REFERENCES users(user_id),
    sender_id         UUID              REFERENCES users(user_id),
    wo_id             UUID              REFERENCES work_orders(wo_id) ON DELETE SET NULL,
    task_id           UUID              REFERENCES tasks(task_id) ON DELETE SET NULL,
    notification_type notification_type NOT NULL,
    message           TEXT              NOT NULL,
    is_read           BOOLEAN           NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMP         DEFAULT CURRENT_TIMESTAMP
);



-- 18. Budget Approval History


CREATE TABLE budget_approval_history (
    history_id    UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id     UUID            NOT NULL REFERENCES budget_allocations(budget_id) ON DELETE CASCADE,
    actioned_by   UUID            NOT NULL REFERENCES users(user_id),
    actor_role    user_role       NOT NULL,
    stage         budget_stage    NOT NULL,
    action        approval_action NOT NULL,
    comments      TEXT,
    actioned_at   TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);



-- 19. Work Order Approval History


CREATE TABLE wo_approval_history (
    history_id  UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_id       UUID      NOT NULL REFERENCES work_orders(wo_id) ON DELETE CASCADE,
    actioned_by UUID      NOT NULL REFERENCES users(user_id),
    from_status wo_status NOT NULL,
    to_status   wo_status NOT NULL,
    comments    TEXT,
    actioned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



-- END OF SCHEMA
-- Tables: 19 | ENUMs: 14
-- ==============================================================================
-- City Resource and Infrastructure Management System (CRIMS)
-- ==============================================================================



-- 1. Enumerated Types


CREATE TYPE user_role AS ENUM ('ADMINISTRATOR', 'OFFICER', 'ENGINEER');

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
CREATE TYPE budget_status AS ENUM ('PENDING', 'APPROVED', 'EXHAUSTED');

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

-- Vendor quotation status 
CREATE TYPE quotation_status AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED');



-- 2. Departments
-- "An organizational unit responsible for a class of infrastructure (e.g., Roads, Water, Electrical)."



CREATE TABLE departments (
    department_id   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150) NOT NULL UNIQUE,   
    description     TEXT,
    created_at      TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);



-- 3. System Users
-- Represents the three-tier administrative hierarchy.



CREATE TABLE users (
    user_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       VARCHAR(150) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    role            user_role   NOT NULL,
    department_id   UUID        REFERENCES departments(department_id), -- NULL for ADMINISTRATOR
    created_at      TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,

    -- Administrators are city-wide; Officers and Engineers must belong to a department
    CONSTRAINT chk_department_required_for_staff CHECK (
        role = 'ADMINISTRATOR' OR department_id IS NOT NULL
    )
);



-- 4. Infrastructure
-- Asset = "A physical infrastructure item referenced by WorkOrders and Tasks (e.g., valve, streetlight, road segment)."



CREATE TABLE infrastructure (
    infra_id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(200) NOT NULL,
    type                    VARCHAR(100) NOT NULL,
    location_coordinates    VARCHAR(100) NOT NULL,
    status                  infra_status NOT NULL DEFAULT 'OPERATIONAL',
    department_id           UUID        REFERENCES departments(department_id), -- owning department
    created_at              TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);



-- 5. Budget Allocations



CREATE TABLE budget_allocations (
    budget_id       UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    project_name    VARCHAR(255)    NOT NULL,
    department_id   UUID            REFERENCES departments(department_id),
    base_amount     NUMERIC(15, 2)  NOT NULL CHECK (base_amount > 0),
    gst_amount      NUMERIC(15, 2)  NOT NULL,
    total_amount    NUMERIC(15, 2)  GENERATED ALWAYS AS (base_amount + gst_amount) STORED,
    status          budget_status   NOT NULL DEFAULT 'PENDING',
    approved_by     UUID            REFERENCES users(user_id),
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    -- GST mandatory 
    CONSTRAINT chk_gst_mandatory CHECK (gst_amount > 0),

    CONSTRAINT chk_approved_requires_approver CHECK (
        status = 'PENDING' OR approved_by IS NOT NULL
    )
);



-- 6. Vendor Quotations
-- 1:"Competitive price proposals from vendors used to justify procurement and budget decisions."
-- 2: "Multiple vendor quotations are collected"



CREATE TABLE vendor_quotations (
    quotation_id        UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id           UUID                NOT NULL REFERENCES budget_allocations(budget_id) ON DELETE CASCADE,
    vendor_name         VARCHAR(200)        NOT NULL,
    vendor_gstin        VARCHAR(20)         NOT NULL, 
    is_government_vendor BOOLEAN            NOT NULL DEFAULT FALSE, 
    description         TEXT                NOT NULL,
    quoted_amount       NUMERIC(15, 2)      NOT NULL CHECK (quoted_amount > 0),
    status              quotation_status    NOT NULL DEFAULT 'SUBMITTED',
    reviewed_by         UUID                REFERENCES users(user_id),
    review_notes        TEXT,
    submitted_at        TIMESTAMP           DEFAULT CURRENT_TIMESTAMP,
    reviewed_at         TIMESTAMP,

    -- Review fields required when a decision is made
    CONSTRAINT chk_quotation_review_required CHECK (
        status = 'SUBMITTED' OR status = 'UNDER_REVIEW' OR
        (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
    )
);



-- 7. Quarterly Fund Releases
-- "Funds are released on a quarterly basis"
-- Trigger prevents over-release beyond approved budget total.



CREATE TABLE fund_releases (
    release_id      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id       UUID            NOT NULL REFERENCES budget_allocations(budget_id) ON DELETE CASCADE,
    release_quarter fund_quarter    NOT NULL,
    release_year    INT             NOT NULL CHECK (release_year >= 2024),
    amount_released NUMERIC(15, 2)  NOT NULL CHECK (amount_released > 0),
    released_by     UUID            REFERENCES users(user_id),
    released_on     TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (budget_id, release_quarter, release_year)
);

-- Trigger: cumulative releases must never exceed budget total_amount
CREATE OR REPLACE FUNCTION check_fund_release_limit()
RETURNS TRIGGER AS $$
DECLARE
    total_budget        NUMERIC(15, 2);
    already_released    NUMERIC(15, 2);
BEGIN
    SELECT total_amount INTO total_budget
    FROM budget_allocations
    WHERE budget_id = NEW.budget_id;

    SELECT COALESCE(SUM(amount_released), 0) INTO already_released
    FROM fund_releases
    WHERE budget_id = NEW.budget_id;

    IF (already_released + NEW.amount_released) > total_budget THEN
        RAISE EXCEPTION 'Fund release of % exceeds remaining budget. Already released: %, Total budget: %',
            NEW.amount_released, already_released, total_budget;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_fund_release_limit
BEFORE INSERT ON fund_releases
FOR EACH ROW EXECUTE FUNCTION check_fund_release_limit();



-- 8. Work Orders
-- "A formal request to investigate, repair, or maintain a specific infrastructure asset."
-- Multi-stage approval.




CREATE TABLE work_orders (
    wo_id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    infra_id            UUID            REFERENCES infrastructure(infra_id),
    budget_id           UUID            REFERENCES budget_allocations(budget_id),
    department_id       UUID            REFERENCES departments(department_id),
    title               VARCHAR(200)    NOT NULL,
    description         TEXT            NOT NULL,
    priority            priority_level  NOT NULL DEFAULT 'MEDIUM',
    status              wo_status       NOT NULL DEFAULT 'DRAFT',
    qc_passed           BOOLEAN         NOT NULL DEFAULT FALSE,
    deadline            TIMESTAMP,
    created_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    -- QC certification mandatory for closure
    CONSTRAINT chk_qc_mandatory_for_closure CHECK (
        status != 'COMPLETED' OR qc_passed = TRUE
    ),

    -- Budget must be linked before approval
    CONSTRAINT chk_budget_required_for_approval CHECK (
        status NOT IN ('APPROVED', 'IN_PROGRESS', 'PENDING_QC', 'COMPLETED') OR budget_id IS NOT NULL
    )
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_wo_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_wo_timestamp
BEFORE UPDATE ON work_orders
FOR EACH ROW EXECUTE FUNCTION update_wo_timestamp();

-- Trigger: qc_passed = TRUE only if an approved QC review record exists
CREATE OR REPLACE FUNCTION check_qc_review_exists()
RETURNS TRIGGER AS $$
DECLARE
    approved_review_count INT;
BEGIN
    IF NEW.qc_passed = TRUE AND OLD.qc_passed = FALSE THEN
        SELECT COUNT(*) INTO approved_review_count
        FROM qc_reviews
        WHERE wo_id = NEW.wo_id AND is_approved = TRUE;

        IF approved_review_count = 0 THEN
            RAISE EXCEPTION 'Cannot set qc_passed = TRUE without an approved QC review record for work order %', NEW.wo_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Trigger attached after qc_reviews table is created below.



-- 9. Tasks
-- "A specific actionable unit derived from a WorkOrder and assigned to a Field Engineer."




CREATE TABLE tasks (
    task_id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_id           UUID            NOT NULL REFERENCES work_orders(wo_id) ON DELETE CASCADE,
    assigned_to     UUID            NOT NULL REFERENCES users(user_id), -- Field Engineer
    assigned_by     UUID            NOT NULL REFERENCES users(user_id), -- Department Officer
    title           VARCHAR(200)    NOT NULL,
    description     TEXT            NOT NULL,
    priority        priority_level  NOT NULL DEFAULT 'MEDIUM',
    status          task_status     NOT NULL DEFAULT 'PENDING',
    deadline        TIMESTAMP,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_deadline_required_for_assigned CHECK (
        status = 'PENDING' OR deadline IS NOT NULL
    )
);

-- Trigger: enforce role constraints on task assignment
CREATE OR REPLACE FUNCTION check_task_role_assignment()
RETURNS TRIGGER AS $$
DECLARE
    assignee_role   user_role;
    assigner_role   user_role;
BEGIN
    SELECT role INTO assignee_role FROM users WHERE user_id = NEW.assigned_to;
    SELECT role INTO assigner_role FROM users WHERE user_id = NEW.assigned_by;

    IF assignee_role != 'ENGINEER' THEN
        RAISE EXCEPTION 'Tasks can only be assigned to ENGINEER role users.';
    END IF;

    IF assigner_role NOT IN ('OFFICER', 'ADMINISTRATOR') THEN
        RAISE EXCEPTION 'Tasks can only be assigned by OFFICER or ADMINISTRATOR role users.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_task_role_assignment
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION check_task_role_assignment();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_task_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_task_timestamp
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION update_task_timestamp();



-- 10. Maintenance and Execution Logs
-- Stores proof of execution from Field Engineers.



CREATE TABLE maintenance_logs (
    log_id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_id               UUID        NOT NULL REFERENCES work_orders(wo_id) ON DELETE CASCADE,
    task_id             UUID        REFERENCES tasks(task_id) ON DELETE SET NULL,
    engineer_id         UUID        NOT NULL REFERENCES users(user_id),
    log_description     TEXT        NOT NULL,
    proof_image_url     VARCHAR(500),
    logged_at           TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);



-- 11. Quality Control (QC) Reviews
-- "QC department performs quality verification"
-- Trigger enforces reviewed_by must be OFFICER or ADMINISTRATOR.
-- Engineers cannot perform QC on their own work.



CREATE TABLE qc_reviews (
    qc_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_id           UUID        NOT NULL REFERENCES work_orders(wo_id) ON DELETE CASCADE,
    reviewed_by     UUID        NOT NULL REFERENCES users(user_id), -- must be OFFICER or ADMINISTRATOR
    is_approved     BOOLEAN     NOT NULL,
    comments        TEXT,
    reviewed_at     TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,

    -- Failed QC must include comments explaining why
    CONSTRAINT chk_qc_comments_required_on_fail CHECK (
        is_approved = TRUE OR comments IS NOT NULL
    )
);

-- Trigger: only OFFICER or ADMINISTRATOR can perform QC reviews
CREATE OR REPLACE FUNCTION check_qc_reviewer_role()
RETURNS TRIGGER AS $$
DECLARE
    reviewer_role user_role;
BEGIN
    SELECT role INTO reviewer_role FROM users WHERE user_id = NEW.reviewed_by;

    IF reviewer_role = 'ENGINEER' THEN
        RAISE EXCEPTION 'Engineers cannot perform QC reviews. Only OFFICER or ADMINISTRATOR allowed.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_qc_reviewer_role
BEFORE INSERT OR UPDATE ON qc_reviews
FOR EACH ROW EXECUTE FUNCTION check_qc_reviewer_role();

-- Attach QC bypass prevention trigger on work_orders
CREATE TRIGGER trg_check_qc_review_exists
BEFORE UPDATE ON work_orders
FOR EACH ROW EXECUTE FUNCTION check_qc_review_exists();



-- 12. Utilization Reviews
-- "Periodic evaluation of how allocated funds were used against planned outcomes."



CREATE TABLE utilization_reviews (
    review_id           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id           UUID            NOT NULL REFERENCES budget_allocations(budget_id),
    department_id       UUID            NOT NULL REFERENCES departments(department_id),
    review_quarter      fund_quarter    NOT NULL,
    review_year         INT             NOT NULL CHECK (review_year >= 2024),
    planned_amount      NUMERIC(15, 2)  NOT NULL CHECK (planned_amount > 0),
    actual_spent        NUMERIC(15, 2)  NOT NULL CHECK (actual_spent >= 0),
    utilization_percent NUMERIC(5, 2)   GENERATED ALWAYS AS (
                            CASE WHEN planned_amount > 0
                            THEN ROUND((actual_spent / planned_amount) * 100, 2)
                            ELSE 0 END
                        ) STORED,
    reviewed_by         UUID            REFERENCES users(user_id),
    notes               TEXT,
    reviewed_at         TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    -- One review per department per quarter per year
    UNIQUE (budget_id, department_id, review_quarter, review_year)
);



-- 13. Resource Requests
-- "Any consumable or assignable input required to execute a Task or WorkOrder."



CREATE TABLE resource_requests (
    request_id              UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_id                   UUID                    NOT NULL REFERENCES work_orders(wo_id) ON DELETE CASCADE,
    task_id                 UUID                    REFERENCES tasks(task_id) ON DELETE SET NULL,
    requested_by            UUID                    NOT NULL REFERENCES users(user_id),
    resource_description    TEXT                    NOT NULL,
    quantity                INT                     NOT NULL CHECK (quantity > 0),
    estimated_cost          NUMERIC(15, 2)          CHECK (estimated_cost > 0),
    status                  resource_request_status NOT NULL DEFAULT 'PENDING',
    reviewed_by             UUID                    REFERENCES users(user_id),
    review_notes            TEXT,
    requested_at            TIMESTAMP               DEFAULT CURRENT_TIMESTAMP,
    reviewed_at             TIMESTAMP,

    CONSTRAINT chk_review_required_for_decision CHECK (
        status = 'PENDING' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
    )
);



-- 14. Notifications
-- "Send Task Notification", "Send Rejection Notification",
-- "Send Completion Report", "Send Escalation Notification"




CREATE TABLE notifications (
    notification_id     UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id        UUID                NOT NULL REFERENCES users(user_id),
    sender_id           UUID                REFERENCES users(user_id), -- NULL = system generated
    wo_id               UUID                REFERENCES work_orders(wo_id) ON DELETE SET NULL,
    task_id             UUID                REFERENCES tasks(task_id) ON DELETE SET NULL, -- for task-level notifications
    notification_type   notification_type   NOT NULL,
    message             TEXT                NOT NULL,
    is_read             BOOLEAN             NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP           DEFAULT CURRENT_TIMESTAMP
    CONSTRAINT chk_notification_reference CHECK (
    wo_id IS NOT NULL OR task_id IS NOT NULL
)
);



-- END OF SCHEMA
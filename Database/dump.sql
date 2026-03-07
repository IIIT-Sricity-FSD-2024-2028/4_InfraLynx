--
-- PostgreSQL database dump
--

\restrict ZVH81FqKJLdOgEoJx3SNCuQxHpSwQ9aaU8mI69xOLBbNMa1UXEUhyf5m33SdogQ

-- Dumped from database version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: budget_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.budget_status AS ENUM (
    'PENDING',
    'APPROVED',
    'EXHAUSTED'
);


ALTER TYPE public.budget_status OWNER TO postgres;

--
-- Name: fund_quarter; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.fund_quarter AS ENUM (
    'Q1',
    'Q2',
    'Q3',
    'Q4'
);


ALTER TYPE public.fund_quarter OWNER TO postgres;

--
-- Name: infra_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.infra_status AS ENUM (
    'OPERATIONAL',
    'UNDER_MAINTENANCE',
    'DECOMMISSIONED'
);


ALTER TYPE public.infra_status OWNER TO postgres;

--
-- Name: inspection_severity; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.inspection_severity AS ENUM (
    'LOW',
    'MODERATE',
    'SEVERE',
    'CRITICAL'
);


ALTER TYPE public.inspection_severity OWNER TO postgres;

--
-- Name: notification_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.notification_type AS ENUM (
    'TASK_ASSIGNED',
    'WORK_ORDER_APPROVED',
    'WORK_ORDER_REJECTED',
    'COMPLETION_REPORT',
    'ESCALATION',
    'QC_PASSED',
    'QC_FAILED'
);


ALTER TYPE public.notification_type OWNER TO postgres;

--
-- Name: priority_level; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.priority_level AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'EMERGENCY'
);


ALTER TYPE public.priority_level OWNER TO postgres;

--
-- Name: quotation_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.quotation_status AS ENUM (
    'SUBMITTED',
    'UNDER_REVIEW',
    'ACCEPTED',
    'REJECTED'
);


ALTER TYPE public.quotation_status OWNER TO postgres;

--
-- Name: resource_request_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.resource_request_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'FULFILLED'
);


ALTER TYPE public.resource_request_status OWNER TO postgres;

--
-- Name: schedule_frequency; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.schedule_frequency AS ENUM (
    'ONE_TIME',
    'WEEKLY',
    'MONTHLY',
    'QUARTERLY',
    'ANNUAL'
);


ALTER TYPE public.schedule_frequency OWNER TO postgres;

--
-- Name: sensor_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.sensor_status AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'FAULTY',
    'DECOMMISSIONED'
);


ALTER TYPE public.sensor_status OWNER TO postgres;

--
-- Name: task_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.task_status AS ENUM (
    'PENDING',
    'ASSIGNED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public.task_status OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'ADMINISTRATOR',
    'OFFICER',
    'ENGINEER'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- Name: wo_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.wo_status AS ENUM (
    'DRAFT',
    'PENDING_OFFICER_APPROVAL',
    'PENDING_ADMIN_APPROVAL',
    'APPROVED',
    'IN_PROGRESS',
    'PENDING_QC',
    'COMPLETED',
    'REJECTED'
);


ALTER TYPE public.wo_status OWNER TO postgres;

--
-- Name: check_fund_release_limit(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_fund_release_limit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    total_budget     NUMERIC(15, 2);
    already_released NUMERIC(15, 2);
BEGIN
    SELECT total_amount INTO total_budget
    FROM budget_allocations WHERE budget_id = NEW.budget_id;

    SELECT COALESCE(SUM(amount_released), 0) INTO already_released
    FROM fund_releases WHERE budget_id = NEW.budget_id;

    IF (already_released + NEW.amount_released) > total_budget THEN
        RAISE EXCEPTION 'Fund release of % exceeds remaining budget. Already released: %, Total budget: %',
            NEW.amount_released, already_released, total_budget;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.check_fund_release_limit() OWNER TO postgres;

--
-- Name: check_qc_review_exists(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_qc_review_exists() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.check_qc_review_exists() OWNER TO postgres;

--
-- Name: check_qc_reviewer_role(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_qc_reviewer_role() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    reviewer_role user_role;
BEGIN
    SELECT role INTO reviewer_role FROM users WHERE user_id = NEW.reviewed_by;

    IF reviewer_role = 'ENGINEER' THEN
        RAISE EXCEPTION 'Engineers cannot perform QC reviews. Only OFFICER or ADMINISTRATOR allowed.';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.check_qc_reviewer_role() OWNER TO postgres;

--
-- Name: check_task_role_assignment(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_task_role_assignment() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    assignee_role user_role;
    assigner_role user_role;
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
$$;


ALTER FUNCTION public.check_task_role_assignment() OWNER TO postgres;

--
-- Name: update_task_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_task_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_task_timestamp() OWNER TO postgres;

--
-- Name: update_wo_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_wo_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_wo_timestamp() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: budget_allocations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.budget_allocations (
    budget_id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_name character varying(255) NOT NULL,
    department_id uuid,
    base_amount numeric(15,2) NOT NULL,
    gst_amount numeric(15,2) DEFAULT 0 NOT NULL,
    total_amount numeric(15,2) GENERATED ALWAYS AS ((base_amount + gst_amount)) STORED,
    status public.budget_status DEFAULT 'PENDING'::public.budget_status NOT NULL,
    approved_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT budget_allocations_base_amount_check CHECK ((base_amount > (0)::numeric)),
    CONSTRAINT chk_approved_requires_approver CHECK (((status = 'PENDING'::public.budget_status) OR (approved_by IS NOT NULL))),
    CONSTRAINT chk_gst_mandatory CHECK (((status = 'PENDING'::public.budget_status) OR (gst_amount > (0)::numeric)))
);


ALTER TABLE public.budget_allocations OWNER TO postgres;

--
-- Name: departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departments (
    department_id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.departments OWNER TO postgres;

--
-- Name: fund_releases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fund_releases (
    release_id uuid DEFAULT gen_random_uuid() NOT NULL,
    budget_id uuid NOT NULL,
    release_quarter public.fund_quarter NOT NULL,
    release_year integer NOT NULL,
    amount_released numeric(15,2) NOT NULL,
    release_notes text,
    released_by uuid,
    released_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fund_releases_amount_released_check CHECK ((amount_released > (0)::numeric)),
    CONSTRAINT fund_releases_release_year_check CHECK ((release_year >= 2024))
);


ALTER TABLE public.fund_releases OWNER TO postgres;

--
-- Name: infrastructure; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.infrastructure (
    infra_id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(200) NOT NULL,
    type character varying(100) NOT NULL,
    location_coordinates character varying(100) NOT NULL,
    latitude numeric(9,6),
    longitude numeric(9,6),
    status public.infra_status DEFAULT 'OPERATIONAL'::public.infra_status NOT NULL,
    department_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.infrastructure OWNER TO postgres;

--
-- Name: inspection_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inspection_reports (
    inspection_id uuid DEFAULT gen_random_uuid() NOT NULL,
    infra_id uuid NOT NULL,
    engineer_id uuid NOT NULL,
    condition_rating integer NOT NULL,
    severity public.inspection_severity DEFAULT 'LOW'::public.inspection_severity NOT NULL,
    description text NOT NULL,
    location_tag character varying(100),
    photo_url character varying(500),
    wo_id uuid,
    inspected_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT inspection_reports_condition_rating_check CHECK (((condition_rating >= 1) AND (condition_rating <= 5)))
);


ALTER TABLE public.inspection_reports OWNER TO postgres;

--
-- Name: maintenance_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maintenance_logs (
    log_id uuid DEFAULT gen_random_uuid() NOT NULL,
    wo_id uuid NOT NULL,
    task_id uuid,
    engineer_id uuid NOT NULL,
    log_description text NOT NULL,
    before_image_url character varying(500),
    after_image_url character varying(500),
    logged_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.maintenance_logs OWNER TO postgres;

--
-- Name: maintenance_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maintenance_schedules (
    schedule_id uuid DEFAULT gen_random_uuid() NOT NULL,
    infra_id uuid NOT NULL,
    department_id uuid NOT NULL,
    assigned_to uuid,
    scheduled_by uuid,
    title character varying(200) NOT NULL,
    description text,
    frequency public.schedule_frequency DEFAULT 'ONE_TIME'::public.schedule_frequency NOT NULL,
    scheduled_date timestamp without time zone NOT NULL,
    checklist_items integer DEFAULT 0 NOT NULL,
    is_completed boolean DEFAULT false NOT NULL,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.maintenance_schedules OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    notification_id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient_id uuid NOT NULL,
    sender_id uuid,
    wo_id uuid,
    task_id uuid,
    notification_type public.notification_type NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: qc_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.qc_reviews (
    qc_id uuid DEFAULT gen_random_uuid() NOT NULL,
    wo_id uuid NOT NULL,
    reviewed_by uuid NOT NULL,
    is_approved boolean NOT NULL,
    comments text,
    reviewed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_qc_comments_required_on_fail CHECK (((is_approved = true) OR (comments IS NOT NULL)))
);


ALTER TABLE public.qc_reviews OWNER TO postgres;

--
-- Name: resource_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resource_requests (
    request_id uuid DEFAULT gen_random_uuid() NOT NULL,
    wo_id uuid NOT NULL,
    task_id uuid,
    requested_by uuid NOT NULL,
    resource_description text NOT NULL,
    quantity integer NOT NULL,
    estimated_cost numeric(15,2),
    status public.resource_request_status DEFAULT 'PENDING'::public.resource_request_status NOT NULL,
    reviewed_by uuid,
    review_notes text,
    requested_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    reviewed_at timestamp without time zone,
    CONSTRAINT chk_review_required_for_decision CHECK (((status = 'PENDING'::public.resource_request_status) OR ((reviewed_by IS NOT NULL) AND (reviewed_at IS NOT NULL)))),
    CONSTRAINT resource_requests_estimated_cost_check CHECK ((estimated_cost > (0)::numeric)),
    CONSTRAINT resource_requests_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.resource_requests OWNER TO postgres;

--
-- Name: sensor_deployments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sensor_deployments (
    sensor_id uuid DEFAULT gen_random_uuid() NOT NULL,
    infra_id uuid NOT NULL,
    deployed_by uuid NOT NULL,
    sensor_type character varying(100) NOT NULL,
    location_tag character varying(100) NOT NULL,
    status public.sensor_status DEFAULT 'ACTIVE'::public.sensor_status NOT NULL,
    commissioned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_reading_at timestamp without time zone,
    notes text
);


ALTER TABLE public.sensor_deployments OWNER TO postgres;

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks (
    task_id uuid DEFAULT gen_random_uuid() NOT NULL,
    wo_id uuid NOT NULL,
    assigned_to uuid NOT NULL,
    assigned_by uuid NOT NULL,
    title character varying(200) NOT NULL,
    description text NOT NULL,
    priority public.priority_level DEFAULT 'MEDIUM'::public.priority_level NOT NULL,
    status public.task_status DEFAULT 'PENDING'::public.task_status NOT NULL,
    deadline timestamp without time zone,
    completion_notes character varying(500),
    actual_hours numeric(5,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_deadline_required_for_assigned CHECK (((status = 'PENDING'::public.task_status) OR (deadline IS NOT NULL)))
);


ALTER TABLE public.tasks OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    user_id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name character varying(150) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash character varying(255) NOT NULL,
    phone_number character varying(20),
    role public.user_role NOT NULL,
    department_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_department_required_for_staff CHECK (((role = 'ADMINISTRATOR'::public.user_role) OR (department_id IS NOT NULL)))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: utilization_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.utilization_reviews (
    review_id uuid DEFAULT gen_random_uuid() NOT NULL,
    budget_id uuid NOT NULL,
    department_id uuid NOT NULL,
    review_quarter public.fund_quarter NOT NULL,
    review_year integer NOT NULL,
    planned_amount numeric(15,2) NOT NULL,
    actual_spent numeric(15,2) NOT NULL,
    utilization_percent numeric(5,2) GENERATED ALWAYS AS (
CASE
    WHEN (planned_amount > (0)::numeric) THEN round(((actual_spent / planned_amount) * (100)::numeric), 2)
    ELSE (0)::numeric
END) STORED,
    reviewed_by uuid,
    notes text,
    reviewed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT utilization_reviews_actual_spent_check CHECK ((actual_spent >= (0)::numeric)),
    CONSTRAINT utilization_reviews_planned_amount_check CHECK ((planned_amount > (0)::numeric)),
    CONSTRAINT utilization_reviews_review_year_check CHECK ((review_year >= 2024))
);


ALTER TABLE public.utilization_reviews OWNER TO postgres;

--
-- Name: vendor_quotations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vendor_quotations (
    quotation_id uuid DEFAULT gen_random_uuid() NOT NULL,
    budget_id uuid NOT NULL,
    vendor_name character varying(200) NOT NULL,
    vendor_gstin character varying(20) NOT NULL,
    is_government_vendor boolean DEFAULT false NOT NULL,
    description text NOT NULL,
    quoted_amount numeric(15,2) NOT NULL,
    status public.quotation_status DEFAULT 'SUBMITTED'::public.quotation_status NOT NULL,
    reviewed_by uuid,
    review_notes text,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    reviewed_at timestamp without time zone,
    CONSTRAINT chk_quotation_review_required CHECK (((status = 'SUBMITTED'::public.quotation_status) OR (status = 'UNDER_REVIEW'::public.quotation_status) OR ((reviewed_by IS NOT NULL) AND (reviewed_at IS NOT NULL)))),
    CONSTRAINT vendor_quotations_quoted_amount_check CHECK ((quoted_amount > (0)::numeric))
);


ALTER TABLE public.vendor_quotations OWNER TO postgres;

--
-- Name: work_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.work_orders (
    wo_id uuid DEFAULT gen_random_uuid() NOT NULL,
    display_code character varying(20),
    infra_id uuid,
    budget_id uuid,
    department_id uuid,
    created_by uuid,
    approved_by uuid,
    approved_at timestamp without time zone,
    title character varying(200) NOT NULL,
    description text NOT NULL,
    priority public.priority_level DEFAULT 'MEDIUM'::public.priority_level NOT NULL,
    status public.wo_status DEFAULT 'DRAFT'::public.wo_status NOT NULL,
    qc_passed boolean DEFAULT false NOT NULL,
    deadline timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_approved_by_required CHECK (((status <> ALL (ARRAY['APPROVED'::public.wo_status, 'IN_PROGRESS'::public.wo_status, 'PENDING_QC'::public.wo_status, 'COMPLETED'::public.wo_status])) OR (approved_by IS NOT NULL))),
    CONSTRAINT chk_budget_required_for_approval CHECK (((status <> ALL (ARRAY['APPROVED'::public.wo_status, 'IN_PROGRESS'::public.wo_status, 'PENDING_QC'::public.wo_status, 'COMPLETED'::public.wo_status])) OR (budget_id IS NOT NULL))),
    CONSTRAINT chk_qc_mandatory_for_closure CHECK (((status <> 'COMPLETED'::public.wo_status) OR (qc_passed = true)))
);


ALTER TABLE public.work_orders OWNER TO postgres;

--
-- Data for Name: budget_allocations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.budget_allocations (budget_id, project_name, department_id, base_amount, gst_amount, status, approved_by, created_at) FROM stdin;
44444444-0000-0000-0000-000000000001	Anna Salai Pothole Repair	11111111-0000-0000-0000-000000000001	500000.00	90000.00	APPROVED	22222222-0000-0000-0000-000000000001	2026-03-07 17:01:33.629737
44444444-0000-0000-0000-000000000002	T Nagar Pipeline Replacement	11111111-0000-0000-0000-000000000002	800000.00	144000.00	APPROVED	22222222-0000-0000-0000-000000000001	2026-03-07 17:01:33.629737
44444444-0000-0000-0000-000000000003	Adyar Streetlight Upgrade	11111111-0000-0000-0000-000000000003	250000.00	45000.00	PENDING	\N	2026-03-07 17:01:33.629737
44444444-0000-0000-0000-000000000004	Vadapalani Road Widening	11111111-0000-0000-0000-000000000001	1200000.00	216000.00	APPROVED	22222222-0000-0000-0000-000000000002	2026-03-07 17:01:33.629737
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.departments (department_id, name, description, created_at) FROM stdin;
11111111-0000-0000-0000-000000000001	Roads	Manages road construction and repair	2026-03-07 17:01:33.621335
11111111-0000-0000-0000-000000000002	Water	Manages water pipelines and supply	2026-03-07 17:01:33.621335
11111111-0000-0000-0000-000000000003	Electrical	Manages streetlights and electrical grid	2026-03-07 17:01:33.621335
\.


--
-- Data for Name: fund_releases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fund_releases (release_id, budget_id, release_quarter, release_year, amount_released, release_notes, released_by, released_on) FROM stdin;
1d6b4ddb-0c2d-4bd9-99d2-55429b179738	44444444-0000-0000-0000-000000000001	Q1	2026	200000.00	First release for material procurement	22222222-0000-0000-0000-000000000001	2026-03-07 17:01:33.633603
91137700-48a1-4642-b4b0-66f18060a46c	44444444-0000-0000-0000-000000000001	Q2	2026	150000.00	Second release for labour and equipment	22222222-0000-0000-0000-000000000001	2026-03-07 17:01:33.633603
befe8ec4-ea24-4637-afbc-ba15bab8c57e	44444444-0000-0000-0000-000000000002	Q1	2026	400000.00	Initial release for pipeline materials	22222222-0000-0000-0000-000000000001	2026-03-07 17:01:33.633603
6b91be97-0280-4621-9ab3-ee14a1f3ae02	44444444-0000-0000-0000-000000000004	Q1	2026	500000.00	First tranche for road widening project	22222222-0000-0000-0000-000000000002	2026-03-07 17:01:33.633603
\.


--
-- Data for Name: infrastructure; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.infrastructure (infra_id, name, type, location_coordinates, latitude, longitude, status, department_id, created_at) FROM stdin;
33333333-0000-0000-0000-000000000001	Anna Salai Road Segment 4	Road	13.0674° N, 80.2376° E	13.067400	80.237600	OPERATIONAL	11111111-0000-0000-0000-000000000001	2026-03-07 17:01:33.627326
33333333-0000-0000-0000-000000000002	T Nagar Water Pipeline W7	Pipeline	13.0418° N, 80.2341° E	13.041800	80.234100	UNDER_MAINTENANCE	11111111-0000-0000-0000-000000000002	2026-03-07 17:01:33.627326
33333333-0000-0000-0000-000000000003	Adyar Streetlight SL-102	Streetlight	13.0067° N, 80.2571° E	13.006700	80.257100	OPERATIONAL	11111111-0000-0000-0000-000000000003	2026-03-07 17:01:33.627326
33333333-0000-0000-0000-000000000004	Vadapalani Road Segment 9	Road	13.0524° N, 80.2121° E	13.052400	80.212100	OPERATIONAL	11111111-0000-0000-0000-000000000001	2026-03-07 17:01:33.627326
33333333-0000-0000-0000-000000000005	Tambaram Water Valve WV-47	Valve	12.9249° N, 80.1000° E	12.924900	80.100000	OPERATIONAL	11111111-0000-0000-0000-000000000002	2026-03-07 17:01:33.627326
\.


--
-- Data for Name: inspection_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inspection_reports (inspection_id, infra_id, engineer_id, condition_rating, severity, description, location_tag, photo_url, wo_id, inspected_at) FROM stdin;
b6235e02-04a9-4c44-babd-a90f22f88fda	33333333-0000-0000-0000-000000000001	22222222-0000-0000-0000-000000000006	2	SEVERE	Multiple potholes on Anna Salai segment 4. Road surface deteriorating rapidly.	13.0674, 80.2376	https://storage.crims.gov/inspections/annasalai-seg4.jpg	55555555-0000-0000-0000-000000000001	2026-03-07 17:01:33.647493
d05518e2-61bf-4bf7-941d-3375ff8ed904	33333333-0000-0000-0000-000000000002	22222222-0000-0000-0000-000000000007	1	CRITICAL	Pipeline severely corroded. Immediate replacement required.	13.0418, 80.2341	https://storage.crims.gov/inspections/tnagar-w7.jpg	55555555-0000-0000-0000-000000000002	2026-03-07 17:01:33.647493
35cdc531-f53a-4963-8043-c1b6ffafc20a	33333333-0000-0000-0000-000000000003	22222222-0000-0000-0000-000000000008	3	MODERATE	Streetlight bulb fused. Pole structure intact. Simple replacement needed.	13.0067, 80.2571	https://storage.crims.gov/inspections/adyar-sl102.jpg	55555555-0000-0000-0000-000000000003	2026-03-07 17:01:33.647493
\.


--
-- Data for Name: maintenance_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.maintenance_logs (log_id, wo_id, task_id, engineer_id, log_description, before_image_url, after_image_url, logged_at) FROM stdin;
8028dad8-9611-45b7-8119-ce4687f41370	55555555-0000-0000-0000-000000000001	66666666-0000-0000-0000-000000000001	22222222-0000-0000-0000-000000000006	Site inspection completed. 6 potholes identified and GPS tagged.	https://storage.crims.gov/before/wo001-task1-before.jpg	https://storage.crims.gov/after/wo001-task1-after.jpg	2026-03-07 17:01:33.642411
152a03f1-d5e6-42a2-8b2c-fd78eddc056a	55555555-0000-0000-0000-000000000002	66666666-0000-0000-0000-000000000003	22222222-0000-0000-0000-000000000007	Old corroded pipeline excavated and removed safely. Area cordoned off.	https://storage.crims.gov/before/wo002-task3-before.jpg	https://storage.crims.gov/after/wo002-task3-after.jpg	2026-03-07 17:01:33.642411
fc2db840-5664-4a40-9835-911594a95f7e	55555555-0000-0000-0000-000000000002	66666666-0000-0000-0000-000000000004	22222222-0000-0000-0000-000000000007	New pipeline installed. Pressure test at 6 bar passed. Water supply restored.	https://storage.crims.gov/before/wo002-task4-before.jpg	https://storage.crims.gov/after/wo002-task4-after.jpg	2026-03-07 17:01:33.642411
\.


--
-- Data for Name: maintenance_schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.maintenance_schedules (schedule_id, infra_id, department_id, assigned_to, scheduled_by, title, description, frequency, scheduled_date, checklist_items, is_completed, completed_at, created_at) FROM stdin;
5fe62d43-b4d8-4976-afbf-69cf101c784d	33333333-0000-0000-0000-000000000003	11111111-0000-0000-0000-000000000003	22222222-0000-0000-0000-000000000008	22222222-0000-0000-0000-000000000005	Monthly Streetlight Check - Adyar Zone	Monthly inspection of all streetlights in Adyar zone.	MONTHLY	2026-04-01 08:00:00	12	f	\N	2026-03-07 17:01:33.64964
f9123e47-b3e4-48de-b405-c6cbe3d1b08a	33333333-0000-0000-0000-000000000005	11111111-0000-0000-0000-000000000002	22222222-0000-0000-0000-000000000007	22222222-0000-0000-0000-000000000004	Quarterly Valve Inspection - Tambaram	Quarterly check on all water valves in Tambaram area.	QUARTERLY	2026-04-15 09:00:00	8	f	\N	2026-03-07 17:01:33.64964
ab1c16c5-124b-40f8-aa5f-31b0ce60a784	33333333-0000-0000-0000-000000000001	11111111-0000-0000-0000-000000000001	22222222-0000-0000-0000-000000000009	22222222-0000-0000-0000-000000000003	Annual Road Surface Inspection - Anna Salai	Annual inspection of Anna Salai road surface condition.	ANNUAL	2026-12-01 08:00:00	20	f	\N	2026-03-07 17:01:33.64964
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (notification_id, recipient_id, sender_id, wo_id, task_id, notification_type, message, is_read, created_at) FROM stdin;
ce6c3931-835c-4900-a11b-2b2d12a66916	22222222-0000-0000-0000-000000000006	22222222-0000-0000-0000-000000000003	55555555-0000-0000-0000-000000000001	66666666-0000-0000-0000-000000000001	TASK_ASSIGNED	You have been assigned: Site Inspection and Measurement for WO-2026-001.	f	2026-03-07 17:01:33.657734
babec1ba-e69c-46e9-ac19-a300dc663930	22222222-0000-0000-0000-000000000003	\N	55555555-0000-0000-0000-000000000001	\N	WORK_ORDER_APPROVED	Work Order WO-2026-001 has been approved by the City Administrator.	f	2026-03-07 17:01:33.657734
2fcb5a6a-465e-4c3e-896a-a59867742140	22222222-0000-0000-0000-000000000004	\N	55555555-0000-0000-0000-000000000002	\N	QC_PASSED	Work Order WO-2026-002 has passed QC review and is now marked COMPLETED.	f	2026-03-07 17:01:33.657734
54d64a15-55d6-40ec-b977-66ee4c3cd7b8	22222222-0000-0000-0000-000000000001	22222222-0000-0000-0000-000000000004	55555555-0000-0000-0000-000000000003	\N	ESCALATION	WO-2026-003 has been pending Admin approval for 5 days. Immediate action required.	f	2026-03-07 17:01:33.657734
a4986b71-3077-4ad4-94ba-c8ddeb35108e	22222222-0000-0000-0000-000000000007	22222222-0000-0000-0000-000000000004	55555555-0000-0000-0000-000000000002	66666666-0000-0000-0000-000000000003	TASK_ASSIGNED	You have been assigned: Pipeline Excavation and Removal for WO-2026-002.	f	2026-03-07 17:01:33.657734
\.


--
-- Data for Name: qc_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.qc_reviews (qc_id, wo_id, reviewed_by, is_approved, comments, reviewed_at) FROM stdin;
491b41a8-27f8-40a3-bc88-8324cc3b9c1c	55555555-0000-0000-0000-000000000002	22222222-0000-0000-0000-000000000004	t	Pipeline installation verified. Pressure test results reviewed. Work certified.	2026-03-07 17:01:33.644156
\.


--
-- Data for Name: resource_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.resource_requests (request_id, wo_id, task_id, requested_by, resource_description, quantity, estimated_cost, status, reviewed_by, review_notes, requested_at, reviewed_at) FROM stdin;
d6307021-3447-498e-ba76-41b94b785ae2	55555555-0000-0000-0000-000000000001	66666666-0000-0000-0000-000000000002	22222222-0000-0000-0000-000000000006	Cold mix asphalt bags (25kg each)	50	25000.00	APPROVED	22222222-0000-0000-0000-000000000003	Approved. Purchase order raised with Bharat Roads Pvt Ltd.	2026-03-07 17:01:33.655792	2026-03-07 17:01:33.655792
71679f2f-3b1c-43a0-937d-d99acabbd01d	55555555-0000-0000-0000-000000000001	66666666-0000-0000-0000-000000000002	22222222-0000-0000-0000-000000000006	Road roller (half-day hire)	1	8000.00	APPROVED	22222222-0000-0000-0000-000000000003	Approved. Equipment booked from city depot.	2026-03-07 17:01:33.655792	2026-03-07 17:01:33.655792
186d75f0-b9b5-45ab-a5b6-5484e5194605	55555555-0000-0000-0000-000000000002	66666666-0000-0000-0000-000000000003	22222222-0000-0000-0000-000000000007	Portable water pump for drainage during excavation	2	5000.00	FULFILLED	22222222-0000-0000-0000-000000000004	Pumps collected from store. Returned after use.	2026-03-07 17:01:33.655792	2026-03-07 17:01:33.655792
\.


--
-- Data for Name: sensor_deployments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sensor_deployments (sensor_id, infra_id, deployed_by, sensor_type, location_tag, status, commissioned_at, last_reading_at, notes) FROM stdin;
9ffdfb13-70b7-4e98-ad55-72a91a0cd3e1	33333333-0000-0000-0000-000000000002	22222222-0000-0000-0000-000000000007	Water Flow Meter	13.0418, 80.2341	ACTIVE	2026-03-07 17:01:33.651434	2026-03-07 17:01:33.651434	Deployed after pipeline replacement. Monitoring flow rate.
c1d107fe-2116-4d8d-8d53-24aeb2073f5b	33333333-0000-0000-0000-000000000003	22222222-0000-0000-0000-000000000008	Electricity Consumption Meter	13.0067, 80.2571	ACTIVE	2026-03-07 17:01:33.651434	2026-03-07 17:01:33.651434	Smart meter installed on SL-102 for power usage tracking.
16c7fd81-adb7-4527-911c-8c3eac300fda	33333333-0000-0000-0000-000000000005	22222222-0000-0000-0000-000000000007	Pressure Sensor	12.9249, 80.1000	FAULTY	2026-03-07 17:01:33.651434	\N	Sensor reporting erratic values. Scheduled for replacement.
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tasks (task_id, wo_id, assigned_to, assigned_by, title, description, priority, status, deadline, completion_notes, actual_hours, created_at, updated_at) FROM stdin;
66666666-0000-0000-0000-000000000001	55555555-0000-0000-0000-000000000001	22222222-0000-0000-0000-000000000006	22222222-0000-0000-0000-000000000003	Site Inspection and Measurement	Inspect pothole locations and measure depth and width for repair estimate.	HIGH	COMPLETED	2026-03-20 18:00:00	Measured 6 potholes. Average depth 5.5cm. Coordinates logged.	3.50	2026-03-07 17:01:33.639737	2026-03-07 17:01:33.639737
66666666-0000-0000-0000-000000000002	55555555-0000-0000-0000-000000000001	22222222-0000-0000-0000-000000000006	22222222-0000-0000-0000-000000000003	Pothole Filling with Cold Mix	Fill all identified potholes using approved cold mix asphalt.	HIGH	IN_PROGRESS	2026-04-10 18:00:00	\N	\N	2026-03-07 17:01:33.639737	2026-03-07 17:01:33.639737
66666666-0000-0000-0000-000000000003	55555555-0000-0000-0000-000000000002	22222222-0000-0000-0000-000000000007	22222222-0000-0000-0000-000000000004	Pipeline Excavation and Removal	Excavate and remove the old corroded HDPE pipeline in zone W7.	EMERGENCY	COMPLETED	2026-03-15 18:00:00	Old pipeline removed. 120m section replaced.	12.00	2026-03-07 17:01:33.639737	2026-03-07 17:01:33.639737
66666666-0000-0000-0000-000000000004	55555555-0000-0000-0000-000000000002	22222222-0000-0000-0000-000000000007	22222222-0000-0000-0000-000000000004	New Pipeline Installation and Testing	Install new HDPE pipeline and perform pressure testing.	EMERGENCY	COMPLETED	2026-03-25 18:00:00	New pipeline installed. Pressure test passed at 6 bar.	16.00	2026-03-07 17:01:33.639737	2026-03-07 17:01:33.639737
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (user_id, full_name, email, password_hash, phone_number, role, department_id, created_at) FROM stdin;
22222222-0000-0000-0000-000000000001	Arjun Sharma	arjun@crims.gov	$2b$10$dummyhashADMIN001	9876543210	ADMINISTRATOR	\N	2026-03-07 17:01:33.624143
22222222-0000-0000-0000-000000000002	Priya Nair	priya@crims.gov	$2b$10$dummyhashADMIN002	9876543211	ADMINISTRATOR	\N	2026-03-07 17:01:33.624143
22222222-0000-0000-0000-000000000003	Ravi Kumar	ravi@crims.gov	$2b$10$dummyhashOFFICER01	9876543212	OFFICER	11111111-0000-0000-0000-000000000001	2026-03-07 17:01:33.624143
22222222-0000-0000-0000-000000000004	Meena Iyer	meena@crims.gov	$2b$10$dummyhashOFFICER02	9876543213	OFFICER	11111111-0000-0000-0000-000000000002	2026-03-07 17:01:33.624143
22222222-0000-0000-0000-000000000005	Suresh Pillai	suresh@crims.gov	$2b$10$dummyhashOFFICER03	9876543214	OFFICER	11111111-0000-0000-0000-000000000003	2026-03-07 17:01:33.624143
22222222-0000-0000-0000-000000000006	Karthik Raj	karthik@crims.gov	$2b$10$dummyhashENGINEER1	9876543215	ENGINEER	11111111-0000-0000-0000-000000000001	2026-03-07 17:01:33.624143
22222222-0000-0000-0000-000000000007	Divya Menon	divya@crims.gov	$2b$10$dummyhashENGINEER2	9876543216	ENGINEER	11111111-0000-0000-0000-000000000002	2026-03-07 17:01:33.624143
22222222-0000-0000-0000-000000000008	Arun Babu	arun@crims.gov	$2b$10$dummyhashENGINEER3	9876543217	ENGINEER	11111111-0000-0000-0000-000000000003	2026-03-07 17:01:33.624143
22222222-0000-0000-0000-000000000009	Lakshmi Das	lakshmi@crims.gov	$2b$10$dummyhashENGINEER4	9876543218	ENGINEER	11111111-0000-0000-0000-000000000001	2026-03-07 17:01:33.624143
\.


--
-- Data for Name: utilization_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.utilization_reviews (review_id, budget_id, department_id, review_quarter, review_year, planned_amount, actual_spent, reviewed_by, notes, reviewed_at) FROM stdin;
de608926-8ce3-4ebb-8bff-75700be841ae	44444444-0000-0000-0000-000000000001	11111111-0000-0000-0000-000000000001	Q1	2026	200000.00	185000.00	22222222-0000-0000-0000-000000000001	Slightly under budget. Material costs lower than estimated.	2026-03-07 17:01:33.653466
dd0bb43f-3d51-4567-8a64-24670c2ec5f9	44444444-0000-0000-0000-000000000002	11111111-0000-0000-0000-000000000002	Q1	2026	400000.00	412000.00	22222222-0000-0000-0000-000000000001	Minor overrun due to emergency overtime labour costs.	2026-03-07 17:01:33.653466
\.


--
-- Data for Name: vendor_quotations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vendor_quotations (quotation_id, budget_id, vendor_name, vendor_gstin, is_government_vendor, description, quoted_amount, status, reviewed_by, review_notes, submitted_at, reviewed_at) FROM stdin;
df442dc7-6a69-458d-861c-e10e4b15bb49	44444444-0000-0000-0000-000000000001	Bharat Roads Pvt Ltd	33AABCB1234F1Z5	f	Pothole repair using cold mix asphalt	480000.00	ACCEPTED	22222222-0000-0000-0000-000000000003	\N	2026-03-07 17:01:33.631835	2026-03-07 17:01:33.631835
16ed0fb7-bb6b-477b-80c0-cf7119f6d6d6	44444444-0000-0000-0000-000000000001	Tamil Nadu Civil Works	33AATNT5678G1Z2	t	Pothole repair using hot mix asphalt	520000.00	REJECTED	22222222-0000-0000-0000-000000000003	\N	2026-03-07 17:01:33.631835	2026-03-07 17:01:33.631835
291570e9-eaf6-4720-8989-c229b3d12a37	44444444-0000-0000-0000-000000000002	Chennai Pipe Corp	33AACCP9012H1Z8	f	HDPE pipeline supply and installation	790000.00	ACCEPTED	22222222-0000-0000-0000-000000000004	\N	2026-03-07 17:01:33.631835	2026-03-07 17:01:33.631835
4878975e-17aa-45d7-8581-2fa07f17ebce	44444444-0000-0000-0000-000000000003	Southern Electricals Ltd	33AASSE3456I1Z1	f	LED streetlight supply and installation	240000.00	SUBMITTED	\N	\N	2026-03-07 17:01:33.631835	\N
\.


--
-- Data for Name: work_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.work_orders (wo_id, display_code, infra_id, budget_id, department_id, created_by, approved_by, approved_at, title, description, priority, status, qc_passed, deadline, created_at, updated_at) FROM stdin;
55555555-0000-0000-0000-000000000001	WO-2026-001	33333333-0000-0000-0000-000000000001	44444444-0000-0000-0000-000000000001	11111111-0000-0000-0000-000000000001	22222222-0000-0000-0000-000000000003	22222222-0000-0000-0000-000000000001	2026-03-07 17:01:33.637864	Pothole Repair - Anna Salai Segment 4	Multiple potholes reported on Anna Salai near Gemini flyover. Depth approx 5cm.	HIGH	IN_PROGRESS	f	2026-04-15 18:00:00	2026-03-07 17:01:33.637864	2026-03-07 17:01:33.637864
55555555-0000-0000-0000-000000000003	WO-2026-003	33333333-0000-0000-0000-000000000003	\N	11111111-0000-0000-0000-000000000003	22222222-0000-0000-0000-000000000005	\N	\N	Streetlight Fault - Adyar SL-102	Streetlight SL-102 on Adyar beach road not functioning for 3 days.	MEDIUM	PENDING_ADMIN_APPROVAL	f	2026-04-20 18:00:00	2026-03-07 17:01:33.637864	2026-03-07 17:01:33.637864
55555555-0000-0000-0000-000000000004	WO-2026-004	33333333-0000-0000-0000-000000000004	44444444-0000-0000-0000-000000000004	11111111-0000-0000-0000-000000000001	22222222-0000-0000-0000-000000000003	22222222-0000-0000-0000-000000000002	2026-03-07 17:01:33.637864	Road Widening - Vadapalani Segment 9	Road widening required to ease peak hour congestion near Vadapalani junction.	HIGH	APPROVED	f	2026-06-01 18:00:00	2026-03-07 17:01:33.637864	2026-03-07 17:01:33.637864
55555555-0000-0000-0000-000000000002	WO-2026-002	33333333-0000-0000-0000-000000000002	44444444-0000-0000-0000-000000000002	11111111-0000-0000-0000-000000000002	22222222-0000-0000-0000-000000000004	22222222-0000-0000-0000-000000000001	2026-03-07 17:01:33.637864	Pipeline Replacement - T Nagar W7	Corroded pipeline causing low water pressure in T Nagar zone 7.	EMERGENCY	COMPLETED	t	2026-03-30 18:00:00	2026-03-07 17:01:33.637864	2026-03-07 17:01:33.64572
\.


--
-- Name: budget_allocations budget_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_allocations
    ADD CONSTRAINT budget_allocations_pkey PRIMARY KEY (budget_id);


--
-- Name: departments departments_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_name_key UNIQUE (name);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (department_id);


--
-- Name: fund_releases fund_releases_budget_id_release_quarter_release_year_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fund_releases
    ADD CONSTRAINT fund_releases_budget_id_release_quarter_release_year_key UNIQUE (budget_id, release_quarter, release_year);


--
-- Name: fund_releases fund_releases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fund_releases
    ADD CONSTRAINT fund_releases_pkey PRIMARY KEY (release_id);


--
-- Name: infrastructure infrastructure_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.infrastructure
    ADD CONSTRAINT infrastructure_pkey PRIMARY KEY (infra_id);


--
-- Name: inspection_reports inspection_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inspection_reports
    ADD CONSTRAINT inspection_reports_pkey PRIMARY KEY (inspection_id);


--
-- Name: maintenance_logs maintenance_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_logs
    ADD CONSTRAINT maintenance_logs_pkey PRIMARY KEY (log_id);


--
-- Name: maintenance_schedules maintenance_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_schedules
    ADD CONSTRAINT maintenance_schedules_pkey PRIMARY KEY (schedule_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (notification_id);


--
-- Name: qc_reviews qc_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.qc_reviews
    ADD CONSTRAINT qc_reviews_pkey PRIMARY KEY (qc_id);


--
-- Name: resource_requests resource_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resource_requests
    ADD CONSTRAINT resource_requests_pkey PRIMARY KEY (request_id);


--
-- Name: sensor_deployments sensor_deployments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor_deployments
    ADD CONSTRAINT sensor_deployments_pkey PRIMARY KEY (sensor_id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (task_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: utilization_reviews utilization_reviews_budget_id_department_id_review_quarter__key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilization_reviews
    ADD CONSTRAINT utilization_reviews_budget_id_department_id_review_quarter__key UNIQUE (budget_id, department_id, review_quarter, review_year);


--
-- Name: utilization_reviews utilization_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilization_reviews
    ADD CONSTRAINT utilization_reviews_pkey PRIMARY KEY (review_id);


--
-- Name: vendor_quotations vendor_quotations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_quotations
    ADD CONSTRAINT vendor_quotations_pkey PRIMARY KEY (quotation_id);


--
-- Name: work_orders work_orders_display_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_display_code_key UNIQUE (display_code);


--
-- Name: work_orders work_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_pkey PRIMARY KEY (wo_id);


--
-- Name: fund_releases trg_check_fund_release_limit; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_check_fund_release_limit BEFORE INSERT ON public.fund_releases FOR EACH ROW EXECUTE FUNCTION public.check_fund_release_limit();


--
-- Name: work_orders trg_check_qc_review_exists; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_check_qc_review_exists BEFORE UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.check_qc_review_exists();


--
-- Name: qc_reviews trg_check_qc_reviewer_role; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_check_qc_reviewer_role BEFORE INSERT OR UPDATE ON public.qc_reviews FOR EACH ROW EXECUTE FUNCTION public.check_qc_reviewer_role();


--
-- Name: tasks trg_check_task_role_assignment; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_check_task_role_assignment BEFORE INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.check_task_role_assignment();


--
-- Name: tasks trg_update_task_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_task_timestamp BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_task_timestamp();


--
-- Name: work_orders trg_update_wo_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_wo_timestamp BEFORE UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.update_wo_timestamp();


--
-- Name: budget_allocations budget_allocations_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_allocations
    ADD CONSTRAINT budget_allocations_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(user_id);


--
-- Name: budget_allocations budget_allocations_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_allocations
    ADD CONSTRAINT budget_allocations_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(department_id);


--
-- Name: fund_releases fund_releases_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fund_releases
    ADD CONSTRAINT fund_releases_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.budget_allocations(budget_id) ON DELETE CASCADE;


--
-- Name: fund_releases fund_releases_released_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fund_releases
    ADD CONSTRAINT fund_releases_released_by_fkey FOREIGN KEY (released_by) REFERENCES public.users(user_id);


--
-- Name: infrastructure infrastructure_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.infrastructure
    ADD CONSTRAINT infrastructure_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(department_id);


--
-- Name: inspection_reports inspection_reports_engineer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inspection_reports
    ADD CONSTRAINT inspection_reports_engineer_id_fkey FOREIGN KEY (engineer_id) REFERENCES public.users(user_id);


--
-- Name: inspection_reports inspection_reports_infra_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inspection_reports
    ADD CONSTRAINT inspection_reports_infra_id_fkey FOREIGN KEY (infra_id) REFERENCES public.infrastructure(infra_id);


--
-- Name: inspection_reports inspection_reports_wo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inspection_reports
    ADD CONSTRAINT inspection_reports_wo_id_fkey FOREIGN KEY (wo_id) REFERENCES public.work_orders(wo_id) ON DELETE SET NULL;


--
-- Name: maintenance_logs maintenance_logs_engineer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_logs
    ADD CONSTRAINT maintenance_logs_engineer_id_fkey FOREIGN KEY (engineer_id) REFERENCES public.users(user_id);


--
-- Name: maintenance_logs maintenance_logs_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_logs
    ADD CONSTRAINT maintenance_logs_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(task_id) ON DELETE SET NULL;


--
-- Name: maintenance_logs maintenance_logs_wo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_logs
    ADD CONSTRAINT maintenance_logs_wo_id_fkey FOREIGN KEY (wo_id) REFERENCES public.work_orders(wo_id) ON DELETE CASCADE;


--
-- Name: maintenance_schedules maintenance_schedules_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_schedules
    ADD CONSTRAINT maintenance_schedules_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(user_id);


--
-- Name: maintenance_schedules maintenance_schedules_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_schedules
    ADD CONSTRAINT maintenance_schedules_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(department_id);


--
-- Name: maintenance_schedules maintenance_schedules_infra_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_schedules
    ADD CONSTRAINT maintenance_schedules_infra_id_fkey FOREIGN KEY (infra_id) REFERENCES public.infrastructure(infra_id);


--
-- Name: maintenance_schedules maintenance_schedules_scheduled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_schedules
    ADD CONSTRAINT maintenance_schedules_scheduled_by_fkey FOREIGN KEY (scheduled_by) REFERENCES public.users(user_id);


--
-- Name: notifications notifications_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(user_id);


--
-- Name: notifications notifications_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(user_id);


--
-- Name: notifications notifications_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(task_id) ON DELETE SET NULL;


--
-- Name: notifications notifications_wo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_wo_id_fkey FOREIGN KEY (wo_id) REFERENCES public.work_orders(wo_id) ON DELETE SET NULL;


--
-- Name: qc_reviews qc_reviews_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.qc_reviews
    ADD CONSTRAINT qc_reviews_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(user_id);


--
-- Name: qc_reviews qc_reviews_wo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.qc_reviews
    ADD CONSTRAINT qc_reviews_wo_id_fkey FOREIGN KEY (wo_id) REFERENCES public.work_orders(wo_id) ON DELETE CASCADE;


--
-- Name: resource_requests resource_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resource_requests
    ADD CONSTRAINT resource_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(user_id);


--
-- Name: resource_requests resource_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resource_requests
    ADD CONSTRAINT resource_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(user_id);


--
-- Name: resource_requests resource_requests_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resource_requests
    ADD CONSTRAINT resource_requests_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(task_id) ON DELETE SET NULL;


--
-- Name: resource_requests resource_requests_wo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resource_requests
    ADD CONSTRAINT resource_requests_wo_id_fkey FOREIGN KEY (wo_id) REFERENCES public.work_orders(wo_id) ON DELETE CASCADE;


--
-- Name: sensor_deployments sensor_deployments_deployed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor_deployments
    ADD CONSTRAINT sensor_deployments_deployed_by_fkey FOREIGN KEY (deployed_by) REFERENCES public.users(user_id);


--
-- Name: sensor_deployments sensor_deployments_infra_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor_deployments
    ADD CONSTRAINT sensor_deployments_infra_id_fkey FOREIGN KEY (infra_id) REFERENCES public.infrastructure(infra_id);


--
-- Name: tasks tasks_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(user_id);


--
-- Name: tasks tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(user_id);


--
-- Name: tasks tasks_wo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_wo_id_fkey FOREIGN KEY (wo_id) REFERENCES public.work_orders(wo_id) ON DELETE CASCADE;


--
-- Name: users users_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(department_id);


--
-- Name: utilization_reviews utilization_reviews_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilization_reviews
    ADD CONSTRAINT utilization_reviews_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.budget_allocations(budget_id);


--
-- Name: utilization_reviews utilization_reviews_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilization_reviews
    ADD CONSTRAINT utilization_reviews_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(department_id);


--
-- Name: utilization_reviews utilization_reviews_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilization_reviews
    ADD CONSTRAINT utilization_reviews_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(user_id);


--
-- Name: vendor_quotations vendor_quotations_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_quotations
    ADD CONSTRAINT vendor_quotations_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.budget_allocations(budget_id) ON DELETE CASCADE;


--
-- Name: vendor_quotations vendor_quotations_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_quotations
    ADD CONSTRAINT vendor_quotations_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(user_id);


--
-- Name: work_orders work_orders_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(user_id);


--
-- Name: work_orders work_orders_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.budget_allocations(budget_id);


--
-- Name: work_orders work_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: work_orders work_orders_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(department_id);


--
-- Name: work_orders work_orders_infra_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_infra_id_fkey FOREIGN KEY (infra_id) REFERENCES public.infrastructure(infra_id);


--
-- PostgreSQL database dump complete
--

\unrestrict ZVH81FqKJLdOgEoJx3SNCuQxHpSwQ9aaU8mI69xOLBbNMa1UXEUhyf5m33SdogQ


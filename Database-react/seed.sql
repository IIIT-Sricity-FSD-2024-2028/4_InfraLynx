-- ==============================================================================
-- TIMS (Township Infrastructure Management System) - Production Seed Data (Raw SQL)
-- Realistic Indian Smart Township Infrastructure Scenario
-- Location: DLF CyberCity & Aralias Smart Township, Sector 54, Gurugram (NCR), India
-- Synchronized with frontend-react and backend-react stores
-- ==============================================================================

-- 0. Clean Existing Data (Safe Dependency Order)
TRUNCATE payments, invoice_items, invoices, verifications, work_completion_items, 
         work_completions, approvals, approval_rules, estimate_items, estimates, 
         work_evidence, work_orders, amc_rates, amcs, complaint_photos, 
         complaints, assets, slas, contractor_services, users, contractors, 
         departments, township_subscriptions, township_settings, notifications, 
         audit_logs, townships, subscription_plans CASCADE;

-- ------------------------------------------------------------------------------
-- 1. SUBSCRIPTION PLAN & TOWNSHIP
-- ------------------------------------------------------------------------------
INSERT INTO subscription_plans (id, name, price, billing_cycle, max_users, max_departments, features)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Enterprise Municipal Plan',
    150000.00,
    'YEARLY',
    100,
    15,
    '["3_WAY_RECONCILIATION", "AMC_RATE_CARD_ENGINE", "ESCALATION_MONITOR", "EXECUTIVE_TELEMETRY"]'::jsonb
);

INSERT INTO townships (id, name, address, contact_email, contact_phone, status, subscription_plan_id)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'DLF CyberCity & Aralias Smart Township',
    'Golf Course Road, Sector 54, Gurugram, Haryana - 122002',
    'coo@infralynx.com',
    '+91 124 498 3000',
    'ACTIVE',
    'a0000000-0000-0000-0000-000000000001'
);

INSERT INTO township_settings (township_id, timezone, currency, default_sla_hours, auto_close_hours, major_expenditure_threshold)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'Asia/Kolkata',
    'INR',
    48,
    72,
    200000.00
);

-- ------------------------------------------------------------------------------
-- 2. DEPARTMENTS
-- ------------------------------------------------------------------------------
INSERT INTO departments (id, township_id, name, description)
VALUES 
    ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Civil Infrastructure & Roads', 'Arterial asphalt roads, stormwater drains, footpaths, and pedestrian walkways.'),
    ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Electrical & Power Distribution', 'High-mast streetlighting, 11kV distribution substations, feeder pillars, and transformer networks.'),
    ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Water Supply & Drainage Sanitation', 'Potable drinking water networks, 150mm DI pipelines, sluice valves, and sewage treatment lines.'),
    ('d0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Horticulture & Urban Waste Management', 'Community green belts, central parks, solid waste segregation, and composting units.');

-- ------------------------------------------------------------------------------
-- 3. REGISTERED CONTRACTORS (Indian Infrastructure Corporations)
-- ------------------------------------------------------------------------------
INSERT INTO contractors (id, township_id, company_name, contact_person, email, phone, gstin, address)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Larsen & Toubro Urban Infra Works Ltd.', 'Rameshwar Nath Sharma', 'rn.sharma@lt-urbaninfra.co.in', '+91 98110 45231', '06AAACL1234F1Z8', 'Tower B, DLF CyberPark, Sector 20, Gurugram, Haryana'),
    ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Voltech Power & Electrical Systems Ltd.', 'Vikram Singh Rathore', 'vikram.singh@voltechpower.in', '+91 97230 11984', '06AABCV5678G1Z4', 'Suite 108, Power Plaza, Sector 18, Gurugram, Haryana'),
    ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Kirloskar HydroTech & Water Systems Pvt. Ltd.', 'Suresh Narayan Kulkarni', 'suresh.kulkarni@kirloskarhydro.in', '+91 94220 33819', '06AACKK9012H1Z1', 'Plot 45, Udyog Vihar Phase 4, Gurugram, Haryana'),
    ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Swachh Urban Environmental Solutions LLP', 'Gurpreet Singh Sandhu', 'gurpreet@swachhurban.in', '+91 98722 55431', '06AADCS3456J1Z9', 'Environmental Hub, Sector 34, Gurugram, Haryana');

INSERT INTO contractor_services (contractor_id, service_type)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Civil'),
    ('c0000000-0000-0000-0000-000000000001', 'Roads'),
    ('c0000000-0000-0000-0000-000000000002', 'Electrical'),
    ('c0000000-0000-0000-0000-000000000002', 'Power Distribution'),
    ('c0000000-0000-0000-0000-000000000003', 'Water'),
    ('c0000000-0000-0000-0000-000000000003', 'Drainage Sanitation'),
    ('c0000000-0000-0000-0000-000000000004', 'Horticulture'),
    ('c0000000-0000-0000-0000-000000000004', 'Urban Waste Management');

-- ------------------------------------------------------------------------------
-- 4. USERS (Core Roles & Officials with Password@123 Hash)
-- ------------------------------------------------------------------------------
INSERT INTO users (id, township_id, name, email, username, password_hash, role, department_id, contractor_id, sector, phone)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Dr. Arvind Swaminathan', 'rwa@infralynx.com', 'rwa_rep', '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', 'RWA', NULL, NULL, 'Sector 54', '+91 98101 22345'),
    ('10000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Pooja Verma', 'clerk@infralynx.com', 'desk_clerk', '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', 'DESK_CLERK', 'd0000000-0000-0000-0000-000000000002', NULL, 'Central Admin Block', '+91 98712 34567'),
    ('10000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Vikram Singh Rathore', 'contractor@infralynx.com', 'contractor_lead', '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', 'FIELD_CONTRACTOR', 'd0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', NULL, '+91 97230 11984'),
    ('10000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Er. Rajesh K. Sharma', 'head@infralynx.com', 'dept_head', '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', 'DEPARTMENT_HEAD', 'd0000000-0000-0000-0000-000000000001', NULL, NULL, '+91 99100 87654'),
    ('10000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'Sunil Agrawal, CA', 'finance@infralynx.com', 'finance_clerk', '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', 'FINANCE_CLERK', NULL, NULL, 'Finance Block A', '+91 98188 76543'),
    ('10000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 'Col. (Retd.) Sanjeev Dewan', 'coo@infralynx.com', 'township_coo', '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', 'TOWNSHIP_COO', NULL, NULL, 'Executive Tower', '+91 98111 99887'),
    ('10000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001', 'Anjali Gupta', 'anjali.gupta@infralynx.com', 'clerk_anjali', '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', 'DESK_CLERK', 'd0000000-0000-0000-0000-000000000001', NULL, 'Sector 54', '+91 98733 44556'),
    ('10000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000001', 'Platform Super Admin', 'superadmin@infralynx.com', 'superadmin', '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', 'SUPER_ADMIN', NULL, NULL, 'Headquarters', '+91 99999 00001'),
    -- Category-specific Contractor Accounts (firstname.lastname@infralynx.com)
    ('10000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000001', 'Rameshwar Nath Sharma', 'rameshwar.sharma@infralynx.com', 'rameshwar.sharma', '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', 'FIELD_CONTRACTOR', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', NULL, '+91 98110 45231'),
    ('10000000-0000-0000-0000-00000000000c', 'b0000000-0000-0000-0000-000000000001', 'Vikram Singh Rathore', 'vikram.rathore@infralynx.com', 'vikram.rathore', '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', 'FIELD_CONTRACTOR', 'd0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', NULL, '+91 97230 11984'),
    ('10000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-000000000001', 'Suresh Narayan Kulkarni', 'suresh.kulkarni@infralynx.com', 'suresh.kulkarni', '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', 'FIELD_CONTRACTOR', 'd0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', NULL, '+91 94220 33819'),
    ('10000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-000000000001', 'Gurpreet Singh Sandhu', 'gurpreet.sandhu@infralynx.com', 'gurpreet.sandhu', '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', 'FIELD_CONTRACTOR', 'd0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004', NULL, '+91 98722 55431');

-- Bind Department Head
UPDATE departments SET department_head_id = '10000000-0000-0000-0000-000000000004' WHERE id = 'd0000000-0000-0000-0000-000000000001';

-- ------------------------------------------------------------------------------
-- 5. SLAs
-- ------------------------------------------------------------------------------
INSERT INTO slas (township_id, severity, response_time_hours, resolution_time_hours)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'EMERGENCY', 2, 6),
    ('b0000000-0000-0000-0000-000000000001', 'HIGH', 6, 24),
    ('b0000000-0000-0000-0000-000000000001', 'MEDIUM', 12, 48),
    ('b0000000-0000-0000-0000-000000000001', 'LOW', 24, 72);

-- ------------------------------------------------------------------------------
-- 6. AMC AGREEMENTS & CPWD / DSR SCHEDULE OF RATES
-- ------------------------------------------------------------------------------
INSERT INTO amcs (id, township_id, contractor_id, contract_number, department_id, title, start_date, end_date)
VALUES
    ('20000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'AMC-ELE-2025-03', 'd0000000-0000-0000-0000-000000000002', 'Annual Streetlight, Feeder Pillars & High-Mast Power AMC 2025–26', '2025-04-01', '2026-03-31'),
    ('20000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'AMC-CIV-2025-08', 'd0000000-0000-0000-0000-000000000001', 'Annual Arterial Bitumen Road, Pothole & Storm Drain AMC 2025–26', '2025-04-01', '2026-03-31'),
    ('20000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'AMC-WTR-2025-11', 'd0000000-0000-0000-0000-000000000003', 'Annual Potable Water Network, Sluice Valves & STP Drainage AMC 2025–26', '2025-04-01', '2026-03-31'),
    ('20000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'AMC-SAN-2025-18', 'd0000000-0000-0000-0000-000000000004', 'Annual Horticulture Trimming, Green Waste Shredding & Sanitation AMC 2025–26', '2025-04-01', '2026-03-31');

INSERT INTO amc_rates (amc_id, item_code, item_name, service_type, unit, rate, effective_from)
VALUES
    ('20000000-0000-0000-0000-000000000001', 'RATE-01', 'Senior Electrical Technician / Wireman', 'Labour', 'Hour', 500.00, '2025-04-01'),
    ('20000000-0000-0000-0000-000000000001', 'RATE-02', 'General Labour (Semi-Skilled / Safety Assist)', 'Labour', 'Hour', 300.00, '2025-04-01'),
    ('20000000-0000-0000-0000-000000000001', 'RATE-03', 'Armoured 3-Core Copper Cable 16 sq.mm', 'Material & Service', 'Meter', 150.00, '2025-04-01'),
    ('20000000-0000-0000-0000-000000000001', 'RATE-06', 'Streetlight 120W LED Luminaire & Surge Driver Replacement', 'Hardware', 'Unit', 1800.00, '2025-04-01'),
    ('20000000-0000-0000-0000-000000000002', 'RATE-05', 'Bitumen Cold-Mix Asphalt Pothole Repair', 'Civil Works', 'Sq.Meter', 1200.00, '2025-04-01'),
    ('20000000-0000-0000-0000-000000000002', 'RATE-08', 'Pre-Cast RCC Manhole Chamber Cover (600mm Circular)', 'Civil Works', 'Unit', 3200.00, '2025-04-01'),
    ('20000000-0000-0000-0000-000000000002', 'RATE-09', 'Super-Sucker Mechanical Stormwater Drain Desilting', 'Sanitation', 'Meter', 450.00, '2025-04-01'),
    ('20000000-0000-0000-0000-000000000003', 'RATE-04', 'Pipe Repair & DI Pipeline Fitting (100mm/150mm)', 'Plumbing Works', 'Unit', 800.00, '2025-04-01'),
    ('20000000-0000-0000-0000-000000000003', 'RATE-07', 'Heavy-Duty Cast Iron Sluice Valve Overhaul (150mm)', 'Plumbing Works', 'Unit', 2500.00, '2025-04-01'),
    ('20000000-0000-0000-0000-000000000003', 'RATE-10', 'Submersible Hydro-Pneumatic Pump Overhaul (15 HP)', 'Plumbing Works', 'Unit', 4800.00, '2025-04-01'),
    ('20000000-0000-0000-0000-000000000004', 'RATE-11', 'Hydraulic Crane Mechanical Tree Pruning & Power Clearance', 'Horticulture Works', 'Hour', 1500.00, '2025-04-01'),
    ('20000000-0000-0000-0000-000000000004', 'RATE-12', 'Mechanized Green Waste Shredding & Solid Waste Disposal', 'Waste Management', 'Metric Tonne', 2200.00, '2025-04-01');

-- ------------------------------------------------------------------------------
-- 7. APPROVAL RULES (Tiered Financial Thresholds)
-- ------------------------------------------------------------------------------
INSERT INTO approval_rules (township_id, min_amount, max_amount, required_role, approval_order)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 0.00, 10000.00, 'DESK_CLERK', 1),
    ('b0000000-0000-0000-0000-000000000001', 10000.01, 100000.00, 'DEPARTMENT_HEAD', 1),
    ('b0000000-0000-0000-0000-000000000001', 100000.01, NULL, 'TOWNSHIP_COO', 2);

-- ------------------------------------------------------------------------------
-- ==============================================================================
-- SEED DATA LOAD COMPLETED (Zero Complaints, Zero Work Orders)
-- ==============================================================================

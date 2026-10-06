-- ==============================================================================
-- TIMS (Township Infrastructure Management System) - Initial Seed Data (Raw SQL)
-- Matches frontend mock data: RWA, Desk Clerk, Contractor, Dept Head, Finance, COO
-- ==============================================================================

-- 1. Subscription Plan & Township
INSERT INTO subscription_plans (id, name, price, billing_cycle, max_users, max_departments, features)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Enterprise Municipal Plan',
    150000.00,
    'YEARLY',
    100,
    15,
    '["3_WAY_RECONCILIATION", "AMC_RATE_CARD_ENGINE", "ESCALATION_MONITOR", "EXECUTIVE_TELEMETRY"]'::jsonb
) ON CONFLICT DO NOTHING;

INSERT INTO townships (id, name, address, contact_email, contact_phone, status, subscription_plan_id)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'Greenfield Smart Township',
    'Sector 1–12 Arterial Belt, NCR Region, India',
    'coo@infralynx.com',
    '+91 11 4982 3000',
    'ACTIVE',
    'a0000000-0000-0000-0000-000000000001'
) ON CONFLICT DO NOTHING;

INSERT INTO township_settings (township_id, timezone, currency, default_sla_hours, auto_close_hours, major_expenditure_threshold)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'Asia/Kolkata',
    'INR',
    48,
    72,
    200000.00
) ON CONFLICT DO NOTHING;

-- 2. Departments
INSERT INTO departments (id, township_id, name, description)
VALUES 
    ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Civil Infrastructure', 'Roads, stormwater drains, footpaths, and public masonry structures.'),
    ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Electrical & Power Systems', 'Street lighting, sub-stations, feeder pillars, and transformer networks.'),
    ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Water & Sanitation', 'Overhead tanks, underground potable supply, valves, and sewage mains.')
ON CONFLICT DO NOTHING;

-- 3. Contractors
INSERT INTO contractors (id, township_id, company_name, contact_person, email, phone, gstin, address)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Apex Infraworks Ltd.', 'Rajesh Verma', 'contractor@infralynx.com', '+91 98112 45012', '07BBBBB1111B1Z2', 'Plot 42, Industrial Area Phase 1'),
    ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Voltech Power & Lights', 'Vikram Singh', 'voltech@infralynx.com', '+91 97230 11984', '07AAAAA0000A1Z5', 'Suite 108, Power Plaza, Sector 18'),
    ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'AquaFlow Utilities Corp', 'Anil Deshmukh', 'aquaflow@infralynx.com', '+91 94500 88219', '07CCCCC2222C1Z8', 'Water Works Complex, Canal Road')
ON CONFLICT DO NOTHING;

-- 4. Users (All 6 Core Roles)
INSERT INTO users (id, township_id, name, email, username, password_hash, role, department_id, contractor_id, sector)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Ravi Sharma', 'rwa@infralynx.com', 'rwa_rep', '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', 'RWA', NULL, NULL, 'Sector 4'),
    ('10000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Pooja Rao', 'clerk@infralynx.com', 'desk_clerk', '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', 'DESK_CLERK', 'd0000000-0000-0000-0000-000000000002', NULL, NULL),
    ('10000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Vikram Singh', 'contractor@infralynx.com', 'contractor_lead', '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', 'FIELD_CONTRACTOR', NULL, 'c0000000-0000-0000-0000-000000000002', NULL),
    ('10000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Er. Sandeep Mehta', 'head@infralynx.com', 'dept_head_elec', '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', 'DEPARTMENT_HEAD', 'd0000000-0000-0000-0000-000000000002', NULL, NULL),
    ('10000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'Sunil Agrawal', 'finance@infralynx.com', 'finance_clerk', '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', 'FINANCE_CLERK', NULL, NULL, NULL),
    ('10000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 'Kavita Menon', 'coo@infralynx.com', 'township_coo', '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', 'TOWNSHIP_COO', NULL, NULL, NULL)
ON CONFLICT DO NOTHING;

-- Bind Department Head
UPDATE departments SET department_head_id = '10000000-0000-0000-0000-000000000004' WHERE id = 'd0000000-0000-0000-0000-000000000002';

-- 5. SLAs
INSERT INTO slas (township_id, severity, response_time_hours, resolution_time_hours)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'EMERGENCY', 2, 6),
    ('b0000000-0000-0000-0000-000000000001', 'HIGH', 6, 24),
    ('b0000000-0000-0000-0000-000000000001', 'MEDIUM', 12, 48),
    ('b0000000-0000-0000-0000-000000000001', 'LOW', 24, 72)
ON CONFLICT DO NOTHING;

-- 6. AMC Agreements & Rate Cards
INSERT INTO amcs (id, township_id, contractor_id, contract_number, department_id, title, start_date, end_date)
VALUES
    ('20000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'AMC-ELE-2025-03', 'd0000000-0000-0000-0000-000000000002', 'Annual Streetlight & Power Maintenance 2025–26', '2025-04-01', '2026-03-31'),
    ('20000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'AMC-CIV-2025-08', 'd0000000-0000-0000-0000-000000000001', 'Annual Bitumen Road & Footpath Repair 2025–26', '2025-04-01', '2026-03-31'),
    ('20000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'AMC-WTR-2025-11', 'd0000000-0000-0000-0000-000000000003', 'Annual Potable Water Network AMC 2025–26', '2025-04-01', '2026-03-31')
ON CONFLICT DO NOTHING;

INSERT INTO amc_rates (amc_id, item_code, item_name, service_type, unit, rate, effective_from)
VALUES
    ('20000000-0000-0000-0000-000000000001', 'RATE-01', 'Electrician', 'Labour', 'Hour', 500.00, '2025-04-01'),
    ('20000000-0000-0000-0000-000000000001', 'RATE-02', 'General Labour', 'Labour', 'Hour', 300.00, '2025-04-01'),
    ('20000000-0000-0000-0000-000000000001', 'RATE-03', 'Cable Work', 'Material & Service', 'Meter', 150.00, '2025-04-01'),
    ('20000000-0000-0000-0000-000000000001', 'RATE-06', 'Streetlight LED Luminaire Replacement', 'Hardware', 'Unit', 1800.00, '2025-04-01'),
    ('20000000-0000-0000-0000-000000000002', 'RATE-05', 'Pothole Asphalt Filling', 'Civil Works', 'Sq.Meter', 1200.00, '2025-04-01'),
    ('20000000-0000-0000-0000-000000000003', 'RATE-04', 'Pipe Repair & Fitting', 'Plumbing', 'Unit', 800.00, '2025-04-01'),
    ('20000000-0000-0000-0000-000000000003', 'RATE-07', 'Sluice Valve Overhaul', 'Machinery', 'Unit', 2500.00, '2025-04-01')
ON CONFLICT DO NOTHING;

-- 7. Approval Rules (3-Tier Governance)
INSERT INTO approval_rules (township_id, min_amount, max_amount, required_role, approval_order)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 0.00, 25000.00, 'DESK_CLERK', 1),
    ('b0000000-0000-0000-0000-000000000001', 25000.01, 200000.00, 'DEPARTMENT_HEAD', 1),
    ('b0000000-0000-0000-0000-000000000001', 200000.01, NULL, 'TOWNSHIP_COO', 2)
ON CONFLICT DO NOTHING;

-- 8. Sample Complaint & Work Order Cycle (Linked to React Mock Data)
INSERT INTO complaints (
    id, complaint_code, township_id, reported_by, department_id,
    category, subcategory, title, description, severity, sector, block, street,
    location_details, status
) VALUES (
    'e0000000-0000-0000-0000-000000000001',
    'CMP-2026-0101',
    'b0000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000002',
    'Electrical',
    'Streetlight Failure',
    'High-Mast Streetlight Failure at Main Junction',
    'High-mast LED cluster completely unlit since yesterday evening causing safety hazards.',
    'HIGH',
    'Sector 4',
    'Block B',
    'Gulmohar Marg',
    'Near Sector 4 Community Park Gate 2',
    'PENDING_VERIFICATION'
) ON CONFLICT DO NOTHING;

INSERT INTO work_orders (
    id, work_order_number, township_id, complaint_id, department_id, contractor_id, assigned_by, priority, status
) VALUES (
    '40000000-0000-0000-0000-000000000001',
    'WO-2026-088',
    'b0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'HIGH',
    'COMPLETED'
) ON CONFLICT DO NOTHING;

INSERT INTO invoices (
    id, invoice_code, township_id, contractor_id, work_order_id, invoice_number,
    invoice_date, subtotal, tax, total_amount, approved_estimate_amount, variance_amount,
    rate_card_match, status
) VALUES (
    '50000000-0000-0000-0000-000000000001',
    'INV-2026-088',
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000001',
    'VT-INV/2026/041',
    CURRENT_DATE,
    3400.00,
    0.00,
    3400.00,
    3400.00,
    0.00,
    TRUE,
    'PENDING_AUDIT'
) ON CONFLICT DO NOTHING;

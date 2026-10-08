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

-- ------------------------------------------------------------------------------
-- 4. USERS (Core Roles & Officials with Password@123 Hash)
-- ------------------------------------------------------------------------------
INSERT INTO users (id, township_id, name, email, username, password_hash, role, department_id, contractor_id, sector, phone)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Dr. Arvind Swaminathan', 'rwa@infralynx.com', 'rwa_rep', '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', 'RWA', NULL, NULL, 'Sector 54', '+91 98101 22345'),
    ('10000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Pooja Verma', 'clerk@infralynx.com', 'desk_clerk', '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', 'DESK_CLERK', 'd0000000-0000-0000-0000-000000000002', NULL, 'Central Admin Block', '+91 98712 34567'),
    ('10000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Vikram Singh Rathore', 'contractor@infralynx.com', 'contractor_lead', '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', 'FIELD_CONTRACTOR', NULL, 'c0000000-0000-0000-0000-000000000002', NULL, '+91 97230 11984'),
    ('10000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Er. Rajesh K. Sharma', 'head@infralynx.com', 'dept_head', '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', 'DEPARTMENT_HEAD', 'd0000000-0000-0000-0000-000000000002', NULL, NULL, '+91 99100 87654'),
    ('10000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'Sunil Agrawal, CA', 'finance@infralynx.com', 'finance_clerk', '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', 'FINANCE_CLERK', NULL, NULL, 'Finance Block A', '+91 98188 76543'),
    ('10000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 'Col. (Retd.) Sanjeev Dewan', 'coo@infralynx.com', 'township_coo', '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', 'TOWNSHIP_COO', NULL, NULL, 'Executive Tower', '+91 98111 99887'),
    ('10000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001', 'Anjali Gupta', 'anjali.gupta@infralynx.com', 'clerk_anjali', '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', 'DESK_CLERK', 'd0000000-0000-0000-0000-000000000001', NULL, 'Sector 54', '+91 98733 44556');

-- Bind Department Head
UPDATE departments SET department_head_id = '10000000-0000-0000-0000-000000000004' WHERE id = 'd0000000-0000-0000-0000-000000000002';

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
-- 8. COMPLAINTS (Realistic Indian Scenarios across Lifecycle)
-- ------------------------------------------------------------------------------
INSERT INTO complaints (
    id, complaint_code, township_id, reported_by, department_id,
    category, subcategory, title, description, severity, sector, block, street,
    location_details, latitude, longitude, status
) VALUES 
    -- 1. High-mast Streetlight: Fixed, Verified, Paid
    (
        'e0000000-0000-0000-0000-000000000001',
        'CMP-2026-0101',
        'b0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000002',
        'Electrical',
        'Streetlight Failure',
        'High-Mast Streetlight Failure at Main Sector 54 Junction',
        'High-mast LED cluster completely unlit since evening peak hours, creating severe hazard for evening commuter traffic.',
        'HIGH',
        'Sector 54',
        'Block B',
        'Gulmohar Marg',
        'Near Central Roundabout Fountain',
        28.5355000,
        77.3910000,
        'PENDING_VERIFICATION'
    ),
    -- 2. Drinking Water Pipeline Burst: Repaired, Awaiting Citizen Signoff
    (
        'e0000000-0000-0000-0000-000000000002',
        'CMP-2026-0102',
        'b0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000003',
        'Water',
        'Pipeline Burst',
        '150mm DI Drinking Water Main Line Burst outside Tower 7',
        'Underground pressurized potable pipeline ruptured. Fresh water gushing out onto road with severe pressure loss in Towers 6 to 9.',
        'EMERGENCY',
        'Sector 54',
        'Block C',
        'Palm Avenue',
        'Outside Aralias Tower 7 Gate',
        28.5362000,
        77.3925000,
        'PENDING_VERIFICATION'
    ),
    -- 3. Asphalt Potholes: In Progress
    (
        'e0000000-0000-0000-0000-000000000003',
        'CMP-2026-0103',
        'b0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000001',
        'Civil',
        'Road Damage',
        'Deep Asphalt Potholes on Main Sector Spine Road near Gate 2',
        'Severe 4-inch deep potholes covering 15 sq.m asphalt surface following heavy monsoon showers; damaging resident vehicles.',
        'HIGH',
        'Sector 54',
        'Block A',
        'Arterial Spine Road',
        'Between Gate 1 and Gate 2 Security Checkpost',
        28.5348000,
        77.3895000,
        'IN_PROGRESS'
    ),
    -- 4. Transformer Cable Fault: Assigned to Contractor
    (
        'e0000000-0000-0000-0000-000000000004',
        'CMP-2026-0104',
        'b0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000002',
        'Electrical',
        'Distribution Failure',
        '11kV Transformer Substation Feeder Cable Ground Fault & Sparking',
        'Underground armoured XLPE cable sparking intermittently with smoke emission near the main transformer isolator switch.',
        'EMERGENCY',
        'Sector 54',
        'Block C',
        'Substation Road',
        'Feeder Substation 12B Yard behind Community Hall',
        28.5372000,
        77.3945000,
        'VALIDATED'
    ),
    -- 5. Stormwater Drain Overflow: Completed with Cost Variance
    (
        'e0000000-0000-0000-0000-000000000005',
        'CMP-2026-0105',
        'b0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000001',
        'Civil',
        'Drainage Overflow',
        'Stormwater Drain Silt Blockage & Monsoon Overflow near Market Complex',
        'Covered RCC stormwater drain choked with debris, causing foul water to back up into commercial plaza parking entrance.',
        'MEDIUM',
        'Sector 54',
        'Block D',
        'Commercial Galleria Lane',
        'Opposite HDFC Bank ATM',
        28.5380000,
        77.3960000,
        'PENDING_VERIFICATION'
    ),
    -- 6. Broken Manhole Lid: Validated (Desk Clerk queue)
    (
        'e0000000-0000-0000-0000-000000000006',
        'CMP-2026-0106',
        'b0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000001',
        'Civil',
        'Footpath Hazard',
        'Broken Heavy-Duty RCC Manhole Cover on Primary Pedestrian Walkway',
        '600mm circular manhole lid cracked in half and displaced into pit, presenting immediate fall hazard for morning walkers and children.',
        'HIGH',
        'Sector 54',
        'Block B',
        'Amaltas Enclave Walkway',
        'Adjacent to Children Play Park',
        28.5358000,
        77.3915000,
        'VALIDATED'
    ),
    -- 7. Tank Float Valve: Newly Reported (RWA Intake)
    (
        'e0000000-0000-0000-0000-000000000007',
        'CMP-2026-0107',
        'b0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000003',
        'Water',
        'Overhead Tank Leak',
        'Overhead Potable Water Tank Float Valve Failure causing Continuous Overflow',
        'Mechanical float switch broken; 50,000-litre overhead RCC tank overflowing onto roof slab and cascading into central atrium courtyard.',
        'MEDIUM',
        'Sector 54',
        'Block A',
        'Clubhouse Drive',
        'Main Community Center Utility Roof',
        28.5342000,
        77.3888000,
        'REPORTED'
    ),
    -- 8. Duplicate Candidate: Under Review (Proximity match to CMP-2026-0105 within 35m)
    (
        'e0000000-0000-0000-0000-000000000008',
        'CMP-2026-0108',
        'b0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000001',
        'Civil',
        'Waterlogging',
        'Severe Waterlogging & Drain Choking near Market Complex Galleria Gate',
        'Stagnant water accumulation near commercial gate due to drain overflow.',
        'MEDIUM',
        'Sector 54',
        'Block D',
        'Commercial Galleria Lane',
        'Galleria North Gate (35m from CMP-2026-0105)',
        28.5382000,
        77.3963000,
        'UNDER_REVIEW'
    );

-- ------------------------------------------------------------------------------
-- 9. WORK ORDERS
-- ------------------------------------------------------------------------------
INSERT INTO work_orders (
    id, work_order_number, township_id, complaint_id, department_id,
    contractor_id, assigned_by, priority, status
) VALUES
    ('40000000-0000-0000-0000-000000000001', 'WO-2026-088', 'b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'HIGH', 'COMPLETED'),
    ('40000000-0000-0000-0000-000000000002', 'WO-2026-089', 'b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'EMERGENCY', 'COMPLETED'),
    ('40000000-0000-0000-0000-000000000003', 'WO-2026-087', 'b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'HIGH', 'IN_PROGRESS'),
    ('40000000-0000-0000-0000-000000000004', 'WO-2026-090', 'b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'EMERGENCY', 'ASSIGNED'),
    ('40000000-0000-0000-0000-000000000005', 'WO-2026-091', 'b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'MEDIUM', 'COMPLETED');

-- ------------------------------------------------------------------------------
-- 10. INVOICES & 3-WAY RECONCILIATION AUDIT
-- ------------------------------------------------------------------------------
INSERT INTO invoices (
    id, invoice_code, township_id, contractor_id, work_order_id, invoice_number,
    invoice_date, subtotal, tax, total_amount, approved_estimate_amount, variance_amount,
    rate_card_match, variance_reason, status
) VALUES 
    -- 1. Matched & Pending Final Audit
    (
        '50000000-0000-0000-0000-000000000001',
        'INV-2026-088',
        'b0000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000002',
        '40000000-0000-0000-0000-000000000001',
        'VT-INV/2026/041',
        CURRENT_DATE - INTERVAL '3 days',
        3400.00,
        0.00,
        3400.00,
        3400.00,
        0.00,
        TRUE,
        NULL,
        'PENDING_AUDIT'
    ),
    -- 2. Authorized, Awaiting RTGS Release
    (
        '50000000-0000-0000-0000-000000000002',
        'INV-2026-079',
        'b0000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000003',
        '40000000-0000-0000-0000-000000000002',
        'KIRL-INV/2026/019',
        CURRENT_DATE - INTERVAL '1 day',
        6600.00,
        0.00,
        6600.00,
        6600.00,
        0.00,
        TRUE,
        NULL,
        'AUTHORIZED'
    ),
    -- 3. Flagged Variance (+26.6% cost overrun)
    (
        '50000000-0000-0000-0000-000000000003',
        'INV-2026-084',
        'b0000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000001',
        '40000000-0000-0000-0000-000000000005',
        'LNT-INV/2026/102',
        CURRENT_DATE - INTERVAL '2 days',
        22800.00,
        0.00,
        22800.00,
        18000.00,
        4800.00,
        FALSE,
        'Billed 16 sq.m asphalt filling vs. approved 12 sq.m estimate (+33% quantity increase without prior Dept Head addendum approval).',
        'VARIANCE_FLAGGED'
    ),
    -- 4. Fresh Invoice Pending Audit
    (
        '50000000-0000-0000-0000-000000000004',
        'INV-2026-090',
        'b0000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000002',
        '40000000-0000-0000-0000-000000000004',
        'VT-INV/2026/055',
        CURRENT_DATE,
        14200.00,
        0.00,
        14200.00,
        14200.00,
        0.00,
        TRUE,
        NULL,
        'PENDING_AUDIT'
    );

-- ------------------------------------------------------------------------------
-- 11. INVOICE LINE ITEMS
-- ------------------------------------------------------------------------------
INSERT INTO invoice_items (id, invoice_id, description, unit, quantity, rate, amount)
VALUES
    -- INV-2026-088 Items (Total: ₹3,400)
    ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Senior Electrical Technician / Wireman', 'Hour', 2.00, 500.00, 1000.00),
    ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'General Labour (Semi-Skilled / Safety Assist)', 'Hour', 3.00, 300.00, 900.00),
    ('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', 'Armoured 3-Core Copper Cable 16 sq.mm', 'Meter', 10.00, 150.00, 1500.00),

    -- INV-2026-079 Items (Total: ₹6,600)
    ('60000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000002', 'Heavy-Duty Cast Iron Sluice Valve Overhaul (150mm)', 'Unit', 2.00, 2500.00, 5000.00),
    ('60000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000002', 'Pipe Repair & DI Pipeline Fitting (100mm/150mm)', 'Unit', 2.00, 800.00, 1600.00),

    -- INV-2026-084 Items (Total: ₹22,800)
    ('60000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000003', 'Bitumen Cold-Mix Asphalt Pothole Repair', 'Sq.Meter', 16.00, 1200.00, 19200.00),
    ('60000000-0000-0000-0000-000000000007', '50000000-0000-0000-0000-000000000003', 'General Labour (Semi-Skilled / Safety Assist)', 'Hour', 12.00, 300.00, 3600.00);

-- ------------------------------------------------------------------------------
-- 12. PAYMENTS
-- ------------------------------------------------------------------------------
INSERT INTO payments (
    id, township_id, invoice_id, contractor_id, amount, status,
    payment_mode, payment_reference, paid_at
) VALUES (
    '70000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000002',
    3400.00,
    'DISBURSED',
    'RTGS / Township Escrow',
    'UTR-HDFC-9928192831',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
);

-- ==============================================================================
-- SEED DATA LOAD COMPLETED
-- ==============================================================================

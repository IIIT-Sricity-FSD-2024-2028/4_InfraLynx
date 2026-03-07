-- ==============================================================================
-- CRIMS - Sample Seed Data
-- Run DBschema.sql FIRST, then run this file.
-- ==============================================================================


-- 1. Departments

INSERT INTO departments (department_id, name, description) VALUES
    ('11111111-0000-0000-0000-000000000001', 'Roads', 'Manages road construction and repair'),
    ('11111111-0000-0000-0000-000000000002', 'Water', 'Manages water pipelines and supply'),
    ('11111111-0000-0000-0000-000000000003', 'Electrical', 'Manages streetlights and electrical grid');



-- 2. Users (password_hash is a dummy bcrypt-style hash)

INSERT INTO users (user_id, full_name, email, password_hash, phone_number, role, department_id) VALUES
    -- Administrators (no department)
    ('22222222-0000-0000-0000-000000000001', 'Arjun Sharma',   'arjun@crims.gov',   '$2b$10$dummyhashADMIN001', '9876543210', 'ADMINISTRATOR', NULL),
    ('22222222-0000-0000-0000-000000000002', 'Priya Nair',     'priya@crims.gov',   '$2b$10$dummyhashADMIN002', '9876543211', 'ADMINISTRATOR', NULL),

    -- Officers
    ('22222222-0000-0000-0000-000000000003', 'Ravi Kumar',     'ravi@crims.gov',    '$2b$10$dummyhashOFFICER01', '9876543212', 'OFFICER', '11111111-0000-0000-0000-000000000001'),
    ('22222222-0000-0000-0000-000000000004', 'Meena Iyer',     'meena@crims.gov',   '$2b$10$dummyhashOFFICER02', '9876543213', 'OFFICER', '11111111-0000-0000-0000-000000000002'),
    ('22222222-0000-0000-0000-000000000005', 'Suresh Pillai',  'suresh@crims.gov',  '$2b$10$dummyhashOFFICER03', '9876543214', 'OFFICER', '11111111-0000-0000-0000-000000000003'),

    -- Engineers
    ('22222222-0000-0000-0000-000000000006', 'Karthik Raj',    'karthik@crims.gov', '$2b$10$dummyhashENGINEER1', '9876543215', 'ENGINEER', '11111111-0000-0000-0000-000000000001'),
    ('22222222-0000-0000-0000-000000000007', 'Divya Menon',    'divya@crims.gov',   '$2b$10$dummyhashENGINEER2', '9876543216', 'ENGINEER', '11111111-0000-0000-0000-000000000002'),
    ('22222222-0000-0000-0000-000000000008', 'Arun Babu',      'arun@crims.gov',    '$2b$10$dummyhashENGINEER3', '9876543217', 'ENGINEER', '11111111-0000-0000-0000-000000000003'),
    ('22222222-0000-0000-0000-000000000009', 'Lakshmi Das',    'lakshmi@crims.gov', '$2b$10$dummyhashENGINEER4', '9876543218', 'ENGINEER', '11111111-0000-0000-0000-000000000001');



-- 3. Infrastructure

INSERT INTO infrastructure (infra_id, name, type, location_coordinates, latitude, longitude, status, department_id) VALUES
    ('33333333-0000-0000-0000-000000000001', 'Anna Salai Road Segment 4', 'Road',        '13.0674° N, 80.2376° E', 13.0674, 80.2376, 'OPERATIONAL',       '11111111-0000-0000-0000-000000000001'),
    ('33333333-0000-0000-0000-000000000002', 'T Nagar Water Pipeline W7', 'Pipeline',    '13.0418° N, 80.2341° E', 13.0418, 80.2341, 'UNDER_MAINTENANCE',  '11111111-0000-0000-0000-000000000002'),
    ('33333333-0000-0000-0000-000000000003', 'Adyar Streetlight SL-102',  'Streetlight', '13.0067° N, 80.2571° E', 13.0067, 80.2571, 'OPERATIONAL',       '11111111-0000-0000-0000-000000000003'),
    ('33333333-0000-0000-0000-000000000004', 'Vadapalani Road Segment 9', 'Road',        '13.0524° N, 80.2121° E', 13.0524, 80.2121, 'OPERATIONAL',       '11111111-0000-0000-0000-000000000001'),
    ('33333333-0000-0000-0000-000000000005', 'Tambaram Water Valve WV-47','Valve',       '12.9249° N, 80.1000° E', 12.9249, 80.1000, 'OPERATIONAL',       '11111111-0000-0000-0000-000000000002');



-- 4. Budget Allocations

INSERT INTO budget_allocations (budget_id, project_name, department_id, base_amount, gst_amount, status, approved_by) VALUES
    ('44444444-0000-0000-0000-000000000001', 'Anna Salai Pothole Repair',    '11111111-0000-0000-0000-000000000001', 500000.00, 90000.00, 'APPROVED',  '22222222-0000-0000-0000-000000000001'),
    ('44444444-0000-0000-0000-000000000002', 'T Nagar Pipeline Replacement', '11111111-0000-0000-0000-000000000002', 800000.00, 144000.00,'APPROVED',  '22222222-0000-0000-0000-000000000001'),
    ('44444444-0000-0000-0000-000000000003', 'Adyar Streetlight Upgrade',    '11111111-0000-0000-0000-000000000003', 250000.00, 45000.00, 'PENDING',   NULL),
    ('44444444-0000-0000-0000-000000000004', 'Vadapalani Road Widening',     '11111111-0000-0000-0000-000000000001', 1200000.00,216000.00,'APPROVED',  '22222222-0000-0000-0000-000000000002');



-- 5. Vendor Quotations

INSERT INTO vendor_quotations (budget_id, vendor_name, vendor_gstin, is_government_vendor, description, quoted_amount, status, reviewed_by, reviewed_at) VALUES
    ('44444444-0000-0000-0000-000000000001', 'Bharat Roads Pvt Ltd',       '33AABCB1234F1Z5', FALSE, 'Pothole repair using cold mix asphalt',      480000.00, 'ACCEPTED',  '22222222-0000-0000-0000-000000000003', CURRENT_TIMESTAMP),
    ('44444444-0000-0000-0000-000000000001', 'Tamil Nadu Civil Works',     '33AATNT5678G1Z2', TRUE,  'Pothole repair using hot mix asphalt',        520000.00, 'REJECTED',  '22222222-0000-0000-0000-000000000003', CURRENT_TIMESTAMP),
    ('44444444-0000-0000-0000-000000000002', 'Chennai Pipe Corp',          '33AACCP9012H1Z8', FALSE, 'HDPE pipeline supply and installation',       790000.00, 'ACCEPTED',  '22222222-0000-0000-0000-000000000004', CURRENT_TIMESTAMP),
    ('44444444-0000-0000-0000-000000000003', 'Southern Electricals Ltd',   '33AASSE3456I1Z1', FALSE, 'LED streetlight supply and installation',     240000.00, 'SUBMITTED', NULL, NULL);



-- 6. Fund Releases

INSERT INTO fund_releases (budget_id, release_quarter, release_year, amount_released, release_notes, released_by) VALUES
    ('44444444-0000-0000-0000-000000000001', 'Q1', 2026, 200000.00, 'First release for material procurement',    '22222222-0000-0000-0000-000000000001'),
    ('44444444-0000-0000-0000-000000000001', 'Q2', 2026, 150000.00, 'Second release for labour and equipment',   '22222222-0000-0000-0000-000000000001'),
    ('44444444-0000-0000-0000-000000000002', 'Q1', 2026, 400000.00, 'Initial release for pipeline materials',    '22222222-0000-0000-0000-000000000001'),
    ('44444444-0000-0000-0000-000000000004', 'Q1', 2026, 500000.00, 'First tranche for road widening project',   '22222222-0000-0000-0000-000000000002');



-- 7. Work Orders

INSERT INTO work_orders (wo_id, display_code, infra_id, budget_id, department_id, created_by, approved_by, approved_at, title, description, priority, status, qc_passed, deadline) VALUES
    ('55555555-0000-0000-0000-000000000001', 'WO-2026-001',
        '33333333-0000-0000-0000-000000000001',
        '44444444-0000-0000-0000-000000000001',
        '11111111-0000-0000-0000-000000000001',
        '22222222-0000-0000-0000-000000000003',
        '22222222-0000-0000-0000-000000000001',
        CURRENT_TIMESTAMP,
        'Pothole Repair - Anna Salai Segment 4',
        'Multiple potholes reported on Anna Salai near Gemini flyover. Depth approx 5cm.',
        'HIGH', 'IN_PROGRESS', FALSE, '2026-04-15 18:00:00'),

    ('55555555-0000-0000-0000-000000000002', 'WO-2026-002',
        '33333333-0000-0000-0000-000000000002',
        '44444444-0000-0000-0000-000000000002',
        '11111111-0000-0000-0000-000000000002',
        '22222222-0000-0000-0000-000000000004',
        '22222222-0000-0000-0000-000000000001',
        CURRENT_TIMESTAMP,
        'Pipeline Replacement - T Nagar W7',
        'Corroded pipeline causing low water pressure in T Nagar zone 7.',
        'EMERGENCY', 'PENDING_QC', FALSE, '2026-03-30 18:00:00'),

    ('55555555-0000-0000-0000-000000000003', 'WO-2026-003',
        '33333333-0000-0000-0000-000000000003',
        NULL,
        '11111111-0000-0000-0000-000000000003',
        '22222222-0000-0000-0000-000000000005',
        NULL, NULL,
        'Streetlight Fault - Adyar SL-102',
        'Streetlight SL-102 on Adyar beach road not functioning for 3 days.',
        'MEDIUM', 'PENDING_ADMIN_APPROVAL', FALSE, '2026-04-20 18:00:00'),

    ('55555555-0000-0000-0000-000000000004', 'WO-2026-004',
        '33333333-0000-0000-0000-000000000004',
        '44444444-0000-0000-0000-000000000004',
        '11111111-0000-0000-0000-000000000001',
        '22222222-0000-0000-0000-000000000003',
        '22222222-0000-0000-0000-000000000002',
        CURRENT_TIMESTAMP,
        'Road Widening - Vadapalani Segment 9',
        'Road widening required to ease peak hour congestion near Vadapalani junction.',
        'HIGH', 'APPROVED', FALSE, '2026-06-01 18:00:00');



-- 8. Tasks

INSERT INTO tasks (task_id, wo_id, assigned_to, assigned_by, title, description, priority, status, deadline, completion_notes, actual_hours) VALUES
    ('66666666-0000-0000-0000-000000000001',
        '55555555-0000-0000-0000-000000000001',
        '22222222-0000-0000-0000-000000000006',
        '22222222-0000-0000-0000-000000000003',
        'Site Inspection and Measurement',
        'Inspect pothole locations and measure depth and width for repair estimate.',
        'HIGH', 'COMPLETED', '2026-03-20 18:00:00',
        'Measured 6 potholes. Average depth 5.5cm. Coordinates logged.', 3.5),

    ('66666666-0000-0000-0000-000000000002',
        '55555555-0000-0000-0000-000000000001',
        '22222222-0000-0000-0000-000000000006',
        '22222222-0000-0000-0000-000000000003',
        'Pothole Filling with Cold Mix',
        'Fill all identified potholes using approved cold mix asphalt.',
        'HIGH', 'IN_PROGRESS', '2026-04-10 18:00:00',
        NULL, NULL),

    ('66666666-0000-0000-0000-000000000003',
        '55555555-0000-0000-0000-000000000002',
        '22222222-0000-0000-0000-000000000007',
        '22222222-0000-0000-0000-000000000004',
        'Pipeline Excavation and Removal',
        'Excavate and remove the old corroded HDPE pipeline in zone W7.',
        'EMERGENCY', 'COMPLETED', '2026-03-15 18:00:00',
        'Old pipeline removed. 120m section replaced.', 12.0),

    ('66666666-0000-0000-0000-000000000004',
        '55555555-0000-0000-0000-000000000002',
        '22222222-0000-0000-0000-000000000007',
        '22222222-0000-0000-0000-000000000004',
        'New Pipeline Installation and Testing',
        'Install new HDPE pipeline and perform pressure testing.',
        'EMERGENCY', 'COMPLETED', '2026-03-25 18:00:00',
        'New pipeline installed. Pressure test passed at 6 bar.', 16.0);



-- 9. Maintenance Logs

INSERT INTO maintenance_logs (wo_id, task_id, engineer_id, log_description, before_image_url, after_image_url) VALUES
    ('55555555-0000-0000-0000-000000000001',
        '66666666-0000-0000-0000-000000000001',
        '22222222-0000-0000-0000-000000000006',
        'Site inspection completed. 6 potholes identified and GPS tagged.',
        'https://storage.crims.gov/before/wo001-task1-before.jpg',
        'https://storage.crims.gov/after/wo001-task1-after.jpg'),

    ('55555555-0000-0000-0000-000000000002',
        '66666666-0000-0000-0000-000000000003',
        '22222222-0000-0000-0000-000000000007',
        'Old corroded pipeline excavated and removed safely. Area cordoned off.',
        'https://storage.crims.gov/before/wo002-task3-before.jpg',
        'https://storage.crims.gov/after/wo002-task3-after.jpg'),

    ('55555555-0000-0000-0000-000000000002',
        '66666666-0000-0000-0000-000000000004',
        '22222222-0000-0000-0000-000000000007',
        'New pipeline installed. Pressure test at 6 bar passed. Water supply restored.',
        'https://storage.crims.gov/before/wo002-task4-before.jpg',
        'https://storage.crims.gov/after/wo002-task4-after.jpg');



-- 10. QC Reviews
-- WO-2026-002 is PENDING_QC, so we insert a review then update qc_passed


INSERT INTO qc_reviews (wo_id, reviewed_by, is_approved, comments) VALUES
    ('55555555-0000-0000-0000-000000000002',
        '22222222-0000-0000-0000-000000000004',
        TRUE,
        'Pipeline installation verified. Pressure test results reviewed. Work certified.');

-- Now mark qc_passed = TRUE (trigger will validate the review above exists)
UPDATE work_orders
SET qc_passed = TRUE, status = 'COMPLETED'
WHERE wo_id = '55555555-0000-0000-0000-000000000002';



-- 11. Inspection Reports

INSERT INTO inspection_reports (infra_id, engineer_id, condition_rating, severity, description, location_tag, photo_url, wo_id) VALUES
    ('33333333-0000-0000-0000-000000000001',
        '22222222-0000-0000-0000-000000000006',
        2, 'SEVERE',
        'Multiple potholes on Anna Salai segment 4. Road surface deteriorating rapidly.',
        '13.0674, 80.2376',
        'https://storage.crims.gov/inspections/annasalai-seg4.jpg',
        '55555555-0000-0000-0000-000000000001'),

    ('33333333-0000-0000-0000-000000000002',
        '22222222-0000-0000-0000-000000000007',
        1, 'CRITICAL',
        'Pipeline severely corroded. Immediate replacement required.',
        '13.0418, 80.2341',
        'https://storage.crims.gov/inspections/tnagar-w7.jpg',
        '55555555-0000-0000-0000-000000000002'),

    ('33333333-0000-0000-0000-000000000003',
        '22222222-0000-0000-0000-000000000008',
        3, 'MODERATE',
        'Streetlight bulb fused. Pole structure intact. Simple replacement needed.',
        '13.0067, 80.2571',
        'https://storage.crims.gov/inspections/adyar-sl102.jpg',
        '55555555-0000-0000-0000-000000000003');



-- 12. Maintenance Schedules

INSERT INTO maintenance_schedules (infra_id, department_id, assigned_to, scheduled_by, title, description, frequency, scheduled_date, checklist_items) VALUES
    ('33333333-0000-0000-0000-000000000003',
        '11111111-0000-0000-0000-000000000003',
        '22222222-0000-0000-0000-000000000008',
        '22222222-0000-0000-0000-000000000005',
        'Monthly Streetlight Check - Adyar Zone',
        'Monthly inspection of all streetlights in Adyar zone.',
        'MONTHLY', '2026-04-01 08:00:00', 12),

    ('33333333-0000-0000-0000-000000000005',
        '11111111-0000-0000-0000-000000000002',
        '22222222-0000-0000-0000-000000000007',
        '22222222-0000-0000-0000-000000000004',
        'Quarterly Valve Inspection - Tambaram',
        'Quarterly check on all water valves in Tambaram area.',
        'QUARTERLY', '2026-04-15 09:00:00', 8),

    ('33333333-0000-0000-0000-000000000001',
        '11111111-0000-0000-0000-000000000001',
        '22222222-0000-0000-0000-000000000009',
        '22222222-0000-0000-0000-000000000003',
        'Annual Road Surface Inspection - Anna Salai',
        'Annual inspection of Anna Salai road surface condition.',
        'ANNUAL', '2026-12-01 08:00:00', 20);



-- 13. Sensor Deployments

INSERT INTO sensor_deployments (infra_id, deployed_by, sensor_type, location_tag, status, last_reading_at, notes) VALUES
    ('33333333-0000-0000-0000-000000000002',
        '22222222-0000-0000-0000-000000000007',
        'Water Flow Meter',
        '13.0418, 80.2341',
        'ACTIVE', CURRENT_TIMESTAMP,
        'Deployed after pipeline replacement. Monitoring flow rate.'),

    ('33333333-0000-0000-0000-000000000003',
        '22222222-0000-0000-0000-000000000008',
        'Electricity Consumption Meter',
        '13.0067, 80.2571',
        'ACTIVE', CURRENT_TIMESTAMP,
        'Smart meter installed on SL-102 for power usage tracking.'),

    ('33333333-0000-0000-0000-000000000005',
        '22222222-0000-0000-0000-000000000007',
        'Pressure Sensor',
        '12.9249, 80.1000',
        'FAULTY', NULL,
        'Sensor reporting erratic values. Scheduled for replacement.');



-- 14. Utilization Reviews

INSERT INTO utilization_reviews (budget_id, department_id, review_quarter, review_year, planned_amount, actual_spent, reviewed_by, notes) VALUES
    ('44444444-0000-0000-0000-000000000001',
        '11111111-0000-0000-0000-000000000001',
        'Q1', 2026, 200000.00, 185000.00,
        '22222222-0000-0000-0000-000000000001',
        'Slightly under budget. Material costs lower than estimated.'),

    ('44444444-0000-0000-0000-000000000002',
        '11111111-0000-0000-0000-000000000002',
        'Q1', 2026, 400000.00, 412000.00,
        '22222222-0000-0000-0000-000000000001',
        'Minor overrun due to emergency overtime labour costs.');



-- 15. Resource Requests

INSERT INTO resource_requests (wo_id, task_id, requested_by, resource_description, quantity, estimated_cost, status, reviewed_by, review_notes, reviewed_at) VALUES
    ('55555555-0000-0000-0000-000000000001',
        '66666666-0000-0000-0000-000000000002',
        '22222222-0000-0000-0000-000000000006',
        'Cold mix asphalt bags (25kg each)',
        50, 25000.00, 'APPROVED',
        '22222222-0000-0000-0000-000000000003',
        'Approved. Purchase order raised with Bharat Roads Pvt Ltd.',
        CURRENT_TIMESTAMP),

    ('55555555-0000-0000-0000-000000000001',
        '66666666-0000-0000-0000-000000000002',
        '22222222-0000-0000-0000-000000000006',
        'Road roller (half-day hire)',
        1, 8000.00, 'APPROVED',
        '22222222-0000-0000-0000-000000000003',
        'Approved. Equipment booked from city depot.',
        CURRENT_TIMESTAMP),

    ('55555555-0000-0000-0000-000000000002',
        '66666666-0000-0000-0000-000000000003',
        '22222222-0000-0000-0000-000000000007',
        'Portable water pump for drainage during excavation',
        2, 5000.00, 'FULFILLED',
        '22222222-0000-0000-0000-000000000004',
        'Pumps collected from store. Returned after use.',
        CURRENT_TIMESTAMP);



-- 16. Notifications

INSERT INTO notifications (recipient_id, sender_id, wo_id, task_id, notification_type, message) VALUES
    ('22222222-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000003',
        '55555555-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000001',
        'TASK_ASSIGNED', 'You have been assigned: Site Inspection and Measurement for WO-2026-001.'),

    ('22222222-0000-0000-0000-000000000003', NULL,
        '55555555-0000-0000-0000-000000000001', NULL,
        'WORK_ORDER_APPROVED', 'Work Order WO-2026-001 has been approved by the City Administrator.'),

    ('22222222-0000-0000-0000-000000000004', NULL,
        '55555555-0000-0000-0000-000000000002', NULL,
        'QC_PASSED', 'Work Order WO-2026-002 has passed QC review and is now marked COMPLETED.'),

    ('22222222-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000004',
        '55555555-0000-0000-0000-000000000003', NULL,
        'ESCALATION', 'WO-2026-003 has been pending Admin approval for 5 days. Immediate action required.'),

    ('22222222-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000004',
        '55555555-0000-0000-0000-000000000002', '66666666-0000-0000-0000-000000000003',
        'TASK_ASSIGNED', 'You have been assigned: Pipeline Excavation and Removal for WO-2026-002.');



-- END OF SEED DATA

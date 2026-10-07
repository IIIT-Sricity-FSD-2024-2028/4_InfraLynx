/**
 * TIMS In-Memory Database Engine
 * Zero-install, 100% in-memory relational database store.
 * Synchronized with Database-react/seed.sql and frontend-react mock datasets.
 */

import crypto from 'crypto';

// Initial Seed Data (Matches Database-react/seed.sql)
const SEED_DATA = {
  subscription_plans: [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      name: 'Enterprise Municipal Plan',
      price: 150000.0,
      billing_cycle: 'YEARLY',
      max_users: 100,
      max_departments: 15,
      features: ['3_WAY_RECONCILIATION', 'AMC_RATE_CARD_ENGINE', 'ESCALATION_MONITOR', 'EXECUTIVE_TELEMETRY'],
      created_at: new Date().toISOString(),
    },
  ],

  townships: [
    {
      id: 'b0000000-0000-0000-0000-000000000001',
      name: 'DLF CyberCity & Aralias Smart Township',
      address: 'Golf Course Road, Sector 54, Gurugram, Haryana - 122002',
      contact_email: 'coo@infralynx.com',
      contact_phone: '+91 124 498 3000',
      status: 'ACTIVE',
      subscription_plan_id: 'a0000000-0000-0000-0000-000000000001',
      created_at: new Date().toISOString(),
    },
  ],

  departments: [
    {
      id: 'd0000000-0000-0000-0000-000000000001',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      name: 'Civil Infrastructure & Roads',
      description: 'Arterial asphalt roads, stormwater drains, footpaths, and pedestrian walkways.',
      department_head_id: null,
      status: 'ACTIVE',
    },
    {
      id: 'd0000000-0000-0000-0000-000000000002',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      name: 'Electrical & Power Distribution',
      description: 'High-mast streetlighting, 11kV distribution substations, feeder pillars, and transformer networks.',
      department_head_id: '10000000-0000-0000-0000-000000000004',
      status: 'ACTIVE',
    },
    {
      id: 'd0000000-0000-0000-0000-000000000003',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      name: 'Water Supply & Drainage Sanitation',
      description: 'Potable drinking water networks, 150mm DI pipelines, sluice valves, and sewage treatment lines.',
      department_head_id: null,
      status: 'ACTIVE',
    },
    {
      id: 'd0000000-0000-0000-0000-000000000004',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      name: 'Horticulture & Urban Waste Management',
      description: 'Community green belts, central parks, solid waste segregation, and composting units.',
      department_head_id: null,
      status: 'ACTIVE',
    },
  ],

  contractors: [
    {
      id: 'c0000000-0000-0000-0000-000000000001',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      company_name: 'Larsen & Toubro Urban Infra Works Ltd.',
      contact_person: 'Rameshwar Nath Sharma',
      email: 'rn.sharma@lt-urbaninfra.co.in',
      phone: '+91 98110 45231',
      gstin: '06AAACL1234F1Z8',
      address: 'Tower B, DLF CyberPark, Sector 20, Gurugram, Haryana',
      status: 'ACTIVE',
      rating: 4.85,
    },
    {
      id: 'c0000000-0000-0000-0000-000000000002',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      company_name: 'Voltech Power & Electrical Systems Ltd.',
      contact_person: 'Vikram Singh Rathore',
      email: 'vikram.singh@voltechpower.in',
      phone: '+91 97230 11984',
      gstin: '06AABCV5678G1Z4',
      address: 'Suite 108, Power Plaza, Sector 18, Gurugram, Haryana',
      status: 'ACTIVE',
      rating: 4.92,
    },
    {
      id: 'c0000000-0000-0000-0000-000000000003',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      company_name: 'Kirloskar HydroTech & Water Systems Pvt. Ltd.',
      contact_person: 'Suresh Narayan Kulkarni',
      email: 'suresh.kulkarni@kirloskarhydro.in',
      phone: '+91 94220 33819',
      gstin: '06AACKK9012H1Z1',
      address: 'Plot 45, Udyog Vihar Phase 4, Gurugram, Haryana',
      status: 'ACTIVE',
      rating: 4.78,
    },
    {
      id: 'c0000000-0000-0000-0000-000000000004',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      company_name: 'Swachh Urban Environmental Solutions LLP',
      contact_person: 'Gurpreet Singh Sandhu',
      email: 'gurpreet@swachhurban.in',
      phone: '+91 98722 55431',
      gstin: '06AADCS3456J1Z9',
      address: 'Environmental Hub, Sector 34, Gurugram, Haryana',
      status: 'ACTIVE',
      rating: 4.65,
    },
  ],

  users: [
    {
      id: '10000000-0000-0000-0000-000000000001',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      name: 'Dr. Arvind Swaminathan',
      email: 'rwa@infralynx.com',
      username: 'rwa_rep',
      password_hash: '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', // Password@123
      role: 'RWA',
      department_id: null,
      contractor_id: null,
      sector: 'Sector 54',
      phone: '+91 98101 22345',
      status: 'ACTIVE',
    },
    {
      id: '10000000-0000-0000-0000-000000000002',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      name: 'Pooja Verma',
      email: 'clerk@infralynx.com',
      username: 'desk_clerk',
      password_hash: '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.',
      role: 'DESK_CLERK',
      department_id: 'd0000000-0000-0000-0000-000000000002',
      contractor_id: null,
      sector: 'Central Admin Block',
      phone: '+91 98712 34567',
      status: 'ACTIVE',
    },
    {
      id: '10000000-0000-0000-0000-000000000003',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      name: 'Vikram Singh Rathore',
      email: 'contractor@infralynx.com',
      username: 'contractor_lead',
      password_hash: '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.',
      role: 'FIELD_CONTRACTOR',
      department_id: null,
      contractor_id: 'c0000000-0000-0000-0000-000000000002',
      sector: null,
      phone: '+91 97230 11984',
      status: 'ACTIVE',
    },
    {
      id: '10000000-0000-0000-0000-000000000004',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      name: 'Er. Rajesh K. Sharma',
      email: 'head@infralynx.com',
      username: 'dept_head',
      password_hash: '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.',
      role: 'DEPARTMENT_HEAD',
      department_id: 'd0000000-0000-0000-0000-000000000002',
      contractor_id: null,
      sector: null,
      phone: '+91 99100 87654',
      status: 'ACTIVE',
    },
    {
      id: '10000000-0000-0000-0000-000000000005',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      name: 'Sunil Agrawal, CA',
      email: 'finance@infralynx.com',
      username: 'finance_clerk',
      password_hash: '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.',
      role: 'FINANCE_CLERK',
      department_id: null,
      contractor_id: null,
      sector: 'Finance Block A',
      phone: '+91 98188 76543',
      status: 'ACTIVE',
    },
    {
      id: '10000000-0000-0000-0000-000000000006',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      name: 'Col. (Retd.) Sanjeev Dewan',
      email: 'coo@infralynx.com',
      username: 'township_coo',
      password_hash: '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.',
      role: 'TOWNSHIP_COO',
      department_id: null,
      contractor_id: null,
      sector: 'Executive Tower',
      phone: '+91 98111 99887',
      status: 'ACTIVE',
    },
    {
      id: '10000000-0000-0000-0000-000000000007',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      name: 'Anjali Gupta',
      email: 'anjali.gupta@infralynx.com',
      username: 'clerk_anjali',
      password_hash: '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.',
      role: 'DESK_CLERK',
      department_id: 'd0000000-0000-0000-0000-000000000001',
      contractor_id: null,
      sector: 'Sector 54',
      phone: '+91 98733 44556',
      status: 'ACTIVE',
    },
  ],

  slas: [
    { id: '1', township_id: 'b0000000-0000-0000-0000-000000000001', severity: 'EMERGENCY', response_time_hours: 2, resolution_time_hours: 6 },
    { id: '2', township_id: 'b0000000-0000-0000-0000-000000000001', severity: 'HIGH', response_time_hours: 6, resolution_time_hours: 24 },
    { id: '3', township_id: 'b0000000-0000-0000-0000-000000000001', severity: 'MEDIUM', response_time_hours: 12, resolution_time_hours: 48 },
    { id: '4', township_id: 'b0000000-0000-0000-0000-000000000001', severity: 'LOW', response_time_hours: 24, resolution_time_hours: 72 },
  ],

  amcs: [
    {
      id: '20000000-0000-0000-0000-000000000001',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      contractor_id: 'c0000000-0000-0000-0000-000000000002',
      contract_number: 'AMC-ELE-2025-03',
      department_id: 'd0000000-0000-0000-0000-000000000002',
      title: 'Annual Streetlight, Feeder Pillars & High-Mast Power AMC 2025–26',
      start_date: '2025-04-01',
      end_date: '2026-03-31',
      status: 'ACTIVE',
    },
    {
      id: '20000000-0000-0000-0000-000000000002',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      contractor_id: 'c0000000-0000-0000-0000-000000000001',
      contract_number: 'AMC-CIV-2025-08',
      department_id: 'd0000000-0000-0000-0000-000000000001',
      title: 'Annual Arterial Bitumen Road, Pothole & Storm Drain AMC 2025–26',
      start_date: '2025-04-01',
      end_date: '2026-03-31',
      status: 'ACTIVE',
    },
    {
      id: '20000000-0000-0000-0000-000000000003',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      contractor_id: 'c0000000-0000-0000-0000-000000000003',
      contract_number: 'AMC-WTR-2025-11',
      department_id: 'd0000000-0000-0000-0000-000000000003',
      title: 'Annual Potable Water Network, Sluice Valves & STP Drainage AMC 2025–26',
      start_date: '2025-04-01',
      end_date: '2026-03-31',
      status: 'ACTIVE',
    },
    {
      id: '20000000-0000-0000-0000-000000000004',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      contractor_id: 'c0000000-0000-0000-0000-000000000004',
      contract_number: 'AMC-SAN-2025-18',
      department_id: 'd0000000-0000-0000-0000-000000000004',
      title: 'Annual Horticulture Trimming, Green Waste Shredding & Sanitation AMC 2025–26',
      start_date: '2025-04-01',
      end_date: '2026-03-31',
      status: 'ACTIVE',
    },
  ],

  amc_rates: [
    { id: '1', amc_id: '20000000-0000-0000-0000-000000000001', item_code: 'RATE-01', item_name: 'Senior Electrical Technician / Wireman', service_type: 'Labour', unit: 'Hour', rate: 500.0 },
    { id: '2', amc_id: '20000000-0000-0000-0000-000000000001', item_code: 'RATE-02', item_name: 'General Labour (Semi-Skilled / Safety Assist)', service_type: 'Labour', unit: 'Hour', rate: 300.0 },
    { id: '3', amc_id: '20000000-0000-0000-0000-000000000001', item_code: 'RATE-03', item_name: 'Armoured 3-Core Copper Cable 16 sq.mm', service_type: 'Material & Service', unit: 'Meter', rate: 150.0 },
    { id: '4', amc_id: '20000000-0000-0000-0000-000000000001', item_code: 'RATE-06', item_name: 'Streetlight 120W LED Luminaire & Surge Driver Replacement', service_type: 'Hardware', unit: 'Unit', rate: 1800.0 },
    { id: '5', amc_id: '20000000-0000-0000-0000-000000000002', item_code: 'RATE-05', item_name: 'Bitumen Cold-Mix Asphalt Pothole Repair', service_type: 'Civil Works', unit: 'Sq.Meter', rate: 1200.0 },
    { id: '6', amc_id: '20000000-0000-0000-0000-000000000002', item_code: 'RATE-08', item_name: 'Pre-Cast RCC Manhole Chamber Cover (600mm Circular)', service_type: 'Civil Works', unit: 'Unit', rate: 3200.0 },
    { id: '7', amc_id: '20000000-0000-0000-0000-000000000002', item_code: 'RATE-09', item_name: 'Super-Sucker Mechanical Stormwater Drain Desilting', service_type: 'Sanitation', unit: 'Meter', rate: 450.0 },
    { id: '8', amc_id: '20000000-0000-0000-0000-000000000003', item_code: 'RATE-04', item_name: 'Pipe Repair & DI Pipeline Fitting (100mm/150mm)', service_type: 'Plumbing Works', unit: 'Unit', rate: 800.0 },
    { id: '9', amc_id: '20000000-0000-0000-0000-000000000003', item_code: 'RATE-07', item_name: 'Heavy-Duty Cast Iron Sluice Valve Overhaul (150mm)', service_type: 'Plumbing Works', unit: 'Unit', rate: 2500.0 },
    { id: '10', amc_id: '20000000-0000-0000-0000-000000000003', item_code: 'RATE-10', item_name: 'Submersible Hydro-Pneumatic Pump Overhaul (15 HP)', service_type: 'Plumbing Works', unit: 'Unit', rate: 4800.0 },
    { id: '11', amc_id: '20000000-0000-0000-0000-000000000004', item_code: 'RATE-11', item_name: 'Hydraulic Crane Mechanical Tree Pruning & Power Clearance', service_type: 'Horticulture Works', unit: 'Hour', rate: 1500.0 },
    { id: '12', amc_id: '20000000-0000-0000-0000-000000000004', item_code: 'RATE-12', item_name: 'Mechanized Green Waste Shredding & Solid Waste Disposal', service_type: 'Waste Management', unit: 'Metric Tonne', rate: 2200.0 },
  ],

  complaints: [
    {
      id: 'e0000000-0000-0000-0000-000000000001',
      complaint_code: 'CMP-2026-0101',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      reported_by: '10000000-0000-0000-0000-000000000001',
      department_id: 'd0000000-0000-0000-0000-000000000002',
      category: 'Electrical',
      subcategory: 'Streetlight Failure',
      title: 'High-Mast Streetlight Failure at Main Sector 54 Junction',
      description: 'High-mast LED cluster completely unlit since evening peak hours, creating severe hazard for evening commuter traffic.',
      severity: 'HIGH',
      sector: 'Sector 54',
      block: 'Block B',
      street: 'Gulmohar Marg',
      location_details: 'Near Central Roundabout Fountain',
      latitude: 28.5355,
      longitude: 77.3910,
      status: 'PENDING_VERIFICATION',
      created_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
      history: [
        { stage: 'REPORTED', timestamp: new Date(Date.now() - 72 * 3600 * 1000).toISOString(), actor: 'Dr. Arvind Swaminathan (RWA)', note: 'High-mast outage reported.' },
        { stage: 'VALIDATED', timestamp: new Date(Date.now() - 68 * 3600 * 1000).toISOString(), actor: 'Pooja Verma (DESK_CLERK)', note: 'Issue validated.' },
        { stage: 'ASSIGNED', timestamp: new Date(Date.now() - 65 * 3600 * 1000).toISOString(), actor: 'Er. Rajesh K. Sharma (DEPT_HEAD)', note: 'Assigned to Voltech Power.' },
        { stage: 'IN_PROGRESS', timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(), actor: 'Vikram Singh Rathore (CONTRACTOR)', note: 'Cable and driver replacement underway.' },
        { stage: 'PENDING_VERIFICATION', timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), actor: 'Vikram Singh Rathore (CONTRACTOR)', note: 'Driver & cable replaced. Awaiting citizen confirmation.' },
      ],
    },
    {
      id: 'e0000000-0000-0000-0000-000000000002',
      complaint_code: 'CMP-2026-0102',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      reported_by: '10000000-0000-0000-0000-000000000001',
      department_id: 'd0000000-0000-0000-0000-000000000003',
      category: 'Water',
      subcategory: 'Pipeline Burst',
      title: '150mm DI Drinking Water Main Line Burst outside Tower 7',
      description: 'Underground pressurized potable pipeline ruptured. Fresh water gushing out onto road with severe pressure loss in Towers 6 to 9.',
      severity: 'EMERGENCY',
      sector: 'Sector 54',
      block: 'Block C',
      street: 'Palm Avenue',
      location_details: 'Outside Aralias Tower 7 Gate',
      latitude: 28.5362,
      longitude: 77.3925,
      status: 'PENDING_VERIFICATION',
      created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      history: [
        { stage: 'REPORTED', timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(), actor: 'Dr. Arvind Swaminathan (RWA)', note: 'Emergency water burst reported.' },
        { stage: 'IN_PROGRESS', timestamp: new Date(Date.now() - 40 * 3600 * 1000).toISOString(), actor: 'Suresh Kulkarni (CONTRACTOR)', note: 'Excavation & clamp fitting in progress.' },
        { stage: 'PENDING_VERIFICATION', timestamp: new Date(Date.now() - 10 * 3600 * 1000).toISOString(), actor: 'Suresh Kulkarni (CONTRACTOR)', note: 'Sluice valve overhauled & pressure tested.' },
      ],
    },
    {
      id: 'e0000000-0000-0000-0000-000000000003',
      complaint_code: 'CMP-2026-0103',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      reported_by: '10000000-0000-0000-0000-000000000001',
      department_id: 'd0000000-0000-0000-0000-000000000001',
      category: 'Civil',
      subcategory: 'Road Damage',
      title: 'Deep Asphalt Potholes on Main Sector Spine Road near Gate 2',
      description: 'Severe 4-inch deep potholes covering 15 sq.m asphalt surface following heavy monsoon showers; damaging resident vehicles.',
      severity: 'HIGH',
      sector: 'Sector 54',
      block: 'Block A',
      street: 'Arterial Spine Road',
      location_details: 'Between Gate 1 and Gate 2 Security Checkpost',
      latitude: 28.5348,
      longitude: 77.3895,
      status: 'IN_PROGRESS',
      created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
      history: [
        { stage: 'REPORTED', timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(), actor: 'Dr. Arvind Swaminathan (RWA)', note: 'Multiple vehicle damage incidents.' },
        { stage: 'IN_PROGRESS', timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(), actor: 'L&T Urban Infra', note: 'Bitumen cold-mix paver machinery mobilized.' },
      ],
    },
    {
      id: 'e0000000-0000-0000-0000-000000000004',
      complaint_code: 'CMP-2026-0104',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      reported_by: '10000000-0000-0000-0000-000000000001',
      department_id: 'd0000000-0000-0000-0000-000000000002',
      category: 'Electrical',
      subcategory: 'Distribution Failure',
      title: '11kV Transformer Substation Feeder Cable Ground Fault & Sparking',
      description: 'Underground armoured XLPE cable sparking intermittently with smoke emission near the main transformer isolator switch.',
      severity: 'EMERGENCY',
      sector: 'Sector 54',
      block: 'Block C',
      street: 'Substation Road',
      location_details: 'Feeder Substation 12B Yard behind Community Hall',
      latitude: 28.5372,
      longitude: 77.3945,
      status: 'VALIDATED',
      created_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
      history: [
        { stage: 'REPORTED', timestamp: new Date(Date.now() - 20 * 3600 * 1000).toISOString(), actor: 'Dr. Arvind Swaminathan (RWA)', note: 'Emergency electrical hazard.' },
        { stage: 'VALIDATED', timestamp: new Date(Date.now() - 18 * 3600 * 1000).toISOString(), actor: 'Pooja Verma (DESK_CLERK)', note: 'Validated and marked for urgent estimate.' },
      ],
    },
    {
      id: 'e0000000-0000-0000-0000-000000000005',
      complaint_code: 'CMP-2026-0105',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      reported_by: '10000000-0000-0000-0000-000000000001',
      department_id: 'd0000000-0000-0000-0000-000000000001',
      category: 'Civil',
      subcategory: 'Drainage Overflow',
      title: 'Stormwater Drain Silt Blockage & Monsoon Overflow near Market Complex',
      description: 'Covered RCC stormwater drain choked with debris, causing foul water to back up into commercial plaza parking entrance.',
      severity: 'MEDIUM',
      sector: 'Sector 54',
      block: 'Block D',
      street: 'Commercial Galleria Lane',
      location_details: 'Opposite HDFC Bank ATM',
      latitude: 28.5380,
      longitude: 77.3960,
      status: 'PENDING_VERIFICATION',
      created_at: new Date(Date.now() - 50 * 3600 * 1000).toISOString(),
      history: [
        { stage: 'REPORTED', timestamp: new Date(Date.now() - 50 * 3600 * 1000).toISOString(), actor: 'Dr. Arvind Swaminathan (RWA)', note: 'Market entrance flooded.' },
        { stage: 'COMPLETED', timestamp: new Date(Date.now() - 14 * 3600 * 1000).toISOString(), actor: 'L&T Urban Infra', note: 'Desilting executed.' },
      ],
    },
    {
      id: 'e0000000-0000-0000-0000-000000000006',
      complaint_code: 'CMP-2026-0106',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      reported_by: '10000000-0000-0000-0000-000000000001',
      department_id: 'd0000000-0000-0000-0000-000000000001',
      category: 'Civil',
      subcategory: 'Footpath Hazard',
      title: 'Broken Heavy-Duty RCC Manhole Cover on Primary Pedestrian Walkway',
      description: '600mm circular manhole lid cracked in half and displaced into pit, presenting immediate fall hazard for morning walkers and children.',
      severity: 'HIGH',
      sector: 'Sector 54',
      block: 'Block B',
      street: 'Amaltas Enclave Walkway',
      location_details: 'Adjacent to Children Play Park',
      latitude: 28.5358,
      longitude: 77.3915,
      status: 'VALIDATED',
      created_at: new Date(Date.now() - 15 * 3600 * 1000).toISOString(),
      history: [
        { stage: 'REPORTED', timestamp: new Date(Date.now() - 15 * 3600 * 1000).toISOString(), actor: 'Dr. Arvind Swaminathan (RWA)', note: 'Pedestrian hazard logged.' },
        { stage: 'VALIDATED', timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(), actor: 'Pooja Verma (DESK_CLERK)', note: 'Validated. Queued for replacement order.' },
      ],
    },
    {
      id: 'e0000000-0000-0000-0000-000000000007',
      complaint_code: 'CMP-2026-0107',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      reported_by: '10000000-0000-0000-0000-000000000001',
      department_id: 'd0000000-0000-0000-0000-000000000003',
      category: 'Water',
      subcategory: 'Overhead Tank Leak',
      title: 'Overhead Potable Water Tank Float Valve Failure causing Continuous Overflow',
      description: 'Mechanical float switch broken; 50,000-litre overhead RCC tank overflowing onto roof slab and cascading into central atrium courtyard.',
      severity: 'MEDIUM',
      sector: 'Sector 54',
      block: 'Block A',
      street: 'Clubhouse Drive',
      location_details: 'Main Community Center Utility Roof',
      latitude: 28.5342,
      longitude: 77.3888,
      status: 'REPORTED',
      created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      history: [
        { stage: 'REPORTED', timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(), actor: 'Dr. Arvind Swaminathan (RWA)', note: 'Continuous water wastage reported.' },
      ],
    },
    {
      id: 'e0000000-0000-0000-0000-000000000008',
      complaint_code: 'CMP-2026-0108',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      reported_by: '10000000-0000-0000-0000-000000000001',
      department_id: 'd0000000-0000-0000-0000-000000000001',
      category: 'Civil',
      subcategory: 'Waterlogging',
      title: 'Severe Waterlogging & Drain Choking near Market Complex Galleria Gate',
      description: 'Stagnant water accumulation near commercial gate due to drain overflow.',
      severity: 'MEDIUM',
      sector: 'Sector 54',
      block: 'Block D',
      street: 'Commercial Galleria Lane',
      location_details: 'Galleria North Gate (35m from CMP-2026-0105)',
      latitude: 28.5382,
      longitude: 77.3963,
      status: 'UNDER_REVIEW',
      created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      history: [
        { stage: 'REPORTED', timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(), actor: 'Dr. Arvind Swaminathan (RWA)', note: 'Market drainage issue logged.' },
        { stage: 'UNDER_REVIEW', timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), actor: 'Pooja Verma (DESK_CLERK)', note: 'Flagged for duplicate analysis (35m proximity).' },
      ],
    },
  ],

  work_orders: [
    {
      id: '40000000-0000-0000-0000-000000000001',
      work_order_number: 'WO-2026-088',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      complaint_id: 'e0000000-0000-0000-0000-000000000001',
      department_id: 'd0000000-0000-0000-0000-000000000002',
      contractor_id: 'c0000000-0000-0000-0000-000000000002',
      assigned_by: '10000000-0000-0000-0000-000000000002',
      priority: 'HIGH',
      estimated_cost: 3400.0,
      actual_cost: 3400.0,
      status: 'COMPLETED',
      created_at: new Date(Date.now() - 65 * 3600 * 1000).toISOString(),
    },
    {
      id: '40000000-0000-0000-0000-000000000002',
      work_order_number: 'WO-2026-089',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      complaint_id: 'e0000000-0000-0000-0000-000000000002',
      department_id: 'd0000000-0000-0000-0000-000000000003',
      contractor_id: 'c0000000-0000-0000-0000-000000000003',
      assigned_by: '10000000-0000-0000-0000-000000000002',
      priority: 'EMERGENCY',
      estimated_cost: 6600.0,
      actual_cost: 6600.0,
      status: 'COMPLETED',
      created_at: new Date(Date.now() - 44 * 3600 * 1000).toISOString(),
    },
    {
      id: '40000000-0000-0000-0000-000000000003',
      work_order_number: 'WO-2026-087',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      complaint_id: 'e0000000-0000-0000-0000-000000000003',
      department_id: 'd0000000-0000-0000-0000-000000000001',
      contractor_id: 'c0000000-0000-0000-0000-000000000001',
      assigned_by: '10000000-0000-0000-0000-000000000002',
      priority: 'HIGH',
      estimated_cost: 18000.0,
      actual_cost: null,
      status: 'IN_PROGRESS',
      created_at: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
    },
    {
      id: '40000000-0000-0000-0000-000000000004',
      work_order_number: 'WO-2026-090',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      complaint_id: 'e0000000-0000-0000-0000-000000000004',
      department_id: 'd0000000-0000-0000-0000-000000000002',
      contractor_id: 'c0000000-0000-0000-0000-000000000002',
      assigned_by: '10000000-0000-0000-0000-000000000002',
      priority: 'EMERGENCY',
      estimated_cost: 14200.0,
      actual_cost: null,
      status: 'ASSIGNED',
      created_at: new Date(Date.now() - 16 * 3600 * 1000).toISOString(),
    },
    {
      id: '40000000-0000-0000-0000-000000000005',
      work_order_number: 'WO-2026-091',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      complaint_id: 'e0000000-0000-0000-0000-000000000005',
      department_id: 'd0000000-0000-0000-0000-000000000001',
      contractor_id: 'c0000000-0000-0000-0000-000000000001',
      assigned_by: '10000000-0000-0000-0000-000000000002',
      priority: 'MEDIUM',
      estimated_cost: 18000.0,
      actual_cost: 22800.0,
      status: 'COMPLETED',
      created_at: new Date(Date.now() - 40 * 3600 * 1000).toISOString(),
    },
  ],

  invoices: [
    {
      id: '50000000-0000-0000-0000-000000000001',
      invoice_code: 'INV-2026-088',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      contractor_id: 'c0000000-0000-0000-0000-000000000002',
      work_order_id: '40000000-0000-0000-0000-000000000001',
      invoice_number: 'VT-INV/2026/041',
      invoice_date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
      subtotal: 3400.0,
      tax: 0.0,
      total_amount: 3400.0,
      approved_estimate_amount: 3400.0,
      variance_amount: 0.0,
      rate_card_match: true,
      variance_reason: null,
      status: 'PAID',
      authorized_by: '10000000-0000-0000-0000-000000000005',
      authorized_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: '50000000-0000-0000-0000-000000000002',
      invoice_code: 'INV-2026-079',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      contractor_id: 'c0000000-0000-0000-0000-000000000003',
      work_order_id: '40000000-0000-0000-0000-000000000002',
      invoice_number: 'KIRL-INV/2026/019',
      invoice_date: new Date(Date.now() - 24 * 3600 * 1000).toISOString().split('T')[0],
      subtotal: 6600.0,
      tax: 0.0,
      total_amount: 6600.0,
      approved_estimate_amount: 6600.0,
      variance_amount: 0.0,
      rate_card_match: true,
      variance_reason: null,
      status: 'AUTHORIZED',
      authorized_by: '10000000-0000-0000-0000-000000000005',
      authorized_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    },
    {
      id: '50000000-0000-0000-0000-000000000003',
      invoice_code: 'INV-2026-084',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      contractor_id: 'c0000000-0000-0000-0000-000000000001',
      work_order_id: '40000000-0000-0000-0000-000000000005',
      invoice_number: 'LNT-INV/2026/102',
      invoice_date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
      subtotal: 22800.0,
      tax: 0.0,
      total_amount: 22800.0,
      approved_estimate_amount: 18000.0,
      variance_amount: 4800.0,
      rate_card_match: false,
      variance_reason: 'Billed 16 sq.m asphalt filling vs. approved 12 sq.m estimate (+33% quantity increase without prior Dept Head addendum approval).',
      status: 'VARIANCE_FLAGGED',
      authorized_by: null,
      authorized_at: null,
      created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: '50000000-0000-0000-0000-000000000004',
      invoice_code: 'INV-2026-090',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      contractor_id: 'c0000000-0000-0000-0000-000000000002',
      work_order_id: '40000000-0000-0000-0000-000000000004',
      invoice_number: 'VT-INV/2026/055',
      invoice_date: new Date().toISOString().split('T')[0],
      subtotal: 14200.0,
      tax: 0.0,
      total_amount: 14200.0,
      approved_estimate_amount: 14200.0,
      variance_amount: 0.0,
      rate_card_match: true,
      variance_reason: null,
      status: 'PENDING_AUDIT',
      authorized_by: null,
      authorized_at: null,
      created_at: new Date().toISOString(),
    },
  ],

  invoice_items: [
    // INV-2026-088 Items (Total: ₹3,400)
    {
      id: '60000000-0000-0000-0000-000000000001',
      invoice_id: '50000000-0000-0000-0000-000000000001',
      description: 'Senior Electrical Technician / Wireman',
      unit: 'Hour',
      quantity: 2,
      rate: 500.0,
      amount: 1000.0,
    },
    {
      id: '60000000-0000-0000-0000-000000000002',
      invoice_id: '50000000-0000-0000-0000-000000000001',
      description: 'General Labour (Semi-Skilled / Safety Assist)',
      unit: 'Hour',
      quantity: 3,
      rate: 300.0,
      amount: 900.0,
    },
    {
      id: '60000000-0000-0000-0000-000000000003',
      invoice_id: '50000000-0000-0000-0000-000000000001',
      description: 'Armoured 3-Core Copper Cable 16 sq.mm',
      unit: 'Meter',
      quantity: 10,
      rate: 150.0,
      amount: 1500.0,
    },

    // INV-2026-079 Items (Total: ₹6,600)
    {
      id: '60000000-0000-0000-0000-000000000004',
      invoice_id: '50000000-0000-0000-0000-000000000002',
      description: 'Heavy-Duty Cast Iron Sluice Valve Overhaul (150mm)',
      unit: 'Unit',
      quantity: 2,
      rate: 2500.0,
      amount: 5000.0,
    },
    {
      id: '60000000-0000-0000-0000-000000000005',
      invoice_id: '50000000-0000-0000-0000-000000000002',
      description: 'Pipe Repair & DI Pipeline Fitting (100mm/150mm)',
      unit: 'Unit',
      quantity: 2,
      rate: 800.0,
      amount: 1600.0,
    },

    // INV-2026-084 Items (Total: ₹22,800)
    {
      id: '60000000-0000-0000-0000-000000000006',
      invoice_id: '50000000-0000-0000-0000-000000000003',
      description: 'Bitumen Cold-Mix Asphalt Pothole Repair',
      unit: 'Sq.Meter',
      quantity: 16,
      rate: 1200.0,
      amount: 19200.0,
    },
    {
      id: '60000000-0000-0000-0000-000000000007',
      invoice_id: '50000000-0000-0000-0000-000000000003',
      description: 'General Labour (Semi-Skilled / Safety Assist)',
      unit: 'Hour',
      quantity: 12,
      rate: 300.0,
      amount: 3600.0,
    },
  ],

  payments: [
    {
      id: '70000000-0000-0000-0000-000000000001',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      invoice_id: '50000000-0000-0000-0000-000000000001',
      contractor_id: 'c0000000-0000-0000-0000-000000000002',
      amount: 3400.0,
      status: 'DISBURSED',
      payment_mode: 'RTGS / Township Escrow',
      payment_reference: 'UTR-HDFC-9928192831',
      paid_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    },
  ],

  complaint_evidence: [
    {
      id: 'ev-001',
      complaint_id: 'e0000000-0000-0000-0000-000000000001',
      evidence_type: 'BEFORE',
      file_url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80',
      caption: 'Initial dark street junction photo at Sector 54 fountain roundabout',
      uploaded_by: '10000000-0000-0000-0000-000000000001',
      created_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    },
    {
      id: 'ev-002',
      complaint_id: 'e0000000-0000-0000-0000-000000000001',
      evidence_type: 'AFTER',
      file_url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80',
      caption: 'Luminaire replaced and illuminated, lux levels confirmed',
      uploaded_by: '10000000-0000-0000-0000-000000000003',
      created_at: new Date(Date.now() - 40 * 3600 * 1000).toISOString(),
    },
    {
      id: 'ev-003',
      complaint_id: 'e0000000-0000-0000-0000-000000000002',
      evidence_type: 'BEFORE',
      file_url: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=800&q=80',
      caption: 'Pipeline rupture flooding Palm Avenue outside Tower 7',
      uploaded_by: '10000000-0000-0000-0000-000000000001',
      created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    },
    {
      id: 'ev-004',
      complaint_id: 'e0000000-0000-0000-0000-000000000002',
      evidence_type: 'AFTER',
      file_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
      caption: 'New 150mm DI pipe spliced, valve overhauled, zero leakage',
      uploaded_by: '10000000-0000-0000-0000-000000000003',
      created_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    },
  ],

  audit_logs: [
    {
      id: 'aud-001',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      entity_type: 'COMPLAINT',
      entity_id: 'e0000000-0000-0000-0000-000000000001',
      actor_id: '10000000-0000-0000-0000-000000000001',
      actor_role: 'RWA',
      action: 'REPORTED',
      from_state: null,
      to_state: 'REPORTED',
      notes: 'Initial issue reported by Dr. Arvind Swaminathan.',
      timestamp: new Date().toISOString(),
    },
  ],
};

// In-Memory mutable tables initialized from seed
class InMemoryStore {
  constructor() {
    this.reset();
  }

  reset() {
    this.tables = JSON.parse(JSON.stringify(SEED_DATA));
  }

  getTable(name) {
    if (!this.tables[name]) {
      this.tables[name] = [];
    }
    return this.tables[name];
  }

  find(tableName, predicate = () => true) {
    const table = this.getTable(tableName);
    return table.filter(predicate);
  }

  findAll(tableName, predicate = () => true) {
    return this.find(tableName, predicate);
  }

  findOne(tableName, predicate) {
    const table = this.getTable(tableName);
    return table.find(predicate) || null;
  }

  findById(tableName, id) {
    const table = this.getTable(tableName);
    return table.find((row) => row.id === id || row.complaint_code === id) || null;
  }

  insert(tableName, record) {
    const table = this.getTable(tableName);
    const item = {
      id: record.id || crypto.randomUUID(),
      created_at: record.created_at || new Date().toISOString(),
      ...record,
    };
    table.unshift(item);
    return item;
  }

  update(tableName, id, updates) {
    const table = this.getTable(tableName);
    const index = table.findIndex((row) => row.id === id || row.complaint_code === id);
    if (index === -1) return null;
    table[index] = {
      ...table[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return table[index];
  }

  delete(tableName, id) {
    const table = this.getTable(tableName);
    const index = table.findIndex((row) => row.id === id || row.complaint_code === id);
    if (index === -1) return false;
    table.splice(index, 1);
    return true;
  }

  logAudit({ township_id, entity_type, entity_id, actor_id, actor_role, action, from_state, to_state, notes }) {
    return this.insert('audit_logs', {
      township_id,
      entity_type,
      entity_id,
      actor_id,
      actor_role,
      action,
      from_state,
      to_state,
      notes,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Universal In-Memory Query Engine
   * Executes parameterized queries against in-memory JavaScript objects
   */
  async query(text, params = []) {
    const cleanSql = text.trim();
    const lowerSql = cleanSql.toLowerCase();

    // 1. SELECT user by email or username (Auth Login)
    if (lowerSql.includes('from users') && (lowerSql.includes('lower(u.email) = lower($1)') || lowerSql.includes('lower(u.username)'))) {
      const identifier = (params[0] || '').toLowerCase().trim();
      const user = this.tables.users.find(
        (u) => (u.email && u.email.toLowerCase() === identifier) || (u.username && u.username.toLowerCase() === identifier)
      );

      if (!user) return { rows: [], rowCount: 0 };

      const township = this.tables.townships.find((t) => t.id === user.township_id);
      const dept = this.tables.departments.find((d) => d.id === user.department_id);
      const contractor = this.tables.contractors.find((c) => c.id === user.contractor_id);

      const fullUser = {
        ...user,
        township_name: township ? township.name : 'DLF CyberCity & Aralias Smart Township',
        department_name: dept ? dept.name : null,
        contractor_name: contractor ? contractor.company_name : null,
      };

      return { rows: [fullUser], rowCount: 1 };
    }

    // 2. SELECT user by ID (Auth Middleware /me)
    if (lowerSql.includes('from users') && (lowerSql.includes('where u.id = $1') || lowerSql.includes('where id = $1'))) {
      const userId = params[0];
      const user = this.tables.users.find((u) => u.id === userId);

      if (!user) return { rows: [], rowCount: 0 };

      const township = this.tables.townships.find((t) => t.id === user.township_id);
      const dept = this.tables.departments.find((d) => d.id === user.department_id);
      const contractor = this.tables.contractors.find((c) => c.id === user.contractor_id);

      const fullUser = {
        ...user,
        township_name: township ? township.name : 'DLF CyberCity & Aralias Smart Township',
        department_name: dept ? dept.name : null,
        contractor_name: contractor ? contractor.company_name : null,
      };

      return { rows: [fullUser], rowCount: 1 };
    }

    // 3. UPDATE users SET last_login_at
    if (lowerSql.startsWith('update users') && lowerSql.includes('last_login_at')) {
      const userId = params[0];
      const user = this.tables.users.find((u) => u.id === userId);
      if (user) {
        user.last_login_at = new Date().toISOString();
        return { rowCount: 1, rows: [user] };
      }
      return { rowCount: 0, rows: [] };
    }

    // 4. Generic SELECT * FROM <table>
    for (const tableName of Object.keys(this.tables)) {
      if (lowerSql.startsWith(`select * from ${tableName}`) || lowerSql.startsWith(`select * from ${tableName};`)) {
        const rows = this.tables[tableName];
        return { rows, rowCount: rows.length };
      }
    }

    // 5. Connection check / SELECT NOW()
    if (lowerSql.includes('select now()') || lowerSql.includes('current_database()')) {
      return {
        rows: [{ current_time: new Date().toISOString(), db_name: 'tims_db (In-Memory RAM)' }],
        rowCount: 1,
      };
    }

    // 6. Generic INSERT INTO <table>
    const insertMatch = cleanSql.match(/insert\s+into\s+([a-zA-Z0-9_]+)/i);
    if (insertMatch) {
      const tableName = insertMatch[1].toLowerCase();
      const table = this.getTable(tableName);
      const newRecord = { id: crypto.randomUUID(), created_at: new Date().toISOString() };
      table.push(newRecord);
      return { rowCount: 1, rows: [newRecord] };
    }

    // Fallback default response
    return { rows: [], rowCount: 0 };
  }

  async withTransaction(callback) {
    return await callback({ query: this.query.bind(this) });
  }

  async testConnection() {
    return true;
  }
}

export const inMemoryDb = new InMemoryStore();
export default inMemoryDb;

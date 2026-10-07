/**
 * TIMS In-Memory Database Engine
 * Zero-install, 100% in-memory relational database store.
 * Allows all 5 team members to run and test the complete backend without installing PostgreSQL.
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
      name: 'Greenfield Smart Township',
      address: 'Sector 1–12 Arterial Belt, NCR Region, India',
      contact_email: 'coo@infralynx.com',
      contact_phone: '+91 11 4982 3000',
      status: 'ACTIVE',
      subscription_plan_id: 'a0000000-0000-0000-0000-000000000001',
      created_at: new Date().toISOString(),
    },
  ],

  departments: [
    {
      id: 'd0000000-0000-0000-0000-000000000001',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      name: 'Civil Infrastructure',
      description: 'Roads, stormwater drains, footpaths, and public masonry structures.',
      department_head_id: null,
      status: 'ACTIVE',
    },
    {
      id: 'd0000000-0000-0000-0000-000000000002',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      name: 'Electrical & Power Systems',
      description: 'Street lighting, sub-stations, feeder pillars, and transformer networks.',
      department_head_id: '10000000-0000-0000-0000-000000000004',
      status: 'ACTIVE',
    },
    {
      id: 'd0000000-0000-0000-0000-000000000003',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      name: 'Water & Sanitation',
      description: 'Overhead tanks, underground potable supply, valves, and sewage mains.',
      department_head_id: null,
      status: 'ACTIVE',
    },
  ],

  contractors: [
    {
      id: 'c0000000-0000-0000-0000-000000000001',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      company_name: 'Apex Infraworks Ltd.',
      contact_person: 'Rajesh Verma',
      email: 'contractor@infralynx.com',
      phone: '+91 98112 45012',
      gstin: '07BBBBB1111B1Z2',
      address: 'Plot 42, Industrial Area Phase 1',
      status: 'ACTIVE',
    },
    {
      id: 'c0000000-0000-0000-0000-000000000002',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      company_name: 'Voltech Power & Lights',
      contact_person: 'Vikram Singh',
      email: 'voltech@infralynx.com',
      phone: '+91 97230 11984',
      gstin: '07AAAAA0000A1Z5',
      address: 'Suite 108, Power Plaza, Sector 18',
      status: 'ACTIVE',
    },
    {
      id: 'c0000000-0000-0000-0000-000000000003',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      company_name: 'AquaFlow Utilities Corp',
      contact_person: 'Anil Deshmukh',
      email: 'aquaflow@infralynx.com',
      phone: '+91 94500 88219',
      gstin: '07CCCCC2222C1Z8',
      address: 'Water Works Complex, Canal Road',
      status: 'ACTIVE',
    },
  ],

  users: [
    {
      id: '10000000-0000-0000-0000-000000000001',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      name: 'Ravi Sharma',
      email: 'rwa@infralynx.com',
      username: 'rwa_rep',
      password_hash: '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', // Password@123
      role: 'RWA',
      department_id: null,
      contractor_id: null,
      sector: 'Sector 4',
      phone: '+91 98765 43210',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    },
    {
      id: '10000000-0000-0000-0000-000000000002',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      name: 'Pooja Rao',
      email: 'clerk@infralynx.com',
      username: 'desk_clerk',
      password_hash: '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', // Password@123
      role: 'DESK_CLERK',
      department_id: 'd0000000-0000-0000-0000-000000000002',
      contractor_id: null,
      sector: null,
      phone: '+91 98111 22334',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    },
    {
      id: '10000000-0000-0000-0000-000000000003',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      name: 'Vikram Singh',
      email: 'contractor@infralynx.com',
      username: 'contractor_lead',
      password_hash: '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', // Password@123
      role: 'FIELD_CONTRACTOR',
      department_id: null,
      contractor_id: 'c0000000-0000-0000-0000-000000000002',
      sector: null,
      phone: '+91 97230 11984',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    },
    {
      id: '10000000-0000-0000-0000-000000000004',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      name: 'Er. Sandeep Mehta',
      email: 'head@infralynx.com',
      username: 'dept_head_elec',
      password_hash: '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', // Password@123
      role: 'DEPARTMENT_HEAD',
      department_id: 'd0000000-0000-0000-0000-000000000002',
      contractor_id: null,
      sector: null,
      phone: '+91 99887 66554',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    },
    {
      id: '10000000-0000-0000-0000-000000000005',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      name: 'Sunil Agrawal',
      email: 'finance@infralynx.com',
      username: 'finance_clerk',
      password_hash: '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', // Password@123
      role: 'FINANCE_CLERK',
      department_id: null,
      contractor_id: null,
      sector: null,
      phone: '+91 91234 56789',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    },
    {
      id: '10000000-0000-0000-0000-000000000006',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      name: 'Kavita Menon',
      email: 'coo@infralynx.com',
      username: 'township_coo',
      password_hash: '$2a$10$q9uqgeFG6erhtap7OzAWR.renKUfkcpefyEpSY4tHkbyae.QLJIW.', // Password@123
      role: 'TOWNSHIP_COO',
      department_id: null,
      contractor_id: null,
      sector: null,
      phone: '+91 11 4982 3001',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
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
      title: 'Annual Streetlight & Power Maintenance 2025–26',
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
      title: 'Annual Bitumen Road & Footpath Repair 2025–26',
      start_date: '2025-04-01',
      end_date: '2026-03-31',
      status: 'ACTIVE',
    },
  ],

  amc_rates: [
    { id: '1', amc_id: '20000000-0000-0000-0000-000000000001', item_code: 'RATE-01', item_name: 'Electrician', service_type: 'Labour', unit: 'Hour', rate: 500.0 },
    { id: '2', amc_id: '20000000-0000-0000-0000-000000000001', item_code: 'RATE-02', item_name: 'General Labour', service_type: 'Labour', unit: 'Hour', rate: 300.0 },
    { id: '3', amc_id: '20000000-0000-0000-0000-000000000001', item_code: 'RATE-03', item_name: 'Cable Work', service_type: 'Material & Service', unit: 'Meter', rate: 150.0 },
    { id: '4', amc_id: '20000000-0000-0000-0000-000000000001', item_code: 'RATE-06', item_name: 'Streetlight LED Luminaire Replacement', service_type: 'Hardware', unit: 'Unit', rate: 1800.0 },
    { id: '5', amc_id: '20000000-0000-0000-0000-000000000002', item_code: 'RATE-05', item_name: 'Pothole Asphalt Filling', service_type: 'Civil Works', unit: 'Sq.Meter', rate: 1200.0 },
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
      title: 'High-Mast Streetlight Failure at Main Junction',
      description: 'High-mast LED cluster completely unlit since yesterday evening causing safety hazards.',
      severity: 'HIGH',
      sector: 'Sector 4',
      block: 'Block B',
      street: 'Gulmohar Marg',
      location_details: 'Near Sector 4 Community Park Gate 2',
      status: 'PENDING_VERIFICATION',
      created_at: new Date().toISOString(),
      history: [
        { stage: 'REPORTED', timestamp: new Date().toISOString(), actor: 'Ravi Sharma (RWA)', note: 'Issue logged.' },
        { stage: 'PENDING_VERIFICATION', timestamp: new Date().toISOString(), actor: 'Vikram Singh (FIELD_CONTRACTOR)', note: 'Work completed.' },
      ],
    },
    // Seed complaint 2: REPORTED ? awaiting Desk Clerk triage
    {
      id: 'e0000000-0000-0000-0000-000000000002',
      complaint_code: 'CMP-2026-0102',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      reported_by: '10000000-0000-0000-0000-000000000001',
      department_id: 'd0000000-0000-0000-0000-000000000001',
      category: 'Civil',
      subcategory: 'Road Pothole',
      title: 'Large Pothole on Sector 4 Main Road',
      description: 'A 2-foot pothole near school gate. Vehicles swerving dangerously.',
      severity: 'HIGH',
      sector: 'Sector 4',
      block: 'Block A',
      street: 'School Avenue',
      location_details: 'Opposite Block A primary school entrance',
      asset_id: 'ASSET-ROAD-001',
      asset_name: 'Sector 4 Arterial Road',
      status: 'REPORTED',
      created_at: new Date().toISOString(),
      history: [
        { stage: 'REPORTED', timestamp: new Date().toISOString(), actor: 'Ravi Sharma (RWA)', note: 'Road pothole reported. High severity ? school zone.' },
      ],
    },
    // Seed complaint 3: REPORTED ? awaiting Desk Clerk triage (EMERGENCY)
    {
      id: 'e0000000-0000-0000-0000-000000000003',
      complaint_code: 'CMP-2026-0103',
      township_id: 'b0000000-0000-0000-0000-000000000001',
      reported_by: '10000000-0000-0000-0000-000000000001',
      department_id: 'd0000000-0000-0000-0000-000000000003',
      category: 'Water',
      subcategory: 'Pipe Leakage',
      title: 'Burst Water Main Near Sector 7 Park',
      description: 'Underground water main has burst ? water flooding footpath near park entrance.',
      severity: 'EMERGENCY',
      sector: 'Sector 7',
      block: 'Block C',
      street: 'Park Lane',
      location_details: 'Near Sector 7 central park north entrance',
      asset_id: 'ASSET-WATER-007',
      asset_name: 'Sector 7 Water Main',
      status: 'REPORTED',
      created_at: new Date().toISOString(),
      history: [
        { stage: 'REPORTED', timestamp: new Date().toISOString(), actor: 'Ravi Sharma (RWA)', note: 'Emergency: burst water main. Immediate attention required.' },
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
      status: 'COMPLETED',
      created_at: new Date().toISOString(),
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
      invoice_date: new Date().toISOString().split('T')[0],
      subtotal: 3400.0,
      tax: 0.0,
      total_amount: 3400.0,
      approved_estimate_amount: 3400.0,
      variance_amount: 0.0,
      rate_card_match: true,
      status: 'PENDING_AUDIT',
      created_at: new Date().toISOString(),
    },
  ],

  complaint_evidence: [
    {
      id: 'ev-001',
      complaint_id: 'e0000000-0000-0000-0000-000000000001',
      evidence_type: 'BEFORE',
      file_url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80',
      caption: 'Initial dark street junction photo',
      uploaded_by: '10000000-0000-0000-0000-000000000001',
      created_at: new Date().toISOString(),
    },
    {
      id: 'ev-002',
      complaint_id: 'e0000000-0000-0000-0000-000000000001',
      evidence_type: 'AFTER',
      file_url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80',
      caption: 'Luminaire replaced and illuminated',
      uploaded_by: '10000000-0000-0000-0000-000000000003',
      created_at: new Date().toISOString(),
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
      notes: 'Initial issue reported by resident representative.',
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
        township_name: township ? township.name : 'Greenfield Smart Township',
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
        township_name: township ? township.name : 'Greenfield Smart Township',
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

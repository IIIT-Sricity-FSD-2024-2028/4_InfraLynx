// Realistic initial data for TIMS in-memory state
// Covers data shapes needed across all 5 actors: RWA, Desk Clerk, Field Contractor, Dept Head, Finance

export const INITIAL_CONTRACTORS = [
  {
    id: 'cnt-01',
    name: 'Apex Infraworks Ltd.',
    lead: 'Rajesh Verma',
    phone: '+91 98112 45012',
    email: 'rajesh@apexinfra.com',
    departments: ['Civil'],
    amcContractId: 'AMC-CIV-2025-08',
    status: 'Active',
    rating: 4.8,
  },
  {
    id: 'cnt-02',
    name: 'Voltech Power & Lights',
    lead: 'Vikram Singh',
    phone: '+91 97230 11984',
    email: 'vikram@voltechpower.in',
    departments: ['Electrical'],
    amcContractId: 'AMC-ELE-2025-03',
    status: 'Active',
    rating: 4.6,
  },
  {
    id: 'cnt-03',
    name: 'AquaFlow Utilities Corp',
    lead: 'Anil Deshmukh',
    phone: '+91 94500 88219',
    email: 'anil@aquaflow.org',
    departments: ['Water'],
    amcContractId: 'AMC-WTR-2025-11',
    status: 'Active',
    rating: 4.9,
  },
]

export const INITIAL_AMC_RATE_CARDS = [
  { id: 'rate-01', service: 'Electrician', unit: 'Hour', rate: 500, department: 'Electrical' },
  { id: 'rate-02', service: 'General Labour', unit: 'Hour', rate: 300, department: 'Civil' },
  { id: 'rate-03', service: 'Cable Work', unit: 'Meter', rate: 150, department: 'Electrical' },
  { id: 'rate-04', service: 'Pipe Repair & Fitting', unit: 'Unit', rate: 800, department: 'Water' },
  { id: 'rate-05', service: 'Pothole Asphalt Filling', unit: 'Sq.Meter', rate: 1200, department: 'Civil' },
  { id: 'rate-06', service: 'Streetlight LED Luminaire Replacement', unit: 'Unit', rate: 1800, department: 'Electrical' },
  { id: 'rate-07', service: 'Sluice Valve Overhaul', unit: 'Unit', rate: 2500, department: 'Water' },
]

export const INITIAL_CURRENT_USER = {
  id: 'usr-rwa-01',
  name: 'Ravi Sharma',
  role: 'rwa',
  title: 'RWA Secretary',
  sector: 'Sector 4',
  phone: '+91 98765 43210',
  email: 'rwa.sec4@infralynx.com',
}

// Visual placeholders for realistic township repairs
const SAMPLE_PHOTOS = {
  streetlightBroken: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80',
  streetlightFixed: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80',
  potholeBroken: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
  potholeFixed: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=800&q=80',
  waterLeakBroken: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80',
  waterLeakFixed: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=800&q=80',
}

export const INITIAL_COMPLAINTS = [
  {
    id: 'CMP-2026-0101',
    title: 'High-Mast Streetlight Failure at Main Junction',
    category: 'Electrical',
    subCategory: 'Streetlight Failure',
    location: {
      sector: 'Sector 4',
      block: 'Block B',
      street: 'Gulmohar Marg',
      assetId: 'ELE-HM-042',
      assetName: 'High-Mast Pole #42',
      landmark: 'Near Sector 4 Community Park Gate 2',
      gps: '28.5355° N, 77.3910° E',
    },
    severity: 'High', // High -> 24 hours SLA
    slaDeadline: new Date(Date.now() + 14 * 3600 * 1000).toISOString(),
    status: 'PENDING_VERIFICATION', // Ready for Member 1 Screen 4 action!
    description: 'High-mast LED cluster completely unlit since yesterday evening causing safety hazards for evening commuters and pedestrians.',
    reportedBy: {
      id: 'usr-rwa-01',
      name: 'Ravi Sharma',
      role: 'rwa',
      sector: 'Sector 4',
    },
    createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    beforePhotos: [SAMPLE_PHOTOS.streetlightBroken],
    afterPhotos: [SAMPLE_PHOTOS.streetlightFixed],
    assignedContractor: INITIAL_CONTRACTORS[1],
    workOrderId: 'WO-2026-088',
    inspectionRemarks: 'Found blown LED driver and surge suppressor breakdown due to voltage spike. Requires driver replacement and rewiring.',
    estimateAmount: 3400,
    completionRemarks: 'Replaced 150W industrial driver, installed new MCB protection and re-calibrated twilight timer. All 6 luminaires fully operational.',
    completedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    verification: null,
    dispute: null,
    history: [
      { stage: 'REPORTED', timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(), actor: 'RWA Representative (Ravi Sharma)', note: 'Issue logged with photo evidence.' },
      { stage: 'UNDER REVIEW', timestamp: new Date(Date.now() - 32 * 3600 * 1000).toISOString(), actor: 'Desk Clerk (Pooja Rao)', note: 'Geographic check clear. Validated as Electrical domain.' },
      { stage: 'VALIDATED', timestamp: new Date(Date.now() - 30 * 3600 * 1000).toISOString(), actor: 'Desk Clerk (Pooja Rao)', note: 'Ticket approved for work order creation.' },
      { stage: 'WORK ORDER CREATED', timestamp: new Date(Date.now() - 28 * 3600 * 1000).toISOString(), actor: 'Desk Clerk', note: 'Generated WO-2026-088 under AMC-ELE-2025-03.' },
      { stage: 'ASSIGNED', timestamp: new Date(Date.now() - 26 * 3600 * 1000).toISOString(), actor: 'Voltech Power & Lights', note: 'Dispatched Senior Technician Vikram Singh.' },
      { stage: 'IN PROGRESS', timestamp: new Date(Date.now() - 18 * 3600 * 1000).toISOString(), actor: 'Field Contractor', note: 'Site inspection done; driver replacement in progress.' },
      { stage: 'COMPLETED', timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), actor: 'Field Contractor', note: 'Work completed. Uploaded completion photo proof.' },
      { stage: 'PENDING VERIFICATION', timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), actor: 'System', note: 'Notified RWA for inspection and digital sign-off.' },
    ],
  },
]


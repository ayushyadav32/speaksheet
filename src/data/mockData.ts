import { LeadRecord, VoiceCommandChip, OutreachCampaign } from '../types/spreadsheet';

// DATASET 1: Birth Hour Registration (20 Rows Total: 12 Unique Core Records + 8 Duplicates)
export const birthRegistrationData: LeadRecord[] = [
  // 12 Unique Records
  {
    id: 'birth-1',
    name: '  LIAM ALEXANDER CHEN ',
    company: 'Sarah Chen (Ward 4A)',
    email: '  reg-2026-0041 ',
    phone: '04:15 AM',
    dealValue: 3450, // grams
    stage: 'Won',    // Verified Won
    industry: 'Neonatology' as any,
    leadScore: 95,   // APGAR Score
    status: 'Qualified',
    location: 'Metropolitan Hospital'
  },
  {
    id: 'birth-2',
    name: 'emma sophia martinez',
    company: 'Elena Martinez (Ward 2B)',
    email: 'reg-2026-0092',
    phone: '06:42 AM',
    dealValue: 3120,
    stage: 'Proposal',
    industry: 'Obstetrics' as any,
    leadScore: 90,
    status: 'Pending',
    location: 'St. Jude Medical Center'
  },
  {
    id: 'birth-3',
    name: 'NOAH BENJAMIN PATEL',
    company: 'Priya Patel (Ward 3C)',
    email: ' REG-2026-0013 ',
    phone: '08:19 AM',
    dealValue: 3680,
    stage: 'Won',
    industry: 'Maternal Health' as any,
    leadScore: 98,
    status: 'Contacted',
    location: 'Mount Sinai Maternity'
  },
  {
    id: 'birth-4',
    name: 'olivia grace taylor',
    company: 'Hannah Taylor (Ward 1A)',
    email: 'reg-2026-0084',
    phone: '09:55 AM',
    dealValue: 2450, // Low weight
    stage: 'New',
    industry: 'NICU' as any,
    leadScore: 78,   // Low APGAR (< 85)
    status: 'Pending',
    location: 'Northwestern Memorial'
  },
  {
    id: 'birth-5',
    name: 'LUCAS GABRIEL SILVA',
    company: 'Camila Silva (Ward 4B)',
    email: ' REG-2026-0055 ',
    phone: '11:14 AM',
    dealValue: 3820,
    stage: 'Won',
    industry: 'Obstetrics' as any,
    leadScore: 96,
    status: 'Qualified',
    location: 'Cedars-Sinai Medical'
  },
  {
    id: 'birth-6',
    name: 'ava charlotte kim',
    company: 'Grace Kim (Ward 2A)',
    email: 'reg-2026-0026',
    phone: '01:30 PM',
    dealValue: 2310, // Low weight
    stage: 'Discovery',
    industry: 'NICU' as any,
    leadScore: 76,   // Low APGAR (< 85)
    status: 'Pending',
    location: 'Mayo Clinic Center'
  },
  {
    id: 'birth-7',
    name: 'ETHAN JAMES WRIGHT',
    company: 'Rachel Wright (Ward 5C)',
    email: 'REG-2026-0077',
    phone: '03:48 PM',
    dealValue: 3590,
    stage: 'Won',
    industry: 'Neonatology' as any,
    leadScore: 94,
    status: 'Qualified',
    location: 'Johns Hopkins Bayview'
  },
  {
    id: 'birth-8',
    name: 'mia isabella rossi',
    company: 'Giulia Rossi (Ward 3B)',
    email: 'reg-2026-0038',
    phone: '05:22 PM',
    dealValue: 2890,
    stage: 'Proposal',
    industry: 'Pediatrics' as any,
    leadScore: 92,
    status: 'Contacted',
    location: 'Stanford Children\'s'
  },
  {
    id: 'birth-9',
    name: 'OLIVER HENRY DUBOIS',
    company: 'Claire Dubois (Ward 1C)',
    email: ' REG-2026-0019 ',
    phone: '07:10 PM',
    dealValue: 3940,
    stage: 'Won',
    industry: 'Maternal Health' as any,
    leadScore: 97,
    status: 'Qualified',
    location: 'Boston Children\'s'
  },
  {
    id: 'birth-10',
    name: 'sophia amelia zhang',
    company: 'Mei Zhang (Ward 4C)',
    email: 'reg-2026-0060',
    phone: '09:05 PM',
    dealValue: 2280, // Low weight
    stage: 'New',
    industry: 'NICU' as any,
    leadScore: 74,   // Low APGAR (< 85)
    status: 'Pending',
    location: 'Texas Children\'s'
  },
  {
    id: 'birth-11',
    name: 'MATEO SEBASTIAN CRUZ',
    company: 'Valeria Cruz (Ward 2C)',
    email: 'REG-2026-0091',
    phone: '10:45 PM',
    dealValue: 3710,
    stage: 'Won',
    industry: 'Obstetrics' as any,
    leadScore: 95,
    status: 'Qualified',
    location: 'Seattle Children\'s'
  },
  {
    id: 'birth-12',
    name: 'harper evelyn clark',
    company: 'Chloe Clark (Ward 3A)',
    email: 'reg-2026-0012',
    phone: '11:58 PM',
    dealValue: 2540,
    stage: 'Discovery',
    industry: 'Pediatrics' as any,
    leadScore: 82,   // Low APGAR (< 85)
    status: 'Pending',
    location: 'Children\'s Hospital of Philly'
  },

  // 8 Duplicate Records (for deduplication / canonical testing)
  {
    id: 'birth-dup-1',
    name: 'LIAM ALEXANDER CHEN',
    company: 'Sarah Chen (Ward 4A)',
    email: 'reg-2026-0041',
    phone: '04:15 AM',
    dealValue: 3450,
    stage: 'Won',
    industry: 'Neonatology' as any,
    leadScore: 95,
    status: 'Qualified',
    location: 'Metropolitan Hospital',
    isDuplicate: true
  },
  {
    id: 'birth-dup-2',
    name: 'emma sophia martinez',
    company: 'Elena Martinez (Ward 2B)',
    email: 'reg-2026-0092',
    phone: '06:42 AM',
    dealValue: 3120,
    stage: 'Proposal',
    industry: 'Obstetrics' as any,
    leadScore: 90,
    status: 'Pending',
    location: 'St. Jude Medical Center',
    isDuplicate: true
  },
  {
    id: 'birth-dup-3',
    name: 'Noah Benjamin Patel',
    company: 'Priya Patel (Ward 3C)',
    email: 'REG-2026-0013',
    phone: '08:19 AM',
    dealValue: 3680,
    stage: 'Won',
    industry: 'Maternal Health' as any,
    leadScore: 98,
    status: 'Contacted',
    location: 'Mount Sinai Maternity',
    isDuplicate: true
  },
  {
    id: 'birth-dup-4',
    name: 'olivia grace taylor',
    company: 'Hannah Taylor (Ward 1A)',
    email: 'reg-2026-0084',
    phone: '09:55 AM',
    dealValue: 2450,
    stage: 'New',
    industry: 'NICU' as any,
    leadScore: 78,
    status: 'Pending',
    location: 'Northwestern Memorial',
    isDuplicate: true
  },
  {
    id: 'birth-dup-5',
    name: 'Lucas Gabriel Silva',
    company: 'Camila Silva (Ward 4B)',
    email: 'REG-2026-0055',
    phone: '11:14 AM',
    dealValue: 3820,
    stage: 'Won',
    industry: 'Obstetrics' as any,
    leadScore: 96,
    status: 'Qualified',
    location: 'Cedars-Sinai Medical',
    isDuplicate: true
  },
  {
    id: 'birth-dup-6',
    name: 'ava charlotte kim',
    company: 'Grace Kim (Ward 2A)',
    email: 'reg-2026-0026',
    phone: '01:30 PM',
    dealValue: 2310,
    stage: 'Discovery',
    industry: 'NICU' as any,
    leadScore: 76,
    status: 'Pending',
    location: 'Mayo Clinic Center',
    isDuplicate: true
  },
  {
    id: 'birth-dup-7',
    name: 'Ethan James Wright',
    company: 'Rachel Wright (Ward 5C)',
    email: 'REG-2026-0077',
    phone: '03:48 PM',
    dealValue: 3590,
    stage: 'Won',
    industry: 'Neonatology' as any,
    leadScore: 94,
    status: 'Qualified',
    location: 'Johns Hopkins Bayview',
    isDuplicate: true
  },
  {
    id: 'birth-dup-8',
    name: 'mia isabella rossi',
    company: 'Giulia Rossi (Ward 3B)',
    email: 'reg-2026-0038',
    phone: '05:22 PM',
    dealValue: 2890,
    stage: 'Proposal',
    industry: 'Pediatrics' as any,
    leadScore: 92,
    status: 'Contacted',
    location: 'Stanford Children\'s',
    isDuplicate: true
  }
];

// DATASET 2: Enterprise Sales Pipeline (20 Rows Total: 12 Unique Accounts + 8 Duplicates)
export const salesPipelineData: LeadRecord[] = [
  // 12 Unique Enterprise Accounts
  {
    id: 'sale-1',
    name: '  ALEXANDER VANCE ',
    company: 'Sovereign Capital Holdings',
    email: ' ALEXANDER.VANCE@SOVEREIGN.IO ',
    phone: '4158902341',
    dealValue: 85000,
    stage: 'Negotiation',
    industry: 'Fintech',
    leadScore: 0,
    status: 'Pending',
    location: 'San Francisco, CA'
  },
  {
    id: 'sale-2',
    name: 'elena rostova',
    company: 'Aether BioGenomics',
    email: 'elena@aetherbio.com',
    phone: '(212) 555-0199',
    dealValue: 120000,
    stage: 'Proposal',
    industry: 'Healthcare',
    leadScore: 0,
    status: 'Pending',
    location: 'New York, NY'
  },
  {
    id: 'sale-3',
    name: 'MARCUS AURELIUS TAN',
    company: 'Olympus Autonomous Robotics',
    email: ' MTAN@OLYMPUS-AI.TECH ',
    phone: '6504229100',
    dealValue: 64000,
    stage: 'Discovery',
    industry: 'AI / DeepTech',
    leadScore: 0,
    status: 'Pending',
    location: 'Palo Alto, CA'
  },
  {
    id: 'sale-4',
    name: 'clara von berg',
    company: 'Kaiser & Berg Private Wealth',
    email: 'clara.berg@kaiserberg.de',
    phone: '+49 171 892011',
    dealValue: 95000,
    stage: 'Won',
    industry: 'Fintech',
    leadScore: 0,
    status: 'Qualified',
    location: 'Zurich, Switzerland'
  },
  {
    id: 'sale-5',
    name: 'henry thornton',
    company: 'Lumiere Horlogerie & Co.',
    email: ' H.THORNTON@LUMIERE-LUX.CH ',
    phone: '442079460912',
    dealValue: 42000,
    stage: 'New',
    industry: 'Fintech',
    leadScore: 0,
    status: 'Pending',
    location: 'Geneva, Switzerland'
  },
  {
    id: 'sale-6',
    name: '  KAI CHEN ',
    company: 'Apex Cloud Architecture',
    email: ' kai.chen@apexcloud.co ',
    phone: '(408) 789-1122',
    dealValue: 58000,
    stage: 'Discovery',
    industry: 'SaaS',
    leadScore: 0,
    status: 'Pending',
    location: 'San Jose, CA'
  },
  {
    id: 'sale-7',
    name: 'VICTORIA STERLING',
    company: 'Sterling Quantum Dynamics',
    email: 'VICTORIA@STERLINGQUANTUM.COM',
    phone: '2069814420',
    dealValue: 180000,
    stage: 'Negotiation',
    industry: 'AI / DeepTech',
    leadScore: 0,
    status: 'Qualified',
    location: 'Seattle, WA'
  },
  {
    id: 'sale-8',
    name: 'diego montenegro',
    company: 'Andes Mineral Intelligence',
    email: ' DIEGO.M@ANDESINTEL.PE ',
    phone: '(305) 441-9022',
    dealValue: 35000,
    stage: 'New',
    industry: 'Fintech',
    leadScore: 0,
    status: 'Pending',
    location: 'Miami, FL'
  },
  {
    id: 'sale-9',
    name: 'AMARA OKONKWO',
    company: 'Zenith Health Diagnostics',
    email: 'amara.o@zenithhealth.org',
    phone: '6175550143',
    dealValue: 72000,
    stage: 'Proposal',
    industry: 'Healthcare',
    leadScore: 0,
    status: 'Contacted',
    location: 'Boston, MA'
  },
  {
    id: 'sale-10',
    name: 'julian drake',
    company: 'Hyperion Aerospace Data',
    email: ' J.DRAKE@HYPERIONAERO.IO ',
    phone: '5128091100',
    dealValue: 110000,
    stage: 'Negotiation',
    industry: 'AI / DeepTech',
    leadScore: 0,
    status: 'Qualified',
    location: 'Austin, TX'
  },
  {
    id: 'sale-11',
    name: 'SOPHIE BEAUCHAMP',
    company: 'Maison Royale Systems',
    email: 'sophie.beauchamp@maisonroyale.fr',
    phone: '(310) 902-8811',
    dealValue: 28000,
    stage: 'Lost',
    industry: 'SaaS',
    leadScore: 0,
    status: 'Closed',
    location: 'Los Angeles, CA'
  },
  {
    id: 'sale-12',
    name: 'tariq al-mansoor',
    company: 'Crescent Sovereign Infra',
    email: ' TARIQ@CRESCENTSOV.AE ',
    phone: '9714889123',
    dealValue: 250000,
    stage: 'Proposal',
    industry: 'Fintech',
    leadScore: 0,
    status: 'Contacted',
    location: 'Dubai, UAE'
  },

  // 8 Duplicate Records (for deduplication / canonical testing)
  {
    id: 'sale-dup-1',
    name: 'elena rostova',
    company: 'Aether BioGenomics',
    email: 'elena@aetherbio.com',
    phone: '2125550199',
    dealValue: 120000,
    stage: 'Proposal',
    industry: 'Healthcare',
    leadScore: 0,
    status: 'Pending',
    location: 'New York, NY',
    isDuplicate: true
  },
  {
    id: 'sale-dup-2',
    name: '  KAI CHEN ',
    company: 'Apex Cloud Architecture',
    email: 'kai.chen@apexcloud.co',
    phone: '4087891122',
    dealValue: 58000,
    stage: 'Discovery',
    industry: 'SaaS',
    leadScore: 0,
    status: 'Pending',
    location: 'San Jose, CA',
    isDuplicate: true
  },
  {
    id: 'sale-dup-3',
    name: 'Alexander Vance',
    company: 'Sovereign Capital Holdings',
    email: 'alexander.vance@sovereign.io',
    phone: '4158902341',
    dealValue: 85000,
    stage: 'Negotiation',
    industry: 'Fintech',
    leadScore: 0,
    status: 'Pending',
    location: 'San Francisco, CA',
    isDuplicate: true
  },
  {
    id: 'sale-dup-4',
    name: 'Marcus Aurelius Tan',
    company: 'Olympus Autonomous Robotics',
    email: 'mtan@olympus-ai.tech',
    phone: '6504229100',
    dealValue: 64000,
    stage: 'Discovery',
    industry: 'AI / DeepTech',
    leadScore: 0,
    status: 'Pending',
    location: 'Palo Alto, CA',
    isDuplicate: true
  },
  {
    id: 'sale-dup-5',
    name: 'Clara von Berg',
    company: 'Kaiser & Berg Private Wealth',
    email: 'clara.berg@kaiserberg.de',
    phone: '+49 171 892011',
    dealValue: 95000,
    stage: 'Won',
    industry: 'Fintech',
    leadScore: 0,
    status: 'Qualified',
    location: 'Zurich, Switzerland',
    isDuplicate: true
  },
  {
    id: 'sale-dup-6',
    name: 'Henry Thornton',
    company: 'Lumiere Horlogerie & Co.',
    email: 'h.thornton@lumiere-lux.ch',
    phone: '442079460912',
    dealValue: 42000,
    stage: 'New',
    industry: 'Fintech',
    leadScore: 0,
    status: 'Pending',
    location: 'Geneva, Switzerland',
    isDuplicate: true
  },
  {
    id: 'sale-dup-7',
    name: 'Victoria Sterling',
    company: 'Sterling Quantum Dynamics',
    email: 'victoria@sterlingquantum.com',
    phone: '2069814420',
    dealValue: 180000,
    stage: 'Negotiation',
    industry: 'AI / DeepTech',
    leadScore: 0,
    status: 'Qualified',
    location: 'Seattle, WA',
    isDuplicate: true
  },
  {
    id: 'sale-dup-8',
    name: 'Diego Montenegro',
    company: 'Andes Mineral Intelligence',
    email: 'diego.m@andesintel.pe',
    phone: '(305) 441-9022',
    dealValue: 35000,
    stage: 'New',
    industry: 'Fintech',
    leadScore: 0,
    status: 'Pending',
    location: 'Miami, FL',
    isDuplicate: true
  }
];

export const initialMessyData: LeadRecord[] = salesPipelineData;

// CONTEXTUAL QUICK CHIPS FOR DATASET 1 (Birth Registry)
export const birthRegistryChips: VoiceCommandChip[] = [
  {
    id: 'clean-registry-ids',
    label: 'Clean Registry IDs',
    prompt: 'Clean Registry IDs and standardize formatting',
    icon: 'Sparkles',
    category: 'cleaning'
  },
  {
    id: 'filter-won-status',
    label: 'Filter Won Status',
    prompt: 'Filter records with Won registration status',
    icon: 'CheckCircle2',
    category: 'filter'
  },
  {
    id: 'remove-low-apgar',
    label: 'Remove Low Apgar',
    prompt: 'Remove records with low Apgar score below 85',
    icon: 'ShieldAlert',
    category: 'cleaning'
  },
  {
    id: 'dedupe-birth-records',
    label: 'Deduplicate Records',
    prompt: 'Remove duplicate birth registrations',
    icon: 'CopySlash',
    category: 'cleaning'
  },
  {
    id: 'calc-mean-weight',
    label: 'Calculate Mean Weight',
    prompt: 'Compute average infant weight and delivery statistics',
    icon: 'Coins',
    category: 'enrichment'
  }
];

// CONTEXTUAL QUICK CHIPS FOR DATASET 2 (Sales Pipeline)
export const salesPipelineChips: VoiceCommandChip[] = [
  {
    id: 'dedupe-emails',
    label: 'Deduplicate Emails',
    prompt: 'Deduplicate records by email address',
    icon: 'CopySlash',
    category: 'cleaning'
  },
  {
    id: 'fix-missing-phones',
    label: 'Fix Missing Phones',
    prompt: 'Fix missing phones and normalize to international format',
    icon: 'PhoneCall',
    category: 'cleaning'
  },
  {
    id: 'highlight-vip-deals',
    label: 'Highlight VIP Deals > $50k',
    prompt: 'Highlight enterprise opportunities valued over 50000',
    icon: 'Sparkles',
    category: 'filter'
  },
  {
    id: 'ai-lead-score',
    label: 'AI Lead Scoring',
    prompt: 'Calculate AI propensity score for all leads',
    icon: 'Cpu',
    category: 'enrichment'
  },
  {
    id: 'sum-pipeline',
    label: 'Calculate Pipeline Total',
    prompt: 'Calculate total pipeline valuation and average deal',
    icon: 'Coins',
    category: 'enrichment'
  }
];

export const eventBudgetData: LeadRecord[] = [
  {
    id: 'budget-1',
    name: 'Keynote AV & Holographic Stage',
    company: 'Production',
    email: 'BUD-2026-001',
    phone: 'Apex AudioVisual',
    dealValue: 65000,
    stage: 'Won',
    industry: 'Production' as any,
    leadScore: 61500,
    status: 'Closed',
    location: 'Main Auditorium',
    isDuplicate: false
  },
  {
    id: 'budget-2',
    name: 'Executive Catering & Banquet',
    company: 'Hospitality',
    email: 'bud-2026-002',
    phone: 'Grand Hyatt Culinary',
    dealValue: 48000,
    stage: 'Lost',
    industry: 'Hospitality' as any,
    leadScore: 54200,
    status: 'Pending',
    location: 'Grand Ballroom',
    isDuplicate: false
  },
  {
    id: 'budget-3',
    name: 'Grand Ballroom Venue Rental',
    company: 'Logistics',
    email: 'BUD-2026-003',
    phone: 'Metropolitan Center',
    dealValue: 120000,
    stage: 'Won',
    industry: 'Logistics' as any,
    leadScore: 120000,
    status: 'Closed',
    location: 'Hall A & B',
    isDuplicate: false
  },
  {
    id: 'budget-4',
    name: 'Cybersecurity & RFID Badging',
    company: 'Security',
    email: 'bud-2026-004',
    phone: 'Pinnacle SafeTech',
    dealValue: 32000,
    stage: 'Won',
    industry: 'Security' as any,
    leadScore: 29800,
    status: 'Qualified',
    location: 'Access Gates 1-4',
    isDuplicate: false
  },
  {
    id: 'budget-5',
    name: 'Celebrity Keynote Honorarium',
    company: 'Production',
    email: 'BUD-2026-005',
    phone: 'Speakers Bureau Inc',
    dealValue: 85000,
    stage: 'Lost',
    industry: 'Production' as any,
    leadScore: 92000,
    status: 'Pending',
    location: 'VIP Green Room',
    isDuplicate: false
  },
  {
    id: 'budget-6',
    name: 'Branded Swag & VIP Gift Packs',
    company: 'Marketing',
    email: 'bud-2026-006',
    phone: 'Luxe Branding Co',
    dealValue: 25000,
    stage: 'Won',
    industry: 'Marketing' as any,
    leadScore: 24100,
    status: 'Closed',
    location: 'Welcome Pavilion',
    isDuplicate: false
  },
  {
    id: 'budget-7',
    name: 'High-Speed Dedicated Fiber Uplink',
    company: 'Production',
    email: 'BUD-2026-007',
    phone: 'Telecom Global Direct',
    dealValue: 18000,
    stage: 'Won',
    industry: 'Production' as any,
    leadScore: 17500,
    status: 'Qualified',
    location: 'Broadcast Control Room',
    isDuplicate: false
  },
  {
    id: 'budget-8',
    name: 'Main Stage LED Wall Panels',
    company: 'Production',
    email: 'bud-2026-008',
    phone: 'Prism Display Rigging',
    dealValue: 42000,
    stage: 'Lost',
    industry: 'Production' as any,
    leadScore: 47800,
    status: 'Pending',
    location: 'Center Stage',
    isDuplicate: false
  },
  {
    id: 'budget-9',
    name: 'VIP Shuttle Transportation Fleet',
    company: 'Logistics',
    email: 'BUD-2026-009',
    phone: 'Elite Chauffeur Services',
    dealValue: 22000,
    stage: 'Won',
    industry: 'Logistics' as any,
    leadScore: 21300,
    status: 'Closed',
    location: 'Terminal 2 to Venue',
    isDuplicate: false
  },
  {
    id: 'budget-10',
    name: '4K Live Stream Broadcast Truck',
    company: 'Production',
    email: 'bud-2026-010',
    phone: 'StreamCast Mobile Unit',
    dealValue: 35000,
    stage: 'Won',
    industry: 'Production' as any,
    leadScore: 33400,
    status: 'Qualified',
    location: 'Broadcast Dock B',
    isDuplicate: false
  },
  {
    id: 'budget-11',
    name: 'Environmental Spatial Signage',
    company: 'Marketing',
    email: 'BUD-2026-011',
    phone: 'Metro Wayfinding Studio',
    dealValue: 16000,
    stage: 'Won',
    industry: 'Marketing' as any,
    leadScore: 15200,
    status: 'Closed',
    location: 'Concourse North',
    isDuplicate: false
  },
  {
    id: 'budget-12',
    name: 'Simultaneous Translation Booths',
    company: 'Hospitality',
    email: 'bud-2026-012',
    phone: 'Polyglot Audio Systems',
    dealValue: 14000,
    stage: 'Lost',
    industry: 'Hospitality' as any,
    leadScore: 16300,
    status: 'Pending',
    location: 'Conference Rooms 101-104',
    isDuplicate: false
  },
  // 8 Duplicate Expense Items
  {
    id: 'budget-dup-1',
    name: 'Keynote AV & Holographic Stage',
    company: 'Production',
    email: 'BUD-2026-001',
    phone: 'Apex AudioVisual',
    dealValue: 65000,
    stage: 'Won',
    industry: 'Production' as any,
    leadScore: 61500,
    status: 'Closed',
    location: 'Main Auditorium',
    isDuplicate: true
  },
  {
    id: 'budget-dup-2',
    name: 'Executive Catering & Banquet',
    company: 'Hospitality',
    email: 'bud-2026-002',
    phone: 'Grand Hyatt Culinary',
    dealValue: 48000,
    stage: 'Lost',
    industry: 'Hospitality' as any,
    leadScore: 54200,
    status: 'Pending',
    location: 'Grand Ballroom',
    isDuplicate: true
  },
  {
    id: 'budget-dup-3',
    name: 'Grand Ballroom Venue Rental',
    company: 'Logistics',
    email: 'BUD-2026-003',
    phone: 'Metropolitan Center',
    dealValue: 120000,
    stage: 'Won',
    industry: 'Logistics' as any,
    leadScore: 120000,
    status: 'Closed',
    location: 'Hall A & B',
    isDuplicate: true
  },
  {
    id: 'budget-dup-4',
    name: 'Cybersecurity & RFID Badging',
    company: 'Security',
    email: 'bud-2026-004',
    phone: 'Pinnacle SafeTech',
    dealValue: 32000,
    stage: 'Won',
    industry: 'Security' as any,
    leadScore: 29800,
    status: 'Qualified',
    location: 'Access Gates 1-4',
    isDuplicate: true
  },
  {
    id: 'budget-dup-5',
    name: 'Celebrity Keynote Honorarium',
    company: 'Production',
    email: 'BUD-2026-005',
    phone: 'Speakers Bureau Inc',
    dealValue: 85000,
    stage: 'Lost',
    industry: 'Production' as any,
    leadScore: 92000,
    status: 'Pending',
    location: 'VIP Green Room',
    isDuplicate: true
  },
  {
    id: 'budget-dup-6',
    name: 'Branded Swag & VIP Gift Packs',
    company: 'Marketing',
    email: 'bud-2026-006',
    phone: 'Luxe Branding Co',
    dealValue: 25000,
    stage: 'Won',
    industry: 'Marketing' as any,
    leadScore: 24100,
    status: 'Closed',
    location: 'Welcome Pavilion',
    isDuplicate: true
  },
  {
    id: 'budget-dup-7',
    name: 'High-Speed Dedicated Fiber Uplink',
    company: 'Production',
    email: 'BUD-2026-007',
    phone: 'Telecom Global Direct',
    dealValue: 18000,
    stage: 'Won',
    industry: 'Production' as any,
    leadScore: 17500,
    status: 'Qualified',
    location: 'Broadcast Control Room',
    isDuplicate: true
  },
  {
    id: 'budget-dup-8',
    name: 'Main Stage LED Wall Panels',
    company: 'Production',
    email: 'bud-2026-008',
    phone: 'Prism Display Rigging',
    dealValue: 42000,
    stage: 'Lost',
    industry: 'Production' as any,
    leadScore: 47800,
    status: 'Pending',
    location: 'Center Stage',
    isDuplicate: true
  }
];

// CONTEXTUAL QUICK CHIPS FOR DATASET 3 (Event Budget Sheet)
export const eventBudgetChips: VoiceCommandChip[] = [
  {
    id: 'flag-over-budget',
    label: 'Flag Over Budget',
    prompt: 'Flag and filter over budget expenses where spent exceeds allocated',
    icon: 'ShieldAlert',
    category: 'filter'
  },
  {
    id: 'dedupe-expenses',
    label: 'Deduplicate Expenses',
    prompt: 'Remove duplicate expense line items from budget sheet',
    icon: 'CopySlash',
    category: 'cleaning'
  },
  {
    id: 'filter-approved-status',
    label: 'Filter Approved Status',
    prompt: 'Filter expense items with verified approved status',
    icon: 'CheckCircle2',
    category: 'filter'
  },
  {
    id: 'clean-budget-codes',
    label: 'Standardize Codes',
    prompt: 'Clean and standardize budget cost center codes to uppercase',
    icon: 'Sparkles',
    category: 'cleaning'
  },
  {
    id: 'calc-total-spend',
    label: 'Calculate Total Spend',
    prompt: 'Calculate total allocated budget vs actual expenditure and variance',
    icon: 'Coins',
    category: 'enrichment'
  }
];

// Fallback generic voice chips
export const voiceChips: VoiceCommandChip[] = salesPipelineChips;

export const sampleOutreachTemplates: OutreachCampaign[] = [
  {
    id: 'ai-cold-email',
    name: 'Executive Value Proposition',
    channel: 'email',
    subject: 'Operational Intelligence & Automation for {{Company}}',
    templateBody: 'Hello {{First_Name}},\n\nI reviewed the data workflow at {{Company}} in the {{Industry}} sector. Given your current valuation metric at {{Deal_Value}}, our engineering team has prepared an automated processing benchmark.\n\nAre you available for a brief technical walkthrough this week?',
    status: 'draft'
  },
  {
    id: 'linkedin-sequence',
    name: 'LinkedIn Executive InMail',
    channel: 'linkedin',
    subject: 'Strategic Growth Connect: {{First_Name}} & SpeakSheet',
    templateBody: 'Hi {{First_Name}}, great work steering {{Company}}. We are currently deploying voice-driven spreadsheet automation pipelines across leading {{Industry}} organizations. Would love to share our technical benchmark report with you.',
    status: 'draft'
  },
  {
    id: 'whatsapp-broadcast',
    name: 'Direct VIP WhatsApp Alert',
    channel: 'whatsapp',
    subject: 'VIP Direct Dispatch: {{First_Name}}',
    templateBody: 'Hello {{First_Name}} — This is an automated high-priority dispatch regarding {{Company}}. Your operational profile #{{Deal_Value}} is scheduled for review. Reply 1 to confirm or 2 to reschedule.',
    status: 'draft'
  },
  {
    id: 'sms-dispatch',
    name: 'Priority SMS Alert',
    channel: 'sms',
    subject: 'Priority Notification: {{First_Name}}',
    templateBody: 'SpeakSheet Alert for {{First_Name}} ({{Company}}): Your enterprise account record {{Deal_Value}} requires verification. Reply YES to confirm or 2 to reschedule.',
    status: 'draft'
  }
];

// CONTEXTUAL QUICK CHIPS FOR TAB 3 (Voice-First Bulk Outreach Studio)
export const outreachVoiceChips: VoiceCommandChip[] = [
  {
    id: 'trigger-target-multi',
    label: 'Send LinkedIn to Emma & Liam',
    prompt: 'Send LinkedIn message to Emma and Liam',
    icon: 'Send',
    category: 'enrichment'
  },
  {
    id: 'trigger-dispatch-selected',
    label: 'Dispatch to Selected Leads',
    prompt: 'Dispatch to all selected leads',
    icon: 'Target',
    category: 'mutation'
  },
  {
    id: 'trigger-whatsapp-broadcast',
    label: 'Send WhatsApp to All Leads',
    prompt: 'Send WhatsApp to all active leads',
    icon: 'MessageSquare',
    category: 'filter'
  },
  {
    id: 'trigger-email-seq',
    label: 'Generate Email Sequence',
    prompt: 'Generate AI cold email sequence for active records',
    icon: 'Mail',
    category: 'enrichment'
  },
  {
    id: 'trigger-sms-alert',
    label: 'Send SMS Dispatch',
    prompt: 'Prepare urgent SMS dispatch for contacts',
    icon: 'Sparkles',
    category: 'filter'
  },
  {
    id: 'trigger-bulk-dispatch',
    label: 'Execute Bulk Dispatch',
    prompt: 'Execute bulk outreach dispatch to all targets',
    icon: 'Zap',
    category: 'mutation'
  }
];

// CONTEXTUAL QUICK CHIPS FOR USER-UPLOADED / FRESH IMPORT DATASETS
export const freshImportChips: VoiceCommandChip[] = [
  {
    id: 'fresh-dedupe',
    label: 'Deduplicate Rows',
    prompt: 'Remove duplicate rows and filter canonical',
    icon: 'CopySlash',
    category: 'cleaning'
  },
  {
    id: 'fresh-names',
    label: 'Standardize Names',
    prompt: 'Capitalize and clean formatted names',
    icon: 'Sparkles',
    category: 'cleaning'
  },
  {
    id: 'fresh-phones',
    label: 'Normalize Phones',
    prompt: 'Normalize phone numbers to international standard format',
    icon: 'PhoneCall',
    category: 'cleaning'
  },
  {
    id: 'fresh-calculate',
    label: 'Calculate Valuation',
    prompt: 'Calculate total pipeline valuation and summary',
    icon: 'Coins',
    category: 'enrichment'
  },
  {
    id: 'fresh-score',
    label: 'AI Propensity Score',
    prompt: 'Compute AI propensity scores across records',
    icon: 'Cpu',
    category: 'enrichment'
  }
];


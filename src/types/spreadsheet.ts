export type DealStage = 'New' | 'Discovery' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
export type LeadStatus = 'Pending' | 'Contacted' | 'Qualified' | 'Closed';
export type IndustryType = 'SaaS' | 'Fintech' | 'Healthcare' | 'AI / DeepTech' | 'Vital Statistics';

export interface LeadRecord {
  id: string;
  name: string;        // Contact / Child Name
  company: string;     // Organization / Hospital / Mother Name
  email: string;       // Email / Registry Identification Code
  phone: string;       // Phone / Birth Time Registration
  dealValue: number;   // Valuation ($) / Birth Weight (Grams)
  stage: DealStage;    // Pipeline Stage / Registration Status
  industry: IndustryType; // Sector / Department
  leadScore: number;   // Quality Index (0-100)
  status: LeadStatus;  // Verification Status
  location: string;    // Ward / City / Region
  isDuplicate?: boolean;
}

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: keyof LeadRecord | null;
  direction: SortDirection;
}

export interface ToastMessage {
  id: string;
  title: string;
  description: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: string;
  modifiedCount?: number;
}

export interface VoiceCommandChip {
  id: string;
  label: string;
  prompt: string;
  icon: string;
  category: 'cleaning' | 'enrichment' | 'filter' | 'mutation';
}

export interface OutreachCampaign {
  id: string;
  name: string;
  channel: 'email' | 'linkedin' | 'sms' | 'whatsapp';
  subject: string;
  templateBody: string;
  status: 'draft' | 'sending' | 'completed';
}

export interface GeneratedOutreach {
  leadId: string;
  leadName: string;
  company: string;
  email: string;
  dealValue: number;
  channel: 'email' | 'linkedin' | 'sms' | 'whatsapp';
  personalizedSubject: string;
  personalizedBody: string;
  status: 'queued' | 'sent' | 'opened' | 'replied';
  dispatchTime?: string;
}

export interface DatasetMeta {
  id: 'birth_registration' | 'sales_pipeline' | 'event_budget' | 'custom_imported';
  title: string;
  subtitle: string;
  unitLabel: string;
  valueHeader: string;
  timeHeader: string;
  data: LeadRecord[];
  initialTotal: number;
  removedCount: number;
}

export interface CommandOutputBannerData {
  id: string;
  commandText: string;
  title: string;
  primaryMetric: string;
  secondaryMetric?: string;
  details: string;
  category: 'computation' | 'hygiene' | 'filter' | 'highlight' | 'ai';
  timestamp: string;
  affectedCount?: number;
  totalRows: number;
  removedRows: number;
  activeRows: number;
}

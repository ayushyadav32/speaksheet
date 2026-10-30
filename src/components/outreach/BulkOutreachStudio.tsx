import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LeadRecord, OutreachCampaign, GeneratedOutreach, ToastMessage } from '../../types/spreadsheet';
import { sampleOutreachTemplates, outreachVoiceChips } from '../../data/mockData';
import { soundEffects } from '../../services/voiceEngine';
import { VoiceCommandBar } from '../voice/VoiceCommandBar';
import confetti from 'canvas-confetti';
import { 
  Send, 
  Mail, 
  MessageSquare, 
  Sparkles, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  ArrowRight, 
  Smartphone, 
  Target, 
  Terminal, 
  CheckSquare, 
  Square, 
  Zap, 
  Search,
  X,
  RotateCcw
} from 'lucide-react';

export interface SentMessageItem {
  channel: 'email' | 'linkedin' | 'sms' | 'whatsapp';
  subject: string;
  message: string;
  timestamp: string;
}

export interface MultiCommandClause {
  channel: 'email' | 'linkedin' | 'sms' | 'whatsapp';
  recipients: LeadRecord[];
  rawClause: string;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  type: 'VOICE_COMMAND' | 'AUTO_DISPATCH' | 'TRANSMISSION' | 'CHANNEL_SYNC' | 'SELECTION' | 'VOICE_STAGED';
  command?: string;
  channel: 'email' | 'linkedin' | 'sms' | 'whatsapp';
  recipients: string[];
  recipientDetails?: string; // e.g. "Lucas Gabriel Silva (Camila Silva • Ward 4B)"
  recipientLeadId?: string; // lead id for click-to-inspect
  subjectSnippet?: string; // Message Subject / Preview Snippet
  messageBody?: string; // Full message content
  status: 'STAGED' | 'PENDING' | 'QUEUED' | 'TRANSMITTING' | 'DELIVERED' | 'COMPLETED' | 'READY' | 'SENT';
  latency?: string;
  details: string;
}

interface BulkOutreachStudioProps {
  data: LeadRecord[];
  selectedRowIds: Set<string>;
  datasetId?: string;
  onAddToast?: (toast: ToastMessage) => void;
  initialTargetLead?: LeadRecord | null;
  initialChannel?: 'email' | 'linkedin' | 'sms' | 'whatsapp';
  onChannelChange?: (channel: 'email' | 'linkedin' | 'sms' | 'whatsapp') => void;
  onTargetLeadChange?: (lead: LeadRecord | null) => void;
  resetSignal?: number;
}

// Action words excluded from name matching
const commandWordsToExclude = new Set([
  'send', 'email', 'sms', 'message', 'text', 'whatsapp', 'linkedin', 
  'to', 'for', 'the', 'and', 'all', 'active', 'leads', 'broadcast', 
  'dispatch', 'inmail', 'cold', 'outreach', 'run', 'execute', 'selected',
  'lead', 'person', 'recipient', 'recipients', 'now', 'please', 'draft'
]);

export const BulkOutreachStudio: React.FC<BulkOutreachStudioProps> = ({
  data,
  selectedRowIds,
  datasetId = 'sales_pipeline',
  onAddToast,
  initialTargetLead,
  initialChannel,
  onChannelChange,
  onTargetLeadChange,
  resetSignal
}) => {
  const isBirth = datasetId === 'birth_registration';
  const isBudget = datasetId === 'event_budget';

  // Execution lock to prevent double execution on voice/mic stop
  const hasExecutedRef = useRef(false);

  // Single Selection Set for Target Leads (No isolatedLead or targetLocked state)
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(() => {
    if (initialTargetLead) return new Set([initialTargetLead.id]);
    if (selectedRowIds && selectedRowIds.size > 0) return new Set(selectedRowIds);
    return new Set();
  });

  // Track inspected lead for live preview in Card 3 (Separated from selection toggle)
  const [previewLeadId, setPreviewLeadId] = useState<string | null>(() => {
    if (initialTargetLead) return initialTargetLead.id;
    return null;
  });

  // Sent status tracking for leads that have received dispatched messages
  const [sentLeadIds, setSentLeadIds] = useState<Set<string>>(new Set());

  // Cumulative Sent Records per lead ID: map of lead ID to array of SentMessageItems
  const [sentRecords, setSentRecords] = useState<Record<string, SentMessageItem[]>>({});

  // Active channel selected for inspecting when a lead received multiple channel messages
  const [selectedSentChannel, setSelectedSentChannel] = useState<'email' | 'linkedin' | 'sms' | 'whatsapp' | null>(null);

  // Staged Voice Command Awaiting "Run" Confirmation (Stop immediate auto-send)
  const [isAwaitingRunConfirmation, setIsAwaitingRunConfirmation] = useState(false);
  const [stagedCommandText, setStagedCommandText] = useState('');
  const [stagedClauses, setStagedClauses] = useState<MultiCommandClause[]>([]);

  const [activeChannel, setActiveChannel] = useState<'email' | 'linkedin' | 'sms' | 'whatsapp'>(initialChannel || 'email');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(sampleOutreachTemplates[0].id);

  // Clear Full-Sentence Confirmation Banner with 35-Second Auto-Dismiss
  const [confirmationBanner, setConfirmationBanner] = useState<{
    channel: string;
    count: number;
    names: string[];
    timestamp: string;
  } | null>(null);

  const autoResetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearAutoResetTimer = () => {
    if (autoResetTimerRef.current) {
      clearTimeout(autoResetTimerRef.current);
      autoResetTimerRef.current = null;
    }
  };

  const handleResetDispatchState = () => {
    hasExecutedRef.current = false;
    clearAutoResetTimer();
    setConfirmationBanner(null);
    setSentLeadIds(new Set());
    setSentRecords({});
    setSelectedSentChannel(null);
    setSelectedLeadIds(new Set());
    setDispatchStatus('idle');
    setDispatchProgress(0);
    setPreviewLeadId(data[0]?.id || null);
    setPreviewIndex(0);
    setIsAwaitingRunConfirmation(false);
    setStagedClauses([]);
    setStagedCommandText('');
  };

  // Synchronize reset when top navbar or parent triggers reset
  useEffect(() => {
    if (resetSignal !== undefined && resetSignal > 0) {
      handleResetDispatchState();
    }
  }, [resetSignal]);

  useEffect(() => {
    return () => {
      clearAutoResetTimer();
    };
  }, []);

  // Dedicated Live Terminal Audit Logs (strictly storing verified dispatches)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Visible clean history: strictly verified sent dispatches
  const visibleLogs = useMemo(() => {
    return auditLogs.filter(log => log.status === 'SENT');
  }, [auditLogs]);

  // CRITICAL STATE FIX: Always update audit logs using functional updater so back-to-back entries are preserved
  const addAuditLog = (entry: AuditLogEntry) => {
    setAuditLogs(prev => [entry, ...prev.slice(0, 99)]);
  };

  const addAuditLogs = (entries: AuditLogEntry[]) => {
    setAuditLogs(prev => [...entries, ...prev.slice(0, 99)]);
  };

  const getChannelDisplayName = (ch: 'email' | 'linkedin' | 'sms' | 'whatsapp') => {
    switch (ch) {
      case 'linkedin': return 'LinkedIn InMail';
      case 'whatsapp': return 'WhatsApp Direct';
      case 'email': return 'Email';
      case 'sms': return 'SMS Alert';
    }
  };

  // Sync when initialTargetLead changes
  useEffect(() => {
    if (initialTargetLead) {
      setSelectedLeadIds(new Set([initialTargetLead.id]));
      setPreviewIndex(0);
    }
  }, [initialTargetLead]);

  // Sync when selectedRowIds prop changes (e.g. from multi-target voice command in Tab 1)
  useEffect(() => {
    if (selectedRowIds && selectedRowIds.size > 0) {
      setSelectedLeadIds(new Set(selectedRowIds));
      setPreviewIndex(0);
    }
  }, [selectedRowIds]);

  // Sync when initialChannel changes
  useEffect(() => {
    if (initialChannel && initialChannel !== activeChannel) {
      handleSelectChannel(initialChannel);
    }
  }, [initialChannel]);

  // 4 Harmonized Campaign Templates for Every Context (Email, LinkedIn, WhatsApp, SMS)
  const currentTemplates: OutreachCampaign[] = useMemo(() => {
    if (isBirth) {
      return [
        {
          id: 'birth-email',
          name: 'Vital Registry Certificate',
          channel: 'email',
          subject: 'Official Birth Registry Certificate: {{Name}} ({{Company}})',
          templateBody: 'Dear Care Team,\n\nThis is an automated verification of vital registry for infant {{Name}} (Weight: {{Deal_Value}}, APGAR: {{Score}}).\nCare Department: {{Industry}}.\nRegistry Identifier: {{Email}}.\n\nAll clinical birth records have been indexed and certified in the central hub.\n\nBest regards,\nClinical Registry Services',
          status: 'draft'
        },
        {
          id: 'birth-linkedin',
          name: 'Clinical Ward Verification',
          channel: 'linkedin',
          subject: 'Clinical Ward Verification: {{Name}} - {{Industry}}',
          templateBody: 'Infant Record Notification: {{Name}} enrolled under {{Industry}} ward (Mother/Ward: {{Company}}). Registry Code: {{Email}}. APGAR Vital Score: {{Score}}. Verified and synced to state healthcare registry.',
          status: 'draft'
        },
        {
          id: 'birth-whatsapp',
          name: 'Maternal Care Vital Alert',
          channel: 'whatsapp',
          subject: 'Maternal Care Alert: {{Name}}',
          templateBody: '[VITAL CARE DISPATCH] Infant {{Name}} successfully registered. Mother/Ward: {{Company}}. Recorded weight: {{Deal_Value}}. APGAR: {{Score}}. Status: Verified.',
          status: 'draft'
        },
        {
          id: 'birth-sms',
          name: 'Urgent Care SMS Dispatch',
          channel: 'sms',
          subject: 'Vital Care SMS: {{Name}}',
          templateBody: 'URGENT [Vital Care]: Clinical registry for infant {{Name}} has been indexed. Weight: {{Deal_Value}}, Status: {{Stage}}. Reply CONFIRM to certify.',
          status: 'draft'
        }
      ];
    }
    if (isBudget) {
      return [
        {
          id: 'budget-email',
          name: 'Budget Clearance Notice',
          channel: 'email',
          subject: 'Event Budget Clearance Notice: {{Name}} ({{Company}})',
          templateBody: 'Attention {{Company}} Team,\n\nThis is an automated review for expense item "{{Name}}".\nAllocated Cap: {{Deal_Value}} | Invoiced Spend: {{Score}}.\nBudget Code: {{Email}}.\n\nPlease verify invoice documentation for clearance.\n\nRegards,\nEvent Procurement & Budget Committee',
          status: 'draft'
        },
        {
          id: 'budget-linkedin',
          name: 'Vendor Procurement Audit',
          channel: 'linkedin',
          subject: 'Procurement & Vendor Sync: {{Name}} - {{Company}}',
          templateBody: 'Vendor Notification: Expense item "{{Name}}" under {{Company}} has been audited. Allocation: {{Deal_Value}} | Current Invoiced: {{Score}}. Coordinated via central event finance.',
          status: 'draft'
        },
        {
          id: 'budget-whatsapp',
          name: 'Emergency Budget Action',
          channel: 'whatsapp',
          subject: 'URGENT: Budget Status - {{Name}}',
          templateBody: '[BUDGET DISPATCH] {{Company}} - Expense: "{{Name}}". Allocated: {{Deal_Value}}, Spent: {{Score}}. Reply 1 to approve payment or 2 for escalation.',
          status: 'draft'
        },
        {
          id: 'budget-sms',
          name: 'Purchase Order SMS Alert',
          channel: 'sms',
          subject: 'Budget Authorization: {{Name}}',
          templateBody: 'ALERT: Event expense "{{Name}}" ({{Company}}) allocated {{Deal_Value}}. Invoiced: {{Score}}. Reply APPROVE to release purchase order.',
          status: 'draft'
        }
      ];
    }
    return sampleOutreachTemplates;
  }, [isBirth, isBudget]);

  const [customSubject, setCustomSubject] = useState(
    isBirth 
      ? 'Official Birth Registry Certificate: {{Name}} ({{Company}})'
      : isBudget
      ? 'Event Budget Clearance Notice: {{Name}} ({{Company}})'
      : sampleOutreachTemplates[0].subject
  );
  const [customBody, setCustomBody] = useState(
    isBirth
      ? 'Dear Care Team,\n\nThis is an automated verification of vital registry for infant {{Name}} (Weight: {{Deal_Value}}, APGAR: {{Score}}).\nCare Department: {{Industry}}.\nRegistry Identifier: {{Email}}.\n\nAll clinical birth records have been indexed and certified in the central hub.\n\nBest regards,\nClinical Registry Services'
      : isBudget
      ? 'Attention {{Company}} Team,\n\nThis is an automated review for expense item "{{Name}}".\nAllocated Cap: {{Deal_Value}} | Invoiced Spend: {{Score}}.\nBudget Code: {{Email}}.\n\nPlease verify invoice documentation for clearance.\n\nRegards,\nEvent Procurement & Budget Committee'
      : sampleOutreachTemplates[0].templateBody
  );

  // Synchronize campaign templates when dataset changes
  useEffect(() => {
    const matched = currentTemplates.find(t => t.channel === activeChannel) || currentTemplates[0];
    if (matched) {
      setSelectedTemplateId(matched.id);
      setCustomSubject(matched.subject);
      setCustomBody(matched.templateBody);
    }
  }, [datasetId, currentTemplates]);

  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchProgress, setDispatchProgress] = useState(0);
  const [dispatchLogs, setDispatchLogs] = useState<string[]>([]);
  const [dispatchStatus, setDispatchStatus] = useState<'idle' | 'running' | 'completed'>('idle');
  const [previewIndex, setPreviewIndex] = useState(0);

  // Search and Terminal Collapse States
  const [searchTerm, setSearchTerm] = useState('');
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);

  // Voice Command Bar State for Tab 3
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [lastVoiceSummary, setLastVoiceSummary] = useState('');

  // Target Leads: filter based on selectedLeadIds, or all active data if none explicitly selected
  const targetLeads = useMemo(() => {
    if (selectedLeadIds.size > 0) {
      return data.filter(d => selectedLeadIds.has(d.id));
    }
    return data;
  }, [data, selectedLeadIds]);

  // Filtered Leads based on Search Query
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const s = searchTerm.toLowerCase().trim();
    return data.filter(d => 
      d.name.toLowerCase().includes(s) || 
      d.company.toLowerCase().includes(s) ||
      d.stage.toLowerCase().includes(s) ||
      d.email.toLowerCase().includes(s) ||
      d.industry.toLowerCase().includes(s)
    );
  }, [data, searchTerm]);

  // Exact Multi-Recipient Lead Matcher with Deduplication by Normalized Name
  const findMatchingLeads = (command: string, leadList: LeadRecord[]): LeadRecord[] => {
    // 1. Convert spoken command to lowercase words
    const spokenWords = command
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);

    const candidateSpokenWords = spokenWords.filter(w => !commandWordsToExclude.has(w));
    const matched: LeadRecord[] = [];
    const seenNames = new Set<string>();

    // 2. Loop through EVERY row in leadList (activeRows)
    for (const row of leadList) {
      // Normalize name to deduplicate multiple rows of the exact same person
      const normalizedName = row.name.toLowerCase().trim().replace(/\s+/g, ' ');
      if (seenNames.has(normalizedName)) continue;

      // Split row's name into lowercase parts
      const nameParts = normalizedName
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(Boolean);

      // 3. Match a row if ANY name part in the row matches ANY word in spokenWords:
      // exact match OR prefix match of at least 3 letters
      const isMatch = nameParts.some(namePart => {
        return candidateSpokenWords.some(spokenWord => {
          if (namePart === spokenWord) return true;
          if (spokenWord.length >= 3 && namePart.startsWith(spokenWord)) return true;
          if (namePart.length >= 3 && spokenWord.startsWith(namePart)) return true;
          return false;
        });
      });

      if (isMatch) {
        seenNames.add(normalizedName);
        matched.push(row);
      }
    }

    return matched;
  };

  // Requirement 1 & 3: Clicking lead row/card strictly sets previewLeadId to inspect that person's message
  // It MUST NOT deselect them or remove their "Sent" status!
  const handleInspectLead = (lead: LeadRecord) => {
    soundEffects.playListeningClick();
    setPreviewLeadId(lead.id);

    const items = sentRecords[lead.id];
    if (items && items.length > 0) {
      setSelectedSentChannel(items[0].channel);
    }

    // Sync previewIndex if lead is part of targetLeads
    const targetIndex = targetLeads.findIndex(d => d.id === lead.id);
    if (targetIndex >= 0) {
      setPreviewIndex(targetIndex);
    }
  };

  const handleInspectLeadById = (leadId: string, channel?: 'email' | 'linkedin' | 'sms' | 'whatsapp') => {
    soundEffects.playListeningClick();
    setPreviewLeadId(leadId);

    if (channel) {
      setSelectedSentChannel(channel);
    } else {
      const items = sentRecords[leadId];
      if (items && items.length > 0) {
        setSelectedSentChannel(items[0].channel);
      }
    }

    const targetIndex = targetLeads.findIndex(d => d.id === leadId);
    if (targetIndex >= 0) {
      setPreviewIndex(targetIndex);
    }
  };

  // Requirement 1: Only clicking the small checkbox icon toggles lead selection
  const handleToggleLeadCheckbox = (lead: LeadRecord) => {
    soundEffects.playListeningClick();
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(lead.id)) {
        next.delete(lead.id);
      } else {
        next.add(lead.id);
      }
      return next;
    });
    setPreviewLeadId(lead.id);
  };

  // Toggle Select All (respects search filter if active)
  const handleToggleSelectAll = () => {
    soundEffects.playListeningClick();
    if (searchTerm.trim()) {
      const allFilteredSelected = filteredData.length > 0 && filteredData.every(d => selectedLeadIds.has(d.id));
      setSelectedLeadIds(prev => {
        const next = new Set(prev);
        if (allFilteredSelected) {
          filteredData.forEach(d => next.delete(d.id));
        } else {
          filteredData.forEach(d => next.add(d.id));
        }
        return next;
      });
    } else {
      if (selectedLeadIds.size === data.length) {
        clearAutoResetTimer();
        setSelectedLeadIds(new Set());
        setSentLeadIds(new Set());
        setConfirmationBanner(null);
      } else {
        setSelectedLeadIds(new Set(data.map(d => d.id)));
      }
    }
    setPreviewLeadId(null);
    setPreviewIndex(0);
  };

  // 1-Click Interactive Action Button Triggers & Channel Selectors
  // Immediately clear old "Successfully sent..." banner, sent status & progress on channel switch
  const handleSelectChannel = (ch: 'email' | 'linkedin' | 'sms' | 'whatsapp') => {
    clearAutoResetTimer();
    setConfirmationBanner(null);
    setSentLeadIds(new Set());
    setDispatchStatus('idle');
    setDispatchProgress(0);

    setActiveChannel(ch);
    onChannelChange?.(ch);
    soundEffects.playListeningClick();

    const matched = currentTemplates.find(t => t.channel === ch);
    if (matched) {
      setSelectedTemplateId(matched.id);
      setCustomSubject(matched.subject);
      setCustomBody(matched.templateBody);
    }
  };

  const handleSelectTemplate = (tmpl: OutreachCampaign) => {
    setSelectedTemplateId(tmpl.id);
    setActiveChannel(tmpl.channel);
    onChannelChange?.(tmpl.channel);
    setCustomSubject(tmpl.subject);
    setCustomBody(tmpl.templateBody);
  };

  // Interpolate variables context-aware
  const generatePersonalizedMessage = (lead: LeadRecord, subjectStr: string, bodyStr: string) => {
    const firstName = lead.name.trim().split(/\s+/)[0] || (isBirth ? 'Infant' : 'Executive');
    const replaceMap: Record<string, string> = isBirth
      ? {
          '{{First_Name}}': firstName,
          '{{Name}}': lead.name.trim(),
          '{{Company}}': lead.company.trim(),
          '{{Deal_Value}}': `${lead.dealValue.toLocaleString()}g`,
          '{{Industry}}': lead.industry,
          '{{Stage}}': lead.stage,
          '{{Score}}': `${lead.leadScore}`,
          '{{Email}}': lead.email
        }
      : isBudget
      ? {
          '{{First_Name}}': lead.company.trim(),
          '{{Name}}': lead.name.trim(),
          '{{Company}}': lead.company.trim(),
          '{{Deal_Value}}': `$${lead.dealValue.toLocaleString()}`,
          '{{Industry}}': lead.industry,
          '{{Stage}}': lead.stage,
          '{{Score}}': `$${lead.leadScore.toLocaleString()}`,
          '{{Email}}': lead.email
        }
      : {
          '{{First_Name}}': firstName,
          '{{Name}}': lead.name.trim(),
          '{{Company}}': lead.company.trim(),
          '{{Deal_Value}}': `$${lead.dealValue.toLocaleString()}`,
          '{{Industry}}': lead.industry,
          '{{Stage}}': lead.stage,
          '{{Score}}': `${lead.leadScore}`,
          '{{Email}}': lead.email
        };

    let pSub = subjectStr;
    let pBody = bodyStr;

    Object.entries(replaceMap).forEach(([key, val]) => {
      pSub = pSub.split(key).join(val);
      pBody = pBody.split(key).join(val);
    });

    return { subject: pSub, body: pBody };
  };

  // Generated personalized items
  const generatedMessages: GeneratedOutreach[] = useMemo(() => {
    return targetLeads.map(lead => {
      const { subject, body } = generatePersonalizedMessage(lead, customSubject, customBody);
      return {
        leadId: lead.id,
        leadName: lead.name,
        company: lead.company,
        email: lead.email,
        dealValue: lead.dealValue,
        channel: activeChannel,
        personalizedSubject: subject,
        personalizedBody: body,
        status: 'queued'
      };
    });
  }, [targetLeads, customSubject, customBody, activeChannel]);

  // Autonomous Execution Engine (Runs automatically on voice commands or one-click button)
  const executeAutoDispatch = (
    recipientsToDispatch: LeadRecord[],
    channel: 'email' | 'linkedin' | 'sms' | 'whatsapp',
    commandTrigger?: string
  ) => {
    if (isDispatching || recipientsToDispatch.length === 0) return;

    clearAutoResetTimer();
    setConfirmationBanner(null);

    setIsTerminalOpen(true);
    setIsDispatching(true);
    setDispatchStatus('running');
    setDispatchProgress(0);
    soundEffects.playListeningClick();

    const targetNames = recipientsToDispatch.map(r => r.name.trim());
    const chLabel = getChannelDisplayName(channel);

    setDispatchLogs([`Starting message dispatch to ${recipientsToDispatch.length} recipient(s) via ${chLabel}.`]);

    let current = 0;
    const total = recipientsToDispatch.length;
    const interval = setInterval(() => {
      current++;
      const progressPercent = Math.round((current / total) * 100);
      setDispatchProgress(progressPercent);

      const targetLead = recipientsToDispatch[current - 1];
      const timeStr = new Date().toLocaleTimeString();
      const { subject, body } = generatePersonalizedMessage(targetLead, customSubject, customBody);

      // Store in cumulative sent records
      setSentRecords(prev => ({
        ...prev,
        [targetLead.id]: [
          ...(prev[targetLead.id] || []),
          {
            channel,
            subject,
            message: body,
            timestamp: timeStr
          }
        ]
      }));

      const recipientDetails = isBirth
        ? `Sent to: ${targetLead.name} (${targetLead.company} • ${targetLead.industry})`
        : `Sent to: ${targetLead.name} (${targetLead.company})`;

      const logSentence = `[${timeStr}] Successfully sent ${chLabel} message to ${targetLead.name} (${targetLead.company}).`;
      setDispatchLogs(prev => [logSentence, ...prev.slice(0, 9)]);

      const newEntry: AuditLogEntry = {
        id: `tx-${Date.now()}-${current}-${targetLead.id}`,
        timestamp: timeStr,
        type: 'TRANSMISSION',
        channel,
        recipients: [targetLead.name],
        recipientDetails,
        recipientLeadId: targetLead.id,
        subjectSnippet: subject,
        messageBody: body,
        status: 'SENT',
        latency: '24ms',
        details: `Successfully sent ${chLabel} message to ${targetLead.name} (${targetLead.company}).`
      };

      // Functional updater preserves strictly sent entries
      setAuditLogs(prevLogs => [newEntry, ...prevLogs.filter(l => l.status === 'SENT')]);

      if (current >= total) {
        clearInterval(interval);
        setIsDispatching(false);
        setDispatchStatus('completed');
        soundEffects.playSuccessChime();

        // Keep those leads selected and keep their "Sent" status visible
        const dispatchedIds = new Set(recipientsToDispatch.map(r => r.id));
        setSelectedLeadIds(prev => new Set([...prev, ...dispatchedIds]));
        setSentLeadIds(prev => new Set([...prev, ...dispatchedIds]));

        // Set Clear Full-Sentence Confirmation Banner
        setConfirmationBanner({
          channel: chLabel,
          count: total,
          names: targetNames,
          timestamp: new Date().toLocaleTimeString()
        });

        // 35000 ms (35-second) auto-dismiss timer
        clearAutoResetTimer();
        autoResetTimerRef.current = setTimeout(() => {
          handleResetDispatchState();
        }, 35000);

        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#D95338', '#D4A359', '#38BDF8']
        });

        onAddToast?.({
          id: 'outreach-done-' + Date.now(),
          title: `${chLabel} Sent`,
          description: `Successfully sent ${chLabel} message to ${total} recipients: ${targetNames.join(', ')}.`,
          type: 'success',
          timestamp: new Date().toLocaleTimeString()
        });
      }
    }, 320);
  };

  // Multi-Command Clause Parser (Handles single-person multi-channel, multi-person clauses, and broadcast)
  const parseMultiCommand = (
    commandText: string,
    leadList: LeadRecord[],
    fallbackChannel: 'email' | 'linkedin' | 'sms' | 'whatsapp'
  ): MultiCommandClause[] => {
    const text = commandText.trim();
    if (!text) return [];

    const lower = text.toLowerCase();

    // STRICT RULE: Only target all 20 leads if the user explicitly says "all leads", "everyone", or "all records"
    const isExplicitBroadcast =
      lower.includes('all leads') ||
      lower.includes('all active leads') ||
      lower.includes('everyone') ||
      lower.includes('all records') ||
      lower.includes('broadcast to all') ||
      lower.includes('send to all leads') ||
      lower.includes('dispatch to all');

    // Extract any specific person name matches from the full command
    const allMatchedLeads = findMatchingLeads(text, leadList);

    // STRICT RULE: If any specific person's name is mentioned, NEVER send to the remaining 19 unselected leads
    const treatAsBroadcast = isExplicitBroadcast && allMatchedLeads.length === 0;

    // Detect all channels spoken in the command
    const detectedChannels: ('email' | 'linkedin' | 'sms' | 'whatsapp')[] = [];
    if (lower.includes('linkedin') || lower.includes('inmail')) detectedChannels.push('linkedin');
    if (lower.includes('whatsapp') || lower.includes('wa ') || lower.includes("what's app") || lower.includes('whats app')) detectedChannels.push('whatsapp');
    if (lower.includes('sms') || lower.includes('text') || lower.includes('phone message')) detectedChannels.push('sms');
    if (lower.includes('email') || lower.includes('mail')) detectedChannels.push('email');

    // If user says "all messages", "all channels", or "every message" to someone
    if (
      lower.includes('all message') ||
      lower.includes('all channels') ||
      lower.includes('every channel') ||
      lower.includes('every message') ||
      (lower.includes('all') && lower.includes('message'))
    ) {
      (['linkedin', 'whatsapp', 'sms', 'email'] as const).forEach(ch => {
        if (!detectedChannels.includes(ch)) detectedChannels.push(ch);
      });
    }

    const channelsToUse = detectedChannels.length > 0 ? detectedChannels : [fallbackChannel];

    // CASE 1: Single Person Target (e.g. "Send LinkedIn, WhatsApp, SMS and Email to Emma" or "Send to Emma")
    // Target strictly this 1 person across all detected channels - NEVER fall back to 20 leads
    if (allMatchedLeads.length === 1 && !treatAsBroadcast) {
      const singleLead = allMatchedLeads[0];
      return channelsToUse.map(ch => ({
        channel: ch,
        recipients: [singleLead],
        rawClause: `Send ${ch} to ${singleLead.name}`
      }));
    }

    // CASE 2: Multiple People Target (e.g. "Send email to Lucas and send SMS to Emma" or "Send SMS to Emma and Noah")
    if (allMatchedLeads.length > 1 && !treatAsBroadcast) {
      // Check if different clauses specify different channels
      const splitRegex = /(?:[,;]|\b(?:and\s+then|then|after\s+that)\b|\b(?:and|also)\s+(?=(?:send\s+)?(?:email|mail|sms|text|whatsapp|wa|linkedin|inmail|dispatch)\b))/i;
      const rawClauses = text.split(splitRegex).map(s => s.trim()).filter(Boolean);

      if (rawClauses.length > 1) {
        const clauseResults: MultiCommandClause[] = [];
        for (const rawClause of rawClauses) {
          const cLower = rawClause.toLowerCase();
          let cChannel = fallbackChannel;
          if (cLower.includes('whatsapp') || cLower.includes('wa ') || cLower.includes("what's app")) cChannel = 'whatsapp';
          else if (cLower.includes('linkedin') || cLower.includes('inmail')) cChannel = 'linkedin';
          else if (cLower.includes('sms') || cLower.includes('text')) cChannel = 'sms';
          else if (cLower.includes('email') || cLower.includes('mail')) cChannel = 'email';

          const clauseLeads = findMatchingLeads(rawClause, leadList);
          if (clauseLeads.length > 0) {
            clauseResults.push({
              channel: cChannel,
              recipients: clauseLeads,
              rawClause
            });
          }
        }

        if (clauseResults.length > 0) {
          return clauseResults;
        }
      }

      // If no discrete per-person clauses, all matched leads get all detected channels
      return channelsToUse.map(ch => ({
        channel: ch,
        recipients: allMatchedLeads,
        rawClause: text
      }));
    }

    // CASE 3: No Person Matched
    if (treatAsBroadcast) {
      return channelsToUse.map(ch => ({
        channel: ch,
        recipients: leadList,
        rawClause: text
      }));
    }

    // Safe Fallback: Target currently selected leads or the 1st lead. NEVER broadcast to all 20!
    const fallbackRecipients = selectedLeadIds.size > 0
      ? leadList.filter(d => selectedLeadIds.has(d.id))
      : [leadList[0]];

    return channelsToUse.map(ch => ({
      channel: ch,
      recipients: fallbackRecipients,
      rawClause: text
    }));
  };

  // Requirement 1: Stage Voice Command (Populate preview & require "Run" confirmation, NO immediate auto-send)
  const handleStageVoiceCommand = (commandText: string) => {
    setIsVoiceProcessing(true);
    clearAutoResetTimer();
    setConfirmationBanner(null);

    const clauses = parseMultiCommand(commandText, data, activeChannel);
    if (clauses.length === 0) {
      setIsVoiceProcessing(false);
      return;
    }

    const matchedIds = new Set<string>();
    clauses.forEach(c => c.recipients.forEach(r => matchedIds.add(r.id)));
    const matchedRecipients = Array.from(matchedIds).map(id => data.find(d => d.id === id)!).filter(Boolean);

    // Stage Card 1 selections
    setSelectedLeadIds(matchedIds);
    if (matchedRecipients.length > 0) {
      setPreviewLeadId(matchedRecipients[0].id);
    }

    // Stage Card 2 channel
    const primaryChannel = clauses[0].channel;
    setActiveChannel(primaryChannel);
    onChannelChange?.(primaryChannel);

    // Stage confirmation state
    setStagedClauses(clauses);
    setStagedCommandText(commandText);
    setIsAwaitingRunConfirmation(true);
    setIsTerminalOpen(true);

    const targetNames = matchedRecipients.map(r => r.name).join(', ');
    const channelNames = Array.from(new Set(clauses.map(c => getChannelDisplayName(c.channel)))).join(', ');

    addAuditLog({
      id: 'stage-' + Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      type: 'VOICE_STAGED',
      command: commandText,
      channel: primaryChannel,
      recipients: matchedRecipients.map(r => r.name),
      recipientDetails: `Target: ${targetNames} via [${channelNames}]`,
      status: 'STAGED',
      details: "Voice Intent Staged: Ready to run. Click Confirm & Run Dispatch or say 'Run'."
    });

    setLastVoiceSummary(`Staged: ${targetNames} via [${channelNames}]`);
    setIsVoiceProcessing(false);
  };

  // Requirement 1: Confirm and Execute the staged dispatch (Triggered when user clicks Run or says "Run")
  const handleConfirmAndExecuteDispatch = (commandOverride?: string) => {
    if (hasExecutedRef.current) return;
    hasExecutedRef.current = true;
    setTimeout(() => {
      hasExecutedRef.current = false;
    }, 1200);

    clearAutoResetTimer();
    setConfirmationBanner(null);
    setIsVoiceProcessing(true);

    let clausesToRun = stagedClauses;
    const cmdToRun = commandOverride || stagedCommandText;

    if (clausesToRun.length === 0 || commandOverride) {
      clausesToRun = parseMultiCommand(cmdToRun || 'Execute dispatch', data, activeChannel);
    }

    if (clausesToRun.length === 0) {
      setIsVoiceProcessing(false);
      return;
    }

    // Reset staging state
    setIsAwaitingRunConfirmation(false);
    setStagedClauses([]);
    setStagedCommandText('');

    executeClausesDispatch(clausesToRun, cmdToRun);
  };

  // Execute Dispatch Across Clauses and Update All States & Audit Logs
  const executeClausesDispatch = (clauses: MultiCommandClause[], commandTrigger?: string) => {
    const timeStr = new Date().toLocaleTimeString();
    const newSentMap: Record<string, SentMessageItem[]> = {};
    const newlyDispatchedLeadIds: string[] = [];
    const allDispatchedSummaries: string[] = [];
    const newAuditEntries: AuditLogEntry[] = [];

    // Push individual message transmissions first so latest dispatched message is at the top
    for (let cIdx = 0; cIdx < clauses.length; cIdx++) {
      const clause = clauses[cIdx];
      const chLabel = getChannelDisplayName(clause.channel);
      const tmpl = currentTemplates.find(t => t.channel === clause.channel) || currentTemplates[0];

      for (let rIdx = 0; rIdx < clause.recipients.length; rIdx++) {
        const lead = clause.recipients[rIdx];
        const { subject, body } = generatePersonalizedMessage(lead, tmpl.subject, tmpl.templateBody);

        const newItem: SentMessageItem = {
          channel: clause.channel,
          subject,
          message: body,
          timestamp: timeStr
        };

        if (!newSentMap[lead.id]) {
          newSentMap[lead.id] = [];
        }
        newSentMap[lead.id].push(newItem);

        if (!newlyDispatchedLeadIds.includes(lead.id)) {
          newlyDispatchedLeadIds.push(lead.id);
        }
        allDispatchedSummaries.push(`${lead.name} (${chLabel})`);

        const recipientDetails = isBirth
          ? `Sent to: ${lead.name} (${lead.company} • ${lead.industry})`
          : `Sent to: ${lead.name} (${lead.company})`;

        newAuditEntries.push({
          id: `tx-${Date.now()}-${cIdx}-${rIdx}-${lead.id}-${clause.channel}`,
          timestamp: timeStr,
          type: 'TRANSMISSION',
          channel: clause.channel,
          recipients: [lead.name],
          recipientDetails,
          recipientLeadId: lead.id,
          subjectSnippet: subject,
          messageBody: body,
          status: 'SENT',
          latency: `${Math.floor(Math.random() * 12) + 14}ms`,
          details: `Successfully sent ${chLabel} message to ${lead.name} (${lead.company}).`
        });
      }
    }

    // Functional updater preserves strictly verified sent message dispatches
    setAuditLogs(prevLogs => {
      const cleanSent = prevLogs.filter(l => l.status === 'SENT');
      return [...newAuditEntries, ...cleanSent];
    });

    // Cumulative Sent status tracking merged into arrays
    setSentRecords(prev => {
      const updated: Record<string, SentMessageItem[]> = { ...prev };
      Object.entries(newSentMap).forEach(([id, items]) => {
        updated[id] = [...(updated[id] || []), ...items];
      });
      return updated;
    });

    setSentLeadIds(prev => new Set([...prev, ...newlyDispatchedLeadIds]));
    setSelectedLeadIds(new Set(newlyDispatchedLeadIds));

    // Focus Card 3 on first dispatched lead and channel
    if (newlyDispatchedLeadIds.length > 0) {
      setPreviewLeadId(newlyDispatchedLeadIds[0]);
      setActiveChannel(clauses[0].channel);
      setSelectedSentChannel(clauses[0].channel);
    }

    setIsTerminalOpen(true);
    setDispatchStatus('completed');
    soundEffects.playSuccessChime();

    // Set Clear Full-Sentence Confirmation Banner with all channels & recipients
    const uniqueChannels = Array.from(new Set(clauses.map(c => getChannelDisplayName(c.channel)))).join(' & ');

    setConfirmationBanner({
      channel: uniqueChannels,
      count: newlyDispatchedLeadIds.length,
      names: allDispatchedSummaries,
      timestamp: timeStr
    });

    // 35-Second auto-reset timer
    clearAutoResetTimer();
    autoResetTimerRef.current = setTimeout(() => {
      handleResetDispatchState();
    }, 35000);

    confetti({
      particleCount: 110,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#D95338', '#D4A359', '#38BDF8', '#34D399']
    });

    onAddToast?.({
      id: 'outreach-multi-' + Date.now(),
      title: 'Dispatches Delivered',
      description: `Dispatched ${newAuditEntries.filter(e => e.type === 'TRANSMISSION').length} message(s): ${allDispatchedSummaries.join(', ')}`,
      type: 'success',
      timestamp: timeStr
    });

    setLastVoiceSummary(`Dispatched: ${allDispatchedSummaries.join(', ')}`);
    setIsVoiceProcessing(false);
  };

  const getChannelIcon = (ch: 'email' | 'linkedin' | 'sms' | 'whatsapp') => {
    switch (ch) {
      case 'email': 
        return <Mail className="w-4 h-4 text-terracotta" />;
      case 'linkedin': 
        return (
          <svg className="w-4 h-4 text-blue-400 fill-current" viewBox="0 0 24 24">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
          </svg>
        );
      case 'whatsapp':
        return (
          <svg className="w-4 h-4 text-emerald-400 fill-current" viewBox="0 0 24 24">
            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.24-.74-.66-1.24-1.48-1.39-1.73-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44s-.56-1.36-.77-1.86c-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29z"/>
          </svg>
        );
      case 'sms': 
        return <MessageSquare className="w-4 h-4 text-gold" />;
    }
  };

  // Active lead currently being previewed in Card 3 (supports inspecting leads without toggling selection)
  const activePreviewLead: LeadRecord | null = useMemo(() => {
    if (previewLeadId) {
      const found = data.find(d => d.id === previewLeadId);
      if (found) return found;
    }
    if (targetLeads.length > 0) {
      const idx = Math.min(Math.max(0, previewIndex), targetLeads.length - 1);
      return targetLeads[idx] || null;
    }
    return data[0] || null;
  }, [previewLeadId, data, targetLeads, previewIndex]);

  const safeIndex = useMemo(() => {
    if (!activePreviewLead || targetLeads.length === 0) return 0;
    const idx = targetLeads.findIndex(d => d.id === activePreviewLead.id);
    return idx >= 0 ? idx : Math.min(Math.max(0, previewIndex), targetLeads.length - 1);
  }, [activePreviewLead, targetLeads, previewIndex]);

  const activeLeadSentItems: SentMessageItem[] = useMemo(() => {
    if (!activePreviewLead) return [];
    return sentRecords[activePreviewLead.id] || [];
  }, [activePreviewLead, sentRecords]);

  // Which sent item to preview (if multiple channels sent to this lead)
  const activeSentItem: SentMessageItem | null = useMemo(() => {
    if (activeLeadSentItems.length === 0) return null;
    if (selectedSentChannel) {
      const match = activeLeadSentItems.find(it => it.channel === selectedSentChannel);
      if (match) return match;
    }
    return activeLeadSentItems[0];
  }, [activeLeadSentItems, selectedSentChannel]);

  const currentPreview: GeneratedOutreach | null = useMemo(() => {
    if (!activePreviewLead) return null;

    if (activeSentItem) {
      return {
        leadId: activePreviewLead.id,
        leadName: activePreviewLead.name,
        company: activePreviewLead.company,
        email: activePreviewLead.email,
        dealValue: activePreviewLead.dealValue,
        channel: activeSentItem.channel,
        personalizedSubject: activeSentItem.subject,
        personalizedBody: activeSentItem.message,
        status: 'sent'
      };
    }

    const personalized = generatePersonalizedMessage(activePreviewLead, customSubject, customBody);
    return {
      leadId: activePreviewLead.id,
      leadName: activePreviewLead.name,
      company: activePreviewLead.company,
      email: activePreviewLead.email,
      dealValue: activePreviewLead.dealValue,
      channel: activeChannel,
      personalizedSubject: personalized.subject,
      personalizedBody: personalized.body,
      status: 'queued'
    };
  }, [activePreviewLead, activeSentItem, customSubject, customBody, activeChannel]);

  return (
    <div className="w-full space-y-6 pb-8">
      {/* 3D Voice Command Bar directly embedded for Tab 3 Bulk Outreach Studio */}
      <VoiceCommandBar
        onExecuteCommand={handleConfirmAndExecuteDispatch}
        onStageCommand={handleStageVoiceCommand}
        isAwaitingConfirmation={isAwaitingRunConfirmation}
        isProcessing={isVoiceProcessing}
        lastActionSummary={lastVoiceSummary}
        chips={outreachVoiceChips}
        resetSignal={resetSignal}
      />

      {/* 3-Step Visual Progress Stepper Header */}
      <div className="bg-stone-card p-4 rounded-2xl border border-border-gold shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs">
          {/* Step 1 Pill */}
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-terracotta text-white font-mono text-xs flex items-center justify-center font-bold shadow-md shadow-terracotta/30">
              1
            </span>
            <div className="flex flex-col whitespace-normal break-words">
              <span className="font-semibold text-white whitespace-normal break-words">Target Leads</span>
              <span className="text-[10px] text-sand-muted font-mono whitespace-normal break-words">
                {selectedLeadIds.size > 0 ? `${selectedLeadIds.size} Target(s) Selected` : `All ${data.length} Active`}
              </span>
            </div>
          </div>

          <ArrowRight className="w-4 h-4 text-border-gold hidden sm:block" />

          {/* Step 2 Pill */}
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-terracotta/20 border border-terracotta text-terracotta font-mono text-xs flex items-center justify-center font-bold">
              2
            </span>
            <div className="flex flex-col whitespace-normal break-words">
              <span className="font-semibold text-white whitespace-normal break-words">Channel &amp; Copy</span>
              <span className="text-[10px] text-gold font-mono uppercase whitespace-normal break-words">
                {getChannelDisplayName(activeChannel)}
              </span>
            </div>
          </div>

          <ArrowRight className="w-4 h-4 text-border-gold hidden sm:block" />

          {/* Step 3 Pill */}
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-gold/20 border border-gold text-gold font-mono text-xs flex items-center justify-center font-bold">
              3
            </span>
            <div className="flex flex-col whitespace-normal break-words">
              <span className="font-semibold text-white whitespace-normal break-words">Preview &amp; Dispatch</span>
              <span className="text-[10px] text-emerald-400 font-mono whitespace-normal break-words">
                {generatedMessages.length} Messages Ready
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono text-sand-muted flex items-center gap-1.5 bg-charcoal px-3 py-1.5 rounded-xl border border-border-gold whitespace-normal break-words">
            <Sparkles className="w-3.5 h-3.5 text-gold" />
            Autonomous Outreach Studio
          </span>
        </div>
      </div>

      {/* 3-Step Clear Visual Layout Grid: Exactly Equal Heights (h-[560px] flex flex-col justify-between) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* ======================================================== */}
        {/* STEP 1: Target Lead Selection (Column 1 of 3) */}
        {/* ======================================================== */}
        <div>
          <div className="luxury-card p-5 rounded-2xl border-border-gold h-[560px] flex flex-col justify-between shadow-xl">
            {/* Card 1 Top: Header & Search */}
            <div className="space-y-3 shrink-0">
              <div className="flex items-center justify-between border-b border-border-gold/40 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-terracotta/20 border border-terracotta text-terracotta text-xs font-bold flex items-center justify-center font-mono shadow-sm">
                    1
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Target Leads
                    </h3>
                    <p className="text-[10px] text-sand-muted font-sans whitespace-normal break-words">
                      Click lead to preview or speak names
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-gold bg-charcoal px-2.5 py-1 rounded-lg border border-border-gold font-bold whitespace-normal break-words">
                  {selectedLeadIds.size > 0 ? `${selectedLeadIds.size} Selected` : `All ${data.length} Active`}
                </span>
              </div>

              {/* Search Bar Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-sand-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search leads by name, company, stage..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-charcoal text-white text-xs pl-8 pr-7 py-2 rounded-xl border border-border-gold/80 focus:outline-none focus:border-gold placeholder:text-sand-muted/50 transition-all whitespace-normal break-words"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sand-muted hover:text-white cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Card 1 Middle: Scrollable Lead List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-3 custom-scrollbar">
              {filteredData.length === 0 ? (
                <div className="p-8 text-center text-xs text-sand-muted space-y-1 whitespace-normal break-words">
                  <p>No matching leads found for "{searchTerm}".</p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-gold text-[10px] hover:underline cursor-pointer"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                filteredData.map((lead) => {
                  const isChecked = selectedLeadIds.has(lead.id);
                  const leadSentItems = sentRecords[lead.id] || [];
                  const isSent = leadSentItems.length > 0 || sentLeadIds.has(lead.id);
                  const sentChannel = leadSentItems.length > 0 ? leadSentItems[0].channel : (isSent ? activeChannel : null);
                  const isPreviewing = activePreviewLead?.id === lead.id;
                  return (
                    <div
                      key={lead.id}
                      onClick={() => handleInspectLead(lead)}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-start gap-2.5 cursor-pointer group whitespace-normal break-words ${
                        isPreviewing
                          ? 'bg-stone-surface border-gold ring-2 ring-gold/70 shadow-lg text-white'
                          : isChecked
                          ? 'bg-stone-surface/80 border-terracotta ring-1 ring-terracotta/70 shadow-md text-white'
                          : 'bg-charcoal/70 border-border-gold/70 hover:border-gold/50 text-sand-subtext hover:text-white'
                      }`}
                    >
                      {/* Multi-Select Checkbox - ONLY clicking here toggles selection */}
                      <div 
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
                          isChecked 
                            ? isSent
                              ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                              : 'bg-terracotta border-terracotta text-white shadow-sm' 
                            : 'bg-charcoal border-border-gold text-transparent group-hover:border-gold'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleLeadCheckbox(lead);
                        }}
                        title={isChecked ? 'Click to deselect' : 'Click to select'}
                      >
                        <CheckSquare className={`w-3.5 h-3.5 ${isChecked ? 'block' : 'opacity-0'}`} />
                      </div>

                      {/* Fully Visible Contact Info */}
                      <div className="min-w-0 flex-1 space-y-0.5 whitespace-normal break-words">
                        <div className="flex flex-wrap items-baseline justify-between gap-1 whitespace-normal break-words">
                          <span className="font-semibold text-white text-xs whitespace-normal break-words">
                            {lead.name}
                          </span>
                          <span className="text-[10px] font-mono text-gold shrink-0 font-bold whitespace-normal break-words">
                            {isBirth ? `${lead.dealValue}g` : isBudget ? `$${lead.dealValue.toLocaleString()}` : `$${lead.dealValue.toLocaleString()}`}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-sand-muted whitespace-normal break-words">
                          <span className="whitespace-normal break-words">{lead.company}</span>
                          <span className={`uppercase font-mono text-[9px] px-2 py-0.5 rounded shrink-0 font-bold whitespace-normal break-words flex items-center gap-1 border ${
                            isSent
                              ? sentChannel === 'linkedin' ? 'bg-blue-950/80 text-blue-300 border-blue-500/50 shadow-sm' :
                                sentChannel === 'whatsapp' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-sm' :
                                sentChannel === 'sms' ? 'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-sm' :
                                'bg-terracotta/20 text-terracotta border-terracotta/50 shadow-sm'
                              : isChecked
                              ? 'bg-terracotta/20 text-terracotta border border-terracotta/40'
                              : 'bg-charcoal border border-border-gold text-sand-muted'
                          }`}>
                            {isSent ? (
                              <>
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                <span>
                                  {leadSentItems.length > 1
                                    ? `${leadSentItems.length} CHANNELS SENT ✓`
                                    : sentChannel
                                    ? `${sentChannel.toUpperCase()} SENT ✓`
                                    : 'SENT ✓'}
                                </span>
                              </>
                            ) : isChecked ? (
                              'SELECTED'
                            ) : (
                              lead.stage
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Card 1 Bottom: Toolbar Footer */}
            <div className="pt-2.5 border-t border-border-gold/40 flex items-center justify-between text-xs shrink-0">
              <span className="text-[11px] font-mono text-sand-muted whitespace-normal break-words">
                {selectedLeadIds.size > 0 ? `${selectedLeadIds.size} of ${data.length} selected` : `All ${data.length} in audience`}
              </span>
              <button
                onClick={handleToggleSelectAll}
                className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-charcoal border border-border-gold hover:border-gold text-gold hover:text-white transition-all cursor-pointer font-medium whitespace-normal break-words"
              >
                {selectedLeadIds.size === data.length ? 'Deselect All' : selectedLeadIds.size > 0 ? 'Clear Selection' : 'Select All'}
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* STEP 2: Channel & Template Selection (Column 2 of 3) */}
        {/* ======================================================== */}
        <div>
          <div className="luxury-card p-5 rounded-2xl border-border-gold h-[560px] flex flex-col justify-between shadow-xl">
            {/* Card 2 Top: Header */}
            <div className="flex items-center justify-between border-b border-border-gold/40 pb-2.5 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-terracotta/20 border border-terracotta text-terracotta text-xs font-bold flex items-center justify-center font-mono shadow-sm">
                  2
                </span>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Channel &amp; Copy
                  </h3>
                  <p className="text-[10px] text-sand-muted font-sans whitespace-normal break-words">
                    Delivery channel &amp; template
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-gold uppercase bg-charcoal px-2.5 py-1 rounded-lg border border-border-gold font-bold whitespace-normal break-words">
                {activeChannel}
              </span>
            </div>

            {/* Card 2 Middle: Scrollable Channel buttons & Inputs */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 my-2 custom-scrollbar">
              {/* 4 Branded Channel Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSelectChannel('email')}
                  className={`p-2.5 rounded-xl border text-xs flex flex-col items-start gap-1 transition-all cursor-pointer whitespace-normal break-words ${
                    activeChannel === 'email'
                      ? 'bg-terracotta text-white border-terracotta shadow-md shadow-terracotta/30'
                      : 'bg-charcoal text-sand-subtext border-border-gold hover:border-gold'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email</span>
                  </div>
                  <span className="text-[10px] opacity-80 font-mono">Direct Message</span>
                </button>

                <button
                  onClick={() => handleSelectChannel('linkedin')}
                  className={`p-2.5 rounded-xl border text-xs flex flex-col items-start gap-1 transition-all cursor-pointer whitespace-normal break-words ${
                    activeChannel === 'linkedin'
                      ? 'bg-blue-600/30 text-blue-300 border-blue-400 shadow-md ring-1 ring-blue-400'
                      : 'bg-charcoal text-sand-subtext border-border-gold hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold">
                    {getChannelIcon('linkedin')}
                    <span>LinkedIn InMail</span>
                  </div>
                  <span className="text-[10px] opacity-80 font-mono">Direct Message</span>
                </button>

                <button
                  onClick={() => handleSelectChannel('whatsapp')}
                  className={`p-2.5 rounded-xl border text-xs flex flex-col items-start gap-1 transition-all cursor-pointer whitespace-normal break-words ${
                    activeChannel === 'whatsapp'
                      ? 'bg-emerald-600/30 text-emerald-300 border-emerald-400 shadow-md ring-1 ring-emerald-400'
                      : 'bg-charcoal text-sand-subtext border-border-gold hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold">
                    {getChannelIcon('whatsapp')}
                    <span>WhatsApp Direct</span>
                  </div>
                  <span className="text-[10px] opacity-80 font-mono">Direct Message</span>
                </button>

                <button
                  onClick={() => handleSelectChannel('sms')}
                  className={`p-2.5 rounded-xl border text-xs flex flex-col items-start gap-1 transition-all cursor-pointer whitespace-normal break-words ${
                    activeChannel === 'sms'
                      ? 'bg-amber-600/30 text-gold border-gold shadow-md ring-1 ring-gold'
                      : 'bg-charcoal text-sand-subtext border-border-gold hover:border-gold'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold">
                    {getChannelIcon('sms')}
                    <span>SMS Alert</span>
                  </div>
                  <span className="text-[10px] opacity-80 font-mono">Direct Message</span>
                </button>
              </div>

              {/* Preset Sequences */}
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-sand-muted block uppercase tracking-wider">
                  Preset Sequences:
                </span>
                <div className="space-y-1">
                  {currentTemplates.map(tmpl => (
                    <button
                      key={tmpl.id}
                      onClick={() => handleSelectTemplate(tmpl)}
                      className={`w-full text-left p-2 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer whitespace-normal break-words ${
                        selectedTemplateId === tmpl.id
                          ? 'bg-charcoal border-gold text-white font-medium shadow-sm'
                          : 'bg-stone-surface/40 border-border-gold/60 text-sand-muted hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 whitespace-normal break-words">
                        {getChannelIcon(tmpl.channel)}
                        <span className="whitespace-normal break-words">{tmpl.name}</span>
                      </div>
                      <span className="uppercase text-[9px] font-mono text-sand-muted px-1.5 py-0.5 rounded bg-charcoal border border-border-gold shrink-0">
                        {tmpl.channel}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject & Body */}
              <div className="space-y-2 pt-1">
                <div>
                  <label className="text-[11px] text-sand-muted font-medium mb-1 block">Subject Line</label>
                  <input
                    type="text"
                    value={customSubject}
                    onChange={e => setCustomSubject(e.target.value)}
                    className="w-full bg-charcoal text-white text-xs px-3 py-2 rounded-xl border border-border-gold/80 focus:outline-none focus:border-gold whitespace-normal break-words"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-sand-muted font-medium mb-1 block">Message Content</label>
                  <textarea
                    rows={4}
                    value={customBody}
                    onChange={e => setCustomBody(e.target.value)}
                    className="w-full bg-charcoal text-white text-xs p-3 rounded-xl border border-border-gold/80 focus:outline-none focus:border-gold font-sans leading-relaxed resize-none whitespace-normal break-words"
                  />
                </div>
              </div>
            </div>

            {/* Card 2 Bottom: Dynamic Variables Footer */}
            <div className="pt-2.5 border-t border-border-gold/40 flex items-center justify-between text-xs shrink-0">
              <span className="text-[10px] font-mono uppercase text-sand-muted">Variables:</span>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-gold">
                <span className="bg-charcoal px-2 py-0.5 rounded border border-border-gold">{"{{Name}}"}</span>
                <span className="bg-charcoal px-2 py-0.5 rounded border border-border-gold">{"{{Company}}"}</span>
                <span className="bg-charcoal px-2 py-0.5 rounded border border-border-gold">{"{{Deal_Value}}"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* STEP 3: Live Message Preview & Auto-Dispatch (Column 3 of 3) */}
        {/* ======================================================== */}
        <div>
          <div className="luxury-card p-5 rounded-2xl border-border-gold h-[560px] flex flex-col justify-between shadow-xl">
            {/* Card 3 Top: Header with Prev/Next switcher */}
            <div className="flex items-center justify-between border-b border-border-gold/40 pb-2.5 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-terracotta/20 border border-terracotta text-terracotta text-xs font-bold flex items-center justify-center font-mono shadow-sm">
                  3
                </span>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Preview &amp; Dispatch
                  </h3>
                  <p className="text-[10px] font-sans whitespace-normal break-words flex items-center gap-1">
                    {currentPreview && sentLeadIds.has(currentPreview.leadId) ? (
                      <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Sent to {currentPreview.leadName} ({safeIndex + 1} of {targetLeads.length})
                      </span>
                    ) : (
                      <span className="text-sand-muted">
                        {targetLeads.length > 0 ? `Showing recipient ${safeIndex + 1} of ${targetLeads.length}` : 'Personalized message'}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Prev / Next record navigation buttons */}
              {targetLeads.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      const newIdx = Math.max(0, safeIndex - 1);
                      setPreviewIndex(newIdx);
                      if (targetLeads[newIdx]) {
                        setPreviewLeadId(targetLeads[newIdx].id);
                      }
                      soundEffects.playListeningClick();
                    }}
                    disabled={safeIndex === 0}
                    className="p-1 rounded-lg bg-charcoal border border-border-gold text-sand-subtext hover:text-white disabled:opacity-30 cursor-pointer"
                    title="Previous Record"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono text-gold px-1 font-bold whitespace-normal break-words">
                    {safeIndex + 1} of {targetLeads.length}
                  </span>
                  <button
                    onClick={() => {
                      const newIdx = Math.min(targetLeads.length - 1, safeIndex + 1);
                      setPreviewIndex(newIdx);
                      if (targetLeads[newIdx]) {
                        setPreviewLeadId(targetLeads[newIdx].id);
                      }
                      soundEffects.playListeningClick();
                    }}
                    disabled={safeIndex >= targetLeads.length - 1}
                    className="p-1 rounded-lg bg-charcoal border border-border-gold text-sand-subtext hover:text-white disabled:opacity-30 cursor-pointer"
                    title="Next Record"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Card 3 Middle: Scrollable Live Message Preview & Confirmation Banner */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 my-2 custom-scrollbar">
              {/* Full-Sentence Confirmation Banner with Done button & Auto-Dismiss */}
              {confirmationBanner && (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500 shadow-xl space-y-1.5 animate-in fade-in duration-200">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-emerald-300 font-mono whitespace-normal break-words leading-relaxed">
                          Successfully sent {confirmationBanner.channel} message to {confirmationBanner.count} recipients: {confirmationBanner.names.join(', ')}
                        </div>
                        <p className="text-[10px] text-emerald-200/80 whitespace-normal break-words">
                          All {confirmationBanner.count} messages delivered.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleResetDispatchState}
                      className="px-2.5 py-1 rounded bg-emerald-900 border border-emerald-400 text-emerald-200 hover:text-white text-[10px] font-mono font-bold transition-all cursor-pointer shrink-0"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

              {/* Requirement 1: Staged Confirmation Prompt (Requires Run confirmation before auto-dispatch) */}
              {isAwaitingRunConfirmation && stagedCommandText && (
                <div className="p-3.5 rounded-xl bg-gold/15 border border-gold/70 shadow-xl flex items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Sparkles className="w-4 h-4 text-gold shrink-0 animate-bounce" />
                    <div className="min-w-0 text-xs space-y-0.5">
                      <span className="font-bold text-white font-mono block">
                        Awaiting Execution Confirmation
                      </span>
                      <p className="text-sand-subtext text-[11px] whitespace-normal break-words">
                        "{stagedCommandText}" — Say <span className="text-gold font-bold font-mono">"Run"</span> or click <span className="text-gold font-bold font-mono">Run</span> to dispatch.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleConfirmAndExecuteDispatch()}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono shrink-0 shadow-md cursor-pointer transition-all flex items-center gap-1.5 animate-pulse"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Run Now</span>
                  </button>
                </div>
              )}

              {/* Requirement 3: Clickable Channel Tabs for Multi-Channel Deliveries to a single person */}
              {activeLeadSentItems.length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-charcoal rounded-xl border border-border-gold/80">
                  <span className="text-[10px] font-mono uppercase text-sand-muted px-1.5 font-bold">
                    Delivered Channels ({activeLeadSentItems.length}):
                  </span>
                  {activeLeadSentItems.map(item => {
                    const isSelected = activeSentItem?.channel === item.channel;
                    return (
                      <button
                        key={item.channel}
                        onClick={() => {
                          setSelectedSentChannel(item.channel);
                          soundEffects.playListeningClick();
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? item.channel === 'linkedin' ? 'bg-blue-600 text-white shadow-md ring-1 ring-blue-300' :
                              item.channel === 'whatsapp' ? 'bg-emerald-600 text-white shadow-md ring-1 ring-emerald-300' :
                              item.channel === 'sms' ? 'bg-amber-600 text-white shadow-md ring-1 ring-amber-300' :
                              'bg-terracotta text-white shadow-md ring-1 ring-terracotta-light'
                            : 'bg-stone-surface text-sand-subtext hover:text-white border border-border-gold/40'
                        }`}
                      >
                        {getChannelIcon(item.channel)}
                        <span className="uppercase">{item.channel}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Channel-Authentic Message Simulation */}
              {!currentPreview ? (
                <div className="p-12 text-center text-xs text-sand-muted whitespace-normal break-words">
                  No record selected for preview.
                </div>
              ) : currentPreview.channel === 'email' ? (
                <div className="rounded-xl border border-border-gold bg-charcoal overflow-hidden shadow-xl">
                  <div className="bg-stone-surface px-3 py-2 border-b border-border-gold flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                      <span className="text-[10px] font-mono text-sand-muted ml-2">Email Preview</span>
                    </div>
                    <span className="text-[10px] font-mono text-terracotta bg-terracotta/15 px-2 py-0.5 rounded border border-terracotta/30 font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                      <Mail className="w-3 h-3 text-terracotta" />
                      {activeSentItem ? 'EMAIL (SENT ✓)' : 'EMAIL'}
                    </span>
                  </div>
                  <div className="p-3.5 space-y-2 text-xs whitespace-normal break-words">
                    <div className="flex flex-wrap items-baseline justify-between border-b border-border-gold/30 pb-2 text-[11px] gap-2">
                      <div className="flex flex-wrap items-center gap-1.5 text-sand-muted">
                        <span>To:</span>
                        <span className="text-white font-bold">{currentPreview.leadName}</span>
                        <span className="text-gold font-medium">({currentPreview.company})</span>
                        <span className="text-sand-dark">&lt;{currentPreview.email}&gt;</span>
                      </div>
                      <span className="text-gold font-mono text-[10px] shrink-0 font-bold">
                        {isBirth ? `${currentPreview.dealValue}g` : isBudget ? `$${currentPreview.dealValue.toLocaleString()}` : `$${currentPreview.dealValue.toLocaleString()}`}
                      </span>
                    </div>
                    <div className="font-semibold text-white text-xs whitespace-normal break-words">
                      {currentPreview.personalizedSubject}
                    </div>
                    <div className="text-sand-subtext whitespace-pre-line text-xs font-sans leading-relaxed pt-1 whitespace-normal break-words">
                      {currentPreview.personalizedBody}
                    </div>
                  </div>
                </div>
              ) : currentPreview.channel === 'whatsapp' ? (
                <div className="rounded-xl border border-emerald-900/60 bg-[#0B141A] overflow-hidden shadow-xl">
                  <div className="bg-[#1F2C34] px-3.5 py-2.5 border-b border-emerald-900/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-600/30 border border-emerald-500 flex items-center justify-center shrink-0">
                        {getChannelIcon('whatsapp')}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white flex items-center gap-1.5 whitespace-normal break-words">
                          <span>{currentPreview.leadName}</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                        <span className="text-[10px] text-gold font-mono block">
                          {currentPreview.company}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/90 px-2.5 py-1 rounded-md border border-emerald-500/50 font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                      {getChannelIcon('whatsapp')}
                      {activeSentItem ? 'WHATSAPP (SENT ✓)' : 'WHATSAPP DIRECT'}
                    </span>
                  </div>
                  <div className="p-3.5 space-y-2 whitespace-normal break-words">
                    <div className="ml-auto max-w-[92%] bg-[#005C4B] text-white p-3 rounded-2xl rounded-tr-none text-xs leading-relaxed shadow-md whitespace-normal break-words">
                      <p className="whitespace-pre-line whitespace-normal break-words">{currentPreview.personalizedBody}</p>
                      <div className="flex items-center justify-end gap-1.5 mt-1 text-[9px] text-emerald-200/80 font-mono">
                        <span>{activeSentItem?.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-cyan-300 font-bold">✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : currentPreview.channel === 'linkedin' ? (
                <div className="rounded-xl border border-blue-900/60 bg-[#0E1626] overflow-hidden shadow-xl">
                  <div className="bg-[#1B2738] px-3.5 py-2.5 border-b border-blue-900/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-400 flex items-center justify-center shrink-0">
                        {getChannelIcon('linkedin')}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white flex items-center gap-1.5 whitespace-normal break-words">
                          <span>{currentPreview.leadName}</span>
                        </div>
                        <span className="text-[10px] text-gold block font-mono">
                          {currentPreview.company}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-blue-300 bg-blue-950/90 px-2.5 py-1 rounded-md border border-blue-400/50 font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                      {getChannelIcon('linkedin')}
                      {activeSentItem ? 'LINKEDIN (SENT ✓)' : 'LINKEDIN INMAIL'}
                    </span>
                  </div>
                  <div className="p-3.5 space-y-2 text-xs whitespace-normal break-words">
                    <div className="text-white font-semibold text-xs border-b border-blue-900/40 pb-1.5 whitespace-normal break-words">
                      {currentPreview.personalizedSubject}
                    </div>
                    <div className="text-sand-subtext whitespace-pre-line leading-relaxed font-sans text-xs whitespace-normal break-words">
                      {currentPreview.personalizedBody}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-900/50 bg-charcoal overflow-hidden shadow-xl">
                  <div className="bg-stone-surface px-3.5 py-2.5 border-b border-border-gold flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-gold shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-white block whitespace-normal break-words">{currentPreview.leadName}</span>
                        <span className="text-[10px] text-gold font-mono block">{currentPreview.company}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-gold bg-amber-950/60 px-2.5 py-1 rounded-md border border-gold/40 font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                      <Smartphone className="w-3.5 h-3.5 text-gold" />
                      {activeSentItem ? 'SMS (SENT ✓)' : 'SMS ALERT'}
                    </span>
                  </div>
                  <div className="p-3.5 space-y-2 whitespace-normal break-words">
                    <div className="ml-auto max-w-[92%] bg-stone-surface border border-border-gold text-sand-subtext p-3 rounded-2xl rounded-tr-none text-xs leading-relaxed shadow-md whitespace-normal break-words">
                      <p className="whitespace-pre-line text-white whitespace-normal break-words">{currentPreview.personalizedBody}</p>
                      <div className="text-right text-[9px] text-gold font-mono mt-1">
                        {activeSentItem ? `Delivered at ${activeSentItem.timestamp}` : 'Ready for dispatch'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Card 3 Bottom: Dispatch Button OR Completed State Badge */}
            <div className="pt-2.5 border-t border-border-gold/40 space-y-2 shrink-0">
              {sentLeadIds.size > 0 ? (
                /* Sleek completion state bar that maintains exact 3-column symmetry */
                <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/70 shadow-lg flex items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-md bg-emerald-600/30 border border-emerald-500 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-mono font-bold text-emerald-300 block truncate">
                        ✓ Dispatched to {sentLeadIds.size} {sentLeadIds.size === 1 ? 'recipient' : 'recipients'}
                      </span>
                      <span className="text-[10px] text-emerald-200/70 font-mono block truncate">
                        Transmission verified · Live in audit trail
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleResetDispatchState}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-400/60 text-white text-[11px] font-mono font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-sm"
                  >
                    <RotateCcw className="w-3 h-3 text-emerald-300" />
                    <span>New Dispatch</span>
                  </button>
                </div>
              ) : isAwaitingRunConfirmation ? (
                <button
                  onClick={() => handleConfirmAndExecuteDispatch()}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 px-4 rounded-xl text-xs font-bold tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/40 cursor-pointer uppercase transition-all animate-pulse ring-2 ring-emerald-400"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    Confirm &amp; Run Dispatch ({stagedClauses.length} {stagedClauses.length === 1 ? 'Message' : 'Messages'})
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => executeAutoDispatch(targetLeads, activeChannel)}
                  disabled={isDispatching || generatedMessages.length === 0}
                  className="w-full btn-terracotta py-3 px-4 rounded-xl text-xs font-bold tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-terracotta/30 disabled:opacity-50 cursor-pointer uppercase transition-all whitespace-normal break-words"
                >
                  {isDispatching ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Transmitting Dispatch ({dispatchProgress}%)</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>
                        Execute Dispatch ({targetLeads.length} {targetLeads.length === 1 ? 'Message' : 'Messages'})
                      </span>
                    </>
                  )}
                </button>
              )}

              {/* Dispatch progress bar */}
              {isDispatching && (
                <div className="w-full bg-charcoal h-2 rounded-full overflow-hidden border border-border-gold">
                  <div
                    className="bg-gradient-to-r from-terracotta via-gold to-amber-400 h-full transition-all duration-300"
                    style={{ width: `${dispatchProgress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* DEDICATED LIVE EXECUTION TERMINAL / COMMAND AUDIT TRAIL */}
      {/* ======================================================== */}
      <div className="bg-[#0B0907] rounded-2xl border border-border-gold/80 overflow-hidden shadow-2xl transition-all">
        {/* Terminal Header */}
        <div 
          onClick={() => setIsTerminalOpen(prev => !prev)}
          className="bg-[#141210] px-4 py-3 border-b border-border-gold/60 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-[#181614] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80 shadow-sm" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80 shadow-sm" />
              <span className="w-3 h-3 rounded-full bg-green-500/80 shadow-sm" />
            </div>
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-gold" />
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider whitespace-normal break-words">
                Live Dispatch &amp; Command Audit Trail
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[10px] font-mono text-sand-muted whitespace-normal break-words">
              {visibleLogs.length} {visibleLogs.length === 1 ? 'Dispatch' : 'Dispatches'}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setAuditLogs([]);
              }}
              className="px-2 py-0.5 rounded bg-charcoal border border-border-gold hover:border-gold text-sand-muted hover:text-white text-[10px] font-mono transition-all cursor-pointer whitespace-normal break-words"
              title="Clear Terminal Logs"
            >
              Clear
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsTerminalOpen(prev => !prev);
              }}
              className="p-1 rounded bg-charcoal border border-border-gold hover:border-gold text-gold hover:text-white transition-all cursor-pointer flex items-center gap-1 text-[10px] font-mono whitespace-normal break-words"
            >
              <span>{isTerminalOpen ? 'Collapse' : 'Expand'}</span>
              {isTerminalOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Collapsed Minimalist 1-Line Status Bar (No truncation) */}
        {!isTerminalOpen && (
          <div 
            onClick={() => setIsTerminalOpen(true)}
            className="px-4 py-2.5 bg-[#070605] flex flex-wrap items-center justify-between text-[11px] font-mono text-sand-muted cursor-pointer hover:bg-[#0c0a08] transition-colors gap-2"
          >
            <div className="flex flex-wrap items-center gap-2 whitespace-normal break-words">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                visibleLogs.length > 0 
                  ? 'bg-emerald-400 animate-pulse' 
                  : 'bg-gold/60'
              }`} />
              <span className="text-gold font-bold shrink-0">AUDIT TRAIL:</span>
              <span className="text-sand-subtext whitespace-normal break-words">
                {visibleLogs.length > 0 ? (
                  <>
                    <span>
                      [{visibleLogs[0].timestamp}] [{visibleLogs[0].channel.toUpperCase()}]{' '}
                      {visibleLogs[0].recipientDetails || visibleLogs[0].details}
                    </span>
                    <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/50">
                      SENT ✓
                    </span>
                  </>
                ) : (
                  'Ready for dispatches · History clean'
                )}
              </span>
            </div>
            <span className="text-[10px] text-gold hover:underline shrink-0 font-medium">
              Expand audit stream ({visibleLogs.length} {visibleLogs.length === 1 ? 'record' : 'records'}) &rarr;
            </span>
          </div>
        )}

        {/* Terminal Output Window (Expanded) (No truncation, full structured entries) */}
        {isTerminalOpen && (
          <div className="p-3 md:p-4 font-mono text-[11px] space-y-2 max-h-80 overflow-y-auto bg-[#070605] custom-scrollbar animate-in fade-in duration-200">
            {visibleLogs.length === 0 ? (
              <div className="p-8 text-center text-sand-muted whitespace-normal break-words">
                History is empty. Dispatched voice and manual messages will appear here with clean SENT ✓ telemetry.
              </div>
            ) : (
              visibleLogs.map((log) => {
                const isSelectedForPreview = activePreviewLead?.id === log.recipientLeadId;
                const channelBadgeStyle =
                  log.channel === 'linkedin' ? 'bg-blue-950/90 text-blue-300 border-blue-500/60' :
                  log.channel === 'whatsapp' ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60' :
                  log.channel === 'sms' ? 'bg-amber-950/90 text-amber-300 border-amber-500/60' :
                  'bg-terracotta/20 text-terracotta border-terracotta/60';

                return (
                  <div
                    key={log.id}
                    onClick={() => {
                      if (log.recipientLeadId) {
                        handleInspectLeadById(log.recipientLeadId, log.channel);
                      }
                    }}
                    className={`p-3 rounded-xl border transition-all text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 cursor-pointer group whitespace-normal break-words ${
                      isSelectedForPreview
                        ? 'bg-stone-surface border-gold ring-1 ring-gold/70 shadow-lg'
                        : 'bg-[#100E0C] border-border-gold/50 hover:border-gold/60 hover:bg-[#161412]'
                    }`}
                    title={log.recipientLeadId ? "Click to view full message in Card 3 Preview" : undefined}
                  >
                    {/* Left Details: 1. Timestamp, 2. Channel Badge, 3. Recipient Full Name & Org/Ward, 4. Subject */}
                    <div className="flex-1 space-y-1.5 min-w-0 whitespace-normal break-words">
                      <div className="flex flex-wrap items-center gap-2 whitespace-normal break-words">
                        {/* 1. Timestamp */}
                        <span className="text-sand-muted text-[10px] font-mono shrink-0 bg-charcoal px-2 py-0.5 rounded border border-border-gold/50">
                          {log.timestamp}
                        </span>

                        {/* 2. Delivery Channel Badge */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider shrink-0 flex items-center gap-1 border ${channelBadgeStyle}`}>
                          {getChannelIcon(log.channel)}
                          <span>[{log.channel.toUpperCase()}]</span>
                        </span>

                        {/* 3. Recipient Full Name & Organization/Ward */}
                        <span className="font-semibold text-white text-xs whitespace-normal break-words">
                          {log.recipientDetails || `Sent to: ${log.recipients.join(', ')}`}
                        </span>
                      </div>

                      {/* 4. Message Subject / Preview Snippet */}
                      {log.subjectSnippet ? (
                        <div className="text-[11px] text-sand-subtext pl-1 flex items-baseline gap-1.5 whitespace-normal break-words">
                          <span className="text-gold font-mono text-[10px] font-bold shrink-0">Subject:</span>
                          <span className="text-white/90 italic whitespace-normal break-words">"{log.subjectSnippet}"</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-sand-muted pl-1 whitespace-normal break-words">
                          {log.details}
                        </div>
                      )}
                    </div>

                    {/* Right: 5. Delivery Status Badge */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {log.latency && (
                        <span className="text-sand-muted font-mono text-[10px] hidden lg:inline">
                          {log.latency}
                        </span>
                      )}
                      {/* 5. Delivery Status Badge: Clean Green SENT ✓ */}
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 shadow-sm shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>SENT ✓</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

    </div>
  );
};

import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { 
  birthRegistrationData, 
  salesPipelineData,
  eventBudgetData,
  birthRegistryChips,
  salesPipelineChips,
  eventBudgetChips,
  freshImportChips
} from './data/mockData';
import { LeadRecord, LeadStatus, ToastMessage, CommandOutputBannerData } from './types/spreadsheet';
import { executeVoiceCommand } from './services/voiceEngine';
import { LandingPage } from './components/landing/LandingPage';
import { VoiceCommandBar } from './components/voice/VoiceCommandBar';
import { CommandOutputBanner } from './components/voice/CommandOutputBanner';
import { SpreadsheetTable } from './components/spreadsheet/SpreadsheetTable';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { BulkOutreachStudio } from './components/outreach/BulkOutreachStudio';
import { ToastContainer } from './components/common/ToastContainer';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { 
  Table, 
  BarChart3, 
  Send, 
  Mic, 
  Sparkles, 
  Home, 
  Plus, 
  X, 
  RotateCcw, 
  Layers, 
  Database, 
  Baby, 
  Briefcase,
  Wallet,
  FolderOpen,
  Upload,
  FileSpreadsheet,
  FileUp,
  Loader2
} from 'lucide-react';

interface DatasetState {
  id: string;
  name: string;
  data: LeadRecord[];
  history: LeadRecord[][];
  historyIndex: number;
  initialTotal: number;
  removedCount: number;
}

// Client-side routing & cache hydration to prevent 404s and state wipe on F5 browser refresh
const getInitialRouteState = () => {
  try {
    const rawHash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
    const savedView = sessionStorage.getItem('speaksheet_view') as 'landing' | 'workspace' | null;
    const savedTab = sessionStorage.getItem('speaksheet_tab') as 'table' | 'analytics' | 'outreach' | null;
    const savedMode = sessionStorage.getItem('speaksheet_mode') as 'demo' | 'fresh' | null;
    const savedDemoId = sessionStorage.getItem('speaksheet_demo_id') as 'birth_registration' | 'sales_pipeline' | 'event_budget' | null;

    if (rawHash === 'outreach') {
      return { view: 'workspace' as const, tab: 'outreach' as const, mode: savedMode || 'demo', demoId: savedDemoId || 'birth_registration' };
    }
    if (rawHash === 'analytics') {
      return { view: 'workspace' as const, tab: 'analytics' as const, mode: savedMode || 'demo', demoId: savedDemoId || 'birth_registration' };
    }
    if (rawHash === 'table' || rawHash === 'workspace') {
      return { view: 'workspace' as const, tab: 'table' as const, mode: savedMode || 'demo', demoId: savedDemoId || 'birth_registration' };
    }
    if (rawHash === 'landing') {
      return { view: 'landing' as const, tab: 'table' as const, mode: savedMode || 'demo', demoId: savedDemoId || 'birth_registration' };
    }

    if (savedView === 'workspace') {
      return {
        view: 'workspace' as const,
        tab: (savedTab === 'analytics' || savedTab === 'outreach' ? savedTab : 'table') as 'table' | 'analytics' | 'outreach',
        mode: savedMode || 'demo',
        demoId: savedDemoId || 'birth_registration'
      };
    }
  } catch (err) {
    console.warn('Failed to parse route from storage/hash:', err);
  }
  return { view: 'landing' as const, tab: 'table' as const, mode: 'demo' as const, demoId: 'birth_registration' as const };
};

const getInitialCachedFreshDataset = (): { datasets: Record<string, DatasetState>; activeId: string } | null => {
  try {
    const raw = sessionStorage.getItem('speaksheet_cached_fresh_dataset');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id && Array.isArray(parsed.data) && parsed.data.length > 0) {
        return {
          datasets: {
            [parsed.id]: {
              id: parsed.id,
              name: parsed.name || 'Imported Dataset',
              data: parsed.data,
              history: [parsed.data],
              historyIndex: 0,
              initialTotal: parsed.data.length,
              removedCount: 0
            }
          },
          activeId: parsed.id
        };
      }
    }
  } catch (err) {
    console.warn('Failed to restore cached fresh dataset:', err);
  }
  return null;
};

export function App() {
  const initialRoute = getInitialRouteState();
  const initialFresh = getInitialCachedFreshDataset();

  // App views: 'landing' | 'workspace'
  const [currentView, setCurrentView] = useState<'landing' | 'workspace'>(initialRoute.view);

  // Workspace Mode: Strictly 'demo' (3 preloaded datasets) vs 'fresh' (user CSV files)
  const [workspaceMode, setWorkspaceMode] = useState<'demo' | 'fresh'>(initialFresh ? (initialRoute.mode || 'fresh') : initialRoute.mode);
  
  // Workspace tabs: 1: 'table' (Spreadsheet & Data Table) | 2: 'analytics' (Analytics & Visual) | 3: 'outreach' (Bulk Outreach)
  const [activeTab, setActiveTab] = useState<'table' | 'analytics' | 'outreach'>(initialRoute.tab);

  // DEMO MODE DATASETS: Strictly the 3 pre-loaded demo datasets with independent states
  const [demoDatasets, setDemoDatasets] = useState<Record<string, DatasetState>>({
    birth_registration: {
      id: 'birth_registration',
      name: 'Birth Registry',
      data: birthRegistrationData,
      history: [birthRegistrationData],
      historyIndex: 0,
      initialTotal: 20,
      removedCount: 0
    },
    sales_pipeline: {
      id: 'sales_pipeline',
      name: 'Sales Pipeline',
      data: salesPipelineData,
      history: [salesPipelineData],
      historyIndex: 0,
      initialTotal: 20,
      removedCount: 0
    },
    event_budget: {
      id: 'event_budget',
      name: 'Event Budget Sheet',
      data: eventBudgetData,
      history: [eventBudgetData],
      historyIndex: 0,
      initialTotal: 20,
      removedCount: 0
    }
  });

  const [activeDemoDatasetId, setActiveDemoDatasetId] = useState<'birth_registration' | 'sales_pipeline' | 'event_budget'>(initialRoute.demoId);

  // FRESH IMPORT MODE DATASETS: Strictly user-uploaded CSV datasets or clean sheets (Never mixed with demo datasets)
  const defaultCleanLead: LeadRecord = {
    id: 'fresh-1',
    name: 'Julian Sterling',
    company: 'Sovereign Core Labs',
    email: 'julian@sovereigncore.com',
    phone: '+1 (555) 234-5678',
    dealValue: 75000,
    stage: 'Discovery',
    industry: 'AI / DeepTech',
    leadScore: 65,
    status: 'Pending',
    location: 'San Francisco, CA'
  };

  const [freshDatasets, setFreshDatasets] = useState<Record<string, DatasetState>>(initialFresh ? initialFresh.datasets : {});
  const [activeFreshDatasetId, setActiveFreshDatasetId] = useState<string>(initialFresh ? initialFresh.activeId : '');

  // Synchronize URL hash & sessionStorage for seamless F5 browser refresh without losing view or tab
  useEffect(() => {
    try {
      sessionStorage.setItem('speaksheet_view', currentView);
      sessionStorage.setItem('speaksheet_mode', workspaceMode);
      sessionStorage.setItem('speaksheet_tab', activeTab);
      sessionStorage.setItem('speaksheet_demo_id', activeDemoDatasetId);

      if (currentView === 'landing') {
        if (window.location.hash !== '#/landing' && window.location.hash !== '') {
          window.history.replaceState(null, '', '#/landing');
        }
      } else {
        const targetHash = `#/${activeTab}`;
        if (window.location.hash !== targetHash) {
          window.history.replaceState(null, '', targetHash);
        }
      }
    } catch {}
  }, [currentView, workspaceMode, activeTab, activeDemoDatasetId]);

  // Handle browser back/forward and direct hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const raw = window.location.hash.replace(/^#\/?/, '').toLowerCase();
      if (raw === 'landing' || raw === '') {
        setCurrentView('landing');
      } else if (raw === 'outreach') {
        setCurrentView('workspace');
        setActiveTab('outreach');
      } else if (raw === 'analytics') {
        setCurrentView('workspace');
        setActiveTab('analytics');
      } else if (raw === 'table' || raw === 'workspace') {
        setCurrentView('workspace');
        setActiveTab('table');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  // Inline CSV Import Modal in Fresh Workspace
  const [isFreshUploadOpen, setIsFreshUploadOpen] = useState(false);
  const [isFreshParsing, setIsFreshParsing] = useState(false);
  const [freshParseProgress, setFreshParseProgress] = useState<string | null>(null);

  const isDemo = workspaceMode === 'demo';

  // Current active dataset reference based on mode
  const currentDataset: DatasetState = isDemo
    ? (demoDatasets[activeDemoDatasetId] || demoDatasets.birth_registration)
    : (freshDatasets[activeFreshDatasetId] || Object.values(freshDatasets)[0] || {
        id: 'fresh-clean',
        name: 'Clean Spreadsheet',
        data: [defaultCleanLead],
        history: [[defaultCleanLead]],
        historyIndex: 0,
        initialTotal: 1,
        removedCount: 0
      });

  const spreadsheetData = currentDataset.data;
  const activeDatasetId = currentDataset.id;

  // Selected & Modified Rows for active view
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [modifiedRowIds, setModifiedRowIds] = useState<Set<string>>(new Set());

  // Voice Command State
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [lastActionSummary, setLastActionSummary] = useState<string>('');
  const [resetSignal, setResetSignal] = useState(0);

  // Explicit Command Output Banner State (Prominent Result HUD)
  const [commandOutput, setCommandOutput] = useState<CommandOutputBannerData | null>(null);

  // Targeted Outreach State (Cross-Tab Voice Orchestration)
  const [targetedOutreachLead, setTargetedOutreachLead] = useState<LeadRecord | null>(null);
  const [targetedOutreachChannel, setTargetedOutreachChannel] = useState<'email' | 'linkedin' | 'sms' | 'whatsapp'>('email');

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Add Row Modal State
  const [isAddRowOpen, setIsAddRowOpen] = useState(false);
  const [newRowData, setNewRowData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    dealValue: 50000,
    stage: 'Discovery' as const,
    industry: 'SaaS' as const,
    leadScore: 0,
    status: 'Pending' as const,
    location: 'Global'
  });

  // Helper to update current dataset while maintaining independent state
  const updateActiveDataset = (updater: (prev: DatasetState) => DatasetState) => {
    if (isDemo) {
      setDemoDatasets(prev => ({
        ...prev,
        [activeDemoDatasetId]: updater(prev[activeDemoDatasetId] || prev.birth_registration)
      }));
    } else {
      const targetId = activeFreshDatasetId || currentDataset.id;
      setFreshDatasets(prev => {
        const existing = prev[targetId] || currentDataset;
        return {
          ...prev,
          [targetId]: updater(existing)
        };
      });
    }
  };

  // Push new state to undo/redo history for active dataset
  const updateDataWithHistory = (newData: LeadRecord[], newRemovedCount?: number) => {
    updateActiveDataset(prev => {
      const updatedHistory = prev.history.slice(0, prev.historyIndex + 1);
      updatedHistory.push(newData);
      const computedRemoved = newRemovedCount !== undefined 
        ? newRemovedCount 
        : Math.max(0, prev.initialTotal - newData.length);

      return {
        ...prev,
        data: newData,
        history: updatedHistory,
        historyIndex: updatedHistory.length - 1,
        removedCount: computedRemoved
      };
    });
  };

  const handleUndo = () => {
    if (currentDataset.historyIndex > 0) {
      const prevIndex = currentDataset.historyIndex - 1;
      const prevData = currentDataset.history[prevIndex];
      updateActiveDataset(prev => ({
        ...prev,
        historyIndex: prevIndex,
        data: prevData,
        removedCount: Math.max(0, prev.initialTotal - prevData.length)
      }));
      addToast({
        id: 'toast-' + Date.now(),
        title: 'Action Undone',
        description: `Reverted to previous revision. Active rows: ${prevData.length}`,
        type: 'info',
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  const handleRedo = () => {
    if (currentDataset.historyIndex < currentDataset.history.length - 1) {
      const nextIndex = currentDataset.historyIndex + 1;
      const nextData = currentDataset.history[nextIndex];
      updateActiveDataset(prev => ({
        ...prev,
        historyIndex: nextIndex,
        data: nextData,
        removedCount: Math.max(0, prev.initialTotal - nextData.length)
      }));
      addToast({
        id: 'toast-' + Date.now(),
        title: 'Action Redone',
        description: `Restored revision. Active rows: ${nextData.length}`,
        type: 'info',
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  // Toast Helper
  const addToast = (toast: ToastMessage) => {
    setToasts(prev => [toast, ...prev.slice(0, 4)]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Reset current dataset to original pristine state
  const handleResetCurrentDataset = () => {
    setResetSignal(prev => prev + 1);
    setLastActionSummary('');
    if (isDemo) {
      const original = activeDemoDatasetId === 'birth_registration' 
        ? birthRegistrationData 
        : activeDemoDatasetId === 'event_budget'
        ? eventBudgetData
        : salesPipelineData;
      updateActiveDataset(prev => ({
        ...prev,
        data: [...original],
        history: [[...original]],
        historyIndex: 0,
        initialTotal: 20,
        removedCount: 0
      }));
      addToast({
        id: 'reset-' + Date.now(),
        title: 'Demo Dataset Reset',
        description: `Reset ${currentDataset.name} to initial 20 rows. Total: 20, Removed: 0, Active: 20`,
        type: 'info',
        timestamp: new Date().toLocaleTimeString()
      });
    } else {
      const initial = currentDataset.history[0] || [defaultCleanLead];
      updateActiveDataset(prev => ({
        ...prev,
        data: [...initial],
        history: [[...initial]],
        historyIndex: 0,
        removedCount: 0
      }));
      addToast({
        id: 'reset-' + Date.now(),
        title: 'Dataset Reset',
        description: `Reverted ${currentDataset.name} to uploaded version.`,
        type: 'info',
        timestamp: new Date().toLocaleTimeString()
      });
    }
    setSelectedRowIds(new Set());
    setModifiedRowIds(new Set());
    setCommandOutput(null);
    setTargetedOutreachLead(null);
  };

  // Dual-entry handlers
  const handleLaunchDemo = () => {
    setWorkspaceMode('demo');
    setActiveDemoDatasetId('birth_registration');
    setCurrentView('workspace');
    setActiveTab('table');
    addToast({
      id: 'demo-welcome',
      title: 'Interactive Demo Loaded',
      description: `Loaded ${demoDatasets.birth_registration.name}. Strictly isolating 3 demo datasets.`,
      type: 'info',
      timestamp: new Date().toLocaleTimeString()
    });
  };

  const handleStartFresh = () => {
    setWorkspaceMode('fresh');
    const newId = 'fresh_' + Date.now();
    const cleanDataset: DatasetState = {
      id: newId,
      name: 'Clean Spreadsheet',
      data: [defaultCleanLead],
      history: [[defaultCleanLead]],
      historyIndex: 0,
      initialTotal: 1,
      removedCount: 0
    };
    setFreshDatasets({ [newId]: cleanDataset });
    setActiveFreshDatasetId(newId);
    setCurrentView('workspace');
    setActiveTab('table');
    addToast({
      id: 'fresh-welcome',
      title: 'Fresh Workspace Ready',
      description: 'Loaded isolated fresh workspace. Ready for data entry or CSV imports.',
      type: 'success',
      timestamp: new Date().toLocaleTimeString()
    });
  };

  const handleImportCustomData = (imported: LeadRecord[], fileName?: string) => {
    setWorkspaceMode('fresh');
    const newId = 'csv_' + Date.now();
    const displayName = fileName ? (fileName.length > 24 ? fileName.slice(0, 21) + '...' : fileName) : `Imported CSV (${imported.length})`;
    const importedDataset: DatasetState = {
      id: newId,
      name: displayName,
      data: imported,
      history: [imported],
      historyIndex: 0,
      initialTotal: imported.length,
      removedCount: 0
    };
    setFreshDatasets(prev => ({
      ...prev,
      [newId]: importedDataset
    }));
    setActiveFreshDatasetId(newId);
    setCurrentView('workspace');
    setActiveTab('table');

    // Cache small/medium datasets in sessionStorage for instant F5 restoration
    try {
      if (imported.length <= 1500) {
        sessionStorage.setItem('speaksheet_cached_fresh_dataset', JSON.stringify({
          id: newId,
          name: displayName,
          data: imported
        }));
      } else {
        sessionStorage.removeItem('speaksheet_cached_fresh_dataset');
      }
    } catch (e) {
      console.warn('SessionStorage quota exceeded, skipping CSV cache', e);
    }

    addToast({
      id: 'import-success',
      title: 'CSV Dataset Loaded',
      description: `Loaded ${displayName} with ${imported.length} rows. Strictly isolated in Fresh Workspace.`,
      type: 'success',
      timestamp: new Date().toLocaleTimeString()
    });
  };

  // Handle CSV file upload directly inside Fresh Mode Workspace with chunking & memory guard
  const handleFreshFileDrop = (e: React.DragEvent<HTMLDivElement> | React.ChangeEvent<HTMLInputElement>) => {
    let file: File | null = null;
    if ('dataTransfer' in e) {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        file = e.dataTransfer.files[0];
      }
    } else if (e.target.files && e.target.files[0]) {
      file = e.target.files[0];
    }
    if (!file) return;

    // Safeguard against memory exhaustion / browser freeze on massive files (> 25MB)
    if (file.size > 25 * 1024 * 1024) {
      addToast({
        id: 'file-size-error-' + Date.now(),
        title: 'File Too Large (> 25MB)',
        description: 'Dataset exceeds the 25MB safety threshold. Please select a file under 25MB for smooth in-browser operation.',
        type: 'error',
        timestamp: new Date().toLocaleTimeString()
      });
      return;
    }

    setIsFreshParsing(true);
    setFreshParseProgress(`Reading ${file.name}...`);

    const isLargeFile = file.size > 5 * 1024 * 1024;
    const previewLimit = isLargeFile ? 10000 : 0;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      preview: previewLimit,
      complete: async (results) => {
        try {
          if (!results.data || results.data.length === 0) {
            throw new Error('No data rows found in CSV file.');
          }

          const totalRows = results.data.length;
          const mappedRows: LeadRecord[] = [];
          const CHUNK_SIZE = 500;

          for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
            const end = Math.min(i + CHUNK_SIZE, totalRows);
            for (let idx = i; idx < end; idx++) {
              const row: any = results.data[idx];
              const name = row.name || row.Name || row.customer || row.client || `Record #${idx + 1}`;
              const company = row.company || row.Company || row.organization || row.vendor || 'Enterprise Corp';
              const email = row.email || row.Email || `user.${idx + 1}@${String(company).toLowerCase().replace(/[^a-z0-9]/g, '') || 'enterprise'}.io`;
              const phone = row.phone || row.Phone || `+1 (555) 019-${String(idx).padStart(4, '0')}`;
              let dealValue = 50000;
              if (typeof row.dealValue === 'number') dealValue = row.dealValue;
              else if (typeof row['Deal Value'] === 'number') dealValue = row['Deal Value'];
              else if (typeof row.amount === 'number') dealValue = row.amount;

              let stage: any = 'Discovery';
              if (row.stage) stage = row.stage;
              else if (idx % 4 === 0) stage = 'Proposal';
              else if (idx % 6 === 0) stage = 'Won';

              const industry = row.industry || (idx % 2 === 0 ? 'Fintech' : 'SaaS');
              const leadScore = typeof row.leadScore === 'number' ? row.leadScore : typeof row.score === 'number' ? row.score : Math.floor(Math.random() * 40) + 60;
              let status: any = 'Pending';
              if (stage === 'Won') status = 'Closed';
              else if (stage === 'Proposal') status = 'Qualified';

              mappedRows.push({
                ...row,
                id: `imported-${idx + 1}-${Date.now()}`,
                name: String(name).trim(),
                company: String(company).trim(),
                email: String(email).trim().toLowerCase(),
                phone: String(phone).trim(),
                dealValue: Math.round(dealValue),
                stage,
                industry,
                leadScore: Math.round(leadScore),
                status,
                location: String(row.location || row.city || 'Global'),
                isDuplicate: false
              });
            }

            const percent = Math.min(100, Math.round((end / totalRows) * 100));
            setFreshParseProgress(`Processing records: ${end.toLocaleString()} / ${totalRows.toLocaleString()} (${percent}%)...`);
            // Yield to browser main thread
            await new Promise((resolve) => setTimeout(resolve, 0));
          }

          setIsFreshParsing(false);
          setFreshParseProgress(null);
          setIsFreshUploadOpen(false);
          handleImportCustomData(mappedRows, file.name);
        } catch (err: any) {
          setIsFreshParsing(false);
          setFreshParseProgress(null);
          addToast({
            id: 'parse-err-' + Date.now(),
            title: 'CSV Parsing Error',
            description: err.message || 'File malformed or unreadable.',
            type: 'error',
            timestamp: new Date().toLocaleTimeString()
          });
        }
      },
      error: (err) => {
        setIsFreshParsing(false);
        setFreshParseProgress(null);
        addToast({
          id: 'parse-fail-' + Date.now(),
          title: 'Parser Failure',
          description: err.message,
          type: 'error',
          timestamp: new Date().toLocaleTimeString()
        });
      }
    });
  };

  // REAL-TIME VOICE COMMAND EXECUTION & DYNAMIC HUB UPDATE
  const handleExecuteVoiceCommand = (commandText: string) => {
    setIsVoiceProcessing(true);
    setModifiedRowIds(new Set());

    setTimeout(() => {
      const result = executeVoiceCommand(
        commandText,
        spreadsheetData,
        currentDataset.initialTotal,
        currentDataset.removedCount,
        activeDatasetId
      );

      // Determine updated removed count
      const updatedRemoved = result.purgedCount !== undefined && result.purgedCount > 0
        ? currentDataset.removedCount + result.purgedCount
        : currentDataset.removedCount;

      updateDataWithHistory(result.updatedData, updatedRemoved);
      setLastActionSummary(result.actionSummary);
      addToast(result.toast);

      // Explicit Command Output Banner for Tab 1 (Prominent Result HUD)
      if (result.outputBanner) {
        setCommandOutput(result.outputBanner);
      }

      // Smart Targeted Voice Outreach Routing
      if (result.isOutreachCommand) {
        if (result.targetPersonNames && result.targetPersonNames.length > 0) {
          const matchedIds = new Set<string>();
          let firstMatch: LeadRecord | null = null;
          for (const name of result.targetPersonNames) {
            const lowerTarget = name.toLowerCase().trim();
            const matched = spreadsheetData.find(d => {
              const dName = d.name.toLowerCase().trim();
              if (dName.includes(lowerTarget) || lowerTarget.includes(dName)) return true;
              const tokens = dName.split(/\s+/).filter(t => t.length > 1);
              return tokens.some(tok => lowerTarget.includes(tok) || tok.includes(lowerTarget));
            });
            if (matched) {
              matchedIds.add(matched.id);
              if (!firstMatch) firstMatch = matched;
            }
          }
          if (matchedIds.size > 0) {
            setSelectedRowIds(matchedIds);
            setTargetedOutreachLead(firstMatch);
          }
        } else if (result.targetPersonName) {
          const lowerTarget = result.targetPersonName.toLowerCase().trim();
          const matched = spreadsheetData.find(d => {
            const dName = d.name.toLowerCase().trim();
            if (dName.includes(lowerTarget) || lowerTarget.includes(dName)) return true;
            const tokens = dName.split(/\s+/).filter(t => t.length > 1);
            return tokens.some(tok => lowerTarget.includes(tok) || tok.includes(lowerTarget));
          });
          if (matched) {
            setTargetedOutreachLead(matched);
            setSelectedRowIds(new Set([matched.id]));
          }
        } else {
          setTargetedOutreachLead(null);
        }
        if (result.targetChannel) {
          setTargetedOutreachChannel(result.targetChannel);
        }
        setActiveTab('outreach');
      }

      // Trigger warm amber glow on modified rows
      if (result.modifiedIds.length > 0) {
        setModifiedRowIds(new Set(result.modifiedIds));
        setTimeout(() => {
          setModifiedRowIds(new Set());
        }, 2600);
      }

      setIsVoiceProcessing(false);
    }, 250);
  };

  // Cell Update
  const handleUpdateCell = (id: string, field: keyof LeadRecord, value: any) => {
    const updated = spreadsheetData.map(row => {
      if (row.id === id) {
        return { ...row, [field]: value };
      }
      return row;
    });
    updateDataWithHistory(updated);
    setModifiedRowIds(new Set([id]));
    setTimeout(() => setModifiedRowIds(new Set()), 2400);
  };

  // Row Selection Handlers
  const handleSelectRow = (id: string) => {
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedRowIds.size === spreadsheetData.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(spreadsheetData.map(d => d.id)));
    }
  };

  const handleDeleteSelected = () => {
    const deleteCount = selectedRowIds.size;
    const remaining = spreadsheetData.filter(d => !selectedRowIds.has(d.id));
    const newRemoved = currentDataset.removedCount + deleteCount;
    updateDataWithHistory(remaining, newRemoved);

    addToast({
      id: 'toast-' + Date.now(),
      title: 'Rows Purged',
      description: `Total rows: ${currentDataset.initialTotal}, Removed: ${newRemoved}, Active rows: ${remaining.length}`,
      type: 'info',
      timestamp: new Date().toLocaleTimeString()
    });
    setSelectedRowIds(new Set());
  };

  const handleBulkStatusChange = (status: LeadStatus) => {
    const updated = spreadsheetData.map(row => {
      if (selectedRowIds.has(row.id)) {
        return { ...row, status };
      }
      return row;
    });
    updateDataWithHistory(updated);
    setModifiedRowIds(new Set(Array.from(selectedRowIds)));
    setTimeout(() => setModifiedRowIds(new Set()), 2400);

    addToast({
      id: 'toast-' + Date.now(),
      title: 'Status Updated',
      description: `Updated status for ${selectedRowIds.size} records. Active rows: ${spreadsheetData.length}`,
      type: 'success',
      timestamp: new Date().toLocaleTimeString(),
      modifiedCount: selectedRowIds.size
    });
  };

  const handleSendToOutreach = () => {
    setActiveTab('outreach');
    addToast({
      id: 'toast-' + Date.now(),
      title: 'Transferred to Outreach Studio',
      description: `Loaded ${selectedRowIds.size > 0 ? selectedRowIds.size : spreadsheetData.length} records into campaign sequencer.`,
      type: 'success',
      timestamp: new Date().toLocaleTimeString()
    });
  };

  // Add Row Submission
  const handleAddRowSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRowData.name || !newRowData.company) return;

    const newLead: LeadRecord = {
      id: 'lead-' + Date.now(),
      ...newRowData
    };

    const updated = [newLead, ...spreadsheetData];
    updateActiveDataset(prev => ({
      ...prev,
      data: updated,
      initialTotal: prev.initialTotal + 1,
      history: [...prev.history, updated],
      historyIndex: prev.historyIndex + 1
    }));
    setModifiedRowIds(new Set([newLead.id]));
    setTimeout(() => setModifiedRowIds(new Set()), 2400);

    setIsAddRowOpen(false);
    setNewRowData({
      name: '',
      company: '',
      email: '',
      phone: '',
      dealValue: 50000,
      stage: 'Discovery',
      industry: 'SaaS',
      leadScore: 0,
      status: 'Pending',
      location: 'Global'
    });

    addToast({
      id: 'toast-' + Date.now(),
      title: 'Record Added',
      description: `Added "${newLead.name}". Total rows: ${currentDataset.initialTotal + 1}, Active rows: ${updated.length}`,
      type: 'success',
      timestamp: new Date().toLocaleTimeString(),
      modifiedCount: 1
    });
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['id', 'name', 'company', 'email', 'phone', 'dealValue', 'stage', 'industry', 'leadScore', 'status'];
    const csvRows = [
      headers.join(','),
      ...spreadsheetData.map(row => 
        headers.map(field => `"${(row as any)[field] ?? ''}"`).join(',')
      )
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeDatasetId}_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast({
      id: 'toast-export',
      title: 'CSV Exported',
      description: `Exported ${spreadsheetData.length} records.`,
      type: 'success',
      timestamp: new Date().toLocaleTimeString()
    });
  };

  // If in landing page view, render LandingPage
  if (currentView === 'landing') {
    return (
      <LandingPage
        onLaunchDemo={handleLaunchDemo}
        onStartFresh={handleStartFresh}
        onImportCustomData={handleImportCustomData}
      />
    );
  }

  return (
    <div className="min-h-screen bg-charcoal text-white flex flex-col justify-between selection:bg-terracotta selection:text-white">
      
      {/* Top Main App Header & Navigation */}
      <header className="sticky top-0 z-30 bg-charcoal/95 backdrop-blur-md border-b border-border-gold px-4 md:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Logo & Return to Landing */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <button
              onClick={() => setCurrentView('landing')}
              className="flex items-center gap-2.5 group cursor-pointer text-left"
              title="Return to Home"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-terracotta to-terracotta-dark flex items-center justify-center shadow-md shadow-terracotta/30 border border-terracotta-light/30">
                <Mic className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-white flex items-center gap-1 font-sans">
                  Speak<span className="text-gold">Sheet</span>
                </span>
                <span className="text-[9px] font-mono tracking-widest text-sand-muted block -mt-1 group-hover:text-gold transition-colors">
                  DATA CLEANING STUDIO
                </span>
              </div>
            </button>

            <div className="h-6 w-[1px] bg-border-gold hidden sm:block" />

            {/* REAL-TIME STATE COUNTER & ACTIVE HUB (Never Stays Static) */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-stone-card border border-border-gold shadow-md font-mono text-xs select-none">
              <div className="flex items-center gap-1">
                <span className="text-sand-muted text-[11px]">Total rows:</span>
                <span className="font-bold text-white bg-charcoal px-2 py-0.5 rounded border border-border-goldLight">
                  {currentDataset.initialTotal}
                </span>
              </div>

              <span className="text-border-goldLight font-bold">|</span>

              <div className="flex items-center gap-1">
                <span className="text-terracotta text-[11px]">Removed:</span>
                <span className="font-bold text-terracotta bg-charcoal px-2 py-0.5 rounded border border-border-goldLight">
                  {currentDataset.removedCount}
                </span>
              </div>

              <span className="text-border-goldLight font-bold">|</span>

              <div className="flex items-center gap-1">
                <span className="text-gold text-[11px]">Active rows:</span>
                <span className="font-bold text-gold bg-charcoal px-2 py-0.5 rounded border border-border-goldLight">
                  {spreadsheetData.length}
                </span>
              </div>
            </div>
          </div>

          {/* Three Clean Top Navigation Tabs */}
          <nav className="flex items-center p-1 bg-stone-card rounded-xl border border-border-gold shadow-lg w-full md:w-auto justify-center">
            
            {/* Tab 1: Space and data table */}
            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'table'
                  ? 'bg-terracotta text-white shadow-md shadow-terracotta/30'
                  : 'text-sand-subtext hover:text-white hover:bg-stone-surface'
              }`}
            >
              <Table className="w-4 h-4" />
              <span>1. Data Table</span>
            </button>

            {/* Tab 2: Analytics and visual */}
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-terracotta text-white shadow-md shadow-terracotta/30'
                  : 'text-sand-subtext hover:text-white hover:bg-stone-surface'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>2. Analytics</span>
            </button>

            {/* Tab 3: Bulk outreach */}
            <button
              onClick={() => setActiveTab('outreach')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'outreach'
                  ? 'bg-terracotta text-white shadow-md shadow-terracotta/30'
                  : 'text-sand-subtext hover:text-white hover:bg-stone-surface'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>3. Bulk Outreach</span>
            </button>

          </nav>

          {/* Right Status Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetCurrentDataset}
              className="btn-gold-outline px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer text-sand-subtext hover:text-white"
              title="Reset current dataset to initial 20 rows"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gold" />
              <span>Reset</span>
            </button>

            <button
              onClick={() => setCurrentView('landing')}
              className="btn-gold-outline px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5 text-gold" />
              <span>Home</span>
            </button>
          </div>

        </div>

        {/* MULTIPLE INDEPENDENT DATASETS SELECTOR BAR - STRICTLY SEPARATING DEMO VS FRESH */}
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-border-gold/40 flex items-center justify-between text-xs overflow-x-auto gap-3">
          <div className="flex items-center gap-2 shrink-0">
            {isDemo ? (
              <>
                <span className="text-[11px] font-mono uppercase tracking-wider text-terracotta bg-terracotta/15 px-2.5 py-0.5 rounded-full border border-terracotta/30 flex items-center gap-1.5 shrink-0 font-semibold">
                  <Sparkles className="w-3 h-3 text-terracotta" /> Demo Datasets (3)
                </span>

                {/* Demo Dataset 1: Birth Registration */}
                <button
                  onClick={() => {
                    setActiveDemoDatasetId('birth_registration');
                    setSelectedRowIds(new Set());
                    setModifiedRowIds(new Set());
                    setCommandOutput(null);
                    setTargetedOutreachLead(null);
                  }}
                  className={`px-3 py-1 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeDemoDatasetId === 'birth_registration'
                      ? 'bg-stone-surface text-gold border-gold font-bold shadow-sm'
                      : 'bg-charcoal text-sand-muted border-border-gold hover:text-sand-subtext'
                  }`}
                >
                  <Baby className="w-3.5 h-3.5 text-gold" />
                  <span>Birth Registry ({demoDatasets.birth_registration.data.length})</span>
                </button>

                {/* Demo Dataset 2: Sales Pipeline */}
                <button
                  onClick={() => {
                    setActiveDemoDatasetId('sales_pipeline');
                    setSelectedRowIds(new Set());
                    setModifiedRowIds(new Set());
                    setCommandOutput(null);
                    setTargetedOutreachLead(null);
                  }}
                  className={`px-3 py-1 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeDemoDatasetId === 'sales_pipeline'
                      ? 'bg-stone-surface text-gold border-gold font-bold shadow-sm'
                      : 'bg-charcoal text-sand-muted border-border-gold hover:text-sand-subtext'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5 text-terracotta" />
                  <span>Sales Pipeline ({demoDatasets.sales_pipeline.data.length})</span>
                </button>

                {/* Demo Dataset 3: Event Budget */}
                <button
                  onClick={() => {
                    setActiveDemoDatasetId('event_budget');
                    setSelectedRowIds(new Set());
                    setModifiedRowIds(new Set());
                    setCommandOutput(null);
                    setTargetedOutreachLead(null);
                  }}
                  className={`px-3 py-1 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeDemoDatasetId === 'event_budget'
                      ? 'bg-stone-surface text-emerald-400 border-emerald-400 font-bold shadow-sm'
                      : 'bg-charcoal text-sand-muted border-border-gold hover:text-sand-subtext'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Event Budget Sheet ({demoDatasets.event_budget.data.length})</span>
                </button>
              </>
            ) : (
              <>
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1.5 shrink-0 font-semibold">
                  <FolderOpen className="w-3 h-3 text-emerald-400" /> User CSV Datasets ({Object.keys(freshDatasets).length || 1})
                </span>

                {/* Render only user-imported datasets or fresh clean sheet */}
                {Object.values(freshDatasets).map(ds => (
                  <button
                    key={ds.id}
                    onClick={() => {
                      setActiveFreshDatasetId(ds.id);
                      setSelectedRowIds(new Set());
                      setModifiedRowIds(new Set());
                    }}
                    className={`px-3 py-1 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                      currentDataset.id === ds.id
                        ? 'bg-stone-surface text-emerald-400 border-emerald-400 font-bold shadow-sm'
                        : 'bg-charcoal text-sand-muted border-border-gold hover:text-sand-subtext'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{ds.name} ({ds.data.length})</span>
                  </button>
                ))}

                {/* If freshDatasets is empty, show clean sheet tab */}
                {Object.keys(freshDatasets).length === 0 && (
                  <button
                    className="px-3 py-1 rounded-lg border text-xs font-mono bg-stone-surface text-emerald-400 border-emerald-400 font-bold shadow-sm flex items-center gap-1.5 cursor-default"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Clean Sheet ({spreadsheetData.length})</span>
                  </button>
                )}

                {/* + Import Another CSV Button */}
                <button
                  onClick={() => setIsFreshUploadOpen(true)}
                  className="btn-gold-outline px-3 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer text-gold hover:text-white"
                  title="Upload additional CSV datasets"
                >
                  <Upload className="w-3.5 h-3.5 text-gold" />
                  <span>+ Import CSV</span>
                </button>
              </>
            )}
          </div>

          {/* Quick Mode Toggle for Judges */}
          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={() => {
                if (isDemo) {
                  setWorkspaceMode('fresh');
                  if (Object.keys(freshDatasets).length === 0) {
                    handleStartFresh();
                  }
                } else {
                  setWorkspaceMode('demo');
                }
                setSelectedRowIds(new Set());
                setModifiedRowIds(new Set());
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-mono border border-border-gold text-sand-muted hover:text-white hover:border-gold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isDemo ? (
                <>
                  <FolderOpen className="w-3 h-3 text-emerald-400" />
                  <span>Open Fresh Mode &rarr;</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-terracotta" />
                  <span>Open Demo Mode &rarr;</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-5">
        
        {/* Tab 1: Space and data table */}
        {activeTab === 'table' && (
          <ErrorBoundary fallbackTitle="Spreadsheet Grid Component Isolation">
            <div className="space-y-4">
              {/* Embedded 3D Voice Command Bar directly at top right above the interactive spreadsheet table */}
              <VoiceCommandBar
                onExecuteCommand={handleExecuteVoiceCommand}
                isProcessing={isVoiceProcessing}
                lastActionSummary={lastActionSummary}
                resetSignal={resetSignal}
                chips={
                  isDemo
                    ? (activeDemoDatasetId === 'birth_registration'
                        ? birthRegistryChips
                        : activeDemoDatasetId === 'event_budget'
                        ? eventBudgetChips
                        : salesPipelineChips)
                    : freshImportChips
                }
              />

              {/* Explicit Command Output Banner (Prominent High-Visibility HUD) */}
              {commandOutput && (
                <CommandOutputBanner
                  output={commandOutput}
                  onDismiss={() => setCommandOutput(null)}
                  onNavigateToOutreach={() => setActiveTab('outreach')}
                />
              )}

              {/* Interactive Spreadsheet Table with Clean Honest Footer */}
              <SpreadsheetTable
                data={spreadsheetData}
                initialTotal={currentDataset.initialTotal}
                removedCount={currentDataset.removedCount}
                datasetId={activeDatasetId}
                modifiedRowIds={modifiedRowIds}
                selectedRowIds={selectedRowIds}
                onSelectRow={handleSelectRow}
                onSelectAll={handleSelectAll}
                onUpdateCell={handleUpdateCell}
                onDeleteSelected={handleDeleteSelected}
                onBulkStatusChange={handleBulkStatusChange}
                onSendToOutreach={handleSendToOutreach}
                onAddRow={() => setIsAddRowOpen(true)}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={currentDataset.historyIndex > 0}
                canRedo={currentDataset.historyIndex < currentDataset.history.length - 1}
                onExportCsv={handleExportCsv}
                resetSignal={resetSignal}
              />
            </div>
          </ErrorBoundary>
        )}

        {/* Tab 2: Analytics and visual (Charts exclusively here) */}
        {activeTab === 'analytics' && (
          <ErrorBoundary fallbackTitle="Analytics & Visual Charts Isolation">
            <AnalyticsView data={spreadsheetData} datasetId={activeDatasetId} isDemo={isDemo} />
          </ErrorBoundary>
        )}

        {/* Tab 3: Bulk outreach (Outreach Studio exclusively here) */}
        {activeTab === 'outreach' && (
          <ErrorBoundary fallbackTitle="Bulk Outreach Studio Isolation">
            <BulkOutreachStudio
              data={spreadsheetData}
              selectedRowIds={selectedRowIds}
              datasetId={activeDatasetId}
              onAddToast={addToast}
              initialTargetLead={targetedOutreachLead}
              initialChannel={targetedOutreachChannel}
              onChannelChange={(ch) => setTargetedOutreachChannel(ch)}
              onTargetLeadChange={(lead) => setTargetedOutreachLead(lead)}
              resetSignal={resetSignal}
            />
          </ErrorBoundary>
        )}

      </main>

      {/* Global Toast Feedback System */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Modal: Add New Lead Row */}
      {isAddRowOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/90 backdrop-blur-md">
          <div className="bg-stone-card border border-border-gold rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border-gold pb-3">
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Plus className="w-4 h-4 text-gold" />
                Add Record ({currentDataset.name})
              </h3>
              <button
                onClick={() => setIsAddRowOpen(false)}
                className="text-sand-muted hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddRowSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-sand-muted block mb-1 font-medium">Record Full Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Liam Alexander Chen"
                  value={newRowData.name}
                  onChange={e => setNewRowData({ ...newRowData, name: e.target.value })}
                  className="w-full bg-charcoal text-white px-3 py-2 rounded-lg border border-border-gold focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-sand-muted block mb-1 font-medium">Organization / Ward / Company</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Ward 4A Maternity"
                  value={newRowData.company}
                  onChange={e => setNewRowData({ ...newRowData, company: e.target.value })}
                  className="w-full bg-charcoal text-white px-3 py-2 rounded-lg border border-border-gold focus:outline-none focus:border-gold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sand-muted block mb-1 font-medium">Registry ID / Email</label>
                  <input
                    type="email"
                    placeholder="reg.chen@vitalstats.org"
                    value={newRowData.email}
                    onChange={e => setNewRowData({ ...newRowData, email: e.target.value })}
                    className="w-full bg-charcoal text-white px-3 py-2 rounded-lg border border-border-gold focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="text-sand-muted block mb-1 font-medium">Hour / Phone</label>
                  <input
                    type="text"
                    placeholder="04:15 AM"
                    value={newRowData.phone}
                    onChange={e => setNewRowData({ ...newRowData, phone: e.target.value })}
                    className="w-full bg-charcoal text-white px-3 py-2 rounded-lg border border-border-gold focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sand-muted block mb-1 font-medium">Value / Weight</label>
                  <input
                    type="number"
                    value={newRowData.dealValue}
                    onChange={e => setNewRowData({ ...newRowData, dealValue: Number(e.target.value) })}
                    className="w-full bg-charcoal text-white px-3 py-2 rounded-lg border border-border-gold focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="text-sand-muted block mb-1 font-medium">Status / Stage</label>
                  <select
                    value={newRowData.stage}
                    onChange={e => setNewRowData({ ...newRowData, stage: e.target.value as any })}
                    className="w-full bg-charcoal text-white px-3 py-2 rounded-lg border border-border-gold focus:outline-none focus:border-gold"
                  >
                    <option value="New">New</option>
                    <option value="Discovery">Discovery</option>
                    <option value="Proposal">Proposal</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Won">Verified / Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddRowOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-sand-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-terracotta px-5 py-2 rounded-xl text-xs font-semibold"
                >
                  Add Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Fresh Mode CSV Import Modal */}
      {isFreshUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/90 backdrop-blur-md">
          <div className="bg-stone-card border border-border-gold rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border-gold pb-3">
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-400" />
                Import CSV into Fresh Workspace
              </h3>
              <button
                onClick={() => !isFreshParsing && setIsFreshUploadOpen(false)}
                disabled={isFreshParsing}
                className="text-sand-muted hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFreshFileDrop}
              className="border-2 border-dashed border-border-gold hover:border-emerald-400 rounded-xl p-8 text-center bg-charcoal/60 transition-all cursor-pointer group relative"
            >
              {isFreshParsing ? (
                <div className="py-6 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                  <p className="text-sm font-semibold text-white">Streaming &amp; Parsing CSV File...</p>
                  <p className="text-xs text-sand-muted font-mono">{freshParseProgress}</p>
                </div>
              ) : (
                <>
                  <FileUp className="w-8 h-8 text-emerald-400 mx-auto group-hover:scale-110 transition-transform mb-2" />
                  <p className="text-sm font-semibold text-white">
                    Drop CSV File Here to Add as Isolated Dataset
                  </p>
                  <p className="text-xs text-sand-muted mt-1">
                    Powered by Papa Parse. Strictly isolated in Fresh Import Workspace.
                  </p>

                  <label className="mt-4 inline-block btn-gold-outline px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer">
                    Browse CSV File
                    <input
                      type="file"
                      accept=".csv,.json"
                      className="hidden"
                      onChange={handleFreshFileDrop}
                    />
                  </label>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Minimal Footer */}
      <footer className="border-t border-border-gold/50 bg-charcoal/80 px-6 py-4 text-center text-xs text-sand-muted font-mono">
        &copy; 2026 SpeakSheet Inc. Professional Voice-First Spreadsheet Studio
      </footer>
    </div>
  );
}

export default App;

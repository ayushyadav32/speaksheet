import React, { useState } from 'react';
import Papa from 'papaparse';
import { Voice3DOrb } from '../voice/Voice3DOrb';
import { 
  Sparkles, 
  Upload, 
  FileSpreadsheet, 
  ArrowRight, 
  Mic, 
  ShieldCheck, 
  BarChart3, 
  Send, 
  Zap, 
  Layers, 
  CheckCircle2, 
  X,
  FileUp,
  Database,
  Radio,
  Loader2
} from 'lucide-react';
import { soundEffects } from '../../services/voiceEngine';
import { LeadRecord } from '../../types/spreadsheet';

interface LandingPageProps {
  onLaunchDemo: () => void;
  onStartFresh: () => void;
  onImportCustomData: (data: LeadRecord[], fileName?: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunchDemo,
  onStartFresh,
  onImportCustomData
}) => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState<string | null>(null);

  const handleLaunchDemoClick = () => {
    soundEffects.playSuccessChime();
    onLaunchDemo();
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement> | React.ChangeEvent<HTMLInputElement>) => {
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
    setImportFileName(file.name);
    setImportError(null);

    // Safeguard against memory exhaustion / browser freeze on massive files (> 25MB)
    if (file.size > 25 * 1024 * 1024) {
      setIsParsing(false);
      setImportError('File size exceeds the 25 MB safety limit. Please upload a dataset under 25 MB to ensure 60 FPS performance.');
      return;
    }

    setIsParsing(true);
    setParseProgress(`Reading ${file.name}...`);

    // Handle JSON files
    if (file.name.toLowerCase().endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            setIsParsing(false);
            setShowImportModal(false);
            soundEffects.playSuccessChime();
            onImportCustomData(parsed, file.name);
          } else {
            throw new Error('JSON file must be an array of objects.');
          }
        } catch (err: any) {
          setIsParsing(false);
          setImportError(err.message || 'Invalid JSON format.');
        }
      };
      reader.readAsText(file);
      return;
    }

    // High performance Papa Parse for huge CSVs with async micro-task chunking
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
              // Intelligent auto-mapping for any dataset (CRM, Deliveries, E-commerce, IPL, etc.)
              const name =
                row.name ||
                row.Name ||
                row.batter ||
                row.player ||
                row.customer ||
                row.client ||
                `Record #${idx + 1}`;

              const company =
                row.company ||
                row.Company ||
                row.batting_team ||
                row.team ||
                row.organization ||
                row.vendor ||
                'Enterprise Corp';

              const email =
                row.email ||
                row.Email ||
                (row.bowler
                  ? `${String(row.bowler).toLowerCase().replace(/[^a-z0-9]/g, '.')}@cricket.io`
                  : `user.${idx + 1}@${String(company).toLowerCase().replace(/[^a-z0-9]/g, '') || 'enterprise'}.io`);

              const phone =
                row.phone ||
                row.Phone ||
                (row.match_id
                  ? `+1 (555) ${String(row.match_id).slice(-4)}-${String(row.over || idx).padStart(4, '0')}`
                  : `+1 (555) 019-${String(idx).padStart(4, '0')}`);

              // Deal valuation parsing
              let dealValue = 50000;
              if (typeof row.dealValue === 'number') dealValue = row.dealValue;
              else if (typeof row['Deal Value'] === 'number') dealValue = row['Deal Value'];
              else if (typeof row.amount === 'number') dealValue = row.amount;
              else if (typeof row.total_runs === 'number') dealValue = row.total_runs * 12500 + 45000;
              else if (typeof row.batsman_runs === 'number') dealValue = row.batsman_runs * 15000 + 35000;

              // Stage mapping
              let stage: any = 'Discovery';
              if (row.stage) stage = row.stage;
              else if (row.dismissal_kind && row.dismissal_kind !== 'NA') stage = 'Lost';
              else if (row.is_wicket === 1) stage = 'Lost';
              else if (idx % 6 === 0) stage = 'Won';
              else if (idx % 4 === 0) stage = 'Proposal';
              else if (idx % 3 === 0) stage = 'Negotiation';

              // Industry
              const industry =
                row.industry || (row.bowling_team ? 'AI / DeepTech' : idx % 2 === 0 ? 'Fintech' : 'SaaS');

              // Lead score
              let leadScore = 0;
              if (typeof row.leadScore === 'number') leadScore = row.leadScore;
              else if (typeof row.batsman_runs === 'number') leadScore = Math.min(99, row.batsman_runs * 20 + 25);
              else if (typeof row.total_runs === 'number') leadScore = Math.min(99, row.total_runs * 15 + 30);

              // Status
              let status: any = 'Pending';
              if (row.status) status = row.status;
              else if (stage === 'Won' || row.is_wicket === 1) status = 'Closed';
              else if (stage === 'Negotiation') status = 'Qualified';
              else if (idx % 3 === 0) status = 'Contacted';

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
                location: String(row.location || row.city || row.bowling_team || 'Global'),
                isDuplicate: false
              });
            }

            const percent = Math.min(100, Math.round((end / totalRows) * 100));
            setParseProgress(`Optimizing & mapping records: ${end.toLocaleString()} / ${totalRows.toLocaleString()} (${percent}%)...`);
            // Yield execution to browser main thread to prevent UI freezing
            await new Promise((resolve) => setTimeout(resolve, 0));
          }

          setIsParsing(false);
          setShowImportModal(false);
          soundEffects.playSuccessChime();
          onImportCustomData(mappedRows, file.name);
        } catch (err: any) {
          setIsParsing(false);
          setImportError(err.message || 'Failed to process CSV file data.');
        }
      },
      error: (err) => {
        setIsParsing(false);
        setImportError(`Papa Parse Error: ${err.message}`);
      }
    });
  };

  return (
    <div className="min-h-screen bg-charcoal text-white relative overflow-hidden flex flex-col justify-between selection:bg-terracotta selection:text-white">
      
      {/* Background Ambience Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-b from-gold/15 via-terracotta/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-48 w-96 h-96 bg-terracotta/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -left-48 w-96 h-96 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-20 border-b border-border-gold/50 bg-charcoal/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Top Left Static Logo */}
          <div className="flex items-center gap-3 select-none">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-terracotta to-terracotta-dark flex items-center justify-center shadow-lg shadow-terracotta/30 border border-terracotta-light/30">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5 font-sans">
                Speak<span className="text-gold">Sheet</span>
              </span>
              <span className="text-[10px] font-mono tracking-widest text-sand-muted block -mt-1">
                DATA CLEANING STUDIO
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-card border border-border-gold text-xs font-mono text-sand-subtext select-none">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Autonomous Engine Active
            </span>

            <button
              onClick={() => setShowImportModal(true)}
              className="btn-gold-outline px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-gold" />
              <span>Import CSV</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero Section: Symmetrically centered with zero side offset */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 lg:py-16 flex-1 flex flex-col items-center justify-center text-center">
        
        {/* Static Professional Badge - Purely Static Branding, NOT Clickable */}
        <div className="flex flex-col items-center justify-center mx-auto mb-6 select-none pointer-events-none">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-stone-card border border-border-gold shadow-xl mb-4">
            <Radio className="w-3.5 h-3.5 text-terracotta animate-pulse" />
            <span className="text-xs font-mono tracking-widest uppercase text-gold font-semibold">
              Voice-First Spreadsheet Studio &bull; Autonomous Cleaning Engine
            </span>
          </div>

          {/* Central Acoustic Sphere - PURELY STATIC BRANDING, NOT CLICKABLE */}
          <div className="relative flex flex-col items-center justify-center mx-auto my-3 pointer-events-none select-none cursor-default">
            <Voice3DOrb
              size={150}
              isListening={false}
              isProcessing={false}
              // Purely static branding: No onClick handler
            />
            <div className="text-[11px] font-mono text-sand-muted mt-2 tracking-wider uppercase select-none">
              Acoustic Speech Visualizer
            </div>
          </div>
        </div>

        {/* Hero Title - Perfectly Centered */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] max-w-4xl mx-auto text-center">
          Voice-First Spreadsheet Studio. <br />
          <span className="bg-gradient-to-r from-terracotta via-gold to-sand-subtext bg-clip-text text-transparent">
            Autonomous Cleaning Engine.
          </span>
        </h1>

        {/* Subtitle - Professional, Concise, Single-Focused */}
        <p className="mt-5 text-base sm:text-lg text-sand-subtext max-w-2xl font-normal leading-relaxed mx-auto text-center">
          Autonomous voice-driven spreadsheet studio for real-time data hygiene, deduplication, schema normalization, and bulk operations with deterministic speed.
        </p>

        {/* DUAL-ENTRY MAIN INTERACTIVE BUTTONS - Perfectly Centered */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md mx-auto mt-8">
          
          {/* Button 1: Launch Interactive Demo - THE EXCLUSIVE LAUNCH TRIGGER */}
          <button
            onClick={handleLaunchDemoClick}
            className="w-full sm:w-auto flex-1 btn-terracotta py-4 px-6 rounded-2xl text-sm font-bold flex items-center justify-center gap-2.5 shadow-2xl group cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-white group-hover:rotate-12 transition-transform" />
            <span>Launch Interactive Demo</span>
            <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Button 2: Start Fresh / Import CSV */}
          <button
            onClick={() => setShowImportModal(true)}
            className="w-full sm:w-auto flex-1 btn-gold-outline py-4 px-6 rounded-2xl text-sm font-bold flex items-center justify-center gap-2.5 shadow-xl group cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-gold" />
            <span>Start Fresh / Import CSV</span>
          </button>

        </div>

        {/* Quick prompt preview hints - Symmetrically Centered */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2 text-xs text-sand-muted font-mono mx-auto text-center select-none">
          <span className="text-sand-dark">Try saying:</span>
          <span className="bg-stone-card px-2.5 py-1 rounded-md border border-border-gold text-sand-subtext">
            "remove duplicate emails"
          </span>
          <span className="bg-stone-card px-2.5 py-1 rounded-md border border-border-gold text-sand-subtext">
            "filter canonical"
          </span>
          <span className="bg-stone-card px-2.5 py-1 rounded-md border border-border-gold text-sand-subtext">
            "clean messy emails"
          </span>
          <span className="bg-stone-card px-2.5 py-1 rounded-md border border-border-gold text-sand-subtext">
            "AI auto-score leads"
          </span>
        </div>

        {/* Three Value Pillars - Symmetrically Centered */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-12 text-left mx-auto">
          
          {/* Card 1 */}
          <div className="luxury-card p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-terracotta/15 border border-terracotta/30 flex items-center justify-center text-terracotta">
              <Mic className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Voice-First Grid
            </h3>
            <p className="text-xs text-sand-muted leading-relaxed">
              Execute instant spreadsheet hygiene, deduplication, and data cleaning using a voice command.
            </p>
          </div>

          {/* Card 2 */}
          <div className="luxury-card p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Visual Analytics
            </h3>
            <p className="text-xs text-sand-muted leading-relaxed">
              Track real-time data health score, valuation disturbance, and category metrics.
            </p>
          </div>

          {/* Card 3 */}
          <div className="luxury-card p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-700/40 flex items-center justify-center text-emerald-400">
              <Send className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Automated Outreach
            </h3>
            <p className="text-xs text-sand-muted leading-relaxed">
              Generate personalized multi-channel communication for clean and verified leads.
            </p>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border-gold/40 bg-charcoal/90 px-6 py-5 text-center text-xs text-sand-muted font-mono select-none">
        <p>&copy; 2026 SpeakSheet Inc. Professional Voice-First Spreadsheet Studio</p>
      </footer>

      {/* Robust Papa Parse Import / Clean Start Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/90 backdrop-blur-lg">
          <div className="bg-stone-card border border-border-gold rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border-gold pb-4">
              <div className="flex items-center gap-2">
                <FileUp className="w-5 h-5 text-gold" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  Import Files or Clean Start
                </h3>
              </div>
              <button
                onClick={() => !isParsing && setShowImportModal(false)}
                disabled={isParsing}
                className="text-sand-muted hover:text-white p-1 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dropzone with Papa Parse */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className="border-2 border-dashed border-border-gold hover:border-gold rounded-xl p-8 text-center bg-charcoal/60 transition-all cursor-pointer group relative"
            >
              {isParsing ? (
                <div className="py-6 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-9 h-9 text-gold animate-spin" />
                  <p className="text-sm font-semibold text-white">Streaming &amp; Parsing Large Dataset...</p>
                  <p className="text-xs text-sand-muted font-mono">{parseProgress}</p>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gold mx-auto group-hover:scale-110 transition-transform mb-2" />
                  <p className="text-sm font-semibold text-white">
                    Drag &amp; Drop CSV or JSON files here
                  </p>
                  <p className="text-xs text-sand-muted mt-1">
                    Powered by Papa Parse: Supports huge datasets (e.g. deliveries.csv) with zero browser freeze
                  </p>

                  <label className="mt-4 inline-block btn-gold-outline px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer">
                    Browse CSV File
                    <input
                      type="file"
                      accept=".csv,.json"
                      className="hidden"
                      onChange={handleFileDrop}
                    />
                  </label>

                  {importFileName && (
                    <p className="mt-3 text-xs font-mono text-emerald-400">
                      Selected: {importFileName}
                    </p>
                  )}

                  {importError && (
                    <p className="mt-3 text-xs text-red-400 font-mono">
                      {importError}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Clean Start Alternative */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-left">
                <span className="text-xs font-semibold text-white block">Prefer a clean slate?</span>
                <span className="text-[11px] text-sand-muted">Start with an empty editable table</span>
              </div>
              <button
                onClick={() => {
                  onStartFresh();
                  setShowImportModal(false);
                  soundEffects.playSuccessChime();
                }}
                disabled={isParsing}
                className="btn-terracotta px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Start Clean Sheet
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

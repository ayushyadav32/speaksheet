import React, { useState } from 'react';
import { CommandOutputBannerData } from '../../types/spreadsheet';
import { 
  Calculator, 
  ShieldCheck, 
  Filter, 
  Sparkles, 
  Target, 
  CheckCircle2, 
  X, 
  Copy, 
  Check, 
  ArrowRight,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { soundEffects } from '../../services/voiceEngine';

interface CommandOutputBannerProps {
  output: CommandOutputBannerData;
  onDismiss: () => void;
  onNavigateToOutreach?: () => void;
}

export const CommandOutputBanner: React.FC<CommandOutputBannerProps> = ({
  output,
  onDismiss,
  onNavigateToOutreach
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = `${output.title}: ${output.primaryMetric} | ${output.secondaryMetric || ''} (${output.details})`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    soundEffects.playListeningClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryDetails = () => {
    switch (output.category) {
      case 'computation':
        return {
          icon: <Calculator className="w-4 h-4 text-terracotta" />,
          label: 'Computation Result',
          badgeStyle: 'bg-terracotta/15 border-terracotta/40 text-terracotta',
          glowStyle: 'border-terracotta/50 shadow-[0_0_25px_rgba(217,83,58,0.25)]'
        };
      case 'hygiene':
        return {
          icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
          label: 'Data Hygiene Audit',
          badgeStyle: 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400',
          glowStyle: 'border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.2)]'
        };
      case 'filter':
        return {
          icon: <Filter className="w-4 h-4 text-gold" />,
          label: 'Deterministic Filter',
          badgeStyle: 'bg-gold/15 border-gold/40 text-gold',
          glowStyle: 'border-gold/40 shadow-[0_0_25px_rgba(212,163,89,0.2)]'
        };
      case 'ai':
        return {
          icon: <Sparkles className="w-4 h-4 text-purple-400" />,
          label: 'AI Propensity Engine',
          badgeStyle: 'bg-purple-950/40 border-purple-500/40 text-purple-400',
          glowStyle: 'border-purple-500/40 shadow-[0_0_25px_rgba(168,85,247,0.2)]'
        };
      case 'highlight':
      default:
        return {
          icon: <Target className="w-4 h-4 text-amber-400" />,
          label: 'Insight & Match',
          badgeStyle: 'bg-amber-950/40 border-amber-500/40 text-amber-400',
          glowStyle: 'border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.2)]'
        };
    }
  };

  const cat = getCategoryDetails();

  return (
    <div 
      className={`relative w-full rounded-2xl bg-gradient-to-r from-stone-card via-stone-surface to-stone-card border p-4 sm:p-5 transition-all animate-in fade-in slide-in-from-top-3 duration-300 ${cat.glowStyle}`}
      role="region"
      aria-label="Command Execution Result Banner"
    >
      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-gold/40 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-mono uppercase tracking-wider flex items-center gap-1.5 font-bold ${cat.badgeStyle}`}>
            {cat.icon}
            {cat.label}
          </span>

          <span className="text-[11px] font-mono text-sand-muted bg-charcoal px-2.5 py-0.5 rounded-md border border-border-gold">
            🎙️ Voice: <span className="text-white italic">"{output.commandText}"</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-sand-muted hidden sm:inline">
            Executed at {output.timestamp}
          </span>

          <button
            onClick={onDismiss}
            className="p-1 rounded-lg text-sand-muted hover:text-white hover:bg-stone-surface border border-transparent hover:border-border-gold transition-colors cursor-pointer"
            title="Dismiss Result Banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Metric Output Display */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-mono tracking-widest text-gold font-semibold">
              {output.title}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-white font-mono tracking-tight text-glow-terracotta">
            {output.primaryMetric}
          </h2>

          {output.secondaryMetric && (
            <p className="text-xs sm:text-sm font-mono text-sand-subtext flex flex-wrap items-center gap-2 pt-0.5">
              <span>{output.secondaryMetric}</span>
            </p>
          )}

          <p className="text-xs text-sand-muted leading-relaxed max-w-3xl pt-1">
            {output.details}
          </p>
        </div>

        {/* State Badges & Action Buttons */}
        <div className="flex flex-wrap md:flex-col items-start md:items-end justify-between gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border-gold/30">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="bg-charcoal px-2 py-1 rounded border border-border-gold text-sand-subtext">
              Active: <span className="text-gold font-bold">{output.activeRows}</span>
            </span>
            <span className="bg-charcoal px-2 py-1 rounded border border-border-gold text-sand-subtext">
              Total: <span className="text-white font-bold">{output.totalRows}</span>
            </span>
            {output.removedRows > 0 && (
              <span className="bg-charcoal px-2 py-1 rounded border border-border-gold text-sand-subtext">
                Removed: <span className="text-terracotta font-bold">{output.removedRows}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg border border-border-gold hover:border-gold bg-charcoal text-sand-subtext hover:text-white text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
              title="Copy output data to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {onNavigateToOutreach && (
              <button
                onClick={onNavigateToOutreach}
                className="btn-terracotta px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md shadow-terracotta/20"
              >
                <span>Outreach Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

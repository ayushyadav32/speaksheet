import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SpeakSheet ErrorBoundary caught an unhandled exception:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleHardReload = () => {
    try {
      sessionStorage.removeItem('speaksheet_active_csv');
      sessionStorage.removeItem('speaksheet_view');
      sessionStorage.removeItem('speaksheet_tab');
      window.location.hash = '';
    } catch {}
    window.location.reload();
  };

  private handleResetState = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[420px] w-full flex items-center justify-center p-6 bg-charcoal">
          <div className="max-w-xl w-full luxury-card p-6 md:p-8 rounded-2xl border-terracotta/60 shadow-2xl space-y-5 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-terracotta/20 border border-terracotta/50 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 text-terracotta" />
              </div>
              <div className="space-y-1 min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-widest text-terracotta px-2 py-0.5 rounded-full bg-terracotta/10 border border-terracotta/30 inline-block font-bold">
                  Fault Isolation Active
                </span>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {this.props.fallbackTitle || 'Rendering Exception Safely Contained'}
                </h2>
                <p className="text-xs text-sand-muted leading-relaxed">
                  SpeakSheet's boundary isolated a runtime exception from disrupting the entire application. Your session data remains safe.
                </p>
              </div>
            </div>

            {/* Error Message Box */}
            <div className="p-3.5 rounded-xl bg-black/60 border border-border-gold/60 font-mono text-xs text-sand-subtext break-words">
              <div className="flex items-center gap-2 text-terracotta font-semibold mb-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Error: {this.state.error?.name || 'RuntimeError'}</span>
              </div>
              <p className="text-white/90 text-[11px]">
                {this.state.error?.message || 'An unexpected rendering error occurred while computing tabular data.'}
              </p>
            </div>

            {/* Collapsible Technical Trace */}
            {this.state.errorInfo && (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                  className="text-[11px] font-mono text-gold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{this.state.showDetails ? 'Hide technical stack trace' : 'View technical stack trace'}</span>
                  {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {this.state.showDetails && (
                  <pre className="p-3 rounded-lg bg-black text-[10px] text-sand-muted font-mono overflow-x-auto max-h-40 border border-border-gold/40 custom-scrollbar whitespace-pre-wrap">
                    {this.state.error?.stack || this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex flex-wrap items-center gap-3 border-t border-border-gold/30">
              <button
                type="button"
                onClick={this.handleResetState}
                className="btn-terracotta px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>

              <button
                type="button"
                onClick={this.handleHardReload}
                className="btn-gold-outline px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer text-sand-subtext hover:text-white"
              >
                <Home className="w-3.5 h-3.5 text-gold" />
                <span>Reload to Safe State</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

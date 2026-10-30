import React, { useState, useEffect } from 'react';
import { ToastMessage } from '../../types/spreadsheet';
import { Sparkles, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Begin smooth fade-out at 2600ms
    const fadeTimer = setTimeout(() => {
      setIsExiting(true);
    }, 2600);

    // Completely dismiss at 3000ms (3 seconds)
    const dismissTimer = setTimeout(() => {
      onDismiss(toast.id);
    }, 3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, [toast.id, onDismiss]);

  const handleManualClose = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 250);
  };

  return (
    <div
      className={`pointer-events-auto bg-stone-card border border-gold/50 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-xl flex items-start gap-3 relative overflow-hidden transition-all duration-400 ease-out ${
        isExiting
          ? 'opacity-0 translate-y-3 scale-95 pointer-events-none'
          : 'opacity-100 translate-y-0 scale-100 animate-in slide-in-from-bottom-3 fade-in duration-300'
      }`}
      style={{
        boxShadow: '0 12px 35px -8px rgba(0,0,0,0.8), 0 0 15px rgba(212, 163, 89, 0.25)'
      }}
    >
      {/* 3-Second Countdown Progress Line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-charcoal">
        <div 
          className="h-full bg-gradient-to-r from-terracotta to-gold transition-all duration-[3000ms] ease-linear"
          style={{ width: isExiting ? '0%' : '100%' }}
        />
      </div>

      <div className="p-2 rounded-xl bg-gold/15 text-gold shrink-0 border border-gold/30 mt-0.5">
        <Sparkles className="w-4 h-4 text-gold animate-pulse" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-bold text-white tracking-tight">{toast.title}</h4>
          <span className="text-[10px] font-mono text-sand-muted">{toast.timestamp}</span>
        </div>
        <p className="text-xs text-sand-subtext mt-1 leading-relaxed">{toast.description}</p>
        {toast.modifiedCount !== undefined && toast.modifiedCount > 0 && (
          <span className="inline-block mt-2 text-[10px] font-mono text-gold px-2 py-0.5 rounded-full bg-gold/10 border border-gold/30">
            ✨ {toast.modifiedCount} Rows Mutated &amp; Flashing
          </span>
        )}
      </div>

      <button
        onClick={handleManualClose}
        className="text-sand-muted hover:text-white p-1 rounded-lg transition-colors shrink-0 cursor-pointer"
        title="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};


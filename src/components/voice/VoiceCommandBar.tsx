import React, { useState, useEffect, useRef } from 'react';
import { Voice3DOrb } from './Voice3DOrb';
import { voiceChips } from '../../data/mockData';
import { soundEffects } from '../../services/voiceEngine';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  SendHorizontal, 
  Volume2, 
  AudioWaveform,
  CheckCircle2,
  MailCheck,
  CaseSensitive,
  PhoneCall,
  CopySlash,
  Cpu,
  Coins,
  ShieldAlert,
  Send,
  Mail,
  MessageSquare,
  Zap,
  Target
} from 'lucide-react';
import { VoiceCommandChip } from '../../types/spreadsheet';

interface VoiceCommandBarProps {
  onExecuteCommand: (command: string) => void;
  onStageCommand?: (command: string) => void;
  isAwaitingConfirmation?: boolean;
  isProcessing: boolean;
  lastActionSummary?: string;
  chips?: VoiceCommandChip[];
  resetSignal?: number;
}

export const VoiceCommandBar: React.FC<VoiceCommandBarProps> = ({
  onExecuteCommand,
  onStageCommand,
  isAwaitingConfirmation = false,
  isProcessing,
  lastActionSummary,
  chips = voiceChips,
  resetSignal
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [inputVal, setInputVal] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [feedbackStatus, setFeedbackStatus] = useState<string | null>(null);
  const [isSimulatingVoice, setIsSimulatingVoice] = useState(false);
  const [simulatingPrompt, setSimulatingPrompt] = useState('');
  
  // Staging & Execution Lock State (Fix 1: Never auto-execute on mic stop; strictly execute once)
  const [stagedCommand, setStagedCommand] = useState('');
  const [internalAwaitingConfirmation, setInternalAwaitingConfirmation] = useState(false);
  const hasExecutedRef = useRef(false);

  const effectiveAwaiting = isAwaitingConfirmation || internalAwaitingConfirmation;

  const recognitionRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestTranscriptRef = useRef<string>('');

  // Reset state on external resetSignal
  useEffect(() => {
    if (resetSignal !== undefined) {
      setStagedCommand('');
      setInternalAwaitingConfirmation(false);
      setInputVal('');
      setTranscript('');
      setFeedbackStatus(null);
      hasExecutedRef.current = false;
      latestTranscriptRef.current = '';
    }
  }, [resetSignal]);

  // Initialize Web Speech API if supported with Continuous Listening & 3s Debounce
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        soundEffects.playListeningClick();
        setFeedbackStatus('Listening to voice command...');
        simulateAudioWave();
      };

      recognition.onresult = (event: any) => {
        let finalPart = '';
        let interimPart = '';

        for (let i = 0; i < event.results.length; ++i) {
          const res = event.results[i];
          const text = res[0]?.transcript || '';
          if (res.isFinal) {
            finalPart += text + ' ';
          } else {
            interimPart += text;
          }
        }

        const combined = (finalPart + interimPart).trim().replace(/\s+/g, ' ');
        if (combined) {
          // If already awaiting confirmation, check if spoken text is a confirmation word ("run", "yes", etc.)
          if (effectiveAwaiting) {
            const cleaned = combined.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
            if (/^(run|yes|confirm|execute|send|do it|ok|okay)$/i.test(cleaned)) {
              if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
              }
              if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch {}
              }
              setIsListening(false);
              stopAudioWave();
              handleExecuteCommand();
              return;
            }
          }

          latestTranscriptRef.current = combined;
          setTranscript(combined);
          setInputVal(combined);
          setFeedbackStatus(`Listening: "${combined}"`);

          // Resettable 3-second debounce timer on silence after speech ends
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }

          silenceTimerRef.current = setTimeout(() => {
            // 3 full seconds of silence after user finished speaking -> strictly stage, NEVER auto-execute!
            silenceTimerRef.current = null;
            if (recognitionRef.current) {
              try {
                recognitionRef.current.stop();
              } catch {}
            }
            setIsListening(false);
            stopAudioWave();
            handleVoiceInputStop(latestTranscriptRef.current);
          }, 3000);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        // Do NOT stop the microphone on brief pauses/silence; let the 3s debounce timer or user stop it
        if (event.error === 'no-speech') {
          return;
        }
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        setIsListening(false);
        setFeedbackStatus('Mic standby (type or click chips)');
        stopAudioWave();
      };

      recognition.onend = () => {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        setIsListening(false);
        stopAudioWave();
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      stopAudioWave();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const simulateAudioWave = () => {
    let t = 0;
    const loop = () => {
      t += 0.1;
      const wave = Math.abs(Math.sin(t) * 0.7 + Math.cos(t * 1.7) * 0.3);
      setAudioLevel(wave);
      animFrameRef.current = requestAnimationFrame(loop);
    };
    loop();
  };

  const stopAudioWave = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setAudioLevel(0);
  };

  const toggleListening = () => {
    if (isListening) {
      // User clicked Mic button to finish speaking
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      stopAudioWave();
      setFeedbackStatus(null);

      const textToSubmit = inputVal.trim() || transcript.trim() || latestTranscriptRef.current.trim();
      if (textToSubmit) {
        handleVoiceInputStop(textToSubmit);
      }
    } else {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      latestTranscriptRef.current = '';
      setInputVal('');
      setTranscript('');
      setFeedbackStatus('Listening to voice command...');

      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // If already started or browser blocked, fall back to simulated active state
          simulateVoiceInputFlow();
        }
      } else {
        // Fallback for browsers without Web Speech API
        simulateVoiceInputFlow();
      }
    }
  };

  const simulateVoiceInputFlow = () => {
    setIsListening(true);
    soundEffects.playListeningClick();
    simulateAudioWave();
    setFeedbackStatus('Listening... (Voice mode active)');

    const mockPrompts = [
      'Clean messy emails and trim whitespaces',
      'Capitalize all contact full names',
      'Highlight VIP deals over 50000',
      'AI auto-score all pipeline leads',
      'Normalize phone numbers to international format'
    ];
    const picked = mockPrompts[Math.floor(Math.random() * mockPrompts.length)];

    let current = '';
    let index = 0;
    const interval = setInterval(() => {
      if (index < picked.length) {
        current += picked[index];
        setTranscript(current);
        setInputVal(current);
        index++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsListening(false);
          stopAudioWave();
          handleVoiceInputStop(picked);
        }, 600);
      }
    }, 40);
  };

  // Strictly stops listening and stages the parsed command for confirmation (NEVER auto-executes on mic stop)
  const handleVoiceInputStop = (rawText?: string) => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    stopAudioWave();

    const text = (rawText || inputVal.trim() || transcript.trim() || latestTranscriptRef.current.trim()).trim();
    if (!text) {
      setFeedbackStatus(null);
      return;
    }

    // 1. Stage the parsed command for confirmation
    setStagedCommand(text);
    setInputVal(text);
    setTranscript(text);
    latestTranscriptRef.current = text;
    setInternalAwaitingConfirmation(true);
    hasExecutedRef.current = false; // Reset execution lock for this new command

    // 2. Notify parent onStageCommand if provided
    if (onStageCommand) {
      onStageCommand(text);
    }

    setFeedbackStatus('Command staged. Click "Run / Confirm" or say "Run" to execute.');
  };

  // Single Execution Gate with Execution Lock (Executes strictly ONCE per command)
  const handleExecuteCommand = (cmdToRun?: string) => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    stopAudioWave();
    setIsListening(false);

    // Strict execution lock: once executed, cannot fire again
    if (hasExecutedRef.current) return;

    const finalCmd = (cmdToRun || stagedCommand || inputVal.trim() || transcript.trim() || latestTranscriptRef.current.trim()).trim();
    if (!finalCmd) return;

    hasExecutedRef.current = true;
    setInternalAwaitingConfirmation(false);
    setStagedCommand('');
    latestTranscriptRef.current = '';

    setFeedbackStatus('Executing voice intent...');
    onExecuteCommand(finalCmd);
    setInputVal('');
    setTranscript('');

    setTimeout(() => {
      hasExecutedRef.current = false;
      setFeedbackStatus(null);
    }, 2000);
  };

  // ONE-CLICK VOICE DICTATION SIMULATION (1 Second Visual Indicator Before Staging)
  const handleChipClick = (chip: VoiceCommandChip) => {
    if (isSimulatingVoice || isProcessing) return;

    soundEffects.playListeningClick();
    setIsSimulatingVoice(true);
    setSimulatingPrompt(chip.prompt);
    setInputVal(`🎙️ "${chip.prompt}"`);
    setIsListening(true);
    simulateAudioWave();
    setFeedbackStatus(`Voice Dictation: "${chip.prompt}"...`);

    // Exactly 1-second glowing audio-wave / mic-pulse indicator before staging
    setTimeout(() => {
      stopAudioWave();
      setIsListening(false);
      setIsSimulatingVoice(false);
      setInputVal(chip.prompt);
      handleVoiceInputStop(chip.prompt);
    }, 1000);
  };

  const getChipIcon = (iconName: string) => {
    switch (iconName) {
      case 'MailCheck': return <MailCheck className="w-3.5 h-3.5 text-gold" />;
      case 'CaseSensitive': return <CaseSensitive className="w-3.5 h-3.5 text-gold" />;
      case 'PhoneCall': return <PhoneCall className="w-3.5 h-3.5 text-gold" />;
      case 'CopySlash': return <CopySlash className="w-3.5 h-3.5 text-gold" />;
      case 'Sparkles': return <Sparkles className="w-3.5 h-3.5 text-gold" />;
      case 'Cpu': return <Cpu className="w-3.5 h-3.5 text-gold" />;
      case 'Send': return <Send className="w-3.5 h-3.5 text-gold" />;
      case 'Coins': return <Coins className="w-3.5 h-3.5 text-gold" />;
      case 'CheckCircle2': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'ShieldAlert': return <ShieldAlert className="w-3.5 h-3.5 text-terracotta" />;
      case 'Mail': return <Mail className="w-3.5 h-3.5 text-terracotta" />;
      case 'MessageSquare': return <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Zap': return <Zap className="w-3.5 h-3.5 text-gold" />;
      case 'Target': return <Target className="w-3.5 h-3.5 text-terracotta" />;
      default: return <Sparkles className="w-3.5 h-3.5 text-gold" />;
    }
  };

  return (
    <div className="w-full bg-stone-card rounded-2xl border border-border-gold p-4 md:p-5 shadow-2xl relative overflow-hidden backdrop-blur-md">
      {/* Decorative Gold & Crimson Ambient Background Glow */}
      <div className="absolute top-0 right-0 w-80 h-36 bg-gradient-to-l from-gold/10 via-terracotta/10 to-transparent blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-24 bg-gold/5 blur-3xl pointer-events-none" />

      {/* Main Bar: Layout with 3D Orb, Input, and Controls */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 relative z-10">
        
        {/* Left: Branding & Voice Status Indicator */}
        <div className="flex items-center gap-4 w-full lg:w-auto">
          {/* Interactive 3D Voice Orb */}
          <div className="shrink-0">
            <Voice3DOrb
              size={110}
              isListening={isListening || isSimulatingVoice}
              isProcessing={isProcessing}
              audioLevel={audioLevel}
              onClick={toggleListening}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1.5 transition-all ${
                isSimulatingVoice
                  ? 'text-terracotta bg-terracotta/20 border border-terracotta ring-1 ring-terracotta/40 animate-pulse'
                  : 'text-gold bg-gold/10 border border-gold/25'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isListening || isSimulatingVoice ? 'bg-terracotta animate-ping' : 'bg-gold'}`} />
                {isSimulatingVoice ? 'Voice Dictation Simulated' : 'Voice Command Engine'}
              </span>
              <span className="text-[11px] text-sand-muted font-mono hidden sm:inline">
                Real-Time Parser
              </span>
            </div>
            <h3 className="text-base font-bold text-white tracking-tight mt-1">
              Voice-First Autonomous Cleaning Engine
            </h3>
            <p className="text-xs text-sand-muted line-clamp-1 mt-0.5">
              {feedbackStatus || lastActionSummary || 'Speak or select a quick action to execute deterministic data operations.'}
            </p>
          </div>
        </div>

        {/* Right: Natural Language Input + Mic Button */}
        <div className="w-full lg:max-w-xl flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExecuteCommand()}
              placeholder='e.g., "Clean emails", "Highlight deals over 50k", "AI auto-score"'
              className={`w-full pl-10 pr-24 py-2.5 bg-charcoal/90 text-white placeholder-sand-muted/50 text-sm rounded-xl border focus:outline-none transition-all shadow-inner font-sans ${
                isSimulatingVoice
                  ? 'border-terracotta ring-2 ring-terracotta/50 shadow-[0_0_15px_rgba(217,83,58,0.3)] text-terracotta-light'
                  : 'border-border-gold focus:border-gold focus:ring-1 focus:ring-gold'
              }`}
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sand-muted pointer-events-none">
              {isListening || isSimulatingVoice ? (
                <AudioWaveform className="w-4 h-4 text-terracotta animate-pulse" />
              ) : (
                <Sparkles className="w-4 h-4 text-gold" />
              )}
            </div>

            {/* In-input audio level meter when listening or simulating voice */}
            {(isListening || isSimulatingVoice) && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                {[0.4, 0.8, 1.2, 0.6, 0.9].map((multiplier, idx) => (
                  <span
                    key={idx}
                    className="w-1 bg-terracotta rounded-full transition-all duration-75"
                    style={{
                      height: `${Math.max(4, (audioLevel || 0.6) * 18 * multiplier)}px`
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Voice Mic Toggle Button */}
          <button
            onClick={toggleListening}
            className={`px-3.5 py-2.5 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-all shadow-lg shrink-0 cursor-pointer ${
              isListening || isSimulatingVoice
                ? 'bg-terracotta text-white hover:bg-terracotta-hover animate-pulse shadow-terracotta/40 ring-2 ring-terracotta/60'
                : 'btn-gold-outline text-sand-subtext hover:text-white'
            }`}
            title="Toggle Voice Input (Microphone)"
          >
            {isListening || isSimulatingVoice ? (
              <>
                <MicOff className="w-4 h-4" />
                <span className="hidden sm:inline">Stop</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 text-gold" />
                <span className="hidden sm:inline">Speak</span>
              </>
            )}
          </button>

          {/* Execute Command Button */}
          <button
            onClick={() => handleExecuteCommand()}
            disabled={isProcessing || isSimulatingVoice || (!inputVal.trim() && !transcript.trim() && !effectiveAwaiting)}
            className={`px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shrink-0 font-bold transition-all cursor-pointer ${
              effectiveAwaiting
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse shadow-lg shadow-emerald-500/50 ring-2 ring-emerald-400'
                : 'btn-terracotta disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
            title={effectiveAwaiting ? "Click to confirm and run" : "Run command"}
          >
            <span>{effectiveAwaiting ? 'Run (Confirm)' : 'Run'}</span>
            <SendHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Glowing Voice Dictation Simulation Indicator Banner (Active during 1s simulation) */}
      {isSimulatingVoice && (
        <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-terracotta/25 via-stone-card to-gold/20 border border-terracotta shadow-[0_0_20px_rgba(217,83,58,0.35)] flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-terracotta flex items-center justify-center text-white shadow-md shadow-terracotta/60 animate-bounce">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="text-terracotta font-bold tracking-wider">VOICE DICTATION RECORDING</span>
                <span className="text-sand-muted">· 1s Speech Simulation</span>
              </div>
              <p className="text-xs text-white font-medium italic">
                "{simulatingPrompt}"
              </p>
            </div>
          </div>

          {/* Equalizer Bars */}
          <div className="flex items-end gap-1.5 h-5 px-3 py-1 rounded-lg bg-charcoal/80 border border-border-gold shrink-0">
            {[6, 16, 10, 20, 14, 18, 8].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-gradient-to-t from-terracotta to-gold rounded-full animate-pulse"
                style={{
                  height: `${h}px`,
                  animationDelay: `${i * 100}ms`,
                  animationDuration: '500ms'
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Quick Command Chips Row directly above the spreadsheet table */}
      <div className="mt-3.5 pt-3 border-t border-border-gold/60 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <span className="text-[11px] font-mono uppercase tracking-wider text-sand-muted shrink-0 flex items-center gap-1 pl-1">
          <Sparkles className="w-3 h-3 text-gold" /> Voice Quick Actions:
        </span>

        {chips.map((chip) => {
          const isThisChipActive = isSimulatingVoice && simulatingPrompt === chip.prompt;
          return (
            <button
              key={chip.id}
              onClick={() => handleChipClick(chip)}
              disabled={isSimulatingVoice || isProcessing}
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all shrink-0 active:scale-95 shadow-sm cursor-pointer disabled:opacity-60 ${
                isThisChipActive
                  ? 'bg-terracotta/30 border-terracotta text-white ring-2 ring-terracotta/60 shadow-[0_0_15px_rgba(217,83,58,0.6)] animate-pulse'
                  : 'bg-charcoal/70 hover:bg-stone-surface border-border-gold hover:border-gold text-sand-subtext hover:text-white'
              }`}
              title={chip.prompt}
            >
              <span className={`transition-transform ${isThisChipActive ? 'scale-125 animate-bounce' : 'group-hover:scale-110'}`}>
                {getChipIcon(chip.icon)}
              </span>
              <span className="font-medium whitespace-nowrap">{chip.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

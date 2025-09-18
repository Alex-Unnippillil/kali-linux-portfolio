import React from 'react';
import type { VoiceCommandEvent } from '../../hooks/useVoiceCommands';

interface VoiceHUDProps {
  listening: boolean;
  initializing: boolean;
  transcript: string;
  partialTranscript?: string;
  history: VoiceCommandEvent[];
  pendingConfirmation: VoiceCommandEvent | null;
  hotkey: string;
  error?: string | null;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const statusLabel = (listening: boolean, initializing: boolean) => {
  if (initializing) return 'Loading model…';
  return listening ? 'Listening' : 'Voice control paused';
};

const VoiceHUD: React.FC<VoiceHUDProps> = ({
  listening,
  initializing,
  transcript,
  partialTranscript,
  history,
  pendingConfirmation,
  hotkey,
  error,
  onConfirm,
  onCancel,
}) => {
  const recentHistory = history.slice(1, 5);
  return (
    <aside
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] w-80 max-w-[90vw] text-sm text-white"
    >
      <div className="pointer-events-auto overflow-hidden rounded-xl border border-white/10 bg-black/70 shadow-lg backdrop-blur">
        <header className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className={`h-2.5 w-2.5 rounded-full ${
                listening ? 'bg-green-400 animate-pulse' : initializing ? 'bg-amber-300 animate-pulse' : 'bg-zinc-500'
              }`}
            />
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
              {statusLabel(listening, initializing)}
            </p>
          </div>
          <span className="text-[11px] font-medium text-white/60">Hotkey: {hotkey}</span>
        </header>
        <div className="space-y-2 px-3 py-2">
          {error && (
            <div role="alert" className="rounded bg-red-500/20 px-2 py-1 text-[11px] text-red-200">
              {error}
            </div>
          )}
          {partialTranscript && !listening && !initializing && (
            <p className="text-[11px] text-white/60">{partialTranscript}…</p>
          )}
          {transcript && (
            <div>
              <p className="text-[11px] uppercase tracking-wide text-white/50">Last command</p>
              <p className="mt-0.5 text-base text-white">{transcript}</p>
            </div>
          )}
          {pendingConfirmation && (
            <div className="rounded-lg border border-yellow-400/40 bg-yellow-500/10 px-3 py-2 text-[13px] text-yellow-100">
              <p className="font-medium">Confirm “{pendingConfirmation.phrase}”?</p>
              <p className="mt-1 text-[11px] text-yellow-200/80">
                Say “Confirm” or use the buttons below before closing or deleting windows.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={onConfirm}
                  className="flex-1 rounded bg-green-500/30 px-2 py-1 text-xs font-semibold text-green-100 hover:bg-green-500/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 rounded bg-red-500/30 px-2 py-1 text-xs font-semibold text-red-100 hover:bg-red-500/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {recentHistory.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wide text-white/50">Recent</p>
              <ul className="mt-1 space-y-1 text-[12px] text-white/70">
                {recentHistory.map((item, index) => (
                  <li key={`${item.type}-${index}`} className="flex justify-between gap-2">
                    <span className="truncate">{item.phrase}</span>
                    <span className="shrink-0 text-[10px] uppercase text-white/40">{item.type}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-[10px] leading-relaxed text-white/50">
            Voice control runs locally with the bundled Vosk model. Toggle it with the hotkey above when you need hands-free
            navigation.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default VoiceHUD;

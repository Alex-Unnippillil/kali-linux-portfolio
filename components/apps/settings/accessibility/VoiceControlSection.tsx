import React, { useEffect, useState } from 'react';

interface VoiceControlSectionProps {
  enabled: boolean;
  requireConfirmation: boolean;
  hotkey: string;
  onToggleEnabled: (value: boolean) => void;
  onToggleConfirmation: (value: boolean) => void;
  onHotkeyChange: (value: string) => void;
}

const formatKey = (key: string) => {
  switch (key) {
    case ' ':
      return 'Space';
    case 'Escape':
      return 'Esc';
    default:
      return key.length === 1 ? key.toUpperCase() : key.replace(/(^.|\s.)/g, (match) => match.toUpperCase());
  }
};

const VoiceControlSection: React.FC<VoiceControlSectionProps> = ({
  enabled,
  requireConfirmation,
  hotkey,
  onToggleEnabled,
  onToggleConfirmation,
  onHotkeyChange,
}) => {
  const [capturing, setCapturing] = useState(false);
  const [hint, setHint] = useState('Press the hotkey to toggle listening without touching the keyboard.');

  useEffect(() => {
    if (!capturing) return undefined;
    const handleKeydown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const combo: string[] = [];
      if (event.ctrlKey) combo.push('Ctrl');
      if (event.metaKey) combo.push('Meta');
      if (event.altKey) combo.push('Alt');
      if (event.shiftKey) combo.push('Shift');
      const key = event.key;
      if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
        combo.push(formatKey(key === ' ' ? ' ' : key));
      }
      const next = combo.join('+');
      onHotkeyChange(next || 'Ctrl+Shift+Space');
      setCapturing(false);
      setHint('Hotkey updated. Try it on the desktop to start listening.');
    };
    window.addEventListener('keydown', handleKeydown, true);
    return () => window.removeEventListener('keydown', handleKeydown, true);
  }, [capturing, onHotkeyChange]);

  useEffect(() => {
    if (!enabled) {
      setHint('Enable voice control to request microphone access and display the HUD.');
    } else {
      setHint('Use clear verbs like “Open terminal” or “Close window” to trigger commands.');
    }
  }, [enabled]);

  return (
    <section className="mt-8 w-full max-w-3xl rounded-xl border border-ubt-cool-grey/60 bg-black/30 p-4 text-white shadow-inner">
      <header className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Voice control</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onToggleEnabled(event.target.checked)}
            className="h-4 w-4"
          />
          Enabled
        </label>
      </header>
      <p className="mb-3 text-sm text-white/70">{hint}</p>
      <div className="mb-4 flex flex-wrap gap-4">
        <button
          type="button"
          onClick={() => setCapturing(true)}
          disabled={!enabled}
          className="rounded border border-white/20 px-3 py-2 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/40"
        >
          {capturing ? 'Listening for keys…' : `Hotkey: ${hotkey}`}
        </button>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            disabled={!enabled}
            checked={requireConfirmation}
            onChange={(event) => onToggleConfirmation(event.target.checked)}
            className="h-4 w-4"
          />
          Require “confirm” before closing windows
        </label>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/80">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">Training tips</h3>
        <ul className="mt-2 space-y-1 list-disc pl-5">
          <li>Start by saying “Start listening” or press the hotkey after granting microphone permission.</li>
          <li>Use action phrases like “Open settings”, “Focus next window”, or “Show desktop”.</li>
          <li>For dictation, begin with “Type” or “Dictate”, then speak your text naturally.</li>
          <li>Say “Confirm” or “Cancel” when the HUD asks for approval.</li>
        </ul>
      </div>
    </section>
  );
};

export default VoiceControlSection;

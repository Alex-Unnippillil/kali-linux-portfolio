'use client';

import { useEffect, useState } from 'react';
// Assuming the registry is in the parent folder's parent or similar, verify import
// Original import was: import useKeymap from '../keymapRegistry';
// File path: apps/settings/components/KeymapOverlay.tsx -> ../keymapRegistry.ts exists?
// Creating absolute path relative to project for import? No, relative import is fine.
import useKeymap from '../keymapRegistry'; // Adjusted path if needed, but original was ../keymapRegistry. Let's check where keymapRegistry is.
// User's original file was in apps/settings/components/KeymapOverlay.tsx
// Original import: import useKeymap from '../keymapRegistry';
// This means keymapRegistry is in apps/settings/keymapRegistry.ts.
// Let's verify file location from earlier "Other open documents": apps\settings\keymapRegistry.ts
// So ../keymapRegistry is correct.

interface KeymapOverlayProps {
  open: boolean;
  onClose: () => void;
}

const formatEvent = (e: KeyboardEvent) => {
  const parts = [
    e.ctrlKey ? 'Ctrl' : '',
    e.altKey ? 'Alt' : '',
    e.shiftKey ? 'Shift' : '',
    e.metaKey ? 'Meta' : '',
    e.key.length === 1 ? e.key.toUpperCase() : e.key,
  ];
  return parts.filter(Boolean).join('+');
};

export default function KeymapOverlay({ open, onClose }: KeymapOverlayProps) {
  // Fix the import if necessary. The file is in components/, so .. goes to apps/settings/.
  // So ../keymapRegistry is strictly correct.
  const { shortcuts, updateShortcut } = useKeymap();

  // Shortcuts might be undefined if the hook isn't providing defaults? 
  // The original code used it directly. Assuming it works.

  const [rebinding, setRebinding] = useState<string | null>(null);

  useEffect(() => {
    if (!rebinding) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      const combo = formatEvent(e);
      // updateShortcut might not be available in all versions of the hook?
      // Check original code: yes it uses updateShortcut(rebinding, combo).
      if (updateShortcut) {
        updateShortcut(rebinding, combo);
      }
      setRebinding(null);
    };
    window.addEventListener('keydown', handler, { once: true });
    return () => window.removeEventListener('keydown', handler);
  }, [rebinding, updateShortcut]);

  if (!open) return null;

  // Derive conflicts
  const safeShortcuts = shortcuts || [];
  const keyCounts = safeShortcuts.reduce<Map<string, number>>((map, s) => {
    map.set(s.keys, (map.get(s.keys) || 0) + 1);
    return map;
  }, new Map());


  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-w-2xl w-full max-h-[80vh] flex flex-col rounded-2xl border border-[var(--kali-panel-border)] bg-[var(--kali-panel)]/95 shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-[var(--kali-panel-border)]/50">
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-text)]">Keyboard Shortcuts</h2>
            <p className="text-xs text-[var(--color-text)]/60 mt-1">Customize your workflow</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--kali-panel-border)]/20 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text)]">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {safeShortcuts.length === 0 && (
            <div className="text-center py-10 opacity-50">No shortcuts defined</div>
          )}
          {safeShortcuts.map((s) => {
            const isConflict = (keyCounts.get(s.keys) || 0) > 1;
            return (
              <div
                key={s.description}
                className={`
                    group flex items-center justify-between p-3 rounded-lg border transition-all
                    ${isConflict ? 'border-red-500/50 bg-red-500/10' : 'border-[var(--kali-panel-border)]/20 bg-[var(--kali-panel-border)]/5 hover:bg-[var(--kali-panel-border)]/10 hover:border-[var(--kali-panel-border)]/40'}
                  `}
              >
                <span className="text-sm font-medium text-[var(--color-text)]">{s.description}</span>

                <div className="flex items-center gap-3">
                  <code className={`
                        px-2 py-1 rounded-md text-xs font-mono border
                        ${isConflict ? 'bg-red-500/20 border-red-500/30 text-red-100' : 'bg-black/20 border-white/10 text-[var(--kali-control)]'}
                    `}>
                    {s.keys}
                  </code>

                  <button
                    onClick={() => setRebinding(s.description)}
                    className={`
                            px-3 py-1.5 rounded-md text-xs font-semibold transition-all shadow-sm
                            ${rebinding === s.description
                        ? 'bg-[var(--kali-control)] text-white ring-2 ring-[var(--kali-control)]/50'
                        : 'bg-[var(--kali-panel-border)]/30 text-[var(--color-text)] hover:bg-[var(--kali-control)] hover:text-white'
                      }
                        `}
                  >
                    {rebinding === s.description ? 'Listening...' : 'Edit'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-4 bg-[var(--kali-panel-border)]/10 border-t border-[var(--kali-panel-border)]/20 text-center text-xs text-[var(--color-text)]/40">
          Press Esc to cancel binding
        </div>
      </div>
    </div>
  );
}

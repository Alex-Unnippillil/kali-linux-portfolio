'use client';
import type { CSSProperties } from 'react';
import { useEffect } from 'react';

const noteTheme: CSSProperties = {
  '--sticky-note-surface':
    'color-mix(in srgb, var(--kali-terminal-text, #f8fafc) 88%, var(--kali-blue, #0f94d2) 12%)',
  '--sticky-note-ink':
    'color-mix(in srgb, var(--kali-bg-solid, #0b121a) 92%, rgba(0, 0, 0, 0.08))',
  '--sticky-note-border': 'color-mix(in srgb, var(--kali-blue, #0f94d2) 32%, transparent)',
  '--sticky-note-shadow':
    '0 18px 36px color-mix(in srgb, var(--kali-blue-glow, rgba(15, 148, 210, 0.35)) 55%, transparent)',
};

export default function StickyNotes() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('./main');
    }
  }, []);

  return (
    <div
      className="relative flex h-full min-h-full flex-col bg-[color:var(--kali-bg,var(--color-bg))] text-[color:var(--kali-text,#f5f5f5)]"
      style={noteTheme}
    >
      <button
        id="add-note"
        className="fixed left-4 top-4 z-50 rounded-xl border border-[color:color-mix(in_srgb,var(--kali-blue,_#0f94d2)_45%,transparent)] bg-[color:var(--color-accent)] px-3 py-2 text-sm font-semibold uppercase tracking-wide text-[color:var(--color-inverse)] shadow-lg transition hover:-translate-y-px hover:bg-[color:color-mix(in_srgb,var(--color-accent)_90%,rgba(0,0,0,0.12))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
        type="button"
      >
        Add Note
      </button>
      <div id="notes" className="relative h-full w-full p-4 pt-16" />
    </div>
  );
}


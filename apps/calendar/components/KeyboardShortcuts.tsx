'use client';

interface ShortcutItem {
  keys: string;
  description: string;
}

const shortcuts: ShortcutItem[] = [
  {
    keys: '← →',
    description: 'Move the focused day backward or forward by one day.',
  },
  {
    keys: '↑ ↓',
    description:
      'In month view move by one week. In week/day views move by one day.',
  },
  {
    keys: 'Page Up / Page Down',
    description: 'Jump to the previous or next month, week, or day.',
  },
  {
    keys: 'Home / End',
    description: 'Jump to the start or end of the visible range.',
  },
  {
    keys: 'M · W · D',
    description: 'Switch between month, week, and day views.',
  },
  {
    keys: 'T',
    description: 'Return focus to today.',
  },
];

export default function KeyboardShortcuts() {
  return (
    <section
      id="calendar-shortcuts"
      aria-label="Keyboard shortcuts"
      className="rounded border border-white/10 bg-black/30 p-4 text-xs text-white/80"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-white/80">
        Keyboard shortcuts
      </h2>
      <ul className="mt-3 space-y-2">
        {shortcuts.map((shortcut) => (
          <li key={shortcut.keys} className="flex items-start justify-between gap-3">
            <span className="font-mono text-white">{shortcut.keys}</span>
            <span className="text-right leading-relaxed">
              {shortcut.description}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

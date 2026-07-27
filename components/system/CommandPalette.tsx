'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type CommandHandler = () => string | void;

export interface CommandDefinition {
  id: string;
  title: string;
  description?: string;
  keywords?: string[];
  run: CommandHandler;
}

const DESKTOP_NAME_FALLBACK = 'Kali Linux Desktop';
const LIVE_REGION_ID = 'live-region';
const SOUND_SETTING_KEY = 'qs-sound';
const DESKTOP_NAME_KEY = 'desktop-name';

const clearAndAnnounce = (message: string) => {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const region = document.getElementById(LIVE_REGION_ID);
  if (!region) return;
  region.textContent = '';
  window.setTimeout(() => {
    region.textContent = message;
  }, 50);
};

const speakMessage = (message: string) => {
  if (typeof window === 'undefined') return false;
  const synthesis = window.speechSynthesis;
  const Utterance = (window as typeof window & { SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance })
    .SpeechSynthesisUtterance;
  if (!synthesis || typeof synthesis.speak !== 'function' || typeof Utterance !== 'function') {
    return false;
  }
  try {
    synthesis.cancel();
    const utterance = new Utterance(message);
    utterance.rate = 1;
    utterance.pitch = 1;
    synthesis.speak(utterance);
    return true;
  } catch (error) {
    console.error('Failed to play speech output', error);
    return false;
  }
};

const getStoredDesktopName = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DESKTOP_NAME_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string' && parsed.trim().length > 0) return parsed;
    } catch {
      if (raw.trim().length > 0) return raw;
    }
  } catch {
    // ignore storage errors
  }
  return null;
};

const getDesktopName = () => {
  if (typeof document === 'undefined') return DESKTOP_NAME_FALLBACK;
  const sources = [
    document.documentElement?.getAttribute('data-desktop-name'),
    document.body?.getAttribute('data-desktop-name'),
    document.getElementById('desktop')?.getAttribute('data-desktop-name'),
  ];
  for (const name of sources) {
    if (typeof name === 'string' && name.trim().length > 0) {
      return name.trim();
    }
  }
  const stored = getStoredDesktopName();
  return stored || DESKTOP_NAME_FALLBACK;
};

const getOpenWindowCount = () => {
  if (typeof document === 'undefined') return 0;
  const nodes = Array.from(document.querySelectorAll('.opened-window')) as HTMLElement[];
  return nodes.filter((node) => !node.classList.contains('closed-window')).length;
};

const isDoNotDisturbEnabled = () => {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem('desktop-dnd');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'boolean') return parsed;
        if (typeof parsed === 'string') return parsed.toLowerCase() === 'true';
      } catch {
        if (raw.trim().length > 0) {
          return raw.trim().toLowerCase() === 'true';
        }
      }
    }
    const soundRaw = window.localStorage.getItem(SOUND_SETTING_KEY);
    if (soundRaw) {
      try {
        const parsed = JSON.parse(soundRaw);
        if (typeof parsed === 'boolean') return !parsed;
        if (typeof parsed === 'string') return parsed.toLowerCase() !== 'true';
      } catch {
        return soundRaw.toLowerCase() !== 'true';
      }
    }
  } catch {
    // ignore storage errors
  }
  return false;
};

export const buildDesktopStatusMessage = () => {
  const name = getDesktopName();
  const count = getOpenWindowCount();
  const dnd = isDoNotDisturbEnabled();
  const windowPart =
    count === 0
      ? 'no open windows'
      : count === 1
        ? '1 window open'
        : `${count} windows open`;
  return {
    name,
    windowCount: count,
    doNotDisturb: dnd,
    message: `${name} desktop, ${windowPart}. Do Not Disturb is ${dnd ? 'on' : 'off'}.`,
  };
};

export const announceDesktopStatus: CommandHandler = () => {
  if (typeof document === 'undefined') return;
  const { message } = buildDesktopStatusMessage();
  const spoke = speakMessage(message);
  if (!spoke) {
    clearAndAnnounce(message);
  } else {
    clearAndAnnounce(message);
  }
  return message;
};

export const COMMANDS: CommandDefinition[] = [
  {
    id: 'system.desktop-status',
    title: 'Announce desktop status',
    description: 'Summarize the desktop name, open window count, and Do Not Disturb setting.',
    keywords: ['status', 'desktop', 'windows', 'dnd', 'system'],
    run: announceDesktopStatus,
  },
];

export const executeCommand = (id: string) => {
  const command = COMMANDS.find((entry) => entry.id === id);
  return command?.run();
};

interface CommandPaletteProps {
  query?: string;
  onSelect?: (command: CommandDefinition) => void;
}

const matchesQuery = (command: CommandDefinition, query: string) => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    command.title,
    command.description,
    ...(command.keywords || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
};

const CommandPalette = ({ query = '', onSelect }: CommandPaletteProps): JSX.Element | null => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(query);

  useEffect(() => {
    setSearch(query);
  }, [query]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const isModifier = event.ctrlKey || event.metaKey;
    if (isModifier && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      setOpen((value) => !value);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const results = useMemo(
    () => COMMANDS.filter((command) => matchesQuery(command, search)),
    [search],
  );

  const handleSelect = (command: CommandDefinition) => {
    onSelect?.(command);
    command.run();
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-70">
      <div className="mt-16 w-full max-w-lg rounded-lg bg-ub-grey p-4 shadow-lg">
        <label className="sr-only" htmlFor="command-search">
          Search commands
        </label>
        <input
          id="command-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="mb-3 w-full rounded border border-ubt-grey bg-black/30 px-3 py-2 text-white outline-none"
          placeholder="Search commands"
        />
        <ul className="max-h-60 space-y-1 overflow-y-auto">
          {results.length === 0 ? (
            <li className="rounded bg-black/30 px-3 py-2 text-sm text-ubt-grey">
              No matching commands
            </li>
          ) : (
            results.map((command) => (
              <li key={command.id}>
                <button
                  type="button"
                  className="w-full rounded bg-black/40 px-3 py-2 text-left text-white transition hover:bg-black/60"
                  onClick={() => handleSelect(command)}
                >
                  <div className="text-sm font-semibold">{command.title}</div>
                  {command.description && (
                    <div className="text-xs text-ubt-grey">{command.description}</div>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default CommandPalette;

import { isBrowser } from '@/utils/env';
import { useEffect, useState } from 'react';
import logger from '../../utils/logger';

interface ClipmanSettings {
  syncSelections: boolean;
  persistOnExit: boolean;
}

interface ClipmanData {
  history: string[];
  settings: ClipmanSettings;
}

export const CLIPMAN_STORAGE_KEY = 'clipman';

function loadData(): ClipmanData {
  if (!isBrowser()) {
    return {
      history: [],
      settings: { syncSelections: false, persistOnExit: false },
    };
  }
  try {
    const raw = localStorage.getItem(CLIPMAN_STORAGE_KEY);
    if (!raw) throw new Error('no data');
    const data = JSON.parse(raw);
    return {
      history: Array.isArray(data.history) ? data.history : [],
      settings: {
        syncSelections: Boolean(data.settings?.syncSelections),
        persistOnExit: Boolean(data.settings?.persistOnExit),
      },
    };
  } catch {
    return {
      history: [],
      settings: { syncSelections: false, persistOnExit: false },
    };
  }
}

function saveData(data: ClipmanData) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(CLIPMAN_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore errors */
  }
}

const urlRe = /^https?:\/\/\S+$/i;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hexRe = /^0x?[0-9a-f]+$/i;

export interface ClipmanProps {
  onUrl?: (url: string) => void;
  onEmail?: (email: string) => void;
  onHex?: (hex: string) => void;
}

export default function Clipman({
  onUrl,
  onEmail,
  onHex,
}: ClipmanProps) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>(() => loadData().history);
  const [settings, setSettings] = useState<ClipmanSettings>(() => loadData().settings);

  const handleUrl = onUrl || ((url: string) => {
    if (isBrowser()) window.open(url, '_blank');
  });
  const handleEmail = onEmail || ((email: string) => {
    if (isBrowser()) window.location.href = `mailto:${email}`;
  });
  const handleHex = onHex || ((hex: string) => {
    // default handler just logs
    logger.info('hex', hex);
  });

  useEffect(() => {
    // persist settings whenever they change
    const data: ClipmanData = {
      history: settings.persistOnExit ? history : [],
      settings,
    };
    saveData(data);
  }, [settings]);

  useEffect(() => {
    if (settings.persistOnExit) {
      saveData({ history, settings });
    }
  }, [history, settings.persistOnExit]);

  const addClip = () => {
    const text = input.trim();
    if (!text) return;
    setHistory((prev) => [text, ...prev]);
    setInput('');
    if (urlRe.test(text)) {
      handleUrl(text);
    } else if (emailRe.test(text)) {
      handleEmail(text);
    } else if (hexRe.test(text)) {
      handleHex(text);
    }
  };

  const toggleSyncSelections = () =>
    setSettings((s) => ({ ...s, syncSelections: !s.syncSelections }));
  const togglePersistOnExit = () =>
    setSettings((s) => ({ ...s, persistOnExit: !s.persistOnExit }));

  return (
    <div>
      <div>
        <input
          aria-label="clipboard input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button onClick={addClip}>Add</button>
      </div>
      <div>
          <label>
            <input
              type="checkbox"
              aria-label="Sync selections"
              checked={settings.syncSelections}
              onChange={toggleSyncSelections}
            />
            Sync selections
          </label>
          <label>
            <input
              type="checkbox"
              aria-label="Persist on exit"
              checked={settings.persistOnExit}
              onChange={togglePersistOnExit}
            />
            Persist on exit
          </label>
      </div>
      <ul>
        {history.map((h, i) => (
          <li key={i}>{h}</li>
        ))}
      </ul>
    </div>
  );
}

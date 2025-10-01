'use client';

import React, {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import TabbedWindow, { TabDefinition, useTab } from '../../ui/TabbedWindow';
import {
  FirefoxSimulationView,
  FirefoxSimulation,
  SIMULATIONS,
  toSimulationKey,
} from './simulations';

const DEFAULT_URL = 'https://www.kali.org/docs/';
const STORAGE_KEY = 'firefox:last-url';
const START_URL_KEY = 'firefox:start-url';
const TABS_STORAGE_KEY = 'firefox:tabs-state';

const BOOKMARKS = [
  { label: 'OffSec', url: 'https://www.offsec.com/?utm_source=kali&utm_medium=os&utm_campaign=firefox' },
  { label: 'Kali Linux', url: 'https://www.kali.org/' },
  { label: 'Kali Tools', url: 'https://www.kali.org/tools/' },
  { label: 'Kali Docs', url: 'https://www.kali.org/docs/' },
  { label: 'Kali Forums', url: 'https://forums.kali.org/' },
  { label: 'Kali NetHunter', url: 'https://www.kali.org/get-kali/#kali-platforms' },
  { label: 'Exploit-DB', url: 'https://www.exploit-db.com/' },
  { label: 'GoogleHackingDB', url: 'https://www.exploit-db.com/google-hacking-database' },
];

const normaliseUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_URL;
  }
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return url.toString();
      }
      return DEFAULT_URL;
    }
    if (/^\/\//.test(trimmed)) {
      return new URL(`https:${trimmed}`).toString();
    }
    return new URL(`https://${trimmed}`).toString();
  } catch {
    return DEFAULT_URL;
  }
};

const getSimulation = (value: string) => {
  const key = toSimulationKey(value);
  if (!key) {
    return null;
  }
  return SIMULATIONS[key] ?? null;
};

const deriveTitle = (url: string, simulation: FirefoxSimulation | null) => {
  if (simulation) {
    return simulation.heading;
  }
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

type FirefoxSessionSnapshot = {
  id: string;
  title: string;
  history: string[];
  historyIndex: number;
  inputValue: string;
};

const shouldActivate = (shiftKey: boolean | undefined, defaultActivate: boolean) =>
  shiftKey ? !defaultActivate : defaultActivate;

interface FirefoxSessionProps {
  id: string;
  initialSnapshot: FirefoxSessionSnapshot;
  createTab: (snapshot?: Partial<FirefoxSessionSnapshot>) => TabDefinition;
  onSnapshot: (snapshot: FirefoxSessionSnapshot) => void;
}

const FirefoxSession: React.FC<FirefoxSessionProps> = ({
  id,
  initialSnapshot,
  createTab,
  onSnapshot,
}) => {
  const { requestTab, setTitle } = useTab();
  const [history, setHistory] = useState(() => [...initialSnapshot.history]);
  const [historyIndex, setHistoryIndex] = useState(initialSnapshot.historyIndex);
  const [inputValue, setInputValue] = useState(initialSnapshot.inputValue);
  const lastTitleRef = useRef(initialSnapshot.title);

  const currentUrl = history[historyIndex] ?? DEFAULT_URL;
  const simulation = useMemo(() => getSimulation(currentUrl), [currentUrl]);

  useEffect(() => {
    const title = deriveTitle(currentUrl, simulation);
    if (lastTitleRef.current !== title) {
      setTitle(title);
      lastTitleRef.current = title;
    }
    onSnapshot({
      id,
      title,
      history,
      historyIndex,
      inputValue,
    });
  }, [currentUrl, history, historyIndex, id, inputValue, onSnapshot, setTitle, simulation]);

  const pushHistory = useCallback(
    (value: string) => {
      const url = normaliseUrl(value);
      const base = history.slice(0, historyIndex + 1);
      const nextHistory = [...base, url];
      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
      setInputValue(url);
    },
    [history, historyIndex],
  );

  const openClone = useCallback(
    (targetUrl: string | null, activate: boolean) => {
      const base = history.slice(0, historyIndex + 1);
      let nextHistory = base;
      let nextIndex = base.length - 1;
      let nextInput = inputValue;
      if (targetUrl) {
        const url = normaliseUrl(targetUrl);
        nextHistory = [...base, url];
        nextIndex = nextHistory.length - 1;
        nextInput = url;
      }
      const tab = createTab({ history: nextHistory, historyIndex: nextIndex, inputValue: nextInput });
      requestTab(tab, { activate });
    },
    [createTab, history, historyIndex, inputValue, requestTab],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    pushHistory(inputValue);
  };

  const handleBookmarkClick = (event: React.MouseEvent<HTMLButtonElement>, url: string) => {
    if (event.metaKey || event.ctrlKey) {
      event.preventDefault();
      openClone(url, shouldActivate(event.shiftKey, true));
      return;
    }
    pushHistory(url);
  };

  const handleBookmarkAuxClick = (event: React.MouseEvent<HTMLButtonElement>, url: string) => {
    if (event.button === 1) {
      event.preventDefault();
      openClone(url, shouldActivate(event.shiftKey, false));
    }
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const openInNewTab = event.metaKey || event.ctrlKey;
      const activate = shouldActivate(event.shiftKey, true);
      event.preventDefault();
      if (openInNewTab) {
        openClone(event.currentTarget.value, activate);
      } else {
        pushHistory(event.currentTarget.value);
      }
    }
  };

  const handleSimulationLinkNewTab = useCallback(
    (url: string, options: { activate: boolean }) => {
      openClone(url, options.activate);
    },
    [openClone],
  );

  return (
    <div className="flex h-full flex-col bg-ub-cool-grey text-gray-100">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-b border-gray-700 bg-gray-900 px-3 py-2"
      >
        <label htmlFor={`firefox-address-${id}`} className="sr-only">
          Address
        </label>
        <input
          id={`firefox-address-${id}`}
          aria-label="Address"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Enter a URL"
          className="flex-1 rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          Go
        </button>
      </form>
      <nav className="flex flex-wrap gap-1 border-b border-gray-800 bg-gray-900 px-3 py-2 text-xs">
        {BOOKMARKS.map((bookmark) => (
          <button
            key={bookmark.url}
            type="button"
            onClick={(event) => handleBookmarkClick(event, bookmark.url)}
            onAuxClick={(event) => handleBookmarkAuxClick(event, bookmark.url)}
            className="rounded bg-gray-800 px-3 py-1 font-medium text-gray-200 transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {bookmark.label}
          </button>
        ))}
      </nav>
      <div className="flex-1 bg-black">
        {simulation ? (
          <FirefoxSimulationView
            simulation={simulation}
            onOpenLinkInNewTab={(url, opts) => handleSimulationLinkNewTab(url, opts)}
          />
        ) : (
          <iframe
            key={currentUrl}
            title="Firefox"
            src={currentUrl}
            className="h-full w-full border-0"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        )}
      </div>
    </div>
  );
};

const Firefox: React.FC = () => {
  const idCounterRef = useRef(0);
  const openTabsRef = useRef<string[]>([]);
  const snapshotsRef = useRef<Record<string, FirefoxSessionSnapshot>>({});

  const generateId = useCallback(() => {
    idCounterRef.current += 1;
    return `firefox-tab-${Date.now()}-${idCounterRef.current}`;
  }, []);

  const prepareSnapshot = useCallback(
    (input: Partial<FirefoxSessionSnapshot> = {}): FirefoxSessionSnapshot => {
      const history =
        input.history && input.history.length > 0
          ? input.history.map((value) => normaliseUrl(value))
          : [normaliseUrl(input.inputValue ?? DEFAULT_URL)];
      let historyIndex = input.historyIndex ?? history.length - 1;
      if (historyIndex < 0 || historyIndex >= history.length) {
        historyIndex = history.length - 1;
      }
      const currentUrl = history[historyIndex] ?? DEFAULT_URL;
      const inputValue = input.inputValue ? normaliseUrl(input.inputValue) : currentUrl;
      const simulation = getSimulation(currentUrl);
      const title = input.title ?? deriveTitle(currentUrl, simulation);
      const id = input.id ?? generateId();
      return { id, title, history, historyIndex, inputValue };
    },
    [generateId],
  );

  const persistSnapshots = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const data = openTabsRef.current
      .map((tabId) => snapshotsRef.current[tabId])
      .filter((snapshot): snapshot is FirefoxSessionSnapshot => Boolean(snapshot));
    try {
      localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore persistence errors
    }
  }, []);

  const handleSessionSnapshot = useCallback(
    (snapshot: FirefoxSessionSnapshot) => {
      snapshotsRef.current[snapshot.id] = snapshot;
      try {
        const current = snapshot.history[snapshot.historyIndex] ?? DEFAULT_URL;
        localStorage.setItem(STORAGE_KEY, current);
      } catch {
        // ignore persistence errors
      }
      persistSnapshots();
    },
    [persistSnapshots],
  );

  const createTabFromSnapshot = useCallback(
    (input: Partial<FirefoxSessionSnapshot> = {}): TabDefinition => {
      const snapshot = prepareSnapshot(input);
      snapshotsRef.current[snapshot.id] = snapshot;
      return {
        id: snapshot.id,
        title: snapshot.title,
        content: (
          <FirefoxSession
            key={snapshot.id}
            id={snapshot.id}
            initialSnapshot={snapshot}
            createTab={createTabFromSnapshot}
            onSnapshot={handleSessionSnapshot}
          />
        ),
      };
    },
    [handleSessionSnapshot, prepareSnapshot],
  );

  const createNewTab = useCallback(() => createTabFromSnapshot({ history: [DEFAULT_URL] }), [createTabFromSnapshot]);

  const initialTabs = useMemo(() => {
    const snapshots: Partial<FirefoxSessionSnapshot>[] = [];
    if (typeof window !== 'undefined') {
      try {
        const start = sessionStorage.getItem(START_URL_KEY);
        if (start) {
          sessionStorage.removeItem(START_URL_KEY);
          snapshots.push({ history: [normaliseUrl(start)] });
        } else {
          const raw = localStorage.getItem(TABS_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              parsed.forEach((item: Partial<FirefoxSessionSnapshot>) => {
                snapshots.push(item);
              });
            }
          }
        }
      } catch {
        // ignore storage parse errors
      }
      if (snapshots.length === 0) {
        try {
          const last = localStorage.getItem(STORAGE_KEY);
          if (last) {
            snapshots.push({ history: [normaliseUrl(last)] });
          }
        } catch {
          // ignore persistence errors
        }
      }
    }
    if (snapshots.length === 0) {
      snapshots.push({ history: [DEFAULT_URL] });
    }
    const tabs = snapshots.map((snapshot) => createTabFromSnapshot(snapshot));
    openTabsRef.current = tabs.map((tab) => tab.id);
    return tabs;
  }, [createTabFromSnapshot]);

  const handleTabsChange = useCallback(
    (tabs: TabDefinition[]) => {
      openTabsRef.current = tabs.map((tab) => tab.id);
      persistSnapshots();
    },
    [persistSnapshots],
  );

  useEffect(() => {
    persistSnapshots();
  }, [persistSnapshots]);

  return (
    <TabbedWindow
      className="h-full bg-ub-cool-grey text-gray-100"
      initialTabs={initialTabs}
      onNewTab={createNewTab}
      onTabsChange={handleTabsChange}
    />
  );
};

export const displayFirefox = () => <Firefox />;

export default Firefox;

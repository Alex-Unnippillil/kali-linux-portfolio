import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import WhiskerMenu from '../menu/WhiskerMenu';
import apps from '../../apps.config';
import { safeLocalStorage } from '../../utils/safeStorage';
import usePersistentState from '../../hooks/usePersistentState';

const PANEL_HEIGHT = 36;
const WORKSPACE_COUNT = 4;

const sanitizeIds = (ids) =>
  Array.isArray(ids)
    ? ids.filter((id) => typeof id === 'string' && id.trim().length > 0)
    : [];

const resolvePinnedApps = (ids) => {
  const uniqueIds = Array.from(new Set(ids));
  return uniqueIds
    .map((id) => apps.find((app) => app.id === id))
    .filter(Boolean);
};

const readPinnedIds = () => {
  const fallback = apps.filter((app) => app.favourite).map((app) => app.id);
  try {
    const stored = safeLocalStorage?.getItem('pinnedApps');
    if (!stored) {
      return fallback;
    }
    const parsed = JSON.parse(stored);
    const ids = sanitizeIds(parsed);
    if (!ids.length) {
      return fallback;
    }
    const combined = [...ids, ...fallback];
    return Array.from(new Set(combined));
  } catch {
    return fallback;
  }
};

const PinnedAppsRow = ({ apps: pinnedApps }) => {
  const handleOpenApp = useCallback((id) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('open-app', { detail: id }));
  }, []);

  if (!pinnedApps.length) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 overflow-hidden" role="menubar" aria-label="Pinned applications">
      {pinnedApps.map((app) => (
        <button
          key={app.id}
          type="button"
          role="menuitem"
          title={app.title}
          aria-label={app.title}
          onClick={() => handleOpenApp(app.id)}
          className="relative flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubb-orange"
        >
          <Image
            src={app.icon.replace('./', '/')}
            alt=""
            width={20}
            height={20}
            className="h-5 w-5"
            sizes="20px"
            priority={false}
          />
        </button>
      ))}
    </div>
  );
};

const WorkspaceSwitcher = () => {
  const [activeWorkspace, setActiveWorkspace] = usePersistentState(
    'top-panel-workspace',
    0,
    (value) => typeof value === 'number' && value >= 0 && value < WORKSPACE_COUNT,
  );

  const handleSwitch = (index) => {
    setActiveWorkspace(index);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('workspace-change', { detail: index }));
    }
  };

  return (
    <div
      className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-xs shadow-inner"
      role="tablist"
      aria-label="Workspace switcher"
    >
      {Array.from({ length: WORKSPACE_COUNT }).map((_, index) => {
        const active = index === activeWorkspace;
        return (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={active}
            className={`flex h-6 w-6 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubb-orange ${
              active ? 'bg-ubb-orange text-ub-grey font-semibold' : 'text-ubt-grey/70 hover:bg-white/10'
            }`}
            onClick={() => handleSwitch(index)}
          >
            {index + 1}
          </button>
        );
      })}
    </div>
  );
};

const Navbar = () => {
  const [pinnedApps, setPinnedApps] = useState(() => resolvePinnedApps(readPinnedIds()));
  const [quickSettingsOpen, setQuickSettingsOpen] = useState(false);
  const quickSettingsAnchor = useRef(null);

  const syncPinnedApps = useCallback((ids) => {
    if (ids && (!Array.isArray(ids) || !ids.length)) {
      setPinnedApps(resolvePinnedApps(readPinnedIds()));
      return;
    }
    const sourceIds = Array.isArray(ids) ? sanitizeIds(ids) : readPinnedIds();
    setPinnedApps(resolvePinnedApps(sourceIds));
  }, []);

  useEffect(() => {
    const handlePinnedChange = (event) => {
      syncPinnedApps(event.detail);
    };
    const handleStorage = (event) => {
      if (event.key === 'pinnedApps') {
        syncPinnedApps();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pinned-apps-changed', handlePinnedChange);
      window.addEventListener('storage', handleStorage);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('pinned-apps-changed', handlePinnedChange);
        window.removeEventListener('storage', handleStorage);
      }
    };
  }, [syncPinnedApps]);

  useEffect(() => {
    if (!quickSettingsOpen) return;

    const handleClickOutside = (event) => {
      if (!quickSettingsAnchor.current) return;
      if (!quickSettingsAnchor.current.contains(event.target)) {
        setQuickSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [quickSettingsOpen]);

  const panelStyles = useMemo(
    () => ({
      height: `${PANEL_HEIGHT}px`,
      backgroundColor: 'var(--panel-bg, rgba(15, 19, 23, 0.9))',
      borderBottom: '1px solid var(--panel-border, rgba(255, 255, 255, 0.08))',
    }),
    [],
  );

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 select-none shadow-md"
      style={panelStyles}
    >
      <div className="flex h-full w-full items-center justify-between px-2 text-ubt-grey sm:px-3">
        <div className="flex min-w-0 items-center gap-2">
          <WhiskerMenu />
          <PinnedAppsRow apps={pinnedApps} />
        </div>
        <div className="flex flex-1 justify-center">
          <WorkspaceSwitcher />
        </div>
        <div className="flex items-center gap-3 text-xs sm:text-sm">
          <div className="relative" ref={quickSettingsAnchor}>
            <button
              type="button"
              id="status-bar"
              aria-label="System status"
              onClick={() => setQuickSettingsOpen((open) => !open)}
              className="flex items-center gap-2 rounded-md px-2 py-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubb-orange hover:bg-white/10"
            >
              <Status />
            </button>
            <QuickSettings open={quickSettingsOpen} />
          </div>
          <div className="rounded-md px-2 py-1 text-xs sm:text-sm">
            <Clock />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;

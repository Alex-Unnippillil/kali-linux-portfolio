"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';
import { useSettings } from '../../hooks/useSettings';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import type {
  StatusBarLayout,
  StatusBarModuleId,
  StatusBarRegion,
  StatusBarVisibility,
} from '../../types/statusBar';
import { STATUS_BAR_TIPS, type StatusBarTip } from '../../data/statusBarTips';

const ALL_MODULES: StatusBarModuleId[] = ['mode', 'tips', 'network', 'clock'];
const REGIONS: StatusBarRegion[] = ['left', 'center', 'right'];

const MODULE_LABELS: Record<StatusBarModuleId, string> = {
  mode: 'Mode & context',
  tips: 'Rotating tips',
  network: 'Network & system',
  clock: 'Clock',
};

const normalizeLayout = (layout: StatusBarLayout): StatusBarLayout => {
  const next: StatusBarLayout = {
    left: Array.isArray(layout.left) ? [...layout.left] : [],
    center: Array.isArray(layout.center) ? [...layout.center] : [],
    right: Array.isArray(layout.right) ? [...layout.right] : [],
  };
  const seen = new Set<StatusBarModuleId>();
  REGIONS.forEach((region) => {
    next[region] = next[region].filter((module) => {
      if (!ALL_MODULES.includes(module)) return false;
      if (seen.has(module)) return false;
      seen.add(module);
      return true;
    });
  });
  ALL_MODULES.forEach((module) => {
    if (!seen.has(module)) {
      next.right.push(module);
      seen.add(module);
    }
  });
  return next;
};

const normalizeVisibility = (
  visibility: StatusBarVisibility,
): StatusBarVisibility => {
  const result = {} as StatusBarVisibility;
  ALL_MODULES.forEach((module) => {
    result[module] = visibility?.[module] ?? true;
  });
  return result;
};

const moveModuleInLayout = (
  layout: StatusBarLayout,
  moduleId: StatusBarModuleId,
  targetRegion: StatusBarRegion,
  targetIndex: number,
): StatusBarLayout => {
  const base = normalizeLayout(layout);
  const next: StatusBarLayout = {
    left: base.left.filter((id) => id !== moduleId),
    center: base.center.filter((id) => id !== moduleId),
    right: base.right.filter((id) => id !== moduleId),
  };
  const clampedIndex = Math.max(0, Math.min(targetIndex, next[targetRegion].length));
  next[targetRegion].splice(clampedIndex, 0, moduleId);
  return next;
};

const findModulePosition = (layout: StatusBarLayout, moduleId: StatusBarModuleId) => {
  for (const region of REGIONS) {
    const index = layout[region].indexOf(moduleId);
    if (index !== -1) {
      return { region, index };
    }
  }
  return { region: 'right' as StatusBarRegion, index: 0 };
};

const formatTitle = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1).replace(/[-_]/g, ' ');

const useLabModeStatus = () => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const read = () => {
      try {
        setEnabled(window.localStorage.getItem('lab-mode') === 'true');
      } catch {
        setEnabled(false);
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'lab-mode') {
        read();
      }
    };
    const handleLabModeChange = (event: Event) => {
      const custom = event as CustomEvent<{ enabled?: boolean }>;
      if (custom?.detail && typeof custom.detail.enabled === 'boolean') {
        setEnabled(Boolean(custom.detail.enabled));
      } else {
        read();
      }
    };

    read();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('lab-mode:change', handleLabModeChange);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('lab-mode:change', handleLabModeChange);
    };
  }, []);

  return enabled;
};

const ModeContextModule = () => {
  const { theme, density, allowNetwork } = useSettings();
  const labMode = useLabModeStatus();
  return (
    <div
      className="flex flex-col gap-0.5 text-xs leading-tight text-white/85 md:flex-row md:items-center md:gap-3"
      aria-label="Mode and context"
    >
      <span className="font-semibold">
        {labMode ? 'Lab Mode active' : 'Live Mode'}
      </span>
      <span className="flex items-center gap-1 text-white/70">
        <span className="hidden md:inline" aria-hidden="true">
          •
        </span>
        Theme: {formatTitle(theme)}
      </span>
      <span className="flex items-center gap-1 text-white/70">
        <span className="hidden md:inline" aria-hidden="true">
          •
        </span>
        Density: {formatTitle(density)}
      </span>
      <span className="flex items-center gap-1 text-white/70">
        <span className="hidden md:inline" aria-hidden="true">
          •
        </span>
        {allowNetwork ? 'Networking enabled' : 'Offline only'}
      </span>
    </div>
  );
};

const NetworkModule = () => (
  <div className="flex items-center" aria-label="Network and system status">
    <Status />
  </div>
);

const ClockModule = () => (
  <div
    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/90 shadow-sm backdrop-blur"
    aria-label="Clock"
  >
    <Clock onlyTime hour12={false} />
  </div>
);

interface ModuleSlotProps {
  moduleId: StatusBarModuleId;
  region: StatusBarRegion;
  index: number;
  isVisible: boolean;
  onToggleVisibility: (moduleId: StatusBarModuleId, next?: boolean) => void;
  onKeyReorder: (
    event: React.KeyboardEvent<HTMLButtonElement>,
    moduleId: StatusBarModuleId,
    region: StatusBarRegion,
  ) => void;
  onDropModule: (moduleId: StatusBarModuleId, region: StatusBarRegion, index: number) => void;
  onDropIntoRegion: (moduleId: StatusBarModuleId, region: StatusBarRegion) => void;
  draggingId: StatusBarModuleId | null;
  grabbedId: StatusBarModuleId | null;
  onDragStateChange: (moduleId: StatusBarModuleId | null) => void;
}

const ModuleSlot = ({
  moduleId,
  region,
  index,
  isVisible,
  onToggleVisibility,
  onKeyReorder,
  onDropModule,
  onDropIntoRegion,
  draggingId,
  grabbedId,
  onDragStateChange,
}: ModuleSlotProps) => {
  const isDragging = draggingId === moduleId;
  const isGrabbed = grabbedId === moduleId;

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target || !target.closest('[data-drag-handle]')) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData('text/plain', moduleId);
    event.dataTransfer.effectAllowed = 'move';
    onDragStateChange(moduleId);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const dragged = event.dataTransfer.getData('text/plain') as StatusBarModuleId;
    if (!dragged) return;
    const isSlot = (event.target as HTMLElement | null)?.closest('[data-status-slot]');
    if (isSlot) {
      onDropModule(dragged, region, index);
    } else {
      onDropIntoRegion(dragged, region);
    }
    onDragStateChange(null);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const moduleName = MODULE_LABELS[moduleId];

  return (
    <div
      data-status-slot
      role="listitem"
      aria-label={`${moduleName}${isVisible ? '' : ' (hidden)'}`}
      className={clsx(
        'group/module flex w-full items-center gap-2 rounded-lg border border-transparent bg-white/5 px-2 py-1 text-xs text-white/90 transition focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400',
        isDragging && 'opacity-60',
        isVisible ? 'shadow-sm backdrop-blur' : 'border-white/10 bg-transparent text-white/50 italic',
      )}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnd={(event) => {
        event.preventDefault();
        onDragStateChange(null);
      }}
    >
      <button
        type="button"
        data-drag-handle
        className={clsx(
          'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/10 text-white/80 transition focus-visible:border-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300',
          isGrabbed && 'border-cyan-400 bg-cyan-500/20 text-white',
        )}
        aria-label={`Move ${moduleName}`}
        aria-describedby={`status-module-${moduleId}`}
        aria-grabbed={isGrabbed || isDragging}
        onKeyDown={(event) => onKeyReorder(event, moduleId, region)}
      >
        <span aria-hidden="true" className="text-base leading-none">
          ☰
        </span>
      </button>
      <div id={`status-module-${moduleId}`} className="flex min-w-0 flex-1 items-center gap-2">
        {isVisible ? (
          moduleId === 'mode' ? (
            <ModeContextModule />
          ) : moduleId === 'tips' ? (
            <TipsModule />
          ) : moduleId === 'network' ? (
            <NetworkModule />
          ) : (
            <ClockModule />
          )
        ) : (
          <div className="flex w-full items-center justify-between">
            <span>Module hidden</span>
            <button
              type="button"
              className="rounded-md border border-white/20 px-2 py-1 text-[11px] uppercase tracking-wide text-white/80 transition hover:border-cyan-300 hover:text-white"
              onClick={() => onToggleVisibility(moduleId, true)}
            >
              Show
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface TipsModuleContextValue {
  tip: StatusBarTip | null;
  pinned: boolean;
  onDismiss: () => void;
  onTogglePin: () => void;
  onReset: () => void;
  hasDismissed: boolean;
}

const TipsModuleContext = createContext<TipsModuleContextValue | null>(null);

const StatusBar = () => {
  const {
    statusBarLayout,
    statusBarVisibility,
    setStatusBarLayout,
    setStatusBarVisibility,
    pinnedStatusBarTip,
    setPinnedStatusBarTip,
    dismissedStatusBarTips,
    setDismissedStatusBarTips,
  } = useSettings();

  const layout = useMemo(
    () => normalizeLayout(statusBarLayout),
    [statusBarLayout],
  );
  const visibility = useMemo(
    () => normalizeVisibility(statusBarVisibility),
    [statusBarVisibility],
  );
  const [draggingId, setDraggingId] = useState<StatusBarModuleId | null>(null);
  const [grabbedId, setGrabbedId] = useState<StatusBarModuleId | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const customizeRef = useRef<HTMLDivElement | null>(null);
  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  const rotationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [currentTipId, setCurrentTipId] = useState<string | null>(null);

  const availableTips = useMemo(
    () =>
      STATUS_BAR_TIPS.filter((tip) => !dismissedStatusBarTips.includes(tip.id)),
    [dismissedStatusBarTips],
  );

  const pinnedTip = useMemo(
    () => STATUS_BAR_TIPS.find((tip) => tip.id === pinnedStatusBarTip) ?? null,
    [pinnedStatusBarTip],
  );

  useEffect(() => {
    if (pinnedStatusBarTip && dismissedStatusBarTips.includes(pinnedStatusBarTip)) {
      setPinnedStatusBarTip(null);
    }
  }, [dismissedStatusBarTips, pinnedStatusBarTip, setPinnedStatusBarTip]);

  useEffect(() => {
    if (pinnedTip) {
      setCurrentTipId(pinnedTip.id);
      return;
    }
    if (!availableTips.length) {
      setCurrentTipId(null);
      return;
    }
    setCurrentTipId((prev) => {
      if (prev && availableTips.some((tip) => tip.id === prev)) {
        return prev;
      }
      return availableTips[0]?.id ?? null;
    });
  }, [availableTips, pinnedTip]);

  const currentTip = useMemo<StatusBarTip | null>(() => {
    if (pinnedTip) return pinnedTip;
    if (!currentTipId) return null;
    return STATUS_BAR_TIPS.find((tip) => tip.id === currentTipId) ?? null;
  }, [currentTipId, pinnedTip]);

  useEffect(() => {
    if (!liveRegionRef.current) return;
    if (currentTip) {
      liveRegionRef.current.textContent = `${currentTip.title}. ${currentTip.body}`;
    } else if (!availableTips.length && dismissedStatusBarTips.length) {
      liveRegionRef.current.textContent = 'All tips dismissed';
    } else {
      liveRegionRef.current.textContent = '';
    }
  }, [availableTips.length, currentTip, dismissedStatusBarTips.length]);

  useEffect(() => {
    if (rotationTimerRef.current) {
      clearInterval(rotationTimerRef.current);
      rotationTimerRef.current = null;
    }
    if (pinnedTip || availableTips.length <= 1) {
      return;
    }
    rotationTimerRef.current = setInterval(() => {
      setCurrentTipId((prev) => {
        if (!prev) return availableTips[0]?.id ?? null;
        const index = availableTips.findIndex((tip) => tip.id === prev);
        const nextIndex = index >= 0 ? (index + 1) % availableTips.length : 0;
        return availableTips[nextIndex]?.id ?? null;
      });
    }, 15000);
    return () => {
      if (rotationTimerRef.current) {
        clearInterval(rotationTimerRef.current);
        rotationTimerRef.current = null;
      }
    };
  }, [availableTips, pinnedTip]);

  const handleDismissTip = useCallback(() => {
    if (!currentTip) return;
    setDismissedStatusBarTips((prev) => [...prev, currentTip.id]);
    if (pinnedStatusBarTip === currentTip.id) {
      setPinnedStatusBarTip(null);
    }
  }, [currentTip, pinnedStatusBarTip, setDismissedStatusBarTips, setPinnedStatusBarTip]);

  const handleTogglePin = useCallback(() => {
    if (!currentTip) return;
    if (pinnedStatusBarTip === currentTip.id) {
      setPinnedStatusBarTip(null);
    } else {
      setPinnedStatusBarTip(currentTip.id);
    }
  }, [currentTip, pinnedStatusBarTip, setPinnedStatusBarTip]);

  const handleResetTips = useCallback(() => {
    setDismissedStatusBarTips(() => []);
    setPinnedStatusBarTip(null);
  }, [setDismissedStatusBarTips, setPinnedStatusBarTip]);

  useEffect(() => {
    if (!customizeOpen) return undefined;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (customizeRef.current && target && !customizeRef.current.contains(target)) {
        setCustomizeOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCustomizeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [customizeOpen]);

  const handleToggleVisibility = useCallback(
    (moduleId: StatusBarModuleId, force?: boolean) => {
      setStatusBarVisibility((prev) => {
        const normalized = normalizeVisibility(prev);
        const next = force ?? !normalized[moduleId];
        return { ...normalized, [moduleId]: next };
      });
    },
    [setStatusBarVisibility],
  );

  const handleDropModule = useCallback(
    (moduleId: StatusBarModuleId, region: StatusBarRegion, index: number) => {
      setStatusBarLayout((prev) => moveModuleInLayout(prev, moduleId, region, index));
      setDraggingId(null);
      setGrabbedId(null);
    },
    [setStatusBarLayout],
  );

  const handleDropIntoRegion = useCallback(
    (moduleId: StatusBarModuleId, region: StatusBarRegion) => {
      setStatusBarLayout((prev) => moveModuleInLayout(prev, moduleId, region, Number.MAX_SAFE_INTEGER));
      setDraggingId(null);
      setGrabbedId(null);
    },
    [setStatusBarLayout],
  );

  const handleKeyReorder = useCallback(
    (
      event: React.KeyboardEvent<HTMLButtonElement>,
      moduleId: StatusBarModuleId,
      _region: StatusBarRegion,
    ) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setGrabbedId((prev) => (prev === moduleId ? null : moduleId));
        return;
      }
      if (event.key === 'Escape') {
        if (grabbedId === moduleId) {
          setGrabbedId(null);
          event.preventDefault();
        }
        return;
      }
      if (grabbedId !== moduleId) return;
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;

      event.preventDefault();
      setStatusBarLayout((prev) => {
        const normalized = normalizeLayout(prev);
        const position = findModulePosition(normalized, moduleId);
        let next: StatusBarLayout | null = null;
        switch (event.key) {
          case 'ArrowUp':
            if (position.index > 0) {
              next = moveModuleInLayout(normalized, moduleId, position.region, position.index - 1);
            }
            break;
          case 'ArrowDown':
            if (position.index < normalized[position.region].length - 1) {
              next = moveModuleInLayout(normalized, moduleId, position.region, position.index + 1);
            }
            break;
          case 'ArrowLeft': {
            const regionIndex = REGIONS.indexOf(position.region);
            if (regionIndex > 0) {
              const targetRegion = REGIONS[regionIndex - 1];
              const targetIndex = Math.min(position.index, normalized[targetRegion].length);
              next = moveModuleInLayout(normalized, moduleId, targetRegion, targetIndex);
            }
            break;
          }
          case 'ArrowRight': {
            const regionIndex = REGIONS.indexOf(position.region);
            if (regionIndex < REGIONS.length - 1) {
              const targetRegion = REGIONS[regionIndex + 1];
              const targetIndex = Math.min(position.index, normalized[targetRegion].length);
              next = moveModuleInLayout(normalized, moduleId, targetRegion, targetIndex);
            }
            break;
          }
          default:
            break;
        }
        return next ?? prev;
      });
    },
    [grabbedId, setStatusBarLayout],
  );

  const tipsContext = useMemo<TipsModuleContextValue>(
    () => ({
      tip: currentTip,
      pinned: Boolean(pinnedStatusBarTip && currentTip && pinnedStatusBarTip === currentTip.id),
      onDismiss: handleDismissTip,
      onTogglePin: handleTogglePin,
      onReset: handleResetTips,
      hasDismissed: dismissedStatusBarTips.length > 0,
    }),
    [
      currentTip,
      dismissedStatusBarTips.length,
      handleDismissTip,
      handleResetTips,
      handleTogglePin,
      pinnedStatusBarTip,
    ],
  );

  return (
    <TipsModuleContext.Provider value={tipsContext}>
      <div className="relative w-full">
      <div
        role="toolbar"
        aria-label="Desktop status bar"
        className="flex w-full flex-col gap-2 rounded-xl border border-white/10 bg-slate-950/70 p-3 text-white shadow-lg backdrop-blur md:flex-row md:items-center md:justify-between"
      >
        {REGIONS.map((region) => (
          <div
            key={region}
            role="list"
            aria-label={`${region} status modules`}
            className={clsx(
              'flex flex-1 flex-col gap-2 md:flex-row md:items-center',
              region === 'center' && 'md:justify-center',
              region === 'right' && 'md:justify-end',
            )}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(event) => {
              event.preventDefault();
              const dragged = event.dataTransfer.getData('text/plain') as StatusBarModuleId;
              if (!dragged) return;
              handleDropIntoRegion(dragged, region);
            }}
          >
            {layout[region].map((moduleId, index) => (
              <ModuleSlot
                key={moduleId}
                moduleId={moduleId}
                region={region}
                index={index}
                isVisible={visibility[moduleId]}
                onToggleVisibility={handleToggleVisibility}
                onKeyReorder={handleKeyReorder}
                onDropModule={handleDropModule}
                onDropIntoRegion={handleDropIntoRegion}
                draggingId={draggingId}
                grabbedId={grabbedId}
                onDragStateChange={setDraggingId}
              />
            ))}
          </div>
        ))}
        <div className="flex items-center justify-end">
          <button
            type="button"
            className="rounded-md border border-white/20 px-3 py-1 text-xs font-medium text-white/80 transition hover:border-cyan-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            onClick={() => setCustomizeOpen((open) => !open)}
            aria-expanded={customizeOpen}
            aria-controls="status-bar-customize"
          >
            Customize status bar
          </button>
        </div>
      </div>
        {customizeOpen && (
          <div
            id="status-bar-customize"
            ref={customizeRef}
            role="dialog"
            aria-modal="false"
            aria-label="Customize status bar modules"
            className="absolute right-0 z-50 mt-2 w-full max-w-sm rounded-xl border border-white/10 bg-slate-950/90 p-4 text-sm text-white shadow-xl backdrop-blur"
          >
          <p className="mb-3 text-xs text-white/70">
            Reorder modules with drag and drop or keyboard. Toggle visibility to show or hide modules.
          </p>
          <ul className="space-y-2">
            {ALL_MODULES.map((moduleId) => (
              <li key={moduleId} className="flex items-center justify-between">
                <span>{MODULE_LABELS[moduleId]}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={visibility[moduleId]}
                  aria-label={`Toggle ${MODULE_LABELS[moduleId]} module`}
                  className={clsx(
                    'rounded-md border border-white/20 px-3 py-1 text-xs uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300',
                    visibility[moduleId]
                      ? 'border-cyan-400 bg-cyan-500/20 text-white'
                      : 'text-white/70 hover:border-cyan-300 hover:text-white',
                  )}
                  onClick={() => handleToggleVisibility(moduleId)}
                >
                  {visibility[moduleId] ? 'On' : 'Off'}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
            <span className="text-xs text-white/70">Tip rotation</span>
            <button
              type="button"
              className="rounded-md border border-white/20 px-3 py-1 text-xs uppercase tracking-wide text-white/80 transition hover:border-cyan-300 hover:text-white"
              onClick={handleResetTips}
            >
              Reset tips
            </button>
          </div>
        </div>
        )}
        <div ref={liveRegionRef} className="sr-only" aria-live="polite" />
      </div>
    </TipsModuleContext.Provider>
  );
};

const TipsModule = () => {
  const value = useContext(TipsModuleContext);
  if (!value) {
    throw new Error('TipsModule must be used within StatusBar');
  }
  const { tip, pinned, onDismiss, onTogglePin, onReset, hasDismissed } = value;

  if (!tip) {
    return (
      <div className="flex w-full items-center justify-between text-xs text-white/70">
        <span>
          {hasDismissed
            ? 'All tips dismissed. Reset tips to start over.'
            : 'Tips loading...'}
        </span>
        {hasDismissed && (
          <button
            type="button"
            className="rounded-md border border-white/20 px-2 py-1 text-[11px] uppercase tracking-wide text-white/80 transition hover:border-cyan-300 hover:text-white"
            onClick={onReset}
          >
            Reset tips
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-3 text-xs text-white/85">
      <div className="min-w-0">
        <p className="truncate font-semibold" title={tip.title}>
          {tip.title}
        </p>
        <p className="truncate text-white/70" title={tip.body}>
          {tip.body}
        </p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1">
        <button
          type="button"
          className={clsx(
            'rounded-md border border-white/20 px-2 py-1 text-[11px] uppercase tracking-wide transition',
            pinned
              ? 'border-cyan-400 bg-cyan-500/20 text-white'
              : 'text-white/80 hover:border-cyan-300 hover:text-white',
          )}
          aria-pressed={pinned}
          onClick={onTogglePin}
        >
          {pinned ? 'Unpin' : 'Pin'}
        </button>
        <button
          type="button"
          className="rounded-md border border-white/20 px-2 py-1 text-[11px] uppercase tracking-wide text-white/80 transition hover:border-red-400/70 hover:text-white"
          onClick={onDismiss}
          disabled={pinned}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default StatusBar;

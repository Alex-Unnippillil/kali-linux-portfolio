import React, { useEffect, useState, useRef, useMemo } from 'react';

const MODE_LABELS = {
  mru: 'MRU order (Tab)',
  group: 'Group cycle (Ctrl+Tab)',
};

export default function WindowSwitcher({ state, onSelect, onClose }) {
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(() => state?.activeWindowId ?? null);
  const [mode, setMode] = useState('mru');

  const windowsById = useMemo(() => {
    const map = new Map();
    state?.windows?.forEach((win) => {
      map.set(win.id, win);
    });
    return map;
  }, [state]);

  const normalizedQuery = query.trim().toLowerCase();

  const mruIds = useMemo(() => {
    if (!state) return [];
    const order = Array.isArray(state.mruOrder) && state.mruOrder.length
      ? state.mruOrder
      : (state.windows || []).map((win) => win.id);
    return order.filter((id) => {
      const win = windowsById.get(id);
      if (!win) return false;
      if (!normalizedQuery) return true;
      const haystack = `${win.title} ${win.appTitle ?? ''}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [state, windowsById, normalizedQuery]);

  const groups = useMemo(() => {
    if (!state) return [];
    const order = Array.isArray(state.groupedOrder) ? state.groupedOrder : [];
    return order.map((group) => {
      const visibleIds = (group.ids || []).filter((id) => mruIds.includes(id));
      if (!visibleIds.length) return null;
      const windows = visibleIds
        .map((id) => windowsById.get(id))
        .filter(Boolean);
      if (!windows.length) return null;
      return {
        appId: group.appId,
        title: group.title ?? windows[0]?.appTitle ?? windows[0]?.title,
        icon: group.icon ?? windows[0]?.icon,
        windows,
      };
    }).filter(Boolean);
  }, [state, windowsById, mruIds]);

  const resolvedSelectedId = useMemo(() => {
    if (!mruIds.length) return null;
    if (selectedId && mruIds.includes(selectedId)) return selectedId;
    return state?.activeWindowId && mruIds.includes(state.activeWindowId)
      ? state.activeWindowId
      : mruIds[0];
  }, [mruIds, selectedId, state]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedId(state?.activeWindowId ?? null);
    setMode('mru');
    setQuery('');
  }, [state]);

  useEffect(() => {
    if (resolvedSelectedId !== selectedId) {
      setSelectedId(resolvedSelectedId);
    }
  }, [resolvedSelectedId, selectedId]);

  useEffect(() => {
    if (!state) return;
    const handleKeyUp = (e) => {
      if (e.key === 'Alt') {
        if (resolvedSelectedId && typeof onSelect === 'function') {
          onSelect(resolvedSelectedId);
        } else if (typeof onClose === 'function') {
          onClose();
        }
      }
    };
    window.addEventListener('keyup', handleKeyUp);
    return () => window.removeEventListener('keyup', handleKeyUp);
  }, [state, resolvedSelectedId, onSelect, onClose]);

  const activeGroupIndex = useMemo(() => {
    return groups.findIndex((group) =>
      group.windows.some((win) => win.id === resolvedSelectedId)
    );
  }, [groups, resolvedSelectedId]);

  const activeGroup = activeGroupIndex >= 0 ? groups[activeGroupIndex] : null;
  const activeWindowIndex = activeGroup
    ? activeGroup.windows.findIndex((win) => win.id === resolvedSelectedId)
    : -1;

  const cycleMru = (direction) => {
    if (!mruIds.length) return;
    const currentIndex = resolvedSelectedId ? mruIds.indexOf(resolvedSelectedId) : -1;
    const startIndex = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex = (startIndex + direction + mruIds.length) % mruIds.length;
    setSelectedId(mruIds[nextIndex]);
    setMode('mru');
  };

  const rotateGroup = (direction) => {
    if (!activeGroup || !activeGroup.windows.length) {
      setMode('group');
      return;
    }
    const index = activeWindowIndex === -1 ? 0 : activeWindowIndex;
    const nextIndex = (index + direction + activeGroup.windows.length) % activeGroup.windows.length;
    setSelectedId(activeGroup.windows[nextIndex].id);
    setMode('group');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const direction = e.shiftKey ? -1 : 1;
      if (e.ctrlKey) {
        rotateGroup(direction);
      } else {
        cycleMru(direction);
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      rotateGroup(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      rotateGroup(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      cycleMru(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      cycleMru(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (resolvedSelectedId && typeof onSelect === 'function') {
        onSelect(resolvedSelectedId);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (typeof onClose === 'function') onClose();
    }
  };

  const handleChange = (e) => {
    setQuery(e.target.value);
    setMode('mru');
  };

  const handleWindowClick = (id) => {
    if (typeof onSelect === 'function') {
      onSelect(id);
    }
  };

  const handleWindowHover = (id) => {
    setSelectedId(id);
  };

  const renderMruPills = () => {
    if (!mruIds.length) return null;
    return (
      <div className="flex flex-wrap gap-2">
        {mruIds.map((id, index) => {
          const win = windowsById.get(id);
          if (!win) return null;
          const isActive = id === resolvedSelectedId && mode === 'mru';
          return (
            <div
              key={id}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition ${
                isActive
                  ? 'border-[#53b9ff] bg-[#132034] text-white shadow-[0_0_0_1px_rgba(83,185,255,0.35)]'
                  : 'border-white/10 bg-white/5 text-white/60'
              }`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
                isActive ? 'bg-[#53b9ff] text-[#0b1320]' : 'bg-white/10 text-white/70'
              }`}>
                {index + 1}
              </span>
              <span className="truncate max-w-[9rem]">{win.title}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderGroups = () => {
    if (!groups.length) {
      return (
        <div className="rounded-lg border border-white/10 bg-black/30 p-6 text-center text-sm text-white/60">
          {normalizedQuery
            ? `No windows match "${query}".`
            : 'No open windows found.'}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        {groups.map((group, groupIndex) => {
          const isGroupActive = groupIndex === activeGroupIndex;
          return (
            <div
              key={group.appId}
              className={`rounded-xl border bg-[#0d1624]/90 transition ${
                isGroupActive
                  ? 'border-[#53b9ff] shadow-[0_0_0_1px_rgba(83,185,255,0.2)]'
                  : 'border-white/10'
              }`}
            >
              <div className="flex items-center justify-between px-4 py-3 text-sm text-white/70">
                <div className="flex items-center gap-3">
                  {group.icon ? (
                    <img
                      src={group.icon}
                      alt={group.title}
                      className="h-6 w-6 rounded"
                    />
                  ) : null}
                  <span className="font-semibold text-white">{group.title}</span>
                  <span className="text-xs text-white/40">
                    {group.windows.length} window{group.windows.length > 1 ? 's' : ''}
                  </span>
                </div>
                {mode === 'group' && isGroupActive ? (
                  <span className="rounded-full border border-[#53b9ff] px-2 py-0.5 text-[11px] text-[#53b9ff]">
                    Ctrl+Tab
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2 px-4 pb-4">
                {group.windows.map((win) => {
                  const isSelected = win.id === resolvedSelectedId;
                  return (
                    <button
                      key={win.id}
                      type="button"
                      onMouseEnter={() => handleWindowHover(win.id)}
                      onFocus={() => handleWindowHover(win.id)}
                      onClick={() => handleWindowClick(win.id)}
                      className={`group flex min-w-[180px] flex-1 items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${
                        isSelected
                          ? 'border-[#53b9ff] bg-[#132034] text-white shadow-[0_0_15px_rgba(83,185,255,0.15)]'
                          : 'border-white/10 bg-[#101a2b] text-white/80 hover:border-[#53b9ff]/60 hover:bg-[#14213a] hover:text-white'
                      }`}
                    >
                      {win.icon ? (
                        <img
                          src={win.icon}
                          alt={win.appTitle}
                          className="h-8 w-8 rounded"
                        />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded bg-white/10 text-sm font-semibold text-white/60">
                          {win.appTitle?.[0] ?? win.title?.[0] ?? '?'}
                        </span>
                      )}
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium text-white">
                          {win.title}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-white/50">
                          {win.isMinimized ? <span>Minimized</span> : null}
                          {state?.originWindowId === win.id ? (
                            <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/60">
                              Current
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const activeModeLabel = MODE_LABELS[mode] ?? MODE_LABELS.mru;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 text-white">
      <div className="flex w-full max-w-4xl flex-col gap-5 rounded-2xl border border-white/10 bg-[#0b1220]/95 p-6 shadow-[0_25px_60px_rgba(0,0,0,0.55)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-2">
            <input
              ref={inputRef}
              value={query}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              className="w-full rounded-lg border border-white/10 bg-[#131c2f] px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-[#53b9ff] focus:outline-none focus:ring-2 focus:ring-[#53b9ff]/40"
              placeholder="Search open windows"
              aria-label="Search open windows"
            />
            <div className="text-xs uppercase tracking-[0.2em] text-[#53b9ff]">
              {activeModeLabel}
            </div>
          </div>
          <div className="flex flex-col gap-2 text-xs text-white/60">
            <div className="flex items-center gap-2">
              <span className="rounded border border-white/20 px-2 py-0.5 text-[11px]">Tab</span>
              <span>Cycle MRU order</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded border border-white/20 px-2 py-0.5 text-[11px]">Ctrl+Tab</span>
              <span>Rotate within app group</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded border border-white/20 px-2 py-0.5 text-[11px]">Enter</span>
              <span>Activate selection</span>
            </div>
          </div>
        </div>

        {renderMruPills()}
        {renderGroups()}
      </div>
    </div>
  );
}


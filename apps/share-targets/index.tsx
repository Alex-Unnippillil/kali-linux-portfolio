"use client";

import React, {
  useCallback,
  useMemo,
  useSyncExternalStore,
  useRef,
} from "react";
import {
  shareTargetStore,
  getShareTargetsForManagement,
  reorderShareTargets,
  setShareTargetVisibility,
  resetShareTargetSettings,
  ShareTargetWithState,
  ShareTargetsSnapshot,
} from "../../utils/settings/shareTargets";

const ShareTargetsApp: React.FC = () => {
  const snapshot = useSyncExternalStore<ShareTargetsSnapshot>(
    shareTargetStore.subscribe,
    shareTargetStore.getSnapshot,
    shareTargetStore.getServerSnapshot
  );

  const targets = useMemo(
    () => getShareTargetsForManagement(snapshot),
    [snapshot]
  );

  const visibleCount = useMemo(
    () => targets.filter((target) => target.visible).length,
    [targets]
  );

  const dragIndex = useRef<number | null>(null);

  const handleDragStart = useCallback(
    (index: number) => (event: React.DragEvent<HTMLLIElement>) => {
      dragIndex.current = index;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", targets[index].id);
    },
    [targets]
  );

  const handleDragOver = useCallback(
    (index: number) => (event: React.DragEvent<HTMLLIElement>) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    dragIndex.current = null;
  }, []);

  const handleDrop = useCallback(
    (index: number) => (event: React.DragEvent<HTMLLIElement>) => {
      event.preventDefault();
      const source = dragIndex.current;
      dragIndex.current = null;
      if (source === null || source === index) return;
      const order = [...targets];
      const [moved] = order.splice(source, 1);
      order.splice(index, 0, moved);
      reorderShareTargets(order.map((target) => target.id));
    },
    [targets]
  );

  const toggleVisibility = useCallback((target: ShareTargetWithState) => {
    setShareTargetVisibility(target.id, !target.visible);
  }, []);

  const handleReset = useCallback(() => {
    if (
      window.confirm(
        "Reset share targets to their default order and visibility?"
      )
    ) {
      resetShareTargetSettings();
    }
  }, []);

  return (
    <div className="flex h-full w-full flex-col bg-ub-cool-grey text-white">
      <div className="border-b border-black/60 px-6 py-5">
        <h1 className="text-xl font-semibold leading-6">Share Targets</h1>
        <p className="mt-1 text-sm text-white/70">
          Drag targets to reorder them. Toggle visibility to remove entries
          from the share sheet without uninstalling the app.
        </p>
        <p className="mt-2 text-xs uppercase tracking-wide text-white/50">
          Visible {visibleCount} / {targets.length}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {targets.length === 0 ? (
          <p className="text-sm text-white/70">
            No share targets are installed for this profile.
          </p>
        ) : (
          <ul className="space-y-3">
            {targets.map((target, index) => {
              const accentBg = `${target.accent}33`;
              return (
                <li
                  key={target.id}
                  draggable
                  onDragStart={handleDragStart(index)}
                  onDragOver={handleDragOver(index)}
                  onDrop={handleDrop(index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/30 px-4 py-3 transition hover:border-white/20 ${
                    target.visible ? "" : "opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className="cursor-grab text-lg text-white/40"
                      aria-hidden
                    >
                      ☰
                    </span>
                    <span
                      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg text-2xl"
                      style={{ backgroundColor: accentBg, color: target.accent }}
                    >
                      <span aria-hidden>{target.emoji}</span>
                      <span className="sr-only">{target.title}</span>
                    </span>
                    <span>
                      <span className="block text-base font-medium text-white">
                        {target.title}
                      </span>
                      <span className="block text-sm text-white/70">
                        {target.description}
                      </span>
                    </span>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={target.visible}
                      onChange={() => toggleVisibility(target)}
                      className="h-4 w-4"
                    />
                    <span>{target.visible ? "Visible" : "Hidden"}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="border-t border-black/60 px-6 py-4 text-right">
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
};

export default ShareTargetsApp;

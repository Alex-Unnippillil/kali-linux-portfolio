"use client";

import { useEffect, useMemo, useState } from "react";
import usePersistentState from "../../hooks/usePersistentState";

export interface ProTip {
  id: string;
  title: string;
  body: string;
  href?: string;
  actionLabel?: string;
}

interface ProTipsProps {
  tips?: ProTip[];
  rotationIntervalMs?: number;
  className?: string;
}

const DEFAULT_TIPS: ProTip[] = [
  {
    id: "workspace-shortcuts",
    title: "Hop between workspaces",
    body: "Use Super + PgUp/PgDn or click a workspace tile to focus a different desktop instantly.",
  },
  {
    id: "window-snapping",
    title: "Snap like tiling WM",
    body: "Drag a window to a screen edge or press Super + Arrow keys to tile apps side-by-side.",
  },
  {
    id: "dock-customize",
    title: "Pin your essentials",
    body: "Right click any app icon and choose 'Pin to Dock' so it stays ready between sessions.",
  },
  {
    id: "command-launcher",
    title: "Launch with Spotlight",
    body: "Press Super and start typing to open the Whisker menu without leaving the keyboard.",
  },
];

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === "string");

const DEFAULT_ROTATION = 15000;

const clampInterval = (interval: number | undefined) => {
  if (typeof interval !== "number" || Number.isNaN(interval)) return DEFAULT_ROTATION;
  return interval > 0 ? interval : DEFAULT_ROTATION;
};

const ProTips = ({
  tips = DEFAULT_TIPS,
  rotationIntervalMs = DEFAULT_ROTATION,
  className,
}: ProTipsProps) => {
  const [dismissed, setDismissed] = usePersistentState<string[]>(
    "pro-tips-dismissed",
    [],
    isStringArray,
  );
  const [pinned, setPinned] = useState(false);

  const dismissedSet = useMemo(() => new Set(dismissed), [dismissed]);

  const visibleTips = useMemo(
    () => tips.filter(tip => tip && !dismissedSet.has(tip.id)),
    [tips, dismissedSet],
  );

  const [currentTipId, setCurrentTipId] = useState<string | null>(() => visibleTips[0]?.id ?? null);

  useEffect(() => {
    if (visibleTips.length === 0) {
      setCurrentTipId(null);
      setPinned(false);
      return;
    }

    setCurrentTipId(prev => {
      if (prev && visibleTips.some(tip => tip.id === prev)) {
        return prev;
      }
      return visibleTips[0].id;
    });
  }, [visibleTips]);

  useEffect(() => {
    if (visibleTips.length <= 1 || pinned) return;

    const interval = window.setInterval(() => {
      setCurrentTipId(prev => {
        if (visibleTips.length === 0) return null;
        const currentIndex = prev ? visibleTips.findIndex(tip => tip.id === prev) : -1;
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % visibleTips.length;
        return visibleTips[nextIndex]?.id ?? null;
      });
    }, clampInterval(rotationIntervalMs));

    return () => {
      window.clearInterval(interval);
    };
  }, [visibleTips, rotationIntervalMs, pinned]);

  const currentTip = currentTipId
    ? visibleTips.find(tip => tip.id === currentTipId) ?? visibleTips[0]
    : null;

  const currentIndex = currentTip ? visibleTips.findIndex(tip => tip.id === currentTip.id) : -1;

  const handleDismiss = () => {
    if (!currentTip) return;
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(currentTip.id);
      return Array.from(next);
    });
    setPinned(false);
  };

  const togglePin = () => {
    if (!currentTip) return;
    setPinned(prev => !prev);
  };

  if (!currentTip) {
    return (
      <div
        className={`rounded-lg border border-white/10 bg-slate-900/70 p-3 text-left text-white/80 ${
          className ?? ""
        }`}
        role="status"
        aria-live="polite"
      >
        <p className="text-sm font-medium text-white">All tips dismissed</p>
        <p className="mt-1 text-xs text-white/70">
          You've hidden every suggestion. We'll surface new tips once they become available.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-white/10 bg-slate-900/70 p-3 text-left text-white/80 ${
        className ?? ""
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between text-[0.7rem] uppercase tracking-wide text-cyan-200">
        <span>Pro tip</span>
        {visibleTips.length > 1 && currentIndex >= 0 && (
          <span className="text-white/60">{currentIndex + 1} / {visibleTips.length}</span>
        )}
      </div>
      <h3 className="mt-1 text-sm font-semibold text-white">{currentTip.title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-white/80">{currentTip.body}</p>
      {currentTip.href && (
        <a
          href={currentTip.href}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex text-xs font-medium text-cyan-300 underline hover:text-cyan-200"
        >
          {currentTip.actionLabel ?? "Learn more"}
        </a>
      )}
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={togglePin}
          className={`rounded-full border px-3 py-1 font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 ${
            pinned
              ? "border-cyan-300 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20"
              : "border-white/20 bg-white/5 text-white/80 hover:border-white/40 hover:bg-white/10"
          }`}
        >
          {pinned ? "Unpin tip" : "Pin tip"}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-full border border-transparent px-3 py-1 font-medium text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
        >
          Never show again
        </button>
      </div>
    </div>
  );
};

export default ProTips;

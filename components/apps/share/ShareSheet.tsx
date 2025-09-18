"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  shareTargetStore,
  getVisibleShareTargets,
  getRecentShareTargetIds,
  recordShareTargetUse,
  ShareTargetDefinition,
  ShareTargetsSnapshot,
  ShareCapability,
} from "../../../utils/settings/shareTargets";

export interface SharePayload {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

interface ShareSheetProps {
  payload?: SharePayload;
  onSelect?: (target: ShareTargetDefinition) => void;
  onClose?: () => void;
  headline?: string;
  subhead?: string;
}

const deriveCapabilities = (payload: SharePayload | undefined) => {
  const capabilities = new Set<ShareCapability>();
  if (!payload) return capabilities;
  if (payload.text && payload.text.trim().length > 0) {
    capabilities.add("text");
  }
  if (payload.title && payload.title.trim().length > 0) {
    capabilities.add("text");
  }
  if (payload.url && payload.url.trim().length > 0) {
    capabilities.add("url");
  }
  if (payload.files && payload.files.length > 0) {
    capabilities.add("file");
  }
  return capabilities;
};

const ShareTargetButton = React.memo(
  ({
    target,
    onSelect,
  }: {
    target: ShareTargetDefinition;
    onSelect: (target: ShareTargetDefinition) => void;
  }) => {
    const accentBg = `${target.accent}33`;
    return (
      <button
        type="button"
        onClick={() => onSelect(target)}
        className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/20"
      >
        <span
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg text-2xl"
          style={{ backgroundColor: accentBg, color: target.accent }}
        >
          <span aria-hidden>{target.emoji}</span>
          <span className="sr-only">{target.title}</span>
        </span>
        <span className="flex flex-col">
          <span className="text-base font-medium text-white">{target.title}</span>
          <span className="text-sm text-white/70">{target.description}</span>
        </span>
      </button>
    );
  }
);
ShareTargetButton.displayName = "ShareTargetButton";

const ShareSheet: React.FC<ShareSheetProps> = ({
  payload,
  onSelect,
  onClose,
  headline = "Share",
  subhead = "Choose a destination",
}) => {
  const snapshot = useSyncExternalStore<ShareTargetsSnapshot>(
    shareTargetStore.subscribe,
    shareTargetStore.getSnapshot,
    shareTargetStore.getServerSnapshot
  );

  const capabilities = useMemo(() => deriveCapabilities(payload), [payload]);
  const visibleTargets = useMemo(
    () => getVisibleShareTargets(snapshot),
    [snapshot]
  );
  const recentIds = useMemo(
    () => getRecentShareTargetIds(snapshot),
    [snapshot]
  );

  const prioritizedTargets = useMemo(() => {
    if (visibleTargets.length === 0) return [] as ShareTargetDefinition[];
    const map = new Map(visibleTargets.map((target) => [target.id, target]));
    const ordered: ShareTargetDefinition[] = [];
    const seen = new Set<string>();
    for (const id of recentIds) {
      const target = map.get(id);
      if (target && !seen.has(target.id)) {
        ordered.push(target);
        seen.add(target.id);
      }
    }
    for (const target of visibleTargets) {
      if (!seen.has(target.id)) {
        ordered.push(target);
        seen.add(target.id);
      }
    }
    return ordered;
  }, [recentIds, visibleTargets]);

  const compatibleTargets = useMemo(() => {
    if (capabilities.size === 0) return prioritizedTargets;
    return prioritizedTargets.filter((target) =>
      target.accepts.some((cap) => capabilities.has(cap))
    );
  }, [capabilities, prioritizedTargets]);

  const handleSelect = useCallback(
    (target: ShareTargetDefinition) => {
      recordShareTargetUse(target.id);
      onSelect?.(target);
    },
    [onSelect]
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const stopPropagation = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
  }, []);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-[min(520px,90vw)] max-h-[80vh] overflow-hidden rounded-2xl bg-ub-cool-grey text-white shadow-2xl"
        onClick={stopPropagation}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 pb-4 pt-5">
          <div>
            <h2 className="text-lg font-semibold leading-6">{headline}</h2>
            <p className="text-sm text-white/70">{subhead}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-white/60 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            aria-label="Close share sheet"
          >
            ×
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {compatibleTargets.length === 0 ? (
            <p className="text-sm text-white/70">
              No compatible share targets are currently enabled.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {compatibleTargets.map((target) => (
                <ShareTargetButton
                  key={target.id}
                  target={target}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareSheet;

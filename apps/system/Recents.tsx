"use client";

import { useCallback, useMemo } from "react";
import useRecents from "../../hooks/useRecents";
import apps from "../../apps.config";
import type { RecentItem } from "../../utils/recentsStore";
import {
  RECENTS_DOCUMENT_EVENT,
  recordRecentDocument,
} from "../../utils/recentsStore";

const APP_FALLBACK_ICON = "/themes/Yaru/system/user-desktop.png";
const DOC_FALLBACK_ICON = "/themes/Yaru/system/folder.png";

const formatRelativeTime = (timestamp: number): string => {
  const diff = Date.now() - timestamp;
  if (diff < 0) return "Just now";
  const minutes = Math.floor(diff / (60 * 1000));
  if (minutes <= 0) return "Just now";
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }
  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
};

interface Props {
  openApp?: (id: string) => void;
}

const Recents = ({ openApp }: Props) => {
  const { items, remove, clear } = useRecents();

  const appIndex = useMemo(() => {
    const index = new Map<string, { title: string; icon?: string }>();
    (apps as any[]).forEach((app) => {
      if (app && app.id) {
        index.set(app.id, { title: app.title, icon: app.icon });
      }
    });
    return index;
  }, []);

  const handleReopen = useCallback(
    (item: RecentItem) => {
      if (item.type === "app") {
        const targetId = item.appId || item.target;
        if (targetId) openApp?.(targetId);
        return;
      }

      if (item.appId) {
        openApp?.(item.appId);
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(RECENTS_DOCUMENT_EVENT, { detail: item })
        );
      }

      recordRecentDocument({
        id: item.target,
        title: item.title,
        description: item.description,
        icon: item.icon,
        appId: item.appId,
        data: item.data,
      });
    },
    [openApp]
  );

  const handleRemove = useCallback(
    (id: string) => {
      remove(id);
    },
    [remove]
  );

  const handleClear = useCallback(() => {
    clear();
  }, [clear]);

  return (
    <div className="flex h-full w-full select-none flex-col bg-ub-cool-grey text-white">
      <header className="flex items-start justify-between border-b border-black/60 bg-ub-warm-grey/40 px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold">Recents</h1>
          <p className="text-xs text-ubt-grey">
            Review and relaunch your latest apps and documents.
          </p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          disabled={items.length === 0}
          className="rounded border border-black bg-black/40 px-3 py-1 text-sm transition hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-ub-orange disabled:opacity-40"
        >
          Clear All
        </button>
      </header>
      <div className="flex-1 overflow-auto">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-ubt-grey">
            <img
              src={DOC_FALLBACK_ICON}
              alt=""
              className="h-14 w-14 opacity-60"
            />
            <span>No recent activity yet.</span>
          </div>
        ) : (
          <ul className="divide-y divide-black/30">
            {items.map((item) => {
              const appMeta =
                (item.type === "app"
                  ? appIndex.get(item.target)
                  : item.appId
                  ? appIndex.get(item.appId)
                  : undefined) || undefined;
              const icon =
                item.icon ||
                appMeta?.icon ||
                (item.type === "app" ? APP_FALLBACK_ICON : DOC_FALLBACK_ICON);
              const title = item.title || appMeta?.title || item.target;
              const secondary = [
                item.type === "app" ? "Application" : "Document",
                item.description ||
                  (item.type === "document" && item.appId
                    ? `via ${appMeta?.title || item.appId}`
                    : undefined),
              ]
                .filter(Boolean)
                .join(" • ");
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-4 px-4 py-3 transition hover:bg-ub-drk-abrgn/60"
                >
                  <img
                    src={icon}
                    alt=""
                    className="h-10 w-10 flex-shrink-0 rounded bg-black/30 object-contain p-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium" title={title}>
                        {title}
                      </span>
                      <time
                        className="flex-shrink-0 text-xs text-ubt-grey"
                        dateTime={new Date(item.timestamp).toISOString()}
                        title={new Date(item.timestamp).toLocaleString()}
                      >
                        {formatRelativeTime(item.timestamp)}
                      </time>
                    </div>
                    <p className="truncate text-xs text-ubt-grey" title={secondary}>
                      {secondary}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => handleReopen(item)}
                      className="rounded bg-ubt-grey px-3 py-1 text-xs font-semibold text-black transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-ub-orange"
                    >
                      Reopen
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      className="rounded border border-black bg-black/40 px-3 py-1 text-xs transition hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-ub-orange"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Recents;


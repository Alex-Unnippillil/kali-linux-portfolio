"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  RecentItem,
  clearRecentItems,
  formatRelativeTime,
  getRecentItems,
  openRecentItem,
  removeRecentItem,
  subscribeToRecents,
} from "../../utils/recents";

function ItemAvatar({ item }: { item: RecentItem }) {
  if (item.icon) {
    return (
      <div className="mt-1 h-10 w-10 flex items-center justify-center overflow-hidden rounded bg-black/40">
        <Image
          src={item.icon}
          alt=""
          width={40}
          height={40}
          className="h-8 w-8"
        />
      </div>
    );
  }

  const initial = item.name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="mt-1 h-10 w-10 flex items-center justify-center rounded bg-black/40 text-lg font-semibold text-white">
      {initial}
    </div>
  );
}

function ItemBadge({ item }: { item: RecentItem }) {
  const label = item.kind === "app" ? "App" : "File";
  return (
    <span className="rounded bg-white/10 px-2 py-0.5 text-xs uppercase tracking-wide text-ubt-grey">
      {label}
    </span>
  );
}

export default function Recents() {
  const [items, setItems] = useState<RecentItem[]>(() => getRecentItems());

  useEffect(() => {
    return subscribeToRecents((next) => setItems(next));
  }, []);

  const handleOpen = useCallback((item: RecentItem) => {
    if (!openRecentItem(item)) {
      console.warn("Unable to open recent item", item);
    }
  }, []);

  const handleRemove = useCallback((id: string) => {
    removeRecentItem(id);
  }, []);

  const handleClearAll = useCallback(() => {
    clearRecentItems();
  }, []);

  const empty = items.length === 0;

  return (
    <div className="flex h-full flex-col bg-ub-cool-grey text-white">
      <div className="flex items-center justify-between border-b border-black/40 px-4 py-3">
        <h1 className="text-lg font-semibold">Recent Activity</h1>
        <button
          type="button"
          className="rounded bg-black/50 px-3 py-1 text-sm text-white transition hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={handleClearAll}
          disabled={empty}
        >
          Clear All
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {empty ? (
          <p className="rounded bg-black/20 p-4 text-sm text-ubt-grey">
            Launch apps or open files to populate your recent activity. Items update as you
            interact with the desktop experience.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => {
              const timeLabel = formatRelativeTime(item.lastUsed);
              return (
                <article
                  key={item.id}
                  className="flex flex-col gap-3 rounded-lg bg-black/30 p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex flex-1 items-start gap-3">
                    <ItemAvatar item={item} />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-white">{item.name}</span>
                        <ItemBadge item={item} />
                      </div>
                      {item.subtitle && (
                        <span className="mt-1 text-xs text-ubt-grey">{item.subtitle}</span>
                      )}
                      <span className="mt-1 text-xs text-ubt-grey">Last used {timeLabel}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start md:self-center">
                    <button
                      type="button"
                      className="rounded bg-ub-grey px-3 py-1 text-sm font-medium text-white transition hover:bg-ub-grey/70 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => handleOpen(item)}
                      disabled={item.openable === false}
                      title={
                        item.openable === false
                          ? 'Re-opening requires manual permission in the original app.'
                          : undefined
                      }
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      className="rounded border border-red-400 px-3 py-1 text-sm text-red-300 transition hover:bg-red-500/20"
                      onClick={() => handleRemove(item.id)}
                    >
                      Clear
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


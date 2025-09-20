"use client";

import { useMemo } from "react";
import type { AppNotification } from "../../common/NotificationCenter";
import apps from "../../../apps.config";

const APP_LOOKUP = new Map(
  apps.map((app) => [app.id, { title: app.title, icon: app.icon ?? "" }]),
);

interface SummaryBundleProps {
  appId: string;
  notifications: AppNotification[];
  createdAt: number;
  onView: () => void;
  onDismiss: () => void;
}

const formatTime = (value: number) =>
  new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const SummaryBundle = ({
  appId,
  notifications,
  createdAt,
  onView,
  onDismiss,
}: SummaryBundleProps) => {
  const meta = useMemo(() => APP_LOOKUP.get(appId), [appId]);
  const preview = useMemo(
    () => notifications.slice(-3).reverse(),
    [notifications],
  );
  const extraCount = notifications.length - preview.length;

  return (
    <article className="pointer-events-auto rounded-lg border border-gray-700 bg-ub-cool-grey/95 p-3 text-sm text-white shadow-xl backdrop-blur">
      <header className="mb-2 flex items-start justify-between gap-2">
        <div className="flex flex-1 items-center gap-2">
          {meta?.icon && (
            <img
              src={meta.icon}
              alt=""
              className="h-6 w-6 flex-shrink-0 rounded"
              aria-hidden="true"
            />
          )}
          <div className="flex flex-col leading-tight">
            <span className="font-semibold">{meta?.title ?? appId}</span>
            <span className="text-[11px] uppercase tracking-wide text-gray-300">
              {formatTime(createdAt)}
            </span>
          </div>
        </div>
        <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs font-semibold">
          {notifications.length}
        </span>
      </header>
      <ul className="mb-3 space-y-1">
        {preview.map((notification) => (
          <li
            key={notification.id}
            className="rounded bg-black/20 px-2 py-1"
          >
            <span className="text-[11px] uppercase tracking-wide text-gray-400">
              {formatTime(notification.date)}
            </span>
            <span className="block text-sm">{notification.message}</span>
          </li>
        ))}
        {extraCount > 0 && (
          <li className="text-xs italic text-gray-300">
            +{extraCount} more updates bundled
          </li>
        )}
      </ul>
      <footer className="flex justify-end gap-2 text-xs">
        <button
          type="button"
          onClick={onView}
          className="rounded border border-gray-500 px-2 py-1 font-semibold uppercase tracking-wide text-white transition hover:bg-gray-500/30 focus:outline-none focus:ring-2 focus:ring-ub-orange"
        >
          View details
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded border border-transparent px-2 py-1 font-semibold uppercase tracking-wide text-gray-300 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-ub-orange"
        >
          Dismiss
        </button>
      </footer>
    </article>
  );
};

export default SummaryBundle;

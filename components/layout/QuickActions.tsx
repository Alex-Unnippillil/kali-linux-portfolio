"use client";

import React, {
  useCallback,
  useMemo,
  useState,
} from "react";
import clsx from "clsx";
import DelayedTooltip from "../ui/DelayedTooltip";
import { useSettings } from "../../hooks/useSettings";
import type { QuickActionId } from "../../types/quickActions";

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={clsx("h-4 w-4", className)}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const RecordIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={clsx("h-4 w-4", className)}
    fill="currentColor"
  >
    <circle cx="12" cy="12" r="6" />
  </svg>
);

const GearIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={clsx("h-4 w-4", className)}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.06a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.06a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.06a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const LockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={clsx("h-4 w-4", className)}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export type QuickActionDefinition = {
  id: QuickActionId;
  label: string;
  description: string;
  shortcut?: string;
  icon: React.FC<{ className?: string }>;
  perform: (handlers: Partial<Record<QuickActionId, () => void>>) => void;
};

export const QUICK_ACTION_DEFINITIONS: QuickActionDefinition[] = [
  {
    id: "new-tab",
    label: "New Tab",
    description: "Open a fresh terminal session in a new tab.",
    shortcut: "Ctrl+Alt+T",
    icon: PlusIcon,
    perform: (handlers) => {
      if (handlers["new-tab"]) {
        handlers["new-tab"]?.();
        return;
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("open-app", { detail: "terminal" }));
      }
    },
  },
  {
    id: "record-screen",
    label: "Record screen",
    description: "Launch the screen recorder demo window.",
    shortcut: "Ctrl+Alt+R",
    icon: RecordIcon,
    perform: (handlers) => {
      if (handlers["record-screen"]) {
        handlers["record-screen"]?.();
        return;
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("open-app", { detail: "screen-recorder" })
        );
      }
    },
  },
  {
    id: "open-settings",
    label: "Open settings",
    description: "Jump directly to the desktop settings app.",
    shortcut: "Ctrl+,",
    icon: GearIcon,
    perform: (handlers) => {
      if (handlers["open-settings"]) {
        handlers["open-settings"]?.();
        return;
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("open-app", { detail: "settings" }));
      }
    },
  },
  {
    id: "lock-screen",
    label: "Lock screen",
    description: "Secure the desktop until you log back in.",
    shortcut: "Super+L",
    icon: LockIcon,
    perform: (handlers) => {
      if (handlers["lock-screen"]) {
        handlers["lock-screen"]?.();
      }
    },
  },
];

const QUICK_ACTION_MAP: Record<QuickActionId, QuickActionDefinition> = QUICK_ACTION_DEFINITIONS.reduce(
  (acc, definition) => ({ ...acc, [definition.id]: definition }),
  {} as Record<QuickActionId, QuickActionDefinition>
);

const QUICK_ACTION_IDS = new Set<QuickActionId>(
  QUICK_ACTION_DEFINITIONS.map((action) => action.id)
);

export const isQuickActionId = (value: string): value is QuickActionId =>
  QUICK_ACTION_IDS.has(value as QuickActionId);

export interface QuickActionsProps {
  className?: string;
  handlers?: Partial<Record<QuickActionId, () => void>>;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  className,
  handlers = {},
}) => {
  const { quickActions, setQuickActions } = useSettings();
  const [draggedId, setDraggedId] = useState<QuickActionId | null>(null);
  const [activeDropId, setActiveDropId] = useState<QuickActionId | null>(null);

  const orderedActions = useMemo(
    () =>
      quickActions
        .filter((item) => item.visible)
        .map((item) => QUICK_ACTION_MAP[item.id])
        .filter(Boolean),
    [quickActions]
  );

  const reorder = useCallback(
    (dragId: QuickActionId, targetId: QuickActionId | null) => {
      if (dragId === targetId) return;
      const current = quickActions;
      const sourceIndex = current.findIndex((item) => item.id === dragId);
      if (sourceIndex === -1) return;
      const next = current.slice();
      const [entry] = next.splice(sourceIndex, 1);
      if (targetId === null) {
        next.push(entry);
      } else {
        const targetIndex = next.findIndex((item) => item.id === targetId);
        if (targetIndex === -1) {
          next.push(entry);
        } else {
          next.splice(targetIndex, 0, entry);
        }
      }
      setQuickActions(next);
    },
    [quickActions, setQuickActions]
  );

  const handleDropOnContainer = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const raw = event.dataTransfer?.getData("text/plain");
      if (!raw) return;
      if (!isQuickActionId(raw)) return;
      reorder(raw, null);
      setDraggedId(null);
      setActiveDropId(null);
    },
    [reorder]
  );

  const handleDropOnItem = useCallback(
    (event: React.DragEvent<HTMLButtonElement>, targetId: QuickActionId) => {
      event.preventDefault();
      const raw = event.dataTransfer?.getData("text/plain") || draggedId;
      if (!raw) return;
      if (!isQuickActionId(raw)) return;
      reorder(raw, targetId);
      setDraggedId(null);
      setActiveDropId(null);
    },
    [draggedId, reorder]
  );

  const performAction = useCallback(
    (id: QuickActionId) => {
      const action = QUICK_ACTION_MAP[id];
      if (!action) return;
      action.perform(handlers);
    },
    [handlers]
  );

  if (orderedActions.length === 0) {
    return (
      <div
        className={clsx(
          "hidden text-xs text-white/60 md:flex md:items-center",
          className
        )}
        role="note"
      >
        Add quick actions from Settings → Quick Actions.
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "hidden items-center gap-2 text-xs text-white/80 md:flex",
        className
      )}
      role="toolbar"
      aria-label="Quick actions"
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDropOnContainer}
    >
      {orderedActions.map((action) => {
        const Icon = action.icon;
        const isActiveDrop = activeDropId === action.id;
        const ariaKeyShortcuts = action.shortcut
          ?.split(",")
          .map((combo) =>
            combo
              .trim()
              .replace(/Ctrl/gi, "Control")
              .replace(/Super/gi, "Meta")
              .replace(/\s*\+\s*/g, "+")
          )
          .join(" ");
        return (
          <DelayedTooltip
            key={action.id}
            content={
              <div>
                <p className="font-medium text-white">{action.label}</p>
                <p className="mt-1 text-white/80">{action.description}</p>
                {action.shortcut && (
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-white/60">
                    {action.shortcut}
                  </p>
                )}
              </div>
            }
          >
            {({ ref, onBlur, onFocus, onMouseEnter, onMouseLeave }) => (
              <button
                ref={ref as (node: HTMLButtonElement | null) => void}
                type="button"
                className={clsx(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 transition",
                  "border-white/10 bg-white/10 hover:border-ubt-grey/80 hover:bg-white/20",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
                  draggedId === action.id && "opacity-70",
                  isActiveDrop && "border-cyan-400/80 bg-cyan-500/20"
                )}
                aria-label={
                  action.shortcut
                    ? `${action.label} (${action.shortcut})`
                    : action.label
                }
                aria-keyshortcuts={ariaKeyShortcuts}
                draggable
                onClick={() => performAction(action.id)}
                onDragStart={(event) => {
                  event.dataTransfer?.setData("text/plain", action.id);
                  event.dataTransfer?.setDragImage(new Image(), 0, 0);
                  setDraggedId(action.id);
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setActiveDropId(action.id);
                }}
                onDragLeave={() => {
                  setActiveDropId((current) =>
                    current === action.id ? null : current
                  );
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleDropOnItem(event, action.id)}
                onDragEnd={() => {
                  setDraggedId(null);
                  setActiveDropId(null);
                }}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                onFocus={onFocus}
                onBlur={onBlur}
                data-testid={`quick-action-${action.id}`}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium text-white/90">{action.label}</span>
              </button>
            )}
          </DelayedTooltip>
        );
      })}
    </div>
  );
};

export default QuickActions;

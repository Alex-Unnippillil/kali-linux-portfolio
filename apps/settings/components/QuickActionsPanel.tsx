"use client";

import React, { useCallback, useMemo, useState } from "react";
import clsx from "clsx";
import { useSettings } from "../../../hooks/useSettings";
import type { QuickActionId } from "../../../types/quickActions";
import {
  QUICK_ACTION_DEFINITIONS,
  isQuickActionId,
} from "../../../components/layout/QuickActions";

const dragImage = typeof Image !== "undefined" ? new Image() : null;

dragImage?.setAttribute("src", "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==");

type DefinitionMap = Map<QuickActionId, (typeof QUICK_ACTION_DEFINITIONS)[number]>;

const QuickActionsPanel: React.FC = () => {
  const { quickActions, setQuickActions } = useSettings();
  const [dragging, setDragging] = useState<QuickActionId | null>(null);
  const [dropTarget, setDropTarget] = useState<QuickActionId | null>(null);

  const definitionMap = useMemo<DefinitionMap>(() => {
    const map: DefinitionMap = new Map();
    QUICK_ACTION_DEFINITIONS.forEach((definition) => {
      map.set(definition.id, definition);
    });
    return map;
  }, []);

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

  const moveItem = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      if (toIndex < 0 || toIndex >= quickActions.length) return;
      const next = quickActions.slice();
      const [entry] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, entry);
      setQuickActions(next);
    },
    [quickActions, setQuickActions]
  );

  const handleDropOnContainer = useCallback(
    (event: React.DragEvent<HTMLUListElement>) => {
      event.preventDefault();
      const raw = event.dataTransfer?.getData("text/plain");
      if (!raw || !isQuickActionId(raw)) return;
      reorder(raw, null);
      setDragging(null);
      setDropTarget(null);
    },
    [reorder]
  );

  const handleDropOnItem = useCallback(
    (event: React.DragEvent<HTMLLIElement>, targetId: QuickActionId) => {
      event.preventDefault();
      const raw = event.dataTransfer?.getData("text/plain") || dragging;
      if (!raw || !isQuickActionId(raw)) return;
      reorder(raw, targetId);
      setDragging(null);
      setDropTarget(null);
    },
    [dragging, reorder]
  );

  const handleToggle = useCallback(
    (id: QuickActionId) => {
      const next = quickActions.map((item) =>
        item.id === id ? { ...item, visible: !item.visible } : item
      );
      setQuickActions(next);
    },
    [quickActions, setQuickActions]
  );

  return (
    <section className="flex flex-col gap-4 px-6 py-6 text-white">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Quick actions</h2>
        <p className="text-sm text-white/70">
          Drag to reorder the toolbar buttons and toggle their visibility. Changes
          are saved immediately.
        </p>
      </header>
      <ul
        role="list"
        className="flex flex-col gap-3"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDropOnContainer}
      >
        {quickActions.map((item, index) => {
          const definition = definitionMap.get(item.id);
          if (!definition) return null;
          const isDropping = dropTarget === item.id;
          const inputId = `quick-action-toggle-${item.id}`;
          const isFirst = index === 0;
          const isLast = index === quickActions.length - 1;
          return (
            <li
              key={item.id}
              className={clsx(
                "flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 transition",
                isDropping && "border-cyan-400/80 bg-cyan-500/10",
                dragging === item.id && "opacity-70"
              )}
              draggable
              onDragStart={(event) => {
                event.dataTransfer?.setData("text/plain", item.id);
                if (dragImage) {
                  event.dataTransfer?.setDragImage(dragImage, 0, 0);
                }
                setDragging(item.id);
              }}
              onDragEnter={(event) => {
                event.preventDefault();
                setDropTarget(item.id);
              }}
              onDragLeave={() => {
                setDropTarget((current) => (current === item.id ? null : current));
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDropOnItem(event, item.id)}
              onDragEnd={() => {
                setDragging(null);
                setDropTarget(null);
              }}
              data-testid={`quick-action-settings-${item.id}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-1 text-white/60">
                  <button
                    type="button"
                    aria-label={`Move ${definition.label} up`}
                    disabled={isFirst}
                    onClick={() => moveItem(index, index - 1)}
                    className="flex h-6 w-6 items-center justify-center rounded border border-white/10 bg-white/5 text-xs disabled:opacity-40"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${definition.label} down`}
                    disabled={isLast}
                    onClick={() => moveItem(index, index + 1)}
                    className="flex h-6 w-6 items-center justify-center rounded border border-white/10 bg-white/5 text-xs disabled:opacity-40"
                  >
                    ▼
                  </button>
                </div>
                <span
                  className="select-none text-base text-white/40"
                  aria-hidden="true"
                >
                  ≡
                </span>
                <div>
                  <p className="font-medium text-white">{definition.label}</p>
                  <p className="text-xs text-white/70">{definition.description}</p>
                  {definition.shortcut && (
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-white/50">
                      {definition.shortcut}
                    </p>
                  )}
                </div>
              </div>
              <label
                htmlFor={inputId}
                className="flex items-center gap-2 text-sm text-white/80"
              >
                <input
                  id={inputId}
                  type="checkbox"
                  checked={item.visible}
                  onChange={() => handleToggle(item.id)}
                  aria-label={`Show ${definition.label}`}
                />
                <span>Show {definition.label}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default QuickActionsPanel;

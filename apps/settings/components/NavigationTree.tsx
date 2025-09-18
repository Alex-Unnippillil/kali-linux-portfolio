"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { NavigationItem } from "../navigation";
import { getNavigationPath } from "../navigation";

interface NavigationTreeProps {
  items: NavigationItem[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
}

interface VisibleItem {
  node: NavigationItem;
  level: number;
  parentId?: string;
  isLeaf: boolean;
}

const getVisibleItems = (
  items: NavigationItem[],
  expandedIds: Set<string>,
  level = 1,
  parentId?: string
): VisibleItem[] => {
  const result: VisibleItem[] = [];
  for (const item of items) {
    const isLeaf = !item.children || item.children.length === 0;
    result.push({ node: item, level, parentId, isLeaf });
    if (!isLeaf && expandedIds.has(item.id)) {
      result.push(
        ...getVisibleItems(item.children ?? [], expandedIds, level + 1, item.id)
      );
    }
  }
  return result;
};

export default function NavigationTree({
  items,
  activeId,
  onSelect,
  className,
}: NavigationTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(getNavigationPath(activeId).slice(0, -1))
  );
  const [focusedId, setFocusedId] = useState<string>(activeId);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());

  const visibleItems = useMemo(
    () => getVisibleItems(items, expandedIds),
    [items, expandedIds]
  );

  useEffect(() => {
    const path = getNavigationPath(activeId);
    if (path.length <= 1) return;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      path.slice(0, -1).forEach((id) => next.add(id));
      return next;
    });
  }, [activeId]);

  useEffect(() => {
    setFocusedId(activeId);
  }, [activeId]);

  useEffect(() => {
    const ref = itemRefs.current.get(focusedId);
    ref?.focus();
  }, [focusedId, visibleItems]);

  const registerRef = useCallback((id: string, node: HTMLButtonElement | null) => {
    if (!node) {
      itemRefs.current.delete(id);
    } else {
      itemRefs.current.set(id, node);
    }
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const focusByIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= visibleItems.length) return;
      setFocusedId(visibleItems[index].node.id);
    },
    [visibleItems]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, item: VisibleItem) => {
      const index = visibleItems.findIndex((entry) => entry.node.id === item.node.id);
      const isExpanded = !item.isLeaf && expandedIds.has(item.node.id);

      switch (event.key) {
        case "ArrowDown": {
          event.preventDefault();
          focusByIndex(index + 1);
          break;
        }
        case "ArrowUp": {
          event.preventDefault();
          focusByIndex(index - 1);
          break;
        }
        case "ArrowRight": {
          event.preventDefault();
          if (!item.isLeaf) {
            if (!isExpanded) {
              toggleExpand(item.node.id);
            } else {
              focusByIndex(index + 1);
            }
          }
          break;
        }
        case "ArrowLeft": {
          event.preventDefault();
          if (!item.isLeaf && isExpanded) {
            toggleExpand(item.node.id);
          } else if (item.parentId) {
            const parentIndex = visibleItems.findIndex(
              (entry) => entry.node.id === item.parentId
            );
            if (parentIndex >= 0) {
              focusByIndex(parentIndex);
            }
          }
          break;
        }
        case "Home": {
          event.preventDefault();
          focusByIndex(0);
          break;
        }
        case "End": {
          event.preventDefault();
          focusByIndex(visibleItems.length - 1);
          break;
        }
        case "Enter":
        case " ": {
          event.preventDefault();
          if (item.isLeaf) {
            onSelect(item.node.id);
          } else {
            toggleExpand(item.node.id);
          }
          break;
        }
        default:
          break;
      }
    },
    [expandedIds, focusByIndex, onSelect, toggleExpand, visibleItems]
  );

  return (
    <div className={className}>
      <div role="tree" aria-label="Settings sections" className="space-y-1">
        {visibleItems.map((item) => {
          const isExpanded = !item.isLeaf && expandedIds.has(item.node.id);
          const isActive = item.node.id === activeId;
          const paddingLeft = 12 + (item.level - 1) * 16;

          return (
            <div role="none" key={item.node.id}>
              <button
                type="button"
                role="treeitem"
                ref={(node) => registerRef(item.node.id, node)}
                aria-level={item.level}
                aria-expanded={!item.isLeaf ? isExpanded : undefined}
                aria-selected={item.isLeaf ? isActive : undefined}
                tabIndex={focusedId === item.node.id ? 0 : -1}
                onKeyDown={(event) => handleKeyDown(event, item)}
                onClick={() => {
                  setFocusedId(item.node.id);
                  if (item.isLeaf) {
                    onSelect(item.node.id);
                  } else {
                    toggleExpand(item.node.id);
                  }
                }}
                className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                  isActive
                    ? "bg-ub-window-title text-white"
                    : "text-ubt-grey hover:bg-ub-warm-grey hover:bg-opacity-10"
                }`}
                style={{ paddingLeft }}
              >
                {!item.isLeaf && (
                  <span
                    aria-hidden="true"
                    className={`inline-block text-xs transition-transform ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  >
                    ▶
                  </span>
                )}
                <span className="truncate">{item.node.label}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

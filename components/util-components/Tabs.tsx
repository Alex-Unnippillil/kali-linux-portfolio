"use client";

import React, {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type Tab<T extends string> = {
  id: T;
  label: string;
  /**
   * Higher values indicate lower priority. Tabs with the highest priority
   * values are the first to move into the overflow menu when space is
   * constrained.
   */
  priority?: number;
};

export interface TabsProps<T extends string> {
  tabs: readonly Tab<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
  moreLabel?: string;
}

type ResizeHandler = () => void;

type TabWithMetadata<T extends string> = {
  tab: Tab<T>;
  width: number;
};

export default function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  className = "",
  moreLabel = "More",
}: TabsProps<T>) {
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLUListElement | null>(null);
  const tabRefs = useRef<Map<T, HTMLButtonElement | null>>(new Map());
  const menuItemRefs = useRef<Map<T, HTMLButtonElement | null>>(new Map());
  const focusOnOpenRef = useRef<"first" | "last" | null>(null);

  const [overflowIds, setOverflowIds] = useState<Set<T>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);

  const tabIndexMap = useMemo(() => {
    const indexMap = new Map<T, number>();
    tabs.forEach((tab, index) => {
      indexMap.set(tab.id, index);
    });
    return indexMap;
  }, [tabs]);

  const overflowTabs = useMemo(
    () => tabs.filter((tab) => overflowIds.has(tab.id)),
    [tabs, overflowIds],
  );

  useEffect(() => {
    if (!overflowTabs.length && menuOpen) {
      setMenuOpen(false);
    }
  }, [overflowTabs, menuOpen]);

  const normalizeOverflow = useCallback(
    (ids: Set<T>) => {
      const validIds = new Set<T>();
      const tabIdSet = new Set(tabs.map((tab) => tab.id));
      ids.forEach((id) => {
        if (tabIdSet.has(id)) {
          validIds.add(id);
        }
      });
      return validIds;
    },
    [tabs],
  );

  useEffect(() => {
    setOverflowIds((previous) => normalizeOverflow(previous));
  }, [normalizeOverflow]);

  const getTabData = useCallback((): TabWithMetadata<T>[] => {
    return tabs.map((tab) => {
      const ref = tabRefs.current.get(tab.id);
      return {
        tab,
        width: ref?.offsetWidth ?? 0,
      };
    });
  }, [tabs]);

  const recalcOverflow = useCallback(() => {
    if (!containerRef.current) return;

    const tabData = getTabData();
    const containerWidth = containerRef.current.clientWidth;
    const totalTabWidth = tabData.reduce((sum, item) => sum + item.width, 0);

    if (totalTabWidth === 0) {
      setOverflowIds(new Set());
      return;
    }

    if (totalTabWidth <= containerWidth) {
      setOverflowIds(new Set());
      return;
    }

    const moreWidth = moreButtonRef.current?.offsetWidth ?? 0;
    const availableWidth = Math.max(containerWidth - moreWidth, 0);

    const sortedByPriority = [...tabData].sort((a, b) => {
      const priorityDiff = (a.tab.priority ?? 0) - (b.tab.priority ?? 0);
      if (priorityDiff !== 0) return priorityDiff;

      const aIndex = tabIndexMap.get(a.tab.id) ?? 0;
      const bIndex = tabIndexMap.get(b.tab.id) ?? 0;
      return aIndex - bIndex;
    });

    let usedWidth = 0;
    const nextOverflow = new Set<T>();

    for (const item of sortedByPriority) {
      const nextWidth = item.width || 0;
      if (nextWidth === 0) {
        usedWidth += nextWidth;
        continue;
      }

      if (usedWidth + nextWidth <= availableWidth) {
        usedWidth += nextWidth;
      } else {
        nextOverflow.add(item.tab.id);
      }
    }

    setOverflowIds(nextOverflow);
  }, [getTabData, tabIndexMap]);

  useLayoutEffect(() => {
    recalcOverflow();
  }, [recalcOverflow, tabs]);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const handleResize: ResizeHandler = () => {
      recalcOverflow();
    };

    const observer = new ResizeObserver(handleResize);

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    tabs.forEach((tab) => {
      const ref = tabRefs.current.get(tab.id);
      if (ref) {
        observer.observe(ref);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [recalcOverflow, tabs]);

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !moreButtonRef.current?.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        moreButtonRef.current?.focus();
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen || overflowTabs.length === 0) return;

    const focusTarget = focusOnOpenRef.current ?? "first";
    const nextFrame = window.requestAnimationFrame(() => {
      const items = overflowTabs.map((tab) => menuItemRefs.current.get(tab.id));
      if (focusTarget === "last") {
        const lastItem = items.reverse().find(Boolean);
        lastItem?.focus();
      } else {
        const firstItem = items.find(Boolean);
        firstItem?.focus();
      }
      focusOnOpenRef.current = null;
    });

    return () => window.cancelAnimationFrame(nextFrame);
  }, [menuOpen, overflowTabs]);

  const handleTabClick = useCallback(
    (id: T) => {
      onChange(id);
    },
    [onChange],
  );

  const handleOverflowSelection = useCallback(
    (id: T) => {
      setMenuOpen(false);
      focusOnOpenRef.current = null;
      handleTabClick(id);
      moreButtonRef.current?.focus();
    },
    [handleTabClick],
  );

  const setTabRef = useCallback((id: T, element: HTMLButtonElement | null) => {
    if (element) {
      tabRefs.current.set(id, element);
    } else {
      tabRefs.current.delete(id);
    }
  }, []);

  const setMenuItemRef = useCallback(
    (id: T, element: HTMLButtonElement | null) => {
      if (element) {
        menuItemRefs.current.set(id, element);
      } else {
        menuItemRefs.current.delete(id);
      }
    },
    [],
  );

  const handleMenuItemKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
      if (!overflowTabs.length) return;

      const lastIndex = overflowTabs.length - 1;

      switch (event.key) {
        case "ArrowDown": {
          event.preventDefault();
          const nextIndex = index === lastIndex ? 0 : index + 1;
          const nextId = overflowTabs[nextIndex]?.id;
          const nextItem = nextId ? menuItemRefs.current.get(nextId) : null;
          nextItem?.focus();
          break;
        }
        case "ArrowUp": {
          event.preventDefault();
          const prevIndex = index === 0 ? lastIndex : index - 1;
          const prevId = overflowTabs[prevIndex]?.id;
          const prevItem = prevId ? menuItemRefs.current.get(prevId) : null;
          prevItem?.focus();
          break;
        }
        case "Home": {
          event.preventDefault();
          const firstId = overflowTabs[0]?.id;
          const firstItem = firstId ? menuItemRefs.current.get(firstId) : null;
          firstItem?.focus();
          break;
        }
        case "End": {
          event.preventDefault();
          const endId = overflowTabs[lastIndex]?.id;
          const endItem = endId ? menuItemRefs.current.get(endId) : null;
          endItem?.focus();
          break;
        }
        case "Escape": {
          event.preventDefault();
          setMenuOpen(false);
          moreButtonRef.current?.focus();
          break;
        }
        default:
          break;
      }
    },
    [overflowTabs],
  );

  const handleMoreButtonKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (!overflowTabs.length) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        focusOnOpenRef.current = "first";
        setMenuOpen(true);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        focusOnOpenRef.current = "last";
        setMenuOpen(true);
      }
    },
    [overflowTabs],
  );

  const handleMoreButtonClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (!overflowTabs.length) return;
      setMenuOpen((open) => {
        const next = !open;
        focusOnOpenRef.current = next ? "first" : null;
        return next;
      });
    },
    [overflowTabs.length],
  );

  useEffect(() => {
    if (!menuOpen) return;

    const activeIndex = overflowTabs.findIndex((tab) => tab.id === active);
    if (activeIndex === -1) return;

    const activeItem = menuItemRefs.current.get(overflowTabs[activeIndex].id);
    if (activeItem) {
      activeItem.scrollIntoView({ block: "nearest" });
    }
  }, [active, menuOpen, overflowTabs]);

  const baseTabClasses =
    "group relative flex min-w-0 items-center gap-2 whitespace-nowrap rounded border border-transparent px-4 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ub-orange";

  const visibleInactiveClasses =
    "text-ubt-grey hover:bg-ub-cool-grey/30 hover:text-white";
  const visibleActiveClasses = "bg-ub-orange text-white";
  const hiddenMeasurementClasses =
    "absolute left-0 top-0 -z-10 opacity-0 pointer-events-none";

  return (
    <div
      ref={containerRef}
      role="tablist"
      className={`flex flex-nowrap items-stretch gap-2 ${className}`.trim()}
    >
      {tabs.map((tab) => {
        const isOverflow = overflowIds.has(tab.id);
        const isActive = tab.id === active;

        return (
          <button
            key={tab.id}
            ref={(element) => setTabRef(tab.id, element)}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-hidden={isOverflow ? true : undefined}
            tabIndex={isOverflow ? -1 : isActive ? 0 : -1}
            onClick={() => {
              if (!isOverflow) {
                handleTabClick(tab.id);
              }
            }}
            className={[
              baseTabClasses,
              isOverflow
                ? hiddenMeasurementClasses
                : isActive
                ? visibleActiveClasses
                : visibleInactiveClasses,
            ].join(" ")}
            data-tab-id={tab.id}
            style={{
              minInlineSize: "calc(10ch + 2rem)",
              maxWidth: "100%",
            }}
          >
            <span className="block w-full truncate text-left">{tab.label}</span>
          </button>
        );
      })}

      <div className="relative">
        <button
          ref={moreButtonRef}
          type="button"
          className={[
            baseTabClasses,
            overflowTabs.length
              ? "flex-shrink-0 bg-ub-cool-grey/40 text-white hover:bg-ub-cool-grey/60"
              : "absolute left-0 top-0 -z-10 opacity-0 pointer-events-none",
          ].join(" ")}
          tabIndex={overflowTabs.length ? 0 : -1}
          aria-hidden={overflowTabs.length ? undefined : true}
          aria-haspopup="menu"
          aria-expanded={overflowTabs.length ? menuOpen : undefined}
          aria-controls={overflowTabs.length ? menuId : undefined}
          onClick={handleMoreButtonClick}
          onKeyDown={handleMoreButtonKeyDown}
          style={{ minInlineSize: "calc(10ch + 2rem)" }}
        >
          <span className="truncate">{moreLabel}</span>
        </button>

        {menuOpen && overflowTabs.length > 0 && (
          <ul
            ref={menuRef}
            role="menu"
            id={menuId}
            className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-md border border-white/10 bg-ub-dark shadow-lg"
          >
            {overflowTabs.map((tab, index) => {
              const isActive = tab.id === active;

              return (
                <li key={tab.id} role="none">
                  <button
                    ref={(element) => setMenuItemRef(tab.id, element)}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isActive}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm focus:outline-none focus-visible:bg-ub-orange/20 focus-visible:text-white ${
                      isActive ? "bg-ub-orange/20 text-white" : "text-ubt-grey hover:bg-ub-cool-grey/40 hover:text-white"
                    }`}
                    onClick={() => handleOverflowSelection(tab.id)}
                    onKeyDown={(event) => handleMenuItemKeyDown(event, index)}
                  >
                    <span className="truncate">{tab.label}</span>
                    {isActive && <span aria-hidden="true">✓</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

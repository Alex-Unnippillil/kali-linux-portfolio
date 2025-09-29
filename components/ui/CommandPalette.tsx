"use client";

import Image from "next/image";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { THEME_UNLOCKS } from "../../utils/theme";
import { useSettings } from "../../hooks/useSettings";

type AppMeta = {
  id: string;
  title: string;
  icon?: string;
  disabled?: boolean;
};

type WindowMeta = {
  id: string;
  title: string;
  icon?: string;
  minimized?: boolean;
};

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  apps: AppMeta[];
  onOpenApp: (id: string) => void;
  windows: WindowMeta[];
  onFocusWindow: (id: string) => void;
};

type PaletteItem = {
  id: string;
  domId: string;
  label: string;
  section: string;
  description?: string;
  icon?: string;
  keywords: string[];
  onSelect: () => void;
  disabled?: boolean;
};

const SECTION_ORDER: Record<string, number> = {
  "Quick Actions": 0,
  "Open Windows": 1,
  Appearance: 2,
  Applications: 3,
};

const normalizeIcon = (icon?: string): string | undefined => {
  if (!icon) return icon;
  return icon.startsWith("./") ? icon.replace("./", "/") : icon;
};

export default function CommandPalette({
  open,
  onClose,
  apps,
  onOpenApp,
  windows,
  onFocusWindow,
}: CommandPaletteProps) {
  const { theme, setTheme } = useSettings();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    document.body.classList.add("command-palette-open");
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKey);
      document.body.classList.remove("command-palette-open");
    };
  }, [open, onClose]);

  const themeOptions = useMemo(() => {
    const themeIds = Object.keys(THEME_UNLOCKS);
    return themeIds.map((id) => {
      const isActive = theme === id;
      const label =
        id === "default"
          ? "Switch to Light theme"
          : `Switch to ${id.charAt(0).toUpperCase()}${id.slice(1)} theme`;
      return {
        id,
        label,
        isActive,
      };
    });
  }, [theme]);

  const items = useMemo<PaletteItem[]>(() => {
    const appItems: PaletteItem[] = apps
      .filter((app) => !app.disabled)
      .map((app, index) => ({
        id: `app:${app.id}`,
        domId: `command-item-app-${index}`,
        label: app.title,
        section: "Applications",
        description: "Open application",
        icon: normalizeIcon(app.icon),
        keywords: [app.id.toLowerCase(), app.title.toLowerCase()],
        onSelect: () => onOpenApp(app.id),
      }));

    const windowItems: PaletteItem[] = windows.map((windowMeta, index) => ({
      id: `window:${windowMeta.id}`,
      domId: `command-item-window-${index}`,
      label: windowMeta.title,
      section: "Open Windows",
      description: windowMeta.minimized
        ? "Restore window"
        : "Focus window",
      icon: normalizeIcon(windowMeta.icon),
      keywords: [windowMeta.id.toLowerCase(), windowMeta.title.toLowerCase()],
      onSelect: () => onFocusWindow(windowMeta.id),
    }));

    const appearanceItems: PaletteItem[] = themeOptions.map((option, index) => ({
      id: `theme:${option.id}`,
      domId: `command-item-theme-${index}`,
      label: option.label,
      section: "Appearance",
      description: option.isActive ? "Theme currently active" : "Apply theme",
      keywords: [option.id.toLowerCase(), "theme", "appearance"],
      disabled: option.isActive,
      onSelect: () => {
        if (!option.isActive) {
          setTheme(option.id);
        }
      },
    }));

    const quickActions: PaletteItem[] = [
      {
        id: "action:settings",
        domId: "command-item-action-settings",
        label: "Open Settings",
        section: "Quick Actions",
        description: "Adjust desktop preferences",
        icon: normalizeIcon(
          apps.find((app) => app.id === "settings")?.icon ??
            "/themes/Yaru/apps/gnome-control-center.png"
        ),
        keywords: ["settings", "preferences", "control"],
        onSelect: () => onOpenApp("settings"),
      },
    ];

    const combined = [...quickActions, ...windowItems, ...appearanceItems, ...appItems];

    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) {
      return combined.sort((a, b) => {
        const sectionDiff =
          (SECTION_ORDER[a.section] ?? Number.MAX_SAFE_INTEGER) -
          (SECTION_ORDER[b.section] ?? Number.MAX_SAFE_INTEGER);
        if (sectionDiff !== 0) return sectionDiff;
        return a.label.localeCompare(b.label);
      });
    }

    return combined
      .filter((item) => {
        if (item.label.toLowerCase().includes(trimmedQuery)) return true;
        return item.keywords.some((keyword) => keyword.includes(trimmedQuery));
      })
      .sort((a, b) => {
        const labelCompare = a.label.localeCompare(b.label);
        if (labelCompare !== 0) return labelCompare;
        return a.section.localeCompare(b.section);
      })
      .map((item, index) => ({
        ...item,
        domId: `command-item-filtered-${index}`,
      }));
  }, [apps, onFocusWindow, onOpenApp, query, setTheme, themeOptions, windows]);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(items.length ? 0 : -1);
  }, [items.length, open, query]);

  useEffect(() => {
    if (!open) return;
    const activeDomId = items[activeIndex]?.domId;
    if (!activeDomId) return;
    const activeItem = listRef.current?.querySelector<HTMLElement>(
      `#${activeDomId}`
    );
    activeItem?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, items, open]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (!items.length) {
        if (event.key === "Enter") {
          event.preventDefault();
        }
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => {
          const next = prev + 1;
          return next >= items.length ? 0 : next;
        });
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) => {
          const next = prev - 1;
          return next < 0 ? items.length - 1 : next;
        });
      } else if (event.key === "Enter") {
        event.preventDefault();
        const item = items[activeIndex];
        if (item && !item.disabled) {
          item.onSelect();
          onClose();
        }
      }
    },
    [activeIndex, items, onClose]
  );

  if (!open) return null;

  const activeId = items[activeIndex]?.domId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-palette-title"
        className="mt-20 w-full max-w-2xl rounded-xl border border-white/10 bg-slate-900/95 text-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="border-b border-white/10 px-6 py-4">
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-slate-300">
            <span id="command-palette-title">Command Palette</span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[0.65rem] font-semibold text-white">
                Ctrl
              </kbd>
              <span>+</span>
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[0.65rem] font-semibold text-white">
                K
              </kbd>
            </span>
          </div>
          <label className="sr-only" htmlFor="command-palette-input">
            Search for applications or actions
          </label>
          <input
            id="command-palette-input"
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            type="text"
            placeholder="Search apps, windows, or actions"
            aria-label="Search for applications or actions"
            className="w-full rounded-md border border-white/10 bg-slate-800/70 px-3 py-2 text-base text-white placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/60"
          />
        </div>
        <ul
          role="listbox"
          aria-activedescendant={activeId}
          aria-labelledby="command-palette-title"
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto px-2 py-3"
        >
          {items.length === 0 ? (
            <li
              className="px-4 py-3 text-sm text-slate-300"
              role="option"
              aria-selected="false"
              aria-disabled="true"
            >
              No results found.
            </li>
          ) : (
            items.map((item, index) => {
              const isActive = index === activeIndex;
              return (
                <li
                  key={item.id}
                  id={item.domId}
                  role="option"
                  aria-selected={isActive}
                  aria-disabled={item.disabled ? "true" : undefined}
                  className={`group relative flex cursor-pointer items-center gap-3 rounded-md px-4 py-3 text-sm transition-colors ${
                    isActive ? "bg-sky-500/20" : "hover:bg-white/5"
                  } ${item.disabled ? "opacity-60" : ""}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    if (item.disabled) return;
                    item.onSelect();
                    onClose();
                  }}
                >
                  {item.icon ? (
                    <Image
                      src={item.icon}
                      alt=""
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-md object-contain"
                    />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-800 text-xs font-semibold uppercase text-slate-300">
                      {item.section[0]}
                    </span>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{item.label}</span>
                    <span className="truncate text-xs text-slate-300">
                      {item.section}
                      {item.description ? ` • ${item.description}` : ""}
                    </span>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}

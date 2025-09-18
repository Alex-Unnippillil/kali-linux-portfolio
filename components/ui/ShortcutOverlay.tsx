"use client";

import { Fragment, useEffect, useId, useRef } from "react";
import shortcutsData from "../../data/shortcuts.json";

interface ShortcutConfig {
  id: string;
  category: string;
  keys: string;
  description: string;
  note?: string;
}

interface ShortcutOverlayProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = shortcutsData.shortcuts as ShortcutConfig[];

const groupedShortcuts = shortcuts.reduce<
  { title: string; shortcuts: ShortcutConfig[] }[]
>((acc, shortcut) => {
  const existing = acc.find((entry) => entry.title === shortcut.category);
  if (existing) {
    existing.shortcuts.push(shortcut);
  } else {
    acc.push({ title: shortcut.category, shortcuts: [shortcut] });
  }
  return acc;
}, []);

const formatKey = (part: string) => {
  const normalized = part.trim();
  switch (normalized.toLowerCase()) {
    case "arrow left":
      return "\u2190";
    case "arrow right":
      return "\u2192";
    case "arrow up":
      return "\u2191";
    case "arrow down":
      return "\u2193";
    default:
      return normalized;
  }
};

const keyClasses =
  "inline-flex min-w-[2.5rem] justify-center rounded-sm border border-[#d0c877] bg-[#fffce6] px-2 py-0.5 text-xs font-semibold text-[#3f3a28] shadow-inner";

const joinerClasses = "text-[11px] font-semibold text-[#8c8353]";

const ShortcutOverlay = ({ open, onClose }: ShortcutOverlayProps) => {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus();
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-transparent pt-20"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="pointer-events-auto relative w-[min(90vw,560px)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="absolute left-16 -top-2 h-4 w-4 rotate-45 border-l border-t border-[#d0c877] bg-[#fcf7c2] shadow-[-2px_-2px_4px_rgba(0,0,0,0.05)]"
          aria-hidden="true"
        />
        <div className="overflow-hidden rounded-md border border-[#d0c877] bg-[#fcf7c2] text-[#2f2b1f] shadow-[0_20px_45px_rgba(0,0,0,0.45)]">
          <div className="flex items-center justify-between border-b border-[#e5da9d] px-4 py-2">
            <h2 id={titleId} className="text-sm font-semibold uppercase tracking-[0.15em] text-[#5c5230]">
              Keyboard Shortcuts
            </h2>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="rounded px-2 py-1 text-xs font-semibold text-[#5c5230] transition hover:text-[#2f2b1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d0c877] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fcf7c2]"
            >
              Close
            </button>
          </div>
          <div className="space-y-4 px-4 py-3 text-sm">
            {groupedShortcuts.map((group) => (
              <section key={group.title}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6d6336]">
                  {group.title}
                </h3>
                <ul className="space-y-2">
                  {group.shortcuts.map((shortcut) => {
                    const parts = shortcut.keys.split("+");
                    return (
                      <li
                        key={shortcut.id}
                        className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-1"
                      >
                        <div className="flex flex-wrap items-center gap-1">
                          {parts.map((part, index) => (
                            <Fragment key={`${shortcut.id}-${part}-${index}`}>
                              <kbd className={keyClasses}>{formatKey(part)}</kbd>
                              {index < parts.length - 1 && <span className={joinerClasses}>+</span>}
                            </Fragment>
                          ))}
                        </div>
                        <div className="text-sm leading-snug">
                          <p>{shortcut.description}</p>
                          {shortcut.note && (
                            <p className="mt-1 text-xs text-[#6d6336]">{shortcut.note}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShortcutOverlay;

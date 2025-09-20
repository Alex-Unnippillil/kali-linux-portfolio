"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useClickOutside } from "../../hooks/useClickOutside";
import {
  PASTE_MODE_METADATA,
  type PasteMode,
} from "../../utils/clipboard/sanitize";

interface PasteOptionsMenuProps {
  anchorRef: React.RefObject<HTMLElement>;
  open: boolean;
  defaultMode: PasteMode;
  onSelect: (mode: PasteMode) => void;
  onClose: () => void;
  onSetDefault?: (mode: PasteMode) => void;
}

const OFFSET = 8;

const PasteOptionsMenu: React.FC<PasteOptionsMenuProps> = ({
  anchorRef,
  open,
  defaultMode,
  onSelect,
  onClose,
  onSetDefault,
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const options = useMemo(() => Object.entries(PASTE_MODE_METADATA) as Array<[
    PasteMode,
    { label: string; description: string },
  ]>, []);

  useClickOutside([menuRef, anchorRef], () => {
    if (open) onClose();
  }, { enabled: open });

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      setCoords({ top: rect.bottom + OFFSET, left: rect.left });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, anchorRef]);

  if (!open || typeof document === "undefined") return null;

  const content = (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Paste options"
      className="z-50 w-72 rounded-md border border-gray-700 bg-gray-900 text-sm text-white shadow-xl"
      style={{ position: "fixed", top: coords.top, left: coords.left }}
    >
      <div className="border-b border-gray-700 px-3 py-2 text-xs uppercase tracking-wide text-gray-300">
        Paste options
      </div>
      <ul className="py-1">
        {options.map(([mode, meta]) => (
          <li key={mode} className="px-1 py-1">
            <button
              type="button"
              role="menuitemradio"
              aria-checked={mode === defaultMode}
              onClick={() => {
                onSelect(mode);
                onClose();
              }}
              className={`w-full rounded px-3 py-2 text-left transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-ub-orange ${
                mode === defaultMode ? "bg-gray-800/70" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{meta.label}</span>
                {mode === defaultMode && (
                  <span className="text-[10px] uppercase text-ubt-grey">Default</span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-300">{meta.description}</p>
            </button>
            {onSetDefault && mode !== defaultMode && (
              <button
                type="button"
                className="mt-1 ml-3 text-xs text-ub-orange hover:underline"
                onClick={(event) => {
                  event.stopPropagation();
                  onSetDefault(mode);
                }}
              >
                Make default
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );

  return createPortal(content, document.body);
};

export default PasteOptionsMenu;

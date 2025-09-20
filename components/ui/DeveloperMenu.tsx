"use client";

import { useEffect, useRef, useState } from 'react';
import { useDeveloperTools } from '../../hooks/useDeveloperTools';
import { DEVTOOLS_IGNORE_ATTR } from '../../utils/colorAudit';

const DeveloperMenu = (): JSX.Element => {
  const { tools, setTool } = useDeveloperTools();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef.current || !buttonRef.current) return;
      if (
        !menuRef.current.contains(target) &&
        !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const ignoreAttr = { [DEVTOOLS_IGNORE_ATTR]: 'true' } as Record<string, string>;

  return (
    <div className="relative" data-devtools-menu="true" {...ignoreAttr}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className="pl-3 pr-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="developer-menu"
      >
        Dev Tools
      </button>
      {open && (
        <div
          ref={menuRef}
          id="developer-menu"
          role="menu"
          className="absolute right-0 mt-1 z-50 w-64 bg-ub-grey text-white border border-black/60 rounded shadow-lg"
          {...ignoreAttr}
        >
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-semibold">Developer Utilities</h3>
            <p className="mt-1 text-xs text-ubt-warm-grey">
              Experimental overlays to help audit the desktop shell.
            </p>
          </div>
          <label
            className="flex items-start gap-2 px-4 py-3 text-sm hover:bg-white/5 cursor-pointer"
            role="menuitemcheckbox"
            aria-checked={tools.contrastAuditor}
            {...ignoreAttr}
          >
            <input
              type="checkbox"
              className="mt-0.5"
              checked={tools.contrastAuditor}
              onChange={event => setTool('contrastAuditor', event.target.checked)}
            />
            <span>
              <span className="block font-medium">Contrast auditor</span>
              <span className="block text-xs text-ubt-warm-grey">
                Highlights text nodes with insufficient WCAG 2.1 contrast ratios.
              </span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
};

export default DeveloperMenu;

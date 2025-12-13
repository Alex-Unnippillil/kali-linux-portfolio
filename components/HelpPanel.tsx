"use client";

import { useEffect, useId, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

interface HelpPanelProps {
  appId: string;
  docPath?: string;
}

export default function HelpPanel({ appId, docPath }: HelpPanelProps) {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState("<p>Loading...</p>");
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const path = docPath || `/docs/apps/${appId}.md`;
    fetch(path)
      .then((res) => (res.ok ? res.text() : ""))
      .then((md) => {
        if (!md) {
          setHtml("<p>No help available.</p>");
          return;
        }
        const rendered = DOMPurify.sanitize(marked.parse(md) as string);
        setHtml(rendered);
      })
      .catch(() => setHtml("<p>No help available.</p>"));
  }, [open, appId, docPath]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (isInput) return;
      const isHelpToggle =
        (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "/" || e.key === "?");
      if (isHelpToggle) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const focusableSelector =
      'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      const dialogNode = dialogRef.current;
      const focusables = dialogNode
        ? Array.from(dialogNode.querySelectorAll<HTMLElement>(focusableSelector)).filter(
            (el) => el.tabIndex !== -1
          )
        : [];

      if (focusables.length === 0) {
        dialogNode?.focus();
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (!active || active === first || !dialogNode?.contains(active)) {
          last.focus();
          event.preventDefault();
        }
        return;
      }

      if (!active || active === last || !dialogNode?.contains(active)) {
        first.focus();
        event.preventDefault();
      }
    };

    const focusTarget = () => {
      if (closeButtonRef.current) {
        closeButtonRef.current.focus();
        return;
      }
      dialogRef.current?.focus();
    };

    focusTarget();
    document.addEventListener("keydown", trapFocus);

    return () => {
      document.removeEventListener("keydown", trapFocus);
    };
  }, [open]);

  const toggle = () => setOpen((o) => !o);

  return (
    <>
      <button
        type="button"
        aria-label="Help"
        aria-expanded={open}
        onClick={toggle}
        className="fixed top-2 right-2 z-40 bg-gray-700 text-white rounded-full w-8 h-8 flex items-center justify-center focus:outline-none focus:ring"
      >
        ?
      </button>
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-end p-4"
          onClick={toggle}
        >
          <div
            className="bg-white text-black p-4 rounded max-w-md w-full h-full overflow-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            ref={dialogRef}
            tabIndex={-1}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 id={titleId} className="text-lg font-semibold">
                Help
              </h2>
              <button
                type="button"
                onClick={toggle}
                className="text-sm underline"
                ref={closeButtonRef}
              >
                Close
              </button>
            </div>
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      )}
    </>
  );
}


"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
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
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);
  const safeAppId = appId ? appId.replace(/[^a-zA-Z0-9_-]/g, '-') : 'app';
  const titleId = `${safeAppId}-help-title`;
  const contentId = `${safeAppId}-help-content`;

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
    if (!open) return;
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusSelector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const getFocusableElements = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(focusSelector)).filter(
        (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
      );

    const initialFocus = closeButtonRef.current || getFocusableElements()[0] || dialog;
    initialFocus.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) {
          event.preventDefault();
          return;
        }
        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (event.shiftKey) {
          if (active === first || !dialog.contains(active)) {
            event.preventDefault();
            last.focus();
          }
        } else if (active === last) {
          event.preventDefault();
          first.focus();
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };

    dialog.addEventListener('keydown', handleKeyDown);
    return () => {
      dialog.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, close]);

  useEffect(() => {
    if (open) return;
    const previouslyFocused = lastFocusedRef.current;
    if (previouslyFocused) {
      lastFocusedRef.current = null;
      previouslyFocused.focus({ preventScroll: true });
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;
      if (isInput) return;
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggle]);

  return (
    <>
      <button
        type="button"
        aria-label="Help"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? contentId : undefined}
        onClick={toggle}
        className="fixed top-2 right-2 z-40 bg-gray-700 text-white rounded-full w-8 h-8 flex items-center justify-center focus:outline-none focus:ring"
      >
        ?
      </button>
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-end p-4"
          onClick={close}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={contentId}
            tabIndex={-1}
            className="bg-white text-black p-4 rounded max-w-md w-full h-full overflow-auto shadow-xl focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <h2 id={titleId} className="text-xl font-semibold">
                {appId} Help
              </h2>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={close}
                className="ml-auto rounded bg-gray-200 px-3 py-1 text-sm font-medium text-gray-900 hover:bg-gray-300 focus:outline-none focus:ring"
              >
                Close
              </button>
            </div>
            <section className="mt-4" aria-label="Help overlay controls">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
                Overlay controls
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-gray-700">
                <li>
                  <kbd className="rounded border border-gray-400 bg-gray-100 px-1 text-xs font-semibold text-gray-900">
                    ?
                  </kbd>{' '}
                  Toggle this help overlay
                </li>
                <li>
                  <kbd className="rounded border border-gray-400 bg-gray-100 px-1 text-xs font-semibold text-gray-900">
                    Esc
                  </kbd>{' '}
                  Close the overlay
                </li>
                <li>
                  <kbd className="rounded border border-gray-400 bg-gray-100 px-1 text-xs font-semibold text-gray-900">
                    Tab
                  </kbd>{' '}
                  and{' '}
                  <kbd className="rounded border border-gray-400 bg-gray-100 px-1 text-xs font-semibold text-gray-900">
                    Shift
                  </kbd>
                  +
                  <kbd className="ml-1 rounded border border-gray-400 bg-gray-100 px-1 text-xs font-semibold text-gray-900">
                    Tab
                  </kbd>{' '}
                  Move between interactive elements
                </li>
              </ul>
            </section>
            <div id={contentId} className="mt-4 text-sm" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      )}
    </>
  );
}


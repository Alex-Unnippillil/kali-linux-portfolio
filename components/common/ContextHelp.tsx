'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import type {
  ContextHelpRegistry,
  HelpContext,
  ResolvedContextHelpCard,
} from '../../modules/context-help/registry';
import contextHelpRegistry from '../../modules/context-help/registry';

export type ContextHelpProps = {
  registry?: ContextHelpRegistry;
  context?: Partial<HelpContext>;
  storageKey?: string;
};

const DEFAULT_STORAGE_KEY = 'context-help:dismissed';

const isEditableElement = (element: EventTarget | null): boolean => {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  const tag = element.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    element.isContentEditable ||
    (element.getAttribute('role') === 'textbox' && element.tabIndex >= 0)
  );
};

const deriveAppId = (path: string): string | undefined => {
  const clean = path.split('?')[0];
  const segments = clean.split('/').filter(Boolean);
  if (segments[0] === 'apps' && segments[1]) {
    return segments[1];
  }
  return undefined;
};

const ContextHelp: React.FC<ContextHelpProps> = ({
  registry = contextHelpRegistry,
  context,
  storageKey = DEFAULT_STORAGE_KEY,
}) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const lastActiveElementRef = useRef<Element | null>(null);

  const helpContext = useMemo<HelpContext>(() => {
    const route = context?.route ?? router.asPath?.split('?')[0] ?? router.pathname ?? '/';
    return {
      route,
      appId: context?.appId ?? deriveAppId(route),
      locale: context?.locale ?? router.locale ?? 'en',
      state: context?.state,
    };
  }, [context?.appId, context?.locale, context?.route, context?.state, router.asPath, router.locale, router.pathname]);

  const allCards = useMemo<ResolvedContextHelpCard[]>(() => {
    return registry.resolve(helpContext);
  }, [registry, helpContext]);

  const visibleCards = useMemo(
    () => allCards.filter((card) => !dismissed.includes(card.id)),
    [allCards, dismissed]
  );

  const closeHelp = useCallback(() => {
    setOpen(false);
    const lastActive = lastActiveElementRef.current as HTMLElement | null;
    if (lastActive && typeof lastActive.focus === 'function') {
      lastActive.focus();
    }
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setDismissed((current) => {
      if (current.includes(id)) return current;
      return [...current, id];
    });
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isEditableElement(event.target)) return;
      if (event.key === 'F1') {
        if (!visibleCards.length && !allCards.length) return;
        event.preventDefault();
        lastActiveElementRef.current = document.activeElement;
        setOpen(true);
      }
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        closeHelp();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeHelp, open, visibleCards.length, allCards.length]);

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      overlayRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(dismissed));
    } catch {
      // ignore storage errors
    }
  }, [dismissed, storageKey]);

  if (!visibleCards.length && !open) {
    return null;
  }

  return (
    <>
      {open && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/80 p-6 text-slate-100"
          role="dialog"
          aria-modal="true"
          aria-labelledby="context-help-title"
          tabIndex={-1}
        >
          <div className="w-full max-w-xl space-y-4" role="document">
            <div className="flex items-center justify-between">
              <h2 id="context-help-title" className="text-xl font-semibold">
                Contextual help
              </h2>
              <button
                type="button"
                onClick={closeHelp}
                className="rounded px-3 py-1 text-sm font-medium text-slate-100 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                Close
              </button>
            </div>
            <div className="space-y-3">
              {visibleCards.length === 0 ? (
                <p role="status" aria-live="polite">
                  All available help cards for this screen were dismissed.
                </p>
              ) : (
                visibleCards.map((card) => {
                  const headingId = `${card.id}-title`;
                  return (
                    <article
                      key={card.id}
                      aria-labelledby={headingId}
                      className="rounded-md bg-slate-800/80 p-4 shadow-lg focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-sky-400"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 id={headingId} className="text-lg font-semibold">
                            {card.title}
                          </h3>
                          <p className="mt-1 text-sm text-slate-200">{card.body}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDismiss(card.id)}
                          className="rounded px-2 py-1 text-xs font-medium uppercase tracking-wide text-slate-200 hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                          aria-label="Dismiss this help card"
                        >
                          Dismiss
                        </button>
                      </div>
                      {card.actions.length > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Helpful actions">
                          {card.actions.map((action) => (
                            <li key={action.label}>
                              {action.href ? (
                                <a
                                  href={action.href}
                                  target={action.external ? '_blank' : undefined}
                                  rel={action.external ? 'noreferrer' : undefined}
                                  className="inline-flex items-center rounded bg-sky-600 px-3 py-1 text-sm font-semibold text-white hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                                >
                                  {action.label}
                                  {action.external && (
                                    <span className="ml-1 text-xs" aria-hidden="true">
                                      ↗
                                    </span>
                                  )}
                                </a>
                              ) : (
                                <span className="inline-flex items-center rounded bg-slate-700 px-3 py-1 text-sm font-semibold text-white">
                                  {action.label}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ContextHelp;

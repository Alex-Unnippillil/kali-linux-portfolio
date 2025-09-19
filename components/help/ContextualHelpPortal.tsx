'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { helpArticles } from '../../apps.config';

interface HelpArticleMeta {
  appId: string;
  articleId: string;
  title: string;
  docPath: string;
}

type HelpArticlesMap = Record<string, HelpArticleMeta>;

const articles = helpArticles as unknown as HelpArticlesMap;
const DEFAULT_HTML = '<p>No help available for this app.</p>';

const toHtml = async (markdown: string): Promise<string> => {
  const raw = await marked.parse(markdown);
  return DOMPurify.sanitize(typeof raw === 'string' ? raw : String(raw));
};

const getFallbackArticle = (appId: string): HelpArticleMeta => ({
  appId,
  articleId: appId,
  title: 'Help',
  docPath: '',
});

const isFocusableElement = (el: Element | null): el is HTMLElement => {
  return !!el && 'focus' in el && typeof (el as HTMLElement).focus === 'function';
};

const ContextualHelpPortal = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [article, setArticle] = useState<HelpArticleMeta | null>(null);
  const [content, setContent] = useState(DEFAULT_HTML);
  const [loading, setLoading] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const lastOpenedAppIdRef = useRef<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      const previous = lastFocusedRef.current;
      const fallbackId = lastOpenedAppIdRef.current;
      lastFocusedRef.current = null;

      const focusFallback = () => {
        if (!fallbackId) return;
        const fallbackEl = document.getElementById(fallbackId);
        if (fallbackEl && isFocusableElement(fallbackEl)) {
          fallbackEl.focus();
        }
      };

      if (previous && previous.isConnected) {
        requestAnimationFrame(() => {
          previous.focus();
        });
      } else if (fallbackId) {
        requestAnimationFrame(focusFallback);
      }
      return;
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, close]);

  useEffect(() => {
    if (!isMounted) return undefined;

    const handleOpen = (event: Event) => {
      const customEvent = event as CustomEvent<{ appId?: string }>;
      const appId = customEvent.detail?.appId;
      if (!appId) {
        return;
      }

      lastOpenedAppIdRef.current = appId;

      const activeElement = document.activeElement;
      if (isFocusableElement(activeElement)) {
        lastFocusedRef.current = activeElement;
      } else {
        const fallback = document.getElementById(appId);
        lastFocusedRef.current = fallback && isFocusableElement(fallback) ? fallback : null;
      }

      const meta = articles[appId] || getFallbackArticle(appId);
      setArticle(meta);
      setContent(DEFAULT_HTML);
      setLoading(false);
      setIsOpen(true);
    };

    window.addEventListener('open-help', handleOpen as EventListener);
    return () => window.removeEventListener('open-help', handleOpen as EventListener);
  }, [isMounted]);

  useEffect(() => {
    if (!isOpen) return undefined;
    if (!article?.docPath) {
      setContent(DEFAULT_HTML);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    const load = async () => {
      try {
        const response = await fetch(article.docPath);
        const markdown = response.ok ? await response.text() : '';
        if (cancelled) return;
        if (!markdown) {
          setContent(DEFAULT_HTML);
          return;
        }
        const html = await toHtml(markdown);
        if (!cancelled) {
          setContent(html);
        }
      } catch {
        if (!cancelled) {
          setContent(DEFAULT_HTML);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [isOpen, article]);

  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const rendered = useMemo(() => {
    if (loading) {
      return '<p>Loading help…</p>';
    }
    return content || DEFAULT_HTML;
  }, [content, loading]);

  if (!isMounted) {
    return null;
  }

  return createPortal(
    isOpen ? (
      <div
        data-testid="contextual-help"
        className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
        role="presentation"
        onClick={close}
      >
        <div className="absolute inset-0 bg-black/70" aria-hidden="true" />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="contextual-help-title"
          className="relative z-10 w-full max-w-3xl overflow-hidden rounded-lg bg-slate-900 text-slate-100 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
            <h2 id="contextual-help-title" className="text-lg font-semibold">
              {(article && article.title) || 'Help'}
            </h2>
            <button
              type="button"
              ref={closeButtonRef}
              data-testid="contextual-help-close"
              onClick={close}
              className="rounded bg-blue-500 px-3 py-1 text-sm font-medium text-white hover:bg-blue-400 focus:outline-none focus:ring"
            >
              Back to app
            </button>
          </div>
          <div
            data-testid="contextual-help-content"
            className="max-h-[70vh] overflow-y-auto px-5 pb-6 pt-4 text-left text-sm leading-6"
            dangerouslySetInnerHTML={{ __html: rendered }}
          />
        </div>
      </div>
    ) : null,
    document.body
  );
};

export default ContextualHelpPortal;


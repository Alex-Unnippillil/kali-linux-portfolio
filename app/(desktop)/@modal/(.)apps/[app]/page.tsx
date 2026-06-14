'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentType, MouseEvent as ReactMouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/base/Modal';

type ModalPageProps = {
  params: {
    app: string;
  };
};

type LoadedComponent = ComponentType<Record<string, unknown>>;

type LoadedModule = {
  default?: LoadedComponent;
};

const formatTitle = (slug: string): string => {
  const segments = slug.split(/[-_]/).filter(Boolean);
  if (segments.length === 0) {
    return 'App';
  }
  return segments
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

const buildCandidates = (slug: string): string[] => {
  const candidates = new Set<string>();
  const variations = [slug, slug.toLowerCase(), slug.toUpperCase()];

  variations.forEach((variant) => {
    if (!variant) return;
    candidates.add(variant);
    candidates.add(variant.replace(/-/g, '_'));
    candidates.add(variant.replace(/_/g, '-'));
  });

  const capitalized = slug.charAt(0).toUpperCase() + slug.slice(1);
  candidates.add(capitalized);
  candidates.add(capitalized.replace(/-/g, '_'));
  candidates.add(capitalized.replace(/_/g, '-'));

  return Array.from(candidates).filter(Boolean);
};

export default function AppModalPage({ params }: ModalPageProps) {
  const router = useRouter();
  const { app } = params;
  const [AppComponent, setAppComponent] = useState<LoadedComponent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  const canGoBackRef = useRef(false);

  useEffect(() => {
    canGoBackRef.current =
      typeof window !== 'undefined' &&
      Boolean(window.history?.state && window.history.state.idx > 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setAppComponent(null);
    setOpen(true);

    const loadModule = async () => {
      const candidates = buildCandidates(app);
      const errors: unknown[] = [];

      for (const candidate of candidates) {
        try {
          const mod = (await import(`@/pages/apps/${candidate}`)) as LoadedModule;
          if (cancelled) {
            return;
          }
          if (mod?.default) {
            setAppComponent(() => mod.default as LoadedComponent);
            setLoading(false);
            return;
          }
        } catch (error_) {
          errors.push(error_);
        }

        try {
          const mod = (await import(`@/apps/${candidate}`)) as LoadedModule;
          if (cancelled) {
            return;
          }
          if (mod?.default) {
            setAppComponent(() => mod.default as LoadedComponent);
            setLoading(false);
            return;
          }
        } catch (error_) {
          errors.push(error_);
        }
      }

      if (cancelled) {
        return;
      }

      const message = 'Unable to load this app.';
      setError(message);
      setLoading(false);
      if (errors.length > 0) {
        console.error(`Failed to load modal for app "${app}"`, errors[errors.length - 1]);
      }
    };

    loadModule().catch((error_) => {
      if (cancelled) {
        return;
      }
      console.error(`Failed to load modal for app "${app}"`, error_);
      setError('Unable to load this app.');
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [app]);

  const handleDismiss = useCallback(() => {
    setOpen(false);
    if (canGoBackRef.current) {
      router.back();
    } else {
      router.push('/apps');
    }
  }, [router]);

  const handleOverlayClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        handleDismiss();
      }
    },
    [handleDismiss],
  );

  return (
    <Modal isOpen={open} onClose={handleDismiss}>
      <div
        className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4"
        onClick={handleOverlayClick}
      >
        <div
          className="flex h-full w-full max-h-[min(90vh,56rem)] max-w-5xl flex-col overflow-hidden rounded-xl bg-slate-900 text-slate-100 shadow-2xl"
          role="document"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h2 className="text-lg font-semibold">{formatTitle(app)}</h2>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-md bg-slate-800 px-3 py-1 text-sm font-medium text-slate-100 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-auto bg-slate-900 p-4">
            {error ? (
              <p className="text-sm text-slate-300">{error}</p>
            ) : loading ? (
              <p className="text-sm text-slate-300">Loading…</p>
            ) : AppComponent ? (
              <AppComponent addFolder={() => {}} openApp={() => {}} />
            ) : null}
          </div>
        </div>
      </div>
    </Modal>
  );
}

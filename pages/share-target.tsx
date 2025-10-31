"use client";

import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import Toast from '../components/ui/Toast';

type ShareFile = { name: string; type: string };

type SharePayload = {
  title?: string;
  text?: string;
  url?: string;
  files: ShareFile[];
};

type StatusState =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'processing'
  | 'success'
  | 'error';

const CLIPBOARD_SHARE_QUEUE = 'clipboard-share-queue';
const STICKY_NOTES_SHARE_CACHE = 'sticky-notes-share-cache';

const parseFilesParam = (raw: string | null): ShareFile[] => {
  if (!raw) return [];
  const attempts = [raw];
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded && decoded !== raw) {
      attempts.push(decoded);
    }
  } catch {
    // ignore decode failures
  }
  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt);
      if (Array.isArray(parsed)) {
        const mapped = parsed
          .map((entry) => {
            if (!entry || typeof entry !== 'object') return null;
            const { name, type } = entry as Record<string, unknown>;
            if (typeof name !== 'string') return null;
            return {
              name,
              type: typeof type === 'string' && type ? type : 'unknown',
            };
          })
          .filter(Boolean) as ShareFile[];
        if (mapped.length) {
          return mapped;
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  return [];
};

const coerceString = (value: string | null | undefined): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const buildNoteContent = (payload: SharePayload | null): string => {
  if (!payload) return '';
  const segments: string[] = [];
  if (payload.text) segments.push(payload.text);
  if (payload.title && payload.title !== payload.text) {
    segments.push(payload.title);
  }
  if (payload.url && payload.url !== payload.text) {
    segments.push(payload.url);
  }
  if (payload.files.length) {
    segments.push(
      ...payload.files.map((file) => `File: ${file.name}${file.type ? ` (${file.type})` : ''}`)
    );
  }
  return segments.join('\n').trim();
};

const buildClipboardContent = (payload: SharePayload | null): string => {
  if (!payload) return '';
  if (payload.text) return payload.text.trim();
  if (payload.url) return payload.url.trim();
  if (payload.title) return payload.title.trim();
  if (payload.files.length) {
    return payload.files.map((file) => `${file.name} ${file.type}`.trim()).join('\n');
  }
  return '';
};

const persistShareForClipboard = (text: string) => {
  if (typeof window === 'undefined') return;
  try {
    const storage = window.sessionStorage;
    if (!storage) return;
    const raw = storage.getItem(CLIPBOARD_SHARE_QUEUE);
    const queue = raw ? JSON.parse(raw) : [];
    const normalized = Array.isArray(queue) ? queue : [];
    normalized.push({ text, created: Date.now() });
    storage.setItem(CLIPBOARD_SHARE_QUEUE, JSON.stringify(normalized));
  } catch (error) {
    console.warn('Failed to persist clipboard share payload', error);
  }
};

const persistShareForNotes = (text: string) => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage?.setItem(
      STICKY_NOTES_SHARE_CACHE,
      JSON.stringify({ text, created: Date.now() })
    );
  } catch (error) {
    console.warn('Failed to persist sticky notes share payload', error);
  }
};

const buildInputHubParams = (payload: SharePayload | null): URLSearchParams => {
  const params = new URLSearchParams();
  if (!payload) return params;
  if (payload.title) params.set('title', payload.title);
  if (payload.text) params.set('text', payload.text);
  if (payload.url) params.set('url', payload.url);
  if (payload.files.length) {
    try {
      params.set('files', JSON.stringify(payload.files));
    } catch {
      // ignore serialization failure
    }
  }
  return params;
};

export default function ShareTarget() {
  const router = useRouter();
  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [status, setStatus] = useState<{ state: StatusState; message: string }>(
    () => ({ state: 'loading', message: 'Preparing shared content…' })
  );
  const [processing, setProcessing] = useState<'notes' | 'clipboard' | 'input' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const shareDetails = useMemo(() => {
    if (!payload) return [] as { label: string; value: string }[];
    const details: { label: string; value: string }[] = [];
    if (payload.text) details.push({ label: 'Text', value: payload.text });
    if (payload.title) details.push({ label: 'Title', value: payload.title });
    if (payload.url) details.push({ label: 'URL', value: payload.url });
    if (payload.files.length) {
      payload.files.forEach((file, index) => {
        details.push({
          label: `File ${index + 1}`,
          value: `${file.name}${file.type ? ` • ${file.type}` : ''}`,
        });
      });
    }
    return details;
  }, [payload]);

  useEffect(() => {
    if (!router.isReady) return;

    const searchIndex = router.asPath.indexOf('?');
    const rawSearch = searchIndex >= 0 ? router.asPath.slice(searchIndex + 1) : '';
    const params = new URLSearchParams(rawSearch);
    const title = coerceString(params.get('title'));
    const text = coerceString(params.get('text'));
    const url = coerceString(params.get('url'));
    const filesFromQuery = parseFilesParam(params.get('files'));

    if (title || text || url || filesFromQuery.length) {
      setPayload((prev) => ({
        title: title ?? prev?.title,
        text: text ?? prev?.text,
        url: url ?? prev?.url,
        files: filesFromQuery.length ? filesFromQuery : prev?.files ?? [],
      }));
      setStatus({ state: 'ready', message: 'Share content captured. Choose a destination.' });
    } else {
      setStatus((prev) =>
        prev.state === 'ready'
          ? prev
          : { state: 'loading', message: 'Waiting for share data from the system…' }
      );
    }
  }, [router.asPath, router.isReady]);

  const attachLaunchQueue = useCallback(() => {
    if (typeof window === 'undefined') return;
    const { launchQueue } = window as any;
    if (!launchQueue || typeof launchQueue.setConsumer !== 'function') {
      return;
    }
    launchQueue.setConsumer(async (launchParams: any) => {
      try {
        const fileInfos: ShareFile[] = await Promise.all(
          (launchParams?.files ?? []).map(async (item: any) => {
            const file = await item.getFile();
            return { name: file.name, type: file.type || 'unknown' };
          })
        );

        if (fileInfos.length) {
          setPayload((prev) => ({
            title: prev?.title,
            text: prev?.text,
            url: prev?.url,
            files: fileInfos,
          }));
          setStatus({
            state: 'ready',
            message: 'Attached shared files. Choose where to send them.',
          });
        }
      } catch (error) {
        console.error('Failed to read shared files', error);
        setToastMessage('Unable to read shared files from the share sheet.');
        setStatus({ state: 'error', message: 'Reading shared files failed.' });
      }
    });
  }, []);

  useEffect(() => {
    attachLaunchQueue();
  }, [attachLaunchQueue]);

  const noteContent = useMemo(() => buildNoteContent(payload), [payload]);
  const clipboardContent = useMemo(() => buildClipboardContent(payload), [payload]);

  const handleNotes = useCallback(async () => {
    if (!noteContent) {
      setToastMessage('No share text available for Sticky Notes.');
      return;
    }
    setProcessing('notes');
    setStatus({ state: 'processing', message: 'Opening Sticky Notes…' });
    persistShareForNotes(noteContent);
    const params = new URLSearchParams();
    params.set('text', noteContent);
    try {
      await router.replace(`/apps/sticky_notes?${params.toString()}`);
      setToastMessage('Launching Sticky Notes with your shared content.');
      setStatus({ state: 'success', message: 'Sticky Notes opening…' });
    } catch (error) {
      console.error('Failed to route to Sticky Notes', error);
      setProcessing(null);
      setToastMessage('Unable to open Sticky Notes. Try again.');
      setStatus({ state: 'error', message: 'Sticky Notes hand-off failed.' });
    }
  }, [noteContent, router]);

  const handleClipboard = useCallback(async () => {
    if (!clipboardContent) {
      setToastMessage('No share text detected for the clipboard.');
      return;
    }
    setProcessing('clipboard');
    setStatus({ state: 'processing', message: 'Preparing Clipboard Manager…' });
    persistShareForClipboard(clipboardContent);
    let clipboardError: Error | null = null;
    try {
      const writer = navigator.clipboard?.writeText;
      if (writer) {
        await writer.call(navigator.clipboard, clipboardContent);
      } else {
        clipboardError = new Error('Clipboard API unavailable');
      }
    } catch (error: unknown) {
      clipboardError = error instanceof Error ? error : new Error('Clipboard write failed');
    }

    try {
      await router.replace('/apps/clipboard-manager');
      setStatus({ state: 'success', message: 'Clipboard Manager opening…' });
      if (clipboardError) {
        console.warn('Clipboard write fallback', clipboardError);
        setToastMessage('Clipboard write unavailable. Opening Clipboard Manager to review the share.');
      } else {
        setToastMessage('Copied to clipboard. Opening Clipboard Manager.');
      }
    } catch (error) {
      console.error('Failed to route to Clipboard Manager', error);
      setProcessing(null);
      setToastMessage('Unable to open Clipboard Manager. Try again.');
      setStatus({ state: 'error', message: 'Clipboard Manager hand-off failed.' });
    }
  }, [clipboardContent, router]);

  const handleInputHub = useCallback(async () => {
    const params = buildInputHubParams(payload);
    setProcessing('input');
    setStatus({ state: 'processing', message: 'Opening Input Hub…' });
    try {
      await router.replace(`/input-hub?${params.toString()}`);
      setToastMessage('Routing shared content to Input Hub.');
      setStatus({ state: 'success', message: 'Input Hub opening…' });
    } catch (error) {
      console.error('Failed to route to Input Hub', error);
      setProcessing(null);
      setToastMessage('Unable to open Input Hub. Try again.');
      setStatus({ state: 'error', message: 'Input Hub hand-off failed.' });
    }
  }, [payload, router]);

  const statusTone = useMemo(() => {
    switch (status.state) {
      case 'error':
        return 'text-red-300';
      case 'success':
        return 'text-green-300';
      case 'processing':
        return 'text-blue-200';
      default:
        return 'text-gray-300';
    }
  }, [status.state]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Share inbox</h1>
          <p className="text-base text-gray-300">
            Your device handed off new content. Choose where it should go, and we&apos;ll handle the
            rest.
          </p>
        </header>
        <section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
            Share details
          </h2>
          {shareDetails.length ? (
            <dl className="space-y-3 text-sm text-gray-200">
              {shareDetails.map((detail) => (
                <div key={`${detail.label}-${detail.value}`} className="space-y-1">
                  <dt className="text-xs uppercase tracking-wide text-gray-400">{detail.label}</dt>
                  <dd className="rounded-lg border border-white/10 bg-black/40 p-3">
                    <pre className="whitespace-pre-wrap break-words font-sans text-sm text-gray-100">
                      {detail.value}
                    </pre>
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-gray-300">Waiting for share content…</p>
          )}
        </section>
        <section className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
              Choose a destination
            </h2>
            <p
              role="status"
              aria-live="polite"
              className={`text-sm leading-6 ${statusTone}`}
            >
              {status.message}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={handleNotes}
              className="rounded-lg border border-blue-500/40 bg-blue-600/80 px-4 py-3 text-left text-sm font-semibold text-blue-50 shadow-lg transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!noteContent || processing !== null}
            >
              {processing === 'notes' ? 'Opening Sticky Notes…' : 'Send to Sticky Notes'}
            </button>
            <button
              type="button"
              onClick={handleClipboard}
              className="rounded-lg border border-teal-500/40 bg-teal-600/80 px-4 py-3 text-left text-sm font-semibold text-teal-50 shadow-lg transition hover:bg-teal-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!clipboardContent || processing !== null}
            >
              {processing === 'clipboard'
                ? 'Opening Clipboard Manager…'
                : 'Copy to Clipboard Manager'}
            </button>
            <button
              type="button"
              onClick={handleInputHub}
              className="rounded-lg border border-purple-500/40 bg-purple-600/80 px-4 py-3 text-left text-sm font-semibold text-purple-50 shadow-lg transition hover:bg-purple-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={processing !== null}
            >
              {processing === 'input' ? 'Opening Input Hub…' : 'Send to Input Hub'}
            </button>
          </div>
        </section>
      </div>
      {toastMessage ? (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      ) : null}
    </div>
  );
}

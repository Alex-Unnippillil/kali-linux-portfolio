"use client";

import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';

interface LaunchFileData {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
}

interface StoredSharePayload {
  title?: string;
  text?: string;
  url?: string;
  files?: LaunchFileData[];
  createdAt: number;
  source: 'share-target';
}

const STORAGE_PREFIX = 'share-target:payload:';

const buildStorageKey = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${STORAGE_PREFIX}${crypto.randomUUID()}`;
  }
  return `${STORAGE_PREFIX}${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`;
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

const buildNoteFromPayload = ({ title, text, url }: { title?: string; text?: string; url?: string }) => {
  const parts = [title, text, url].filter(Boolean);
  return parts.length ? parts.join('\n\n') : undefined;
};

const persistPayload = (payload: StoredSharePayload) => {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    throw new Error('sessionStorage unavailable');
  }
  const key = buildStorageKey();
  window.sessionStorage.setItem(key, JSON.stringify(payload));
  return key;
};

type FallbackCode = 'file-read' | 'processing-error' | 'unsupported';

export default function ShareTarget() {
  const router = useRouter();
  const [status, setStatus] = useState('Processing shared content…');
  const processedRef = useRef(false);

  useEffect(() => {
    if (!router.isReady || processedRef.current) return;
    processedRef.current = true;

    let cancelled = false;

    const title = typeof router.query.title === 'string' ? router.query.title : undefined;
    const text = typeof router.query.text === 'string' ? router.query.text : undefined;
    const url = typeof router.query.url === 'string' ? router.query.url : undefined;
    const preset = typeof router.query.preset === 'string' ? router.query.preset : undefined;

    const fallbackToInputHub = (code?: FallbackCode) => {
      if (cancelled) return;
      const params = new URLSearchParams();
      if (title) params.set('title', title);
      if (text) params.set('text', text);
      if (url) params.set('url', url);
      if (preset) params.set('preset', preset);
      if (code) params.set('shareError', code);
      const query = params.toString();
      router.replace(query ? `/input-hub?${query}` : '/input-hub').catch(() => {
        setStatus('Unable to redirect shared content.');
      });
    };

    const routeToStickyNotes = () => {
      const note = buildNoteFromPayload({ title, text, url });
      if (!note) {
        fallbackToInputHub('unsupported');
        return;
      }
      if (cancelled) return;
      setStatus('Opening Sticky Notes…');
      router
        .replace(`/apps/sticky_notes?text=${encodeURIComponent(note)}`)
        .catch(() => {
          setStatus('Unable to open Sticky Notes.');
        });
    };

    const processTextOnlyShare = () => {
      if (preset === 'contact') {
        fallbackToInputHub();
      } else {
        routeToStickyNotes();
      }
    };

    const handleFiles = async (handles: any[]) => {
      try {
        const files: LaunchFileData[] = [];
        for (const handle of handles) {
          const file = await handle.getFile();
          const dataUrl = await readFileAsDataUrl(file);
          files.push({
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl,
          });
        }
        if (!files.length) {
          processTextOnlyShare();
          return;
        }
        const key = persistPayload({
          title,
          text,
          url,
          files,
          createdAt: Date.now(),
          source: 'share-target',
        });
        if (cancelled) return;
        setStatus('Routing shared files to Evidence Vault…');
        router
          .replace(
            `/apps/evidence-vault?shareKey=${encodeURIComponent(key)}&source=share-target`
          )
          .catch(() => {
            setStatus('Unable to open Evidence Vault.');
          });
      } catch (error) {
        console.error('Failed to process shared files', error);
        fallbackToInputHub('file-read');
      }
    };

    if ('launchQueue' in window && (window as any).launchQueue?.setConsumer) {
      let consumed = false;
      (window as any).launchQueue.setConsumer((launchParams: any) => {
        consumed = true;
        if (!launchParams.files || launchParams.files.length === 0) {
          processTextOnlyShare();
          return;
        }
        void handleFiles(launchParams.files);
      });
      // Fallback in case setConsumer never fires (e.g., browsers without files)
      setTimeout(() => {
        if (!consumed) {
          processTextOnlyShare();
        }
      }, 0);
    } else {
      processTextOnlyShare();
    }

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <p role="status" className="p-4 text-center text-sm text-white">
      {status}
    </p>
  );
}

"use client";

import { useEffect, useState } from 'react';
import MarkdownContent from './content/Markdown';

interface HelpPanelProps {
  appId: string;
  docPath?: string;
}

type HelpPanelStatus = 'idle' | 'loading' | 'ready' | 'error';

export default function HelpPanel({ appId, docPath }: HelpPanelProps) {
  const [open, setOpen] = useState(false);
  const [documentState, setDocumentState] = useState<{ path: string; markdown: string } | null>(null);
  const [status, setStatus] = useState<HelpPanelStatus>('idle');

  const helpPath = docPath || `/docs/apps/${appId}.md`;

  useEffect(() => {
    if (!open) {
      return;
    }
    if (documentState && documentState.path === helpPath) {
      return;
    }
    let cancelled = false;
    setStatus('loading');
    fetch(helpPath)
      .then((res) => (res.ok ? res.text() : ''))
      .then((markdown) => {
        if (cancelled) return;
        if (!markdown) {
          setDocumentState(null);
          setStatus('error');
          return;
        }
        setDocumentState({ path: helpPath, markdown });
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setDocumentState(null);
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [open, helpPath, documentState]);

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
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggle = () => setOpen((o) => !o);

  const renderContent = () => {
    if (status === 'loading' || status === 'idle') {
      return <p>Loading…</p>;
    }
    if (status === 'error') {
      return <p>No help available.</p>;
    }
    if (status === 'ready' && documentState) {
      return <MarkdownContent source={documentState.markdown} className="text-base" />;
    }
    return null;
  };

  return (
    <>
      <button
        type="button"
        aria-label="Help"
        aria-expanded={open}
        onClick={toggle}
        className="fixed top-2 right-2 z-40 flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-white focus:outline-none focus:ring"
      >
        ?
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-end bg-black bg-opacity-50 p-4"
          onClick={toggle}
        >
          <div
            className="h-full w-full max-w-md overflow-auto rounded bg-white p-4 text-black"
            onClick={(e) => e.stopPropagation()}
          >
            {renderContent()}
          </div>
        </div>
      )}
    </>
  );
}

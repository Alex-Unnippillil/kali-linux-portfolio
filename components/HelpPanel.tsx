"use client";

import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { usePwaInstallPrompt } from '../hooks/usePwaInstallPrompt';

interface HelpPanelProps {
  appId: string;
  docPath?: string;
}

type InstallPromptResult = 'accepted' | 'dismissed' | 'unavailable';

export default function HelpPanel({ appId, docPath }: HelpPanelProps) {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState("<p>Loading...</p>");
  const { canInstall, promptInstall } = usePwaInstallPrompt();
  const [installStatus, setInstallStatus] = useState<InstallPromptResult | null>(null);
  const [isPrompting, setIsPrompting] = useState(false);

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
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!open) {
      setInstallStatus(null);
    }
  }, [open]);

  const toggle = () => setOpen((o) => !o);

  const handleInstall = async () => {
    if (!canInstall || isPrompting) return;
    setIsPrompting(true);
    const result = await promptInstall();
    setInstallStatus(result);
    setIsPrompting(false);
  };

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
          className="fixed inset-0 z-50 flex items-start justify-end bg-black/50 p-4"
          onClick={toggle}
        >
          <div
            className="flex h-full w-full max-w-md flex-col overflow-hidden rounded bg-white text-black shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between gap-2 border-b border-black/10 px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-700">Help</h2>
              <div className="flex items-center gap-2">
                {canInstall && (
                  <button
                    type="button"
                    onClick={handleInstall}
                    disabled={isPrompting}
                    className="rounded bg-gray-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPrompting ? 'Preparing…' : 'Install as App'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggle}
                  className="rounded px-2 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600 transition hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  Close
                </button>
              </div>
            </header>
            {installStatus && (
              <div className="border-b border-black/10 bg-gray-50 px-4 py-2 text-xs text-gray-700">
                {installStatus === 'accepted'
                  ? 'Installation requested. Look for the app in your launcher or home screen.'
                  : installStatus === 'dismissed'
                  ? 'Install prompt dismissed. You can reopen it from Settings when available again.'
                  : "Install prompt unavailable. Try your browser's install menu if the option persists."}
              </div>
            )}
            <div className="h-full overflow-auto px-4 py-4">
              <div dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}


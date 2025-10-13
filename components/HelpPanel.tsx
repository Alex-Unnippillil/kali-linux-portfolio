"use client";

import { useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

interface HelpPanelProps {
  appId: string;
  docPath?: string;
}

export type HelpEntry = {
  id: string;
  title: string;
  subtitle?: string;
  docPath: string;
  keywords?: string[];
  icon?: string;
};

export const HELP_ENTRIES: HelpEntry[] = [
  {
    id: 'terminal',
    title: 'Terminal Help',
    subtitle: 'Keyboard shortcuts and command list for the simulated shell.',
    docPath: '/docs/apps/terminal.md',
    keywords: ['shell', 'command line', 'history', 'keyboard', 'help'],
  },
];

export default function HelpPanel({ appId, docPath }: HelpPanelProps) {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState("<p>Loading...</p>");

  const helpEntry = useMemo(() => HELP_ENTRIES.find((entry) => entry.id === appId), [appId]);
  const resolvedDocPath = docPath || helpEntry?.docPath || `/docs/apps/${appId}.md`;

  useEffect(() => {
    if (!open) return;
    fetch(resolvedDocPath)
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
  }, [open, resolvedDocPath]);

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

  const toggle = () => setOpen((o) => !o);

  return (
    <>
      <button
        type="button"
        aria-label="Help"
        aria-expanded={open}
        aria-keyshortcuts="?"
        onClick={toggle}
        className="fixed top-2 right-2 z-40 bg-gray-700 text-white rounded-full w-8 h-8 flex items-center justify-center focus:outline-none focus:ring"
        title="Toggle help (?)"
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
          >
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      )}
    </>
  );
}


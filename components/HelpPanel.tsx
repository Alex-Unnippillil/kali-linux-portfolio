"use client";

import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

interface HelpPanelProps {
  appId: string;
  docPath?: string;
}

export default function HelpPanel({ appId, docPath }: HelpPanelProps) {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState("<p>Loading...</p>");

  useEffect(() => {
    if (!open) return;

    const defaultPath = `/docs/apps/${appId}.md`;
    const candidates = [
      docPath,
      appId === "terminal" ? "/docs/apps/terminal-kali.md" : undefined,
      defaultPath,
    ].filter(Boolean) as string[];

    const loadDoc = async () => {
      for (const path of candidates) {
        try {
          const res = await fetch(path);
          if (!res.ok) continue;
          const md = await res.text();
          if (!md) continue;
          const rendered = DOMPurify.sanitize(marked.parse(md) as string);
          setHtml(rendered);
          return;
        } catch (error) {
          // Try the next candidate.
        }
      }
      setHtml("<p>No help available.</p>");
    };

    loadDoc();
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
          >
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      )}
    </>
  );
}


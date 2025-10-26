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
  const panelId = `help-panel-${appId}`;

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

  const toggle = () => setOpen((o) => !o);

  return (
    <>
      <button
        type="button"
        aria-label="Help"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        className={`fixed top-2 right-2 z-40 flex h-10 w-10 items-center justify-center rounded-full
          bg-[var(--color-accent)] text-black shadow-lg transition hover:brightness-110
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]
          focus-visible:ring-offset-2 focus-visible:ring-offset-black/40`}
      >
        <img
          src="/themes/Kali/panel/emblem-system-symbolic.svg"
          alt=""
          aria-hidden="true"
          className="h-5 w-5"
        />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-end bg-black/50 p-4 backdrop-blur"
          onClick={toggle}
        >
          <div
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label="Help content"
            className={`h-full w-full max-w-md overflow-auto rounded-xl border
              border-[color-mix(in_srgb,var(--color-accent)_60%,transparent)]
              bg-[color-mix(in_srgb,var(--color-accent)_25%,transparent)] p-4 text-[var(--color-text)]
              shadow-2xl backdrop-blur-xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      )}
    </>
  );
}


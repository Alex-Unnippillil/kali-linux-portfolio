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
        onClick={toggle}
        className="fixed top-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gray-700 text-lg font-semibold text-white shadow-lg transition-transform focus:outline-none focus:ring focus:ring-offset-2 focus:ring-offset-gray-900 hover:scale-105"
      >
        ?
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-end bg-black bg-opacity-60 p-4 md:p-8"
          onClick={toggle}
        >
          <div
            className="h-full w-full max-w-lg overflow-auto rounded-3xl bg-white px-6 py-8 text-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <article
              className="prose prose-slate max-w-none text-base leading-7 prose-headings:mb-2 prose-headings:mt-6 prose-headings:leading-snug prose-p:leading-7 prose-p:my-4 prose-li:leading-7 prose-strong:font-semibold prose-a:text-blue-600 hover:prose-a:text-blue-500"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>
      )}
    </>
  );
}


"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

interface HelpPanelProps {
  appId: string;
  docPath?: string;
}

export default function HelpPanel({ appId, docPath }: HelpPanelProps) {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState("<p>Loading...</p>");
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);

  const scrollToHash = () => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const el = contentRef.current?.querySelector(`#${hash}`) as HTMLElement | null;
    el?.scrollIntoView();
  };

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
        const rendered = DOMPurify.sanitize(marked.parse(md) as string, {
          ADD_ATTR: ['id'],
        });
        setHtml(rendered);
      })
      .catch(() => setHtml("<p>No help available.</p>"));
  }, [open, appId, docPath]);

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash) {
        setOpen(true);
        setTimeout(scrollToHash, 0);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (open) scrollToHash();
  }, [open, html]);

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

  const toggle = () =>
    setOpen((o) => {
      if (o && router.asPath.includes('#')) {
        router.replace(router.asPath.split('#')[0], undefined, { shallow: true });
      }
      return !o;
    });

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
            ref={contentRef}
          >
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      )}
    </>
  );
}


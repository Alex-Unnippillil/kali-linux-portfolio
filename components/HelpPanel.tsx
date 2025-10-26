"use client";

import { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

let mermaidLoader: Promise<typeof import('mermaid')> | null = null;

const loadMermaid = async () => {
  if (!mermaidLoader) {
    mermaidLoader = import('mermaid')
      .then((mod) => {
        mod.default.initialize({ startOnLoad: false });
        return mod;
      })
      .catch((err) => {
        mermaidLoader = null;
        throw err;
      });
  }
  return mermaidLoader;
};

interface HelpPanelProps {
  appId: string;
  docPath?: string;
}

export default function HelpPanel({ appId, docPath }: HelpPanelProps) {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState("<p>Loading...</p>");
  const [mermaidNeeded, setMermaidNeeded] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const path = docPath || `/docs/apps/${appId}.md`;
    fetch(path)
      .then((res) => (res.ok ? res.text() : ""))
      .then((md) => {
        if (!md) {
          setHtml("<p>No help available.</p>");
          setMermaidNeeded(false);
          return;
        }
        const containsMermaid = /```\s*mermaid/i.test(md);
        const renderer = new marked.Renderer();
        const originalCode = renderer.code.bind(renderer);
        renderer.code = (code, infostring, escaped) => {
          if ((infostring || "").trim().toLowerCase() === "mermaid") {
            return `<div class="mermaid">${code}</div>`;
          }
          return originalCode(code, infostring, escaped);
        };
        const rendered = marked.parse(md, { renderer }) as string;
        const sanitized = DOMPurify.sanitize(rendered);
        setHtml(sanitized);
        setMermaidNeeded(containsMermaid);
      })
      .catch(() => {
        setHtml("<p>No help available.</p>");
        setMermaidNeeded(false);
      });
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

  useEffect(() => {
    if (!open || !mermaidNeeded) return;
    const container = contentRef.current;
    if (!container) return;
    const nodes = container.querySelectorAll('.mermaid');
    if (!nodes.length) return;

    let cancelled = false;

    (async () => {
      try {
        const mermaid = await loadMermaid();
        if (cancelled) return;
        await mermaid.default.run({ nodes });
      } catch (err) {
        console.error('Mermaid rendering failed', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, mermaidNeeded, html]);

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
            <div ref={contentRef} dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      )}
    </>
  );
}


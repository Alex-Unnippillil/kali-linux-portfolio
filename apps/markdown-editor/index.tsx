'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import type { editor as MonacoEditor, IDisposable } from 'monaco-editor';
import type { OnMount } from '@monaco-editor/react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-gray-400">
      Loading editor…
    </div>
  ),
});

marked.setOptions({
  gfm: true,
  breaks: true,
});

const STORAGE_KEY = 'markdown-editor-content';

const DEFAULT_MARKDOWN = `# Markdown Editor

## Welcome!

Start typing on the left to see a live preview.

- Supports **GitHub-flavored** Markdown
- Autosaves locally
- Export with inline styles
`;

const EXPORT_STYLES = `:root{color-scheme:dark;}
body{font-family:'Fira Code','Fira Mono',Menlo,monospace;background:#0d1117;color:#c9d1d9;margin:0;padding:32px;line-height:1.6;}
a{color:#58a6ff;}
pre,code{background:#161b22;border-radius:6px;padding:0.2em 0.4em;}
pre{padding:16px;overflow-x:auto;}
blockquote{border-left:4px solid #30363d;margin:0;padding-left:16px;color:#8b949e;}
table{border-collapse:collapse;width:100%;}
th,td{border:1px solid #30363d;padding:8px 12px;text-align:left;}
h1,h2,h3,h4,h5,h6{border-bottom:1px solid #30363d;padding-bottom:0.3em;margin-top:1.5em;}`;

const runLater = (fn: () => void) => {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(fn);
  } else {
    fn();
  }
};

const escapeHtml = (input: string) =>
  input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const toFileName = (title: string) => {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${slug || 'markdown-export'}.html`;
};

const MarkdownEditorApp: React.FC = () => {
  const [value, setValue] = useState<string>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_MARKDOWN;
    }
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      return saved || DEFAULT_MARKDOWN;
    } catch {
      return DEFAULT_MARKDOWN;
    }
  });

  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const ignoreEditorScroll = useRef(false);
  const ignorePreviewScroll = useRef(false);
  const scrollDisposableRef = useRef<IDisposable | null>(null);

  useEffect(() => {
    return () => {
      scrollDisposableRef.current?.dispose();
      scrollDisposableRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handle = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, value);
      } catch {
        /* ignore persistence errors */
      }
    }, 400);
    return () => window.clearTimeout(handle);
  }, [value]);

  const renderedHtml = useMemo(() => {
    const raw = marked.parse(value) as string;
    return DOMPurify.sanitize(raw);
  }, [value]);

  const syncPreview = useCallback(() => {
    const editor = editorRef.current;
    const preview = previewRef.current;
    if (!editor || !preview) return;

    const layout = editor.getLayoutInfo();
    const viewportHeight = layout?.height ?? editor.getDomNode()?.clientHeight ?? 0;
    const maxEditorScroll = Math.max(editor.getScrollHeight() - viewportHeight, 0);
    const maxPreviewScroll = Math.max(preview.scrollHeight - preview.clientHeight, 0);
    const ratio = maxEditorScroll > 0 ? editor.getScrollTop() / maxEditorScroll : 0;
    const target = ratio * maxPreviewScroll;

    ignorePreviewScroll.current = true;
    preview.scrollTop = target;
    runLater(() => {
      ignorePreviewScroll.current = false;
    });
  }, []);

  const syncEditor = useCallback(() => {
    const editor = editorRef.current;
    const preview = previewRef.current;
    if (!editor || !preview) return;

    const layout = editor.getLayoutInfo();
    const viewportHeight = layout?.height ?? editor.getDomNode()?.clientHeight ?? 0;
    const maxEditorScroll = Math.max(editor.getScrollHeight() - viewportHeight, 0);
    const maxPreviewScroll = Math.max(preview.scrollHeight - preview.clientHeight, 0);
    const ratio = maxPreviewScroll > 0 ? preview.scrollTop / maxPreviewScroll : 0;
    const target = ratio * maxEditorScroll;

    ignoreEditorScroll.current = true;
    editor.setScrollTop(target);
    runLater(() => {
      ignoreEditorScroll.current = false;
    });
  }, []);

  const handleEditorDidMount = useCallback<OnMount>(
    (editor) => {
      editorRef.current = editor;
      scrollDisposableRef.current?.dispose();
      scrollDisposableRef.current = editor.onDidScrollChange(() => {
        if (ignoreEditorScroll.current) {
          return;
        }
        syncPreview();
      });
      syncPreview();
    },
    [syncPreview]
  );

  const handlePreviewScroll = useCallback(() => {
    if (ignorePreviewScroll.current) {
      return;
    }
    syncEditor();
  }, [syncEditor]);

  const handleExport = useCallback(() => {
    const sanitized = renderedHtml;
    const headingMatch = value.match(/^#\s+(.+)$/m);
    const title = headingMatch ? headingMatch[1].trim() : 'Markdown Export';
    const plainText = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
    const description = plainText.replace(/\s+/g, ' ').trim().slice(0, 160);
    const htmlDocument = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="generator" content="Kali Linux Portfolio Markdown Editor" />
<meta name="description" content="${escapeHtml(description)}" />
<title>${escapeHtml(title)}</title>
<style>${EXPORT_STYLES}</style>
</head>
<body>
<main class="markdown-body">
${sanitized}
</main>
</body>
</html>`;

    try {
      const blob = new Blob([htmlDocument], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = toFileName(title);
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch {
      /* ignore export errors */
    }
  }, [renderedHtml, value]);

  return (
    <div className="flex h-full flex-col bg-ub-cool-grey text-white">
      <header className="flex items-center justify-between border-b border-ub-grey px-4 py-2">
        <div>
          <h1 className="text-lg font-semibold leading-none">Markdown Editor</h1>
          <p className="text-xs text-ubt-grey">Live preview with scroll sync and autosave.</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="rounded bg-ubt-blue px-3 py-1 text-sm font-medium text-white hover:bg-ubt-blue/80 focus:outline-none focus:ring-2 focus:ring-ubt-blue focus:ring-offset-2"
        >
          Export HTML
        </button>
      </header>
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <section className="flex h-1/2 min-h-[240px] flex-1 flex-col border-b border-ub-grey bg-[#1e1e1e] md:h-auto md:border-b-0 md:border-r">
          <MonacoEditor
            height="100%"
            defaultLanguage="markdown"
            theme="vs-dark"
            value={value}
            onChange={(next) => setValue(next ?? '')}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: false },
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              fontSize: 14,
              lineNumbersMinChars: 3,
            }}
          />
        </section>
        <section className="flex h-1/2 min-h-[240px] flex-1 flex-col bg-[#0f172a] text-left md:h-auto">
          <div
            ref={previewRef}
            data-testid="markdown-preview"
            onScroll={handlePreviewScroll}
            className="markdown-preview h-full overflow-auto p-4 text-sm leading-relaxed"
          >
            <article
              className="space-y-4"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default MarkdownEditorApp;

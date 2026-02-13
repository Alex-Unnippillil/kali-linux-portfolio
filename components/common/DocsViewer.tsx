import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';

import {
  DOCS_HASH_PREFIX,
  getDocAnchorByTarget,
  resolveDocTarget,
  subscribeDocAnchors,
  type DocAnchorEntry,
} from './docsRegistry';

const parseDocsHash = (hash: string): string | null => {
  if (!hash || !hash.startsWith(DOCS_HASH_PREFIX)) return null;
  const encoded = hash.slice(DOCS_HASH_PREFIX.length);
  if (!encoded) return null;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
};

const useCurrentAnchor = () => {
  const [target, setTarget] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : parseDocsHash(window.location.hash),
  );
  const [registryVersion, setRegistryVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeDocAnchors(() =>
      setRegistryVersion(v => v + 1),
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handle = () => {
      setTarget(parseDocsHash(window.location.hash));
    };
    handle();
    window.addEventListener('hashchange', handle);
    return () => window.removeEventListener('hashchange', handle);
  }, []);

  return useMemo(() => {
    if (!target) return null;
    const entry = getDocAnchorByTarget(target) ?? resolveDocTarget(target);
    return entry ?? null;
  }, [target, registryVersion]);
};

interface DocsViewerProps {
  className?: string;
  /** Content rendered when no anchor is active. */
  emptyState?: React.ReactNode;
}

const renderContent = (anchor: DocAnchorEntry | null) => {
  if (!anchor) return null;
  if (typeof anchor.content === 'function') {
    return anchor.content();
  }
  return anchor.content ?? null;
};

const DocsViewer: React.FC<DocsViewerProps> = ({ className, emptyState = null }) => {
  const anchor = useCurrentAnchor();
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!anchor) return;
    const el = containerRef.current;
    if (!el) return;
    if (typeof el.focus === 'function') {
      el.focus();
    }
  }, [anchor?.target]);

  if (!anchor) return emptyState;

  const description = anchor.description ?? `Showing documentation for ${anchor.title}.`;
  const content = renderContent(anchor);

  return (
    <section
      id="docs-viewer"
      ref={node => {
        containerRef.current = node;
      }}
      role="region"
      tabIndex={-1}
      aria-live="polite"
      aria-label="Documentation viewer"
      className={clsx('docs-viewer focus:outline-none', className)}
      data-docs-target={anchor.target}
    >
      <h2 className="text-lg font-semibold text-white">{anchor.title}</h2>
      <p className="mt-2 text-sm text-ubt-grey">{description}</p>
      {content && <div className="mt-4 text-sm leading-relaxed text-white">{content}</div>}
    </section>
  );
};

export default DocsViewer;


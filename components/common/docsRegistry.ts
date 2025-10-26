import type { ReactNode } from 'react';

export interface DocAnchor {
  /**
   * Unique identifier used when rendering help links in the UI.
   */
  id: string;
  /**
   * Human readable title displayed within the documentation viewer.
   */
  title: string;
  /**
   * Optional description that is surfaced to assistive technology users and
   * shown inside the DocsViewer panel.
   */
  description?: string;
  /**
   * Optional custom slug used for the hash fragment. Defaults to the id.
   */
  hash?: string;
  /**
    * Additional hint announced by screen readers when the help link gains
    * focus. Falls back to `description` when omitted.
    */
  srHint?: string;
  /**
   * Arbitrary content rendered within the DocsViewer when this anchor is
   * active. Accepts either a React node or a lazily evaluated function.
   */
  content?: ReactNode | (() => ReactNode);
}

export interface DocAnchorEntry extends DocAnchor {
  /**
   * Normalised target that is appended to the `#docs/` hash.
   */
  target: string;
}

const anchorsById = new Map<string, DocAnchorEntry>();
const anchorsByTarget = new Map<string, DocAnchorEntry>();

type RegistryListener = (anchors: DocAnchorEntry[]) => void;
const listeners = new Set<RegistryListener>();

export const DOCS_HASH_PREFIX = '#docs/';

const toEntry = (input: DocAnchor): DocAnchorEntry => {
  const id = input.id.trim();
  if (!id) {
    throw new Error('Doc anchor id is required.');
  }

  const trimmedHash = input.hash?.trim();
  const target = trimmedHash && trimmedHash.length > 0 ? trimmedHash : id;

  return {
    ...input,
    id,
    target,
  };
};

const snapshot = (): DocAnchorEntry[] => Array.from(anchorsById.values());

const notify = () => {
  const anchors = snapshot();
  listeners.forEach(listener => {
    try {
      listener(anchors);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Docs registry listener failed', error);
    }
  });
};

export const registerDocAnchor = (anchor: DocAnchor): (() => void) => {
  const entry = toEntry(anchor);

  anchorsById.set(entry.id, entry);
  anchorsByTarget.set(entry.target, entry);

  notify();

  return () => {
    const current = anchorsById.get(entry.id);
    if (!current || current.target !== entry.target) return;

    anchorsById.delete(entry.id);
    anchorsByTarget.delete(entry.target);
    notify();
  };
};

export const unregisterDocAnchor = (id: string) => {
  const entry = anchorsById.get(id);
  if (!entry) return;

  anchorsById.delete(id);
  anchorsByTarget.delete(entry.target);
  notify();
};

export const getDocAnchor = (id: string): DocAnchorEntry | null =>
  anchorsById.get(id) ?? null;

export const getDocAnchorByTarget = (target: string): DocAnchorEntry | null =>
  anchorsByTarget.get(target) ?? null;

export const listDocAnchors = (): DocAnchorEntry[] => snapshot();

export const subscribeDocAnchors = (listener: RegistryListener): (() => void) => {
  listeners.add(listener);
  listener(snapshot());
  return () => {
    listeners.delete(listener);
  };
};

const dispatchHashChange = () => {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } catch {
    const event = document.createEvent('HTMLEvents');
    event.initEvent('hashchange', true, true);
    window.dispatchEvent(event);
  }
};

const buildDocsHash = (target: string) =>
  `${DOCS_HASH_PREFIX}${encodeURIComponent(target)}`;

export const resolveDocTarget = (idOrTarget: string): DocAnchorEntry | null => {
  const byId = anchorsById.get(idOrTarget);
  if (byId) return byId;
  const decoded = decodeURIComponent(idOrTarget);
  return anchorsByTarget.get(decoded) ?? null;
};

export const openDocAnchor = (idOrTarget: string): string => {
  const entry = resolveDocTarget(idOrTarget);
  const target = entry?.target ?? idOrTarget;
  const hash = buildDocsHash(target);

  if (typeof window !== 'undefined') {
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    }
    dispatchHashChange();
  }

  return hash;
};

export const __TEST__ = {
  reset: () => {
    anchorsById.clear();
    anchorsByTarget.clear();
    listeners.clear();
  },
};


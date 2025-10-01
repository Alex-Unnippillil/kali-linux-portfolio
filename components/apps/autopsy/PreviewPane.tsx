'use client';

import React, { useCallback, useEffect, useMemo, useState, useId } from 'react';
import {
  PreviewPaneFile,
  bytesToHex,
  decodeBase64Fully,
  formatBytes,
} from './preview-utils';

interface PreviewPaneProps {
  file: PreviewPaneFile;
}

type PreviewMode = 'text' | 'hex' | 'image';

const statusMessages = {
  loading: 'Loading full file…',
  loaded: 'Full file loaded.',
  unavailable: 'Full file is unavailable for this entry.',
  error: 'Failed to load full file.',
} as const;

const PreviewPane: React.FC<PreviewPaneProps> = ({ file }) => {
  const [mode, setMode] = useState<PreviewMode>('text');
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fullText, setFullText] = useState<string | null>(null);
  const [fullHex, setFullHex] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const contentId = useId();

  useEffect(() => {
    const defaultMode: PreviewMode = file.isImage
      ? 'image'
      : file.isBinary
      ? 'hex'
      : 'text';
    setMode(defaultMode);
    setExpanded(false);
    setLoading(false);
    setFullText(null);
    setFullHex(null);
    setStatus('');
  }, [file]);

  useEffect(() => {
    if (mode !== 'image' || !file.isImage || !file.base64) {
      setImageSrc(null);
      return;
    }
    const mime = file.mimeType || 'image/*';
    const src = `data:${mime};base64,${file.base64}`;
    setImageSrc(src);
    return () => setImageSrc(null);
  }, [file, mode]);

  const handleExpand = useCallback(async () => {
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);
    if (!nextExpanded) return;
    if (!file.truncated) return;
    if (!file.base64) {
      setStatus(statusMessages.unavailable);
      return;
    }
    if (fullText && fullHex) return;
    setLoading(true);
    setStatus(statusMessages.loading);
    try {
      const bytes = await decodeBase64Fully(file.base64);
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const decodedText = decoder.decode(bytes).replace(/\u0000/g, '\uFFFD');
      setFullText(decodedText);
      setFullHex(bytesToHex(bytes));
      setStatus(statusMessages.loaded);
    } catch (error) {
      console.error('Failed to load full file preview', error);
      setStatus(statusMessages.error);
    } finally {
      setLoading(false);
    }
  }, [expanded, file, fullHex, fullText]);

  const previewContent = useMemo(() => {
    if (mode === 'image') {
      return imageSrc ? (
        <img
          src={imageSrc}
          alt={`${file.name} preview`}
          className="max-h-48 w-auto rounded border border-ub-cool-grey"
        />
      ) : (
        <p className="text-gray-300">Image preview unavailable.</p>
      );
    }
    if (mode === 'hex') {
      return (
        <pre className="font-mono whitespace-pre-wrap break-words">
          {expanded && fullHex ? fullHex : file.previewHex}
        </pre>
      );
    }
    return (
      <pre className="font-mono whitespace-pre-wrap break-words">
        {expanded && fullText ? fullText : file.previewText}
      </pre>
    );
  }, [expanded, file.previewHex, file.previewText, file.name, fullHex, fullText, imageSrc, mode]);

  const truncatedMessage = useMemo(() => {
    if (!file.truncated || expanded) return null;
    const previewSize = formatBytes(file.previewByteLength);
    const totalSize = file.totalBytes ? formatBytes(file.totalBytes) : undefined;
    return (
      <p className="text-xs text-gray-300" role="note">
        Showing the first {previewSize}
        {totalSize ? ` of approximately ${totalSize}` : ''}. Use the View full file
        button to load the remainder.
      </p>
    );
  }, [expanded, file.previewByteLength, file.totalBytes, file.truncated]);

  const statusMarkup = (
    <p className="sr-only" role="status" aria-live="polite">
      {status}
    </p>
  );

  const modeButtons: Array<{ key: PreviewMode; label: string }> = [
    { key: 'text', label: 'Text' },
    { key: 'hex', label: 'Hex' },
  ];
  if (file.isImage) {
    modeButtons.push({ key: 'image', label: 'Image' });
  }

  return (
    <section className="flex-grow bg-ub-grey p-2 rounded text-xs" aria-labelledby={`${contentId}-title`}>
      <h3 id={`${contentId}-title`} className="font-bold mb-1 text-sm">
        {file.name}
      </h3>
      {file.hash ? <p className="mb-1 break-all">SHA-256: {file.hash}</p> : null}
      {file.known ? (
        <p className="mb-1 text-green-400">Known: {file.known}</p>
      ) : null}
      <div className="flex space-x-2 mb-2" role="tablist" aria-label="Preview mode">
        {modeButtons.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`px-2 py-1 rounded ${
              mode === key ? 'bg-ub-orange text-black' : 'bg-ub-cool-grey'
            }`}
            aria-pressed={mode === key}
          >
            {label}
          </button>
        ))}
      </div>
      {truncatedMessage}
      <div
        id={contentId}
        className="rounded bg-black/50 p-2 text-white focus:outline-none focus:ring-2 focus:ring-ub-orange"
        tabIndex={0}
        aria-live={mode === 'image' ? 'off' : 'polite'}
      >
        {previewContent}
      </div>
      {file.truncated ? (
        <button
          type="button"
          onClick={handleExpand}
          className="mt-2 px-2 py-1 rounded bg-ub-cool-grey hover:bg-ub-orange hover:text-black"
          aria-expanded={expanded}
          aria-controls={contentId}
        >
          {expanded ? 'Collapse full file' : 'View full file'}
          <span className="sr-only">
            {expanded
              ? 'Collapse the expanded preview content.'
              : 'Load the remaining file contents into the preview.'}
          </span>
        </button>
      ) : null}
      {loading ? <p className="text-xs text-gray-300 mt-1">Loading…</p> : null}
      {statusMarkup}
    </section>
  );
};

export default PreviewPane;

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

export type PreviewKind = 'text' | 'json' | 'image' | 'binary';

export interface PreviewLoadInfo {
  duration: number;
  type: PreviewKind;
  size: number;
  cached: boolean;
  withinTarget: boolean;
}

export type PreviewSource =
  | File
  | Blob
  | FileSystemFileHandle
  | {
      name?: string;
      type?: string;
      getFile: () => Promise<File | Blob>;
    };

interface PreviewProps {
  file?: PreviewSource | null;
  className?: string;
  emptyState?: React.ReactNode;
  onLoad?: (info: PreviewLoadInfo) => void;
}

interface TextCacheEntry {
  kind: Exclude<PreviewKind, 'image' | 'binary'>;
  data: string;
}

interface PreviewState {
  status: 'idle' | 'loading' | 'ready' | 'error' | 'unavailable';
  kind: PreviewKind;
  data?: string;
  partial?: boolean;
  message?: string;
  objectUrl?: string;
}

const SMALL_FILE_LIMIT = 2 * 1024 * 1024; // 2 MB
const TARGET_RENDER_MS = 150;
const MAX_CACHE_ENTRIES = 24;

const previewCache = new Map<string, TextCacheEntry>();

const JSON_MIME_TYPES = new Set([
  'application/json',
  'application/ld+json',
  'application/vnd.api+json',
]);

const TEXT_MIME_PREFIXES = ['text/', 'application/xml', 'application/xhtml+xml'];

const JSON_EXTENSIONS = new Set([
  'json',
  'jsonc',
  'geojson',
  'har',
  'map',
]);

const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'bmp',
  'webp',
  'svg',
  'apng',
  'avif',
]);

const TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'markdown',
  'csv',
  'ts',
  'tsx',
  'js',
  'jsx',
  'css',
  'scss',
  'html',
  'htm',
  'xml',
  'yml',
  'yaml',
  'ini',
  'conf',
  'log',
  'json5',
  'py',
  'rb',
  'java',
  'c',
  'cc',
  'cpp',
  'h',
  'hpp',
  'go',
  'rs',
  'sql',
  'sh',
  'bash',
  'zsh',
]);

function isFileSystemHandle(value: PreviewSource): value is FileSystemFileHandle {
  return typeof value === 'object' && value !== null && 'getFile' in value && 'kind' in value;
}

function isFileWithGetter(value: PreviewSource): value is {
  name?: string;
  type?: string;
  getFile: () => Promise<File | Blob>;
} {
  return typeof value === 'object' && value !== null && 'getFile' in value && typeof value.getFile === 'function';
}

function normaliseExtension(name?: string) {
  if (!name) return '';
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : '';
}

function isFileInstance(value: unknown): value is File {
  return typeof File !== 'undefined' && value instanceof File;
}

function isBlobInstance(value: unknown): value is Blob {
  return typeof Blob !== 'undefined' && value instanceof Blob;
}

export function detectFileKind(file: { name?: string; type?: string }): PreviewKind {
  const mime = (file.type || '').toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (JSON_MIME_TYPES.has(mime)) return 'json';
  if (TEXT_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix))) return 'text';

  const ext = normaliseExtension(file.name);
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (JSON_EXTENSIONS.has(ext)) return 'json';
  if (TEXT_EXTENSIONS.has(ext)) return 'text';

  return 'binary';
}

function pruneCache() {
  while (previewCache.size > MAX_CACHE_ENTRIES) {
    const first = previewCache.keys().next();
    if (first.done) break;
    previewCache.delete(first.value);
  }
}

async function resolveFile(source: PreviewSource): Promise<File> {
  if (!source) {
    throw new Error('No file source provided');
  }

  if (isFileInstance(source)) {
    return source;
  }

  if (isBlobInstance(source)) {
    return new File([source], source instanceof File ? source.name : 'blob', {
      type: source.type,
      lastModified: Date.now(),
    });
  }

  if (isFileSystemHandle(source)) {
    const file = await source.getFile();
    if (isFileInstance(file)) return file;
    return new File([file], source.name || 'file', {
      type: file.type,
      lastModified: file.lastModified ?? Date.now(),
    });
  }

  if (isFileWithGetter(source)) {
    const file = await source.getFile();
    if (isFileInstance(file)) return file;
    const name = 'name' in source && source.name ? source.name : 'file';
    return new File([file], name, {
      type: file.type,
      lastModified: file.lastModified ?? Date.now(),
    });
  }

  throw new Error('Unsupported file source');
}

async function readTextStream(
  file: File,
  signal: AbortSignal,
  onChunk?: (value: string, done: boolean) => void,
): Promise<string> {
  if ('stream' in file && typeof file.stream === 'function') {
    const reader = file.stream().getReader();
    const decoder = new TextDecoder();
    let result = '';

    try {
      while (true) {
        if (signal.aborted) {
          reader.releaseLock?.();
          throw signal.reason || new DOMException('Aborted', 'AbortError');
        }
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          result += decoder.decode(value, { stream: true });
          onChunk?.(result, false);
        }
      }
      result += decoder.decode();
      onChunk?.(result, true);
      return result;
    } finally {
      reader.releaseLock?.();
    }
  }

  if (typeof file.text === 'function') {
    const text = await file.text();
    onChunk?.(text, true);
    return text;
  }

  if (typeof file.arrayBuffer === 'function') {
    const buffer = await file.arrayBuffer();
    const text = new TextDecoder().decode(buffer);
    onChunk?.(text, true);
    return text;
  }

  if (typeof Response !== 'undefined') {
    const text = await new Response(file).text();
    onChunk?.(text, true);
    return text;
  }

  if (typeof FileReader !== 'undefined') {
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else if (reader.result instanceof ArrayBuffer) {
          resolve(new TextDecoder().decode(reader.result));
        } else {
          reject(new Error('Unsupported file reader result'));
        }
      };
      reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
      reader.readAsText(file);
    });
    onChunk?.(text, true);
    return text;
  }

  throw new Error('Unable to read file contents');
}

function getCacheKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

const baseContainerStyles: React.CSSProperties = {
  fontFamily: 'var(--font-mono, monospace)',
  background: 'rgba(0, 0, 0, 0.35)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 4,
  padding: 12,
  color: 'var(--color-foreground, #f8f8f2)',
  overflow: 'auto',
  width: '100%',
  height: '100%',
  boxSizing: 'border-box',
};

const textStyles: React.CSSProperties = {
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  margin: 0,
  fontFamily: 'inherit',
};

const imageStyles: React.CSSProperties = {
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain',
  borderRadius: 4,
};

const statusStyles: React.CSSProperties = {
  fontStyle: 'italic',
  opacity: 0.8,
};

const containerClass = 'preview-container flex flex-col';

const defaultEmptyState = (
  <div style={statusStyles} data-testid="preview-empty">
    Select a file to see its preview.
  </div>
);

const loadingState = (
  <div style={statusStyles} data-testid="preview-loading">
    Loading preview…
  </div>
);

const unavailableState = (
  <div style={statusStyles} data-testid="preview-unavailable">
    Preview not available for this file type.
  </div>
);

const errorState = (message: string) => (
  <div style={{ ...statusStyles, color: '#ff6b6b' }} role="alert" data-testid="preview-error">
    {message}
  </div>
);

const partialBadge = (
  <span className="text-xs text-gray-300" data-testid="preview-partial">
    Streaming preview…
  </span>
);

const MAX_STREAM_RENDER_INTERVAL = 32;

const Preview: React.FC<PreviewProps> = ({ file, className = '', emptyState = defaultEmptyState, onLoad }) => {
  const [state, setState] = useState<PreviewState>({ status: 'idle', kind: 'text' });
  const objectUrlRef = useRef<string | null>(null);
  const lastRenderRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();

    const resetObjectUrl = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };

    resetObjectUrl();

    if (!file) {
      setState({ status: 'idle', kind: 'text' });
      return () => {
        cancelled = true;
        abortController.abort();
      };
    }

    setState({ status: 'loading', kind: 'text' });

    const load = async () => {
      try {
        const resolved = await resolveFile(file);
        if (cancelled) return;
        const detectedKind = detectFileKind(resolved);
        const cacheKey = getCacheKey(resolved);
        const start = performance.now();

        if (detectedKind === 'image') {
          const url = URL.createObjectURL(resolved);
          objectUrlRef.current = url;
          if (cancelled) {
            URL.revokeObjectURL(url);
            return;
          }
          const duration = performance.now() - start;
          setState({ status: 'ready', kind: 'image', objectUrl: url });
          onLoad?.({
            duration,
            type: 'image',
            size: resolved.size,
            cached: false,
            withinTarget: resolved.size > SMALL_FILE_LIMIT ? true : duration <= TARGET_RENDER_MS,
          });
          return;
        }

        if (detectedKind === 'binary') {
          const duration = performance.now() - start;
          setState({ status: 'unavailable', kind: 'binary' });
          onLoad?.({
            duration,
            type: 'binary',
            size: resolved.size,
            cached: false,
            withinTarget: duration <= TARGET_RENDER_MS,
          });
          return;
        }

        const cached = previewCache.get(cacheKey);
        if (cached) {
          const duration = performance.now() - start;
          setState({ status: 'ready', kind: cached.kind, data: cached.data });
          onLoad?.({
            duration,
            type: cached.kind,
            size: resolved.size,
            cached: true,
            withinTarget: true,
          });
          return;
        }

        let latest = '';
        lastRenderRef.current = 0;

        const text = await readTextStream(resolved, abortController.signal, (value, done) => {
          latest = value;
          if (cancelled) return;
          const now = performance.now();
          if (!done && now - lastRenderRef.current < MAX_STREAM_RENDER_INTERVAL) return;
          lastRenderRef.current = now;
          setState({
            status: done ? 'ready' : 'loading',
            kind: 'text',
            data: value,
            partial: !done && detectedKind !== 'json',
          });
        });

        if (cancelled) return;

        if (detectedKind === 'json') {
          try {
            const formatted = JSON.stringify(JSON.parse(text), null, 2);
            const duration = performance.now() - start;
            previewCache.set(cacheKey, { kind: 'json', data: formatted });
            pruneCache();
            setState({ status: 'ready', kind: 'json', data: formatted });
            onLoad?.({
              duration,
              type: 'json',
              size: resolved.size,
              cached: false,
              withinTarget: resolved.size > SMALL_FILE_LIMIT ? true : duration <= TARGET_RENDER_MS,
            });
            return;
          } catch {
            previewCache.set(cacheKey, { kind: 'text', data: text });
            pruneCache();
            setState({
              status: 'ready',
              kind: 'text',
              data: text,
              message: 'Unable to parse JSON. Showing raw text.',
            });
            const duration = performance.now() - start;
            onLoad?.({
              duration,
              type: 'text',
              size: resolved.size,
              cached: false,
              withinTarget: resolved.size > SMALL_FILE_LIMIT ? true : duration <= TARGET_RENDER_MS,
            });
            return;
          }
        }

        previewCache.set(cacheKey, { kind: 'text', data: text });
        pruneCache();
        const duration = performance.now() - start;
        setState({ status: 'ready', kind: 'text', data: latest || text });
        onLoad?.({
          duration,
          type: 'text',
          size: resolved.size,
          cached: false,
          withinTarget: resolved.size > SMALL_FILE_LIMIT ? true : duration <= TARGET_RENDER_MS,
        });
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof DOMException && error.name === 'AbortError'
            ? 'Loading cancelled.'
            : error instanceof Error
            ? error.message
            : 'Unable to load preview.';
        setState({ status: 'error', kind: 'text', message });
      }
    };

    load();

    return () => {
      cancelled = true;
      abortController.abort();
      resetObjectUrl();
    };
  }, [file, onLoad]);

  const content = useMemo(() => {
    if (!file) {
      return emptyState;
    }

    if (state.status === 'loading') {
      return (
        <div className="flex flex-col space-y-2">
          {loadingState}
          {state.partial && partialBadge}
        </div>
      );
    }

    if (state.status === 'unavailable') {
      return unavailableState;
    }

    if (state.status === 'error') {
      return errorState(state.message || 'Unable to load preview.');
    }

    if (state.status === 'ready') {
      if (state.kind === 'image' && state.objectUrl) {
        return (
          <img
            src={state.objectUrl}
            alt={isFileInstance(file) ? file.name : 'Image preview'}
            style={imageStyles}
            data-testid="preview-image"
          />
        );
      }

      if (state.kind === 'json') {
        return (
          <pre style={textStyles} data-testid="preview-json">
            {state.data}
          </pre>
        );
      }

      if (state.kind === 'text') {
        return (
          <div className="flex flex-col space-y-2">
            {state.message && (
              <div className="text-xs text-amber-200" data-testid="preview-message">
                {state.message}
              </div>
            )}
            <pre style={textStyles} data-testid="preview-text">
              {state.data}
            </pre>
          </div>
        );
      }

      if (state.kind === 'binary') {
        return unavailableState;
      }
    }

    return loadingState;
  }, [emptyState, file, state]);

  return (
    <div className={`${containerClass} ${className}`} style={baseContainerStyles} data-testid="file-preview">
      {content}
      {state.partial && state.status !== 'loading' && (
        <div className="mt-2" data-testid="preview-streaming">
          {partialBadge}
        </div>
      )}
    </div>
  );
};

export default Preview;

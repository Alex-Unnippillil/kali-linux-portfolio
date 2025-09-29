'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import VirtualList from 'rc-virtual-list';
import type { ListRef } from 'rc-virtual-list';
import DOMPurify from 'dompurify';
import { AnsiUp } from 'ansi_up';

export interface TerminalOutputProps {
  text?: string;
  lines?: string[];
  interactive?: boolean;
  ariaLabel?: string;
  className?: string;
  stickyPrompt?: string;
  onClear?: () => void;
  autoScroll?: boolean;
}

const LINE_HEIGHT = 20;
const ansiEscapePattern = /\u001b\[[0-9;?]*[ -\/]*[@-~]/g;

export default function TerminalOutput({
  text,
  lines,
  interactive = false,
  ariaLabel,
  className,
  stickyPrompt,
  onClear,
  autoScroll = true,
}: TerminalOutputProps) {
  const baseLines = useMemo(() => {
    if (Array.isArray(lines)) return lines;
    if (typeof text === 'string') {
      return text.replace(/\r\n/g, '\n').split('\n');
    }
    return [];
  }, [lines, text]);

  const [cleared, setCleared] = useState(false);
  const prevLengthRef = useRef(baseLines.length);
  const prevLastRef = useRef(baseLines.at(-1));

  useEffect(() => {
    const lengthChanged = baseLines.length !== prevLengthRef.current;
    const lastChanged = baseLines.at(-1) !== prevLastRef.current;
    if ((lengthChanged || lastChanged) && cleared) {
      setCleared(false);
    }
    prevLengthRef.current = baseLines.length;
    prevLastRef.current = baseLines.at(-1);
  }, [baseLines, cleared]);

  const effectiveLines = useMemo(() => (cleared ? [] : baseLines), [cleared, baseLines]);

  const ansiUp = useMemo(() => {
    const instance = new AnsiUp();
    instance.use_classes = false;
    instance.escape_for_html = true;
    return instance;
  }, []);

  const sanitizeLine = useCallback(
    (line: string) => {
      const html = ansiUp.ansi_to_html(line || '');
      return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
    },
    [ansiUp],
  );

  const sanitizedLines = useMemo(() => {
    if (interactive) return [];
    return effectiveLines.map((line) => sanitizeLine(line));
  }, [interactive, effectiveLines, sanitizeLine]);

  const sanitizedCount = sanitizedLines.length;
  const listRef = useRef<ListRef | null>(null);

  useEffect(() => {
    if (interactive || cleared) return;
    if (!autoScroll) return;
    if (!listRef.current) return;
    if (sanitizedCount === 0) return;
    listRef.current.scrollTo({ index: sanitizedCount - 1, align: 'bottom' });
  }, [interactive, cleared, sanitizedCount, autoScroll]);

  const [announcement, setAnnouncement] = useState('');
  const lastAnnouncedRef = useRef('');

  useEffect(() => {
    if (effectiveLines.length === 0) {
      lastAnnouncedRef.current = '';
      setAnnouncement('');
      return;
    }
    const latest = effectiveLines[effectiveLines.length - 1] || '';
    const plain = latest.replace(ansiEscapePattern, '');
    if (plain && plain !== lastAnnouncedRef.current) {
      lastAnnouncedRef.current = plain;
      setAnnouncement(plain);
    }
  }, [effectiveLines]);

  const interactiveRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<import('@xterm/xterm').Terminal | null>(null);
  const fitRef = useRef<{ fit: () => void } | null>(null);

  const copyLog = useCallback(async () => {
    const payload = effectiveLines.join('\n');
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
    } catch (err) {
      console.warn('Clipboard copy failed', err);
    }
  }, [effectiveLines]);

  const clearLog = useCallback(() => {
    setCleared(true);
    termRef.current?.clear();
    lastAnnouncedRef.current = '';
    setAnnouncement('');
    onClear?.();
  }, [onClear]);

  const containerClasses = ['bg-black', 'text-green-400', 'font-mono', 'text-xs', 'rounded', 'flex', 'flex-col', 'gap-2', 'p-2'];
  if (className) containerClasses.push(className);

  useEffect(() => {
    if (!interactive) return;
    let cancelled = false;

    const setup = async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
      ]);
      await import('@xterm/xterm/css/xterm.css');
      if (cancelled) return;
      const term = new Terminal({ convertEol: true, scrollback: 5000, fontSize: 12 });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      if (interactiveRef.current) {
        term.open(interactiveRef.current);
        fitAddon.fit();
      }
      termRef.current = term;
      fitRef.current = fitAddon;
    };

    setup();

    return () => {
      cancelled = true;
      termRef.current?.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, [interactive]);

  useEffect(() => {
    if (!interactive) return;
    const handleResize = () => {
      fitRef.current?.fit();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [interactive]);

  useEffect(() => {
    if (!interactive) return;
    const term = termRef.current;
    if (!term) return;
    term.clear();
    if (cleared) return;
    effectiveLines.forEach((line) => term.writeln(line));
    if (autoScroll) term.scrollToBottom();
  }, [interactive, effectiveLines, cleared, autoScroll]);

  return (
    <section
      className={containerClasses.join(' ')}
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      aria-atomic="false"
      aria-label={ariaLabel}
    >
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={copyLog}
          className="px-2 py-1 bg-ub-grey text-white rounded focus:outline-none focus:ring"
          aria-label="Copy terminal output"
        >
          Copy
        </button>
        <button
          type="button"
          onClick={clearLog}
          className="px-2 py-1 bg-ub-grey text-white rounded focus:outline-none focus:ring"
          aria-label="Clear terminal output"
        >
          Clear
        </button>
      </div>
      <div className="relative flex-1" style={{ minHeight: 200 }}>
        {interactive ? (
          <div ref={interactiveRef} className="h-full w-full overflow-hidden" aria-hidden={cleared} />
        ) : (
          <AutoSizer>
            {({ height, width }) => {
              if (!height || !width) {
                return <div className="text-sm text-green-200">No output</div>;
              }
              return (
                <VirtualList
                  ref={listRef}
                  data={sanitizedLines}
                  height={height}
                  itemHeight={LINE_HEIGHT}
                  itemKey={(_, index) => index}
                  style={{ width }}
                  className="outline-none"
                  overscanCount={8}
                >
                  {(line, _index, { style }) => (
                    <pre
                      style={{ ...style, margin: 0 }}
                      className="px-1 text-xs leading-5 text-green-300"
                      dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }}
                    />
                  )}
                </VirtualList>
              );
            }}
          </AutoSizer>
        )}
        {!interactive && sanitizedLines.length === 0 ? (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-[0.7rem] text-green-200"
            aria-hidden="true"
          >
            No output yet
          </div>
        ) : null}
        {stickyPrompt ? (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent px-2 py-1 text-[0.7rem] text-green-200">
            <span className="pointer-events-auto">{stickyPrompt}</span>
          </div>
        ) : null}
      </div>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </section>
  );
}

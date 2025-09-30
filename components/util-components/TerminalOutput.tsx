import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { List, RowComponentProps } from 'react-window';

interface TerminalOutputProps {
  text: string;
  ariaLabel?: string;
  /**
   * Maximum height (in pixels) before the output becomes scrollable.
   * Small outputs will shrink to fit content.
   */
  maxHeight?: number;
  /** Whether wrapped text should be enabled initially. */
  initialWrap?: boolean;
}

const ESTIMATED_LINE_HEIGHT = 18;
const WRAPPED_LINE_HEIGHT = 20;

type RowContext = {
  lines: string[];
  onCopy: (line: string, index: number) => void;
  isWrapped: boolean;
  copiedIndex: number | null;
  setSize: (index: number, size: number) => void;
};

const Row = ({ index, style, ...props }: RowComponentProps<RowContext>) => {
  const { lines, onCopy, isWrapped, copiedIndex, setSize } = props;
  const line = lines[index];

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        const height = node.getBoundingClientRect().height;
        setSize(index, height);
      }
    },
    [index, setSize],
  );

  return (
    <div style={{ ...style, width: '100%' }}>
      <div
        ref={setRef}
        className="group flex w-full items-stretch gap-2 border-b border-white/5 px-2 py-1 last:border-b-0"
      >
        <div className="pt-0.5 text-[10px] font-mono text-ubt-grey">{index + 1}</div>
        <div
          className={`flex min-w-0 flex-1 flex-col text-green-400 ${
            isWrapped ? 'whitespace-pre-wrap' : 'whitespace-pre'
          }`}
        >
          <div
            className={`font-mono text-xs leading-relaxed ${
              isWrapped ? '' : 'overflow-x-auto'
            }`}
            tabIndex={isWrapped ? -1 : 0}
          >
            {line.length ? line : ' '}
          </div>
          <span className="sr-only">Line content</span>
        </div>
        <button
          type="button"
          onClick={() => onCopy(line, index)}
          className="self-start rounded bg-ub-grey px-2 py-1 text-[11px] font-medium text-white transition focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-black group-hover:bg-ubt-blue"
          aria-label={`Copy line ${index + 1}`}
        >
          {copiedIndex === index ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
};

export default function TerminalOutput({
  text,
  ariaLabel,
  maxHeight = 320,
  initialWrap = true,
}: TerminalOutputProps) {
  const lines = useMemo(() => text.split(/\r?\n/), [text]);
  const [isWrapped, setIsWrapped] = useState(initialWrap);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const sizeMap = useRef<Record<number, number>>({});
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sizeVersion, setSizeVersion] = useState(0);

  const estimatedHeight = isWrapped ? WRAPPED_LINE_HEIGHT : ESTIMATED_LINE_HEIGHT;
  const containerHeight = Math.min(
    maxHeight,
    Math.max(lines.length, 1) * estimatedHeight,
  );

  const setSize = useCallback((index: number, size: number) => {
    if (sizeMap.current[index] !== size) {
      sizeMap.current[index] = size;
      setSizeVersion((value) => value + 1);
    }
  }, []);

  const fallbackCopy = useCallback((content: string) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const textarea = document.createElement('textarea');
    textarea.value = content;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
    } catch {
      // ignore fallback failure
    }
    document.body.removeChild(textarea);
  }, []);

  const handleCopy = useCallback(
    async (content: string, index: number) => {
      if (!content) {
        setCopiedIndex(index);
        return;
      }
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(content);
        } else {
          fallbackCopy(content);
        }
      } catch {
        fallbackCopy(content);
      }
      setCopiedIndex(index);
      if (copyTimeout.current) {
        clearTimeout(copyTimeout.current);
      }
      copyTimeout.current = setTimeout(() => {
        setCopiedIndex(null);
      }, 2000);
    },
    [fallbackCopy],
  );

  const toggleWrap = useCallback(() => {
    setIsWrapped((prev) => !prev);
  }, []);

  useEffect(() => {
    sizeMap.current = {};
    setSizeVersion((value) => value + 1);
    return () => {
      if (copyTimeout.current) {
        clearTimeout(copyTimeout.current);
      }
    };
  }, [text, isWrapped]);

  const rowHeight = useCallback(
    (index: number) => {
      void sizeVersion;
      return sizeMap.current[index] ?? estimatedHeight;
    },
    [estimatedHeight, sizeVersion],
  );

  const rowProps = useMemo(
    () => ({ lines, onCopy: handleCopy, isWrapped, copiedIndex, setSize }),
    [lines, handleCopy, isWrapped, copiedIndex, setSize],
  );

  return (
    <div
      className="flex flex-col rounded border border-white/10 bg-black text-green-400"
      aria-label={ariaLabel}
      role="region"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2 text-[11px] uppercase tracking-wide text-ubt-grey">
        <span className="font-semibold text-white">Terminal output</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-ubt-grey">Tap copy to grab a line</span>
          <button
            type="button"
            onClick={toggleWrap}
            className="rounded bg-ub-grey px-2 py-1 text-[11px] font-medium text-white transition hover:bg-ubt-blue focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-black"
          >
            {isWrapped ? 'Disable wrap' : 'Enable wrap'}
          </button>
        </div>
      </div>
      {lines.length === 0 ? (
        <div className="px-3 py-4 text-xs text-ubt-grey">No output yet.</div>
      ) : (
        <div className="h-full w-full" style={{ height: containerHeight, maxHeight }}>
          <List
            defaultHeight={containerHeight}
            style={{ height: containerHeight, maxHeight, width: '100%' }}
            rowCount={lines.length}
            rowHeight={rowHeight}
            rowComponent={Row}
            rowProps={rowProps}
          />
        </div>
      )}
    </div>
  );
}

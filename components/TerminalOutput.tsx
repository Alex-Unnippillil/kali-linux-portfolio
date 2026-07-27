import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import {
  VariableSizeList as List,
  ListChildComponentProps,
} from 'react-window';

interface TerminalOutputProps {
  text: string;
  ariaLabel?: string;
}

type ItemData = {
  lines: string[];
  wrapLines: boolean;
  copyLine: (line: string) => Promise<void>;
  setSize: (index: number, size: number) => void;
};

function Row({ index, style, data }: ListChildComponentProps<ItemData>) {
  const { lines, wrapLines, copyLine, setSize } = data;
  const line = lines[index] ?? '';
  const rowRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const element = rowRef.current;
    if (!element) {
      return;
    }

    const measure = () => {
      setSize(index, element.getBoundingClientRect().height);
    };

    measure();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        measure();
      });

      observer.observe(element);

      return () => {
        observer.disconnect();
      };
    }

    return undefined;
  }, [index, line, setSize, wrapLines]);

  return (
    <div style={{ ...style, width: '100%' }} className="px-1">
      <div
        ref={rowRef}
        className="flex items-start gap-2"
      >
        <span
          className={`flex-1 text-left ${wrapLines ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'}`}
        >
          {line}
        </span>
        <button
          type="button"
          className="text-gray-400 hover:text-white shrink-0"
          onClick={() => {
            void copyLine(line);
          }}
          aria-label="copy line"
        >
          📋
        </button>
      </div>
    </div>
  );
}

type ListRef = InstanceType<typeof List>;

export default function TerminalOutput({ text, ariaLabel }: TerminalOutputProps) {
  const [wrapLines, setWrapLines] = useState(true);
  const listRef = useRef<ListRef | null>(null);
  const sizeMap = useRef<Map<number, number>>(new Map());

  const lines = useMemo(() => text.split('\n'), [text]);

  const copyLine = useCallback(async (line: string) => {
    try {
      await navigator.clipboard.writeText(line);
    } catch {
      // ignore clipboard errors
    }
  }, []);

  const copyAll = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore clipboard errors
    }
  }, [text]);

  const setSize = useCallback((index: number, size: number) => {
    const current = sizeMap.current.get(index);
    if (current !== size) {
      sizeMap.current.set(index, size);
      listRef.current?.resetAfterIndex(index);
    }
  }, []);

  const getSize = useCallback(
    (index: number) => {
      return sizeMap.current.get(index) ?? (wrapLines ? 20 : 16);
    },
    [wrapLines],
  );

  const resetList = useCallback(() => {
    sizeMap.current.clear();
    listRef.current?.resetAfterIndex(0, true);
  }, []);

  useEffect(() => {
    resetList();
  }, [lines, wrapLines, resetList]);

  const itemData = useMemo(
    () => ({
      lines,
      wrapLines,
      copyLine,
      setSize,
    }),
    [lines, wrapLines, copyLine, setSize],
  );

  const estimatedLineHeight = wrapLines ? 20 : 16;
  const listHeight = Math.min(
    400,
    Math.max(estimatedLineHeight * Math.max(lines.length, 1) + 16, 80),
  );

  return (
    <div
      className="bg-black text-green-400 font-mono text-xs p-2 rounded space-y-2"
      aria-label={ariaLabel}
    >
      <div className="flex flex-wrap items-center justify-end gap-2 text-[11px]">
        <button
          type="button"
          onClick={() => {
            void copyAll();
          }}
          className="px-2 py-1 bg-ub-grey/40 hover:bg-ub-grey/60 text-white rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
        >
          Copy all
        </button>
        <button
          type="button"
          onClick={() => setWrapLines((prev) => !prev)}
          className="px-2 py-1 bg-ub-grey/40 hover:bg-ub-grey/60 text-white rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
          aria-pressed={wrapLines}
          aria-label={`Toggle line wrapping, currently ${wrapLines ? 'on' : 'off'}`}
        >
          Wrap: {wrapLines ? 'On' : 'Off'}
        </button>
      </div>
      <div
        className="border border-green-500/30 rounded bg-black/80 overflow-auto"
        style={{ height: listHeight }}
      >
        <AutoSizer>
          {({ height, width }) => (
            <List
              ref={listRef}
              height={height}
              width={width}
              itemCount={lines.length}
              itemData={itemData}
              itemSize={getSize}
              overscanCount={8}
            >
              {Row}
            </List>
          )}
        </AutoSizer>
      </div>
    </div>
  );
}

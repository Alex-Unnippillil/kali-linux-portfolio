'use client';

import React, {
  forwardRef,
  useRef,
  useState,
  useImperativeHandle,
  useCallback,
} from 'react';
import useToast from '../../../hooks/useToast';

export type TerminalContainerProps = React.HTMLAttributes<HTMLDivElement>;

const Terminal = forwardRef<HTMLDivElement, TerminalContainerProps>(
  ({ style, className = '', children, ...props }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    useImperativeHandle(ref, () => containerRef.current as HTMLDivElement, []);
    const toast = useToast();
    const [copyPos, setCopyPos] = useState<{ x: number; y: number } | null>(
      null,
    );
    const selectionRef = useRef('');
    const touchTimer = useRef<NodeJS.Timeout>();

    const handleSelection = useCallback(
      (event: MouseEvent | TouchEvent) => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();
        if (!text) {
          setCopyPos(null);
          return;
        }
        selectionRef.current = text;
        const rect = containerRef.current?.getBoundingClientRect();
        let clientX = 0;
        let clientY = 0;
        if ('touches' in event && event.touches[0]) {
          clientX = event.touches[0].clientX;
          clientY = event.touches[0].clientY;
        } else if ('changedTouches' in event && event.changedTouches[0]) {
          clientX = event.changedTouches[0].clientX;
          clientY = event.changedTouches[0].clientY;
        } else if ('clientX' in event) {
          clientX = event.clientX;
          clientY = event.clientY;
        }
        setCopyPos({
          x: clientX - (rect?.left ?? 0),
          y: clientY - (rect?.top ?? 0),
        });
      },
      [],
    );

    const onMouseUp = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        handleSelection(e.nativeEvent);
      },
      [handleSelection],
    );

    const onTouchStart = useCallback(
      (e: React.TouchEvent<HTMLDivElement>) => {
        const touch = e.touches[0];
        touchTimer.current = setTimeout(
          () =>
            handleSelection({
              clientX: touch.clientX,
              clientY: touch.clientY,
            } as any),
          500,
        );
      },
      [handleSelection],
    );

    const clearTouchTimer = useCallback(() => {
      if (touchTimer.current) {
        clearTimeout(touchTimer.current);
        touchTimer.current = undefined;
      }
    }, []);

    const onTouchEnd = useCallback(
      (e: React.TouchEvent<HTMLDivElement>) => {
        clearTouchTimer();
        handleSelection(e.nativeEvent);
      },
      [clearTouchTimer, handleSelection],
    );

    const onTouchMove = useCallback(() => {
      clearTouchTimer();
    }, [clearTouchTimer]);

    const handleCopy = useCallback(() => {
      navigator.clipboard
        .writeText(selectionRef.current)
        .then(() => toast('Copied to clipboard'))
        .catch(() => {})
        .finally(() => {
          setCopyPos(null);
          window.getSelection()?.removeAllRanges();
        });
    }, [toast]);

    return (
      <div
        ref={containerRef}
        data-testid="xterm-container"
        className={className}
        onMouseUp={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchMove={onTouchMove}
        style={{
          position: 'relative',
          background: 'var(--kali-bg)',
          fontFamily: 'monospace',
          fontSize: 'clamp(1rem, 0.6vw + 1rem, 1.1rem)',
          lineHeight: 1.4,
          whiteSpace: 'pre',
          ...style,
        }}
        {...props}
      >
        {children}
        {copyPos && (
          <button
            type="button"
            aria-label="Copy"
            data-testid="copy-selection-btn"
            className="absolute px-2 py-1 text-sm border rounded"
            style={{
              top: copyPos.y,
              left: copyPos.x,
            }}
            onClick={handleCopy}
          >
            Copy
          </button>
        )}
      </div>
    );
  },
);

Terminal.displayName = 'Terminal';

export default Terminal;

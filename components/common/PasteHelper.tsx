import React, {
  ReactElement,
  cloneElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import DOMPurify from 'dompurify';
import { createPortal } from 'react-dom';

export type PasteFormat = 'plain' | 'json' | 'csv' | 'code';

export type DetectedFormat = PasteFormat;

export interface PasteResult {
  /** Final format chosen by the user. */
  format: PasteFormat;
  /** The normalized text inserted into the target. */
  text: string;
  /** Sanitized HTML version of the clipboard payload. */
  sanitizedHtml: string;
  /** Format inferred from the clipboard payload. */
  detectedFormat: DetectedFormat;
}

interface PasteHelperProps {
  /**
   * Child form control (input, textarea, or contentEditable element).
   * The helper clones this element and injects an `onPaste` handler.
   */
  children: ReactElement;
  /** Callback fired after a format is selected and the content is applied. */
  onPaste?: (result: PasteResult) => void;
  /** Optional label to override the helper title. */
  title?: string;
}

interface PendingPaste {
  text: string;
  normalizedText: string;
  sanitizedHtml: string;
  detectedFormat: DetectedFormat;
  target: HTMLElement;
  selectionStart: number | null;
  selectionEnd: number | null;
  range?: Range;
  parsedJson: unknown | null;
}

/**
 * Normalize clipboard text to Unix newlines.
 */
export const normalizeLineEndings = (text: string): string => text.replace(/\r\n?/g, '\n');

/**
 * Sanitize HTML using DOMPurify. Returns an empty string when nothing is provided.
 */
export const sanitizeHtml = (html: string): string => {
  if (!html) {
    return '';
  }

  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
};

const isLikelyJson = (text: string): { isJson: boolean; parsed: unknown | null } => {
  const trimmed = text.trim();
  if (!trimmed || !/^[[{]/.test(trimmed)) {
    return { isJson: false, parsed: null };
  }

  try {
    const parsed = JSON.parse(trimmed);
    return { isJson: true, parsed };
  } catch (error) {
    return { isJson: false, parsed: null };
  }
};

const isLikelyCsv = (text: string): boolean => {
  const lines = text.trim().split(/\n/).filter(Boolean);
  if (lines.length < 2) {
    return false;
  }

  const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  const columnCount = lines[0].split(delimiter).length;

  if (columnCount < 2) {
    return false;
  }

  return lines.every((line) => line.split(delimiter).length === columnCount);
};

const isLikelyCode = (text: string): boolean => {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }

  const codeIndicators = /(function\s+|=>|const\s+|let\s+|var\s+|class\s+|<\/?[a-zA-Z][^>]*>)/;
  return codeIndicators.test(trimmed) || /[{};][\s\n]*$/.test(trimmed) || trimmed.split('\n').length > 3;
};

/**
 * Detect whether the clipboard payload resembles JSON, CSV, code, or plain text.
 */
export const detectPasteFormat = (text: string): { format: DetectedFormat; parsedJson: unknown | null } => {
  const jsonCheck = isLikelyJson(text);
  if (jsonCheck.isJson) {
    return { format: 'json', parsedJson: jsonCheck.parsed };
  }

  if (isLikelyCsv(text)) {
    return { format: 'csv', parsedJson: null };
  }

  if (isLikelyCode(text)) {
    return { format: 'code', parsedJson: null };
  }

  return { format: 'plain', parsedJson: null };
};

const formatToLabel: Record<PasteFormat, string> = {
  plain: 'Plain text',
  json: 'JSON',
  csv: 'CSV',
  code: 'Code block',
};

type RuntimeWindow = typeof globalThis & {
  scrollX?: number;
  scrollY?: number;
  getSelection?: () => Selection | null;
};

const runtime: RuntimeWindow = globalThis as RuntimeWindow;

const getSelection = (): Selection | null =>
  typeof runtime.getSelection === 'function' ? runtime.getSelection() : null;

const getScrollOffsets = () => ({
  x: typeof runtime.scrollX === 'number' ? runtime.scrollX : 0,
  y: typeof runtime.scrollY === 'number' ? runtime.scrollY : 0,
});

const hasDocument = typeof globalThis !== 'undefined' && 'document' in globalThis;

const useIsomorphicLayoutEffect: typeof useEffect = hasDocument ? useLayoutEffect : useEffect;

const transformText = (format: PasteFormat, normalizedText: string, parsedJson: unknown | null): string => {
  if (format === 'json' && parsedJson) {
    try {
      return JSON.stringify(parsedJson, null, 2);
    } catch (error) {
      return normalizedText;
    }
  }

  return normalizedText;
};

const applyToEditable = (
  pending: PendingPaste,
  format: PasteFormat,
  onPaste?: (result: PasteResult) => void,
) => {
  const { target, normalizedText, sanitizedHtml, detectedFormat, parsedJson } = pending;
  const finalText = transformText(format, normalizedText, parsedJson);

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const start = pending.selectionStart ?? target.selectionStart ?? target.value.length;
    const end = pending.selectionEnd ?? target.selectionEnd ?? target.value.length;
    target.focus();
    if (typeof target.setRangeText === 'function') {
      target.setRangeText(finalText, start, end, 'end');
    } else {
      const value = target.value;
      target.value = `${value.slice(0, start)}${finalText}${value.slice(end)}`;
    }
    const inputEvent = new Event('input', { bubbles: true });
    target.dispatchEvent(inputEvent);
  } else if ((target as HTMLElement).isContentEditable) {
    const selection = getSelection();
    const baseRange = pending.range ?? (selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null);
    if (selection && baseRange) {
      selection.removeAllRanges();
      selection.addRange(baseRange);
      if (typeof selection.deleteFromDocument === 'function') {
        selection.deleteFromDocument();
      }

      if (format === 'plain' && sanitizedHtml) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = sanitizedHtml;
        const fragment = document.createDocumentFragment();
        while (wrapper.firstChild) {
          fragment.appendChild(wrapper.firstChild);
        }
        if (selection.rangeCount > 0) {
          const current = selection.getRangeAt(0);
          current.insertNode(fragment);
        }
      } else if (selection.rangeCount > 0) {
        const current = selection.getRangeAt(0);
        current.insertNode(document.createTextNode(finalText));
      }

      if (typeof selection.collapseToEnd === 'function') {
        selection.collapseToEnd();
      }
    }
  }

  onPaste?.({
    format,
    text: finalText,
    sanitizedHtml,
    detectedFormat: detectedFormat,
  });
};

const PasteHelperOverlay: React.FC<{
  anchor: DOMRect | null;
  detected: DetectedFormat;
  onDismiss: () => void;
  onSelect: (format: PasteFormat) => void;
  title?: string;
}> = ({ anchor, detected, onDismiss, onSelect, title }) => {
  const [mounted, setMounted] = useState(false);

  useIsomorphicLayoutEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (!(event.target instanceof HTMLElement)) {
        return;
      }
      if (event.target.closest('[data-paste-helper-overlay]')) {
        return;
      }
      onDismiss();
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismiss();
      }
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onDismiss]);

  if (!mounted || !anchor) {
    return null;
  }

  const { x, y } = getScrollOffsets();
  const style: React.CSSProperties = {
    top: anchor.bottom + y + 8,
    left: anchor.left + x + anchor.width / 2,
    transform: 'translateX(-50%)',
  };

  const options: PasteFormat[] = ['plain', 'json', 'csv', 'code'];

  const content = (
    <div
      data-paste-helper-overlay
      className="fixed z-50 max-w-xs rounded-md bg-ub-grey bg-opacity-95 text-white shadow-lg border border-ubt-grey"
      style={style}
    >
      <div className="px-3 py-2 border-b border-ubt-grey text-sm font-semibold">
        {title ?? 'Paste as…'}
      </div>
      <ul className="px-2 py-2 space-y-1 text-sm">
        {options.map((option) => {
          const isDetected = option === detected;
          return (
            <li key={option}>
              <button
                type="button"
                className={`flex w-full items-center justify-between rounded px-2 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ubc-green ${
                  isDetected
                    ? 'bg-ubc-green bg-opacity-20 text-ubc-green'
                    : 'hover:bg-ubt-grey hover:bg-opacity-20'
                }`}
                onClick={() => onSelect(option)}
              >
                <span>{formatToLabel[option]}</span>
                {isDetected && <span className="text-xs uppercase tracking-wide">Detected</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return createPortal(content, document.body);
};

const PasteHelper: React.FC<PasteHelperProps> = ({ children, onPaste, title }) => {
  const [pending, setPending] = useState<PendingPaste | null>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);

  const dismiss = useCallback(() => {
    setPending(null);
    setAnchor(null);
  }, []);

  const handleSelectFormat = useCallback(
    (format: PasteFormat) => {
      if (!pending) {
        return;
      }
      applyToEditable(pending, format, onPaste);
      dismiss();
    },
    [dismiss, onPaste, pending],
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLElement>) => {
      const clipboard = event.clipboardData;
      if (!clipboard) {
        return;
      }

      const text = clipboard.getData('text/plain');
      const html = clipboard.getData('text/html');
      const normalizedText = normalizeLineEndings(text);
      const sanitizedHtml = sanitizeHtml(html);
      const detection = detectPasteFormat(normalizedText);
      const target = event.target as HTMLElement;

      const selectionStart =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
          ? target.selectionStart
          : null;
      const selectionEnd =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
          ? target.selectionEnd
          : null;

      let range: Range | undefined;
      if ((target as HTMLElement).isContentEditable) {
        const selection = getSelection();
        if (selection && selection.rangeCount > 0) {
          range = selection.getRangeAt(0).cloneRange();
        }
      }

      const pendingPaste: PendingPaste = {
        text,
        normalizedText,
        sanitizedHtml,
        detectedFormat: detection.format,
        target,
        selectionStart,
        selectionEnd,
        range,
        parsedJson: detection.parsedJson,
      };

      setPending(pendingPaste);
      setAnchor(target.getBoundingClientRect());
      event.preventDefault();
    },
    [],
  );

  const childWithHandler = useMemo(() => {
    const originalOnPaste = (children.props as { onPaste?: (event: React.ClipboardEvent<HTMLElement>) => void }).onPaste;

    return cloneElement(children, {
      onPaste: (event: React.ClipboardEvent<HTMLElement>) => {
        handlePaste(event);
        originalOnPaste?.(event);
      },
    });
  }, [children, handlePaste]);

  return (
    <>
      {childWithHandler}
      {pending && (
        <PasteHelperOverlay
          anchor={anchor}
          detected={pending.detectedFormat}
          onDismiss={dismiss}
          onSelect={handleSelectFormat}
          title={title}
        />
      )}
    </>
  );
};

export default PasteHelper;

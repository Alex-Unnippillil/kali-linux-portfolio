import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FieldRange } from './LayerView';

interface HexViewProps {
  buffer: Uint8Array;
  highlight?: FieldRange | null;
  onChange: (next: Uint8Array) => void;
  onFocusRange?: (range: FieldRange | null) => void;
  onValidation?: (message: string | null) => void;
}

const COLUMNS = 16;

const byteToHex = (value: number) => value.toString(16).padStart(2, '0').toUpperCase();

const HexView: React.FC<HexViewProps> = ({
  buffer,
  highlight,
  onChange,
  onFocusRange,
  onValidation,
}) => {
  const [draft, setDraft] = useState<string[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const instructionsId = useId();

  useEffect(() => {
    setDraft(Array.from(buffer, (byte) => byteToHex(byte)));
    inputsRef.current = inputsRef.current.slice(0, buffer.length);
  }, [buffer]);

  const isHighlighted = useMemo(() => {
    if (!highlight) return () => false;
    const start = highlight.start;
    const end = start + highlight.length;
    return (index: number) => index >= start && index < end;
  }, [highlight]);

  const focusByte = (index: number) => {
    const target = inputsRef.current[index];
    if (target) {
      target.focus();
      target.select();
    }
  };

  const handleChange = (index: number, value: string) => {
    const sanitized = value.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
    const hasInvalidChars = sanitized.length !== value.length;
    const nextDraft = [...draft];
    nextDraft[index] = sanitized;
    setDraft(nextDraft);

    if (hasInvalidChars) {
      const message = 'Only hexadecimal digits (0-9 and A-F) are allowed.';
      setLocalError(message);
      onValidation?.(message);
    } else {
      setLocalError(null);
      onValidation?.(null);
    }

    if (sanitized.length === 2) {
      const nextValue = parseInt(sanitized, 16);
      if (!Number.isNaN(nextValue)) {
        const nextBuffer = new Uint8Array(buffer);
        nextBuffer[index] = nextValue;
        onChange(nextBuffer);
      }
    }
  };

  const handleBlur = (index: number) => {
    onFocusRange?.(null);
    const normalized = byteToHex(buffer[index] ?? 0);
    setDraft((prev) => {
      const next = [...prev];
      next[index] = normalized;
      return next;
    });
    setLocalError(null);
    onValidation?.(null);
  };

  const handleFocus = (index: number) => {
    onFocusRange?.({ start: index, length: 1, label: `Byte ${index}` });
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusByte(Math.min(buffer.length - 1, index + 1));
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusByte(Math.max(0, index - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const target = index - COLUMNS;
      if (target >= 0) focusByte(target);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      const target = index + COLUMNS;
      if (target < buffer.length) focusByte(target);
    }
  };

  return (
    <div className="space-y-2" role="group" aria-labelledby={`${instructionsId}-label`}>
      <div id={`${instructionsId}-label`} className="text-[11px] font-semibold text-gray-300">
        Hex editor
      </div>
      <p id={instructionsId} className="sr-only">
        Use Tab or the arrow keys to move between bytes. Type two hexadecimal digits to edit the
        focused byte. Changes automatically update the parsed fields and recompute checksums.
      </p>
      {localError && (
        <p className="text-red-400 text-[11px]" role="alert">
          {localError}
        </p>
      )}
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))` }}
      >
        {draft.map((value, index) => {
          const highlighted = isHighlighted(index);
          return (
            <input
              key={index}
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              className={`w-12 text-center px-1 py-0.5 bg-gray-900 border border-gray-700 rounded text-xs text-green-300 font-mono focus:outline focus:outline-1 focus:outline-yellow-400 ${
                highlighted ? 'bg-yellow-900 text-yellow-100 border-yellow-500' : ''
              }`}
              value={value}
              onChange={(e) => handleChange(index, e.target.value)}
              onFocus={() => handleFocus(index)}
              onBlur={() => handleBlur(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              maxLength={2}
              inputMode="text"
              spellCheck={false}
              aria-describedby={instructionsId}
            />
          );
        })}
      </div>
    </div>
  );
};

export default HexView;

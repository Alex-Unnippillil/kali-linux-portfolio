'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface FieldHighlightsApi {
  isHighlighted: (field: string) => boolean;
  triggerHighlight: (fields: string[]) => void;
}

const DEFAULT_DURATION_MS = 2400;

export const useFieldHighlights = (durationMs: number = DEFAULT_DURATION_MS): FieldHighlightsApi & {
  highlightedFields: Set<string>;
} => {
  const [highlightedFields, setHighlightedFields] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimer = useCallback((field: string) => {
    const timer = timersRef.current.get(field);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(field);
    }
  }, []);

  const isHighlighted = useCallback(
    (field: string) => highlightedFields.has(field),
    [highlightedFields],
  );

  const triggerHighlight = useCallback(
    (fields: string[]) => {
      if (!fields.length) return;
      setHighlightedFields((previous) => {
        const next = new Set(previous);
        fields.forEach((field) => {
          if (!field) return;
          next.add(field);
          clearTimer(field);
          const timer = setTimeout(() => {
            setHighlightedFields((latest) => {
              if (!latest.has(field)) {
                return latest;
              }
              const updated = new Set(latest);
              updated.delete(field);
              return updated;
            });
            timersRef.current.delete(field);
          }, durationMs);
          timersRef.current.set(field, timer);
        });
        return next;
      });
    },
    [clearTimer, durationMs],
  );

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    },
    [],
  );

  return { highlightedFields, isHighlighted, triggerHighlight };
};

export default useFieldHighlights;

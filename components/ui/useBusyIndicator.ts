import { MutableRefObject, useCallback, useEffect, useState } from 'react';

const BUSY_COUNT_ATTRIBUTE = 'data-busy-count';

function updateRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === 'function') {
    ref(value);
  } else {
    (ref as MutableRefObject<T | null>).current = value;
  }
}

export function useBusyParent<T extends HTMLElement>(
  active: boolean,
  forwardedRef?: React.Ref<T>,
) {
  const [parent, setParent] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!parent || !active) return;

    const currentAttr = parent.getAttribute(BUSY_COUNT_ATTRIBUTE);
    const current = currentAttr ? Number.parseInt(currentAttr, 10) || 0 : 0;
    const next = current + 1;
    parent.setAttribute(BUSY_COUNT_ATTRIBUTE, String(next));
    parent.setAttribute('aria-busy', 'true');

    return () => {
      const attr = parent.getAttribute(BUSY_COUNT_ATTRIBUTE);
      const value = attr ? Number.parseInt(attr, 10) || 0 : 0;
      const updated = Math.max(value - 1, 0);
      if (updated === 0) {
        parent.removeAttribute(BUSY_COUNT_ATTRIBUTE);
        parent.removeAttribute('aria-busy');
      } else {
        parent.setAttribute(BUSY_COUNT_ATTRIBUTE, String(updated));
      }
    };
  }, [active, parent]);

  return useCallback(
    (node: T | null) => {
      setParent(node?.parentElement ?? null);
      updateRef(forwardedRef, node);
    },
    [forwardedRef],
  );
}

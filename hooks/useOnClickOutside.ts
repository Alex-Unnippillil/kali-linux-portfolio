import { RefObject, useEffect } from 'react';

export function useOnClickOutside<T extends HTMLElement>(
  ref: RefObject<T>,
  handler: (ev: MouseEvent | PointerEvent | TouchEvent) => void
) {
  useEffect(() => {
    const listener = (event: any) => {
      const el = ref.current;
      if (!el || el.contains(event.target as Node)) return;
      handler(event);
    };
    document.addEventListener('pointerdown', listener, { capture: true });
    return () => document.removeEventListener('pointerdown', listener, { capture: true } as any);
  }, [ref, handler]);
}

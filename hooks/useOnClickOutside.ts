import { useEffect } from 'react';

export default function useOnClickOutside(
  ref: React.RefObject<HTMLElement>,
  handler: (event: PointerEvent) => void
) {
  useEffect(() => {
    const listener = (event: PointerEvent) => {
      const el = ref.current;
      if (!el || el.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };

    document.addEventListener('pointerdown', listener);
    return () => {
      document.removeEventListener('pointerdown', listener);
    };
  }, [ref, handler]);
}

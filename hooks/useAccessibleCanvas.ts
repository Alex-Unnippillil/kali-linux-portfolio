import { useRef, useEffect } from 'react';

export default function useAccessibleCanvas(label: string) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', label);
  }, [label]);

  return ref;
}

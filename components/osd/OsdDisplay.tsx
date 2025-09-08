'use client';

import { useEffect, useRef, useState } from 'react';

interface OSDState {
  type: 'volume' | 'brightness';
  value: number;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

export default function OsdDisplay() {
  const [state, setState] = useState<OSDState | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const createHandler = (type: OSDState['type']) => (e: Event) => {
      const detail = (e as CustomEvent<{ value: number }>).detail;
      const value = clamp(Number(detail?.value));
      setState({ type, value });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setState(null), 1000);
    };

    const volumeHandler = createHandler('volume');
    const brightnessHandler = createHandler('brightness');
    window.addEventListener('volumechange', volumeHandler as EventListener);
    window.addEventListener('brightnesschange', brightnessHandler as EventListener);
    return () => {
      window.removeEventListener('volumechange', volumeHandler as EventListener);
      window.removeEventListener('brightnesschange', brightnessHandler as EventListener);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!state) return null;

  const label = state.type === 'volume' ? 'Volume' : 'Brightness';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-4 py-3 rounded transition-opacity duration-300 motion-reduce:transition-none"
    >
      <div className="text-sm mb-1">{label}</div>
      <div className="w-40 h-2 bg-gray-700 rounded">
        <div data-testid="progress" className="h-full bg-white" style={{ width: `${state.value}%` }} />
      </div>
    </div>
  );
}


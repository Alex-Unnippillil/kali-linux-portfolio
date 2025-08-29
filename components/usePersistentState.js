import { useState, useEffect } from 'react';

// Simple hook to persist state in localStorage
export default function usePersistentState(key, initialValue) {

  const [state, setState] = useState(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;

    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(key, JSON.stringify(state));
      } catch {
        // ignore write errors
      }
    }
  }, [key, state]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key !== key) return;
      try {
        if (e.newValue === null) {
          setState(initialValue);
        } else {
          setState(JSON.parse(e.newValue));
        }
      } catch {
        // ignore parse errors
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [key]);

  return [state, setState];
}


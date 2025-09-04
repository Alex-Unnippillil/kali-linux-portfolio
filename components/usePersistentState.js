"use client";

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

  return [state, setState];
}


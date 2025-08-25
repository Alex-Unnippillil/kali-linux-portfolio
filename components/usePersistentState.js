import { useState, useEffect } from 'react';

const usePersistentState = (key, defaultValue) => {

  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (e) {

      return defaultValue;
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        // ignore write errors
      }
    }
  }, [key, value]);

  return [value, setValue];
};

export default usePersistentState;


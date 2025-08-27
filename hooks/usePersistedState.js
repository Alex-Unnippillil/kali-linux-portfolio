import { useState, useEffect } from 'react';

export default function usePersistedState(key, initial, options = {}) {
  const { version = 1, migrate } = options;

  const getInitial = () => {
    if (typeof initial === 'function') return initial();
    return initial;
  };

  const [state, setState] = useState(() => {
    if (typeof window === 'undefined') return getInitial();
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return getInitial();
      const data = JSON.parse(raw);
      if (data.version !== version && typeof migrate === 'function') {
        return migrate(data.state, data.version);
      }
      return data.state;
    } catch {
      return getInitial();
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify({ version, state }));
    } catch {
      // ignore
    }
  }, [key, state, version]);

  return [state, setState];
}

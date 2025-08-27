import { useEffect, useState } from 'react';

// Minimal theme hook used by components in tests. In the real application
// this hook would synchronize the theme with persistent storage and media
// queries, but for the test environment we only need a placeholder that
// provides a "theme" value and updater.
export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // No-op: in production this might read from localStorage or similar
  }, []);

  return { theme, setTheme };
}


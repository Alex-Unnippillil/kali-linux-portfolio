import { useState } from 'react';

export const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  return { theme, setTheme };
};


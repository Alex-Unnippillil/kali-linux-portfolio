import { useSettings } from './useSettings';

// Simple hook that exposes only the theme portion of settings.
// This mirrors the older useTheme hook expected by some apps.
export const useTheme = () => {
  const { theme, setTheme } = useSettings();
  return { theme, setTheme };
};

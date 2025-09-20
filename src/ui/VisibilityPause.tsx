import { useEffect } from 'react';

const setPausedState = (paused: boolean) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (!root) return;
  root.setAttribute('data-paused', paused ? 'true' : 'false');
};

const VisibilityPause = (): null => {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const handleChange = () => {
      setPausedState(document.visibilityState === 'hidden');
    };

    handleChange();
    document.addEventListener('visibilitychange', handleChange);

    return () => {
      document.removeEventListener('visibilitychange', handleChange);
      setPausedState(false);
    };
  }, []);

  return null;
};

export default VisibilityPause;

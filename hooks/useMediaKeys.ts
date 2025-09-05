import { createContext, useContext, useEffect, useRef, useState } from 'react';
import usePersistentState from './usePersistentState';

interface MediaKeysContextValue {
  volume: number;
  setVolume: (v: number) => void;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  visible: boolean;
}

const MediaKeysContext = createContext<MediaKeysContextValue | null>(null);

export const MediaKeysProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [volume, setVolumeState] = usePersistentState('media-volume', 50, (v: any) => typeof v === 'number' && v >= 0 && v <= 100);
  const [enabled, setEnabled] = usePersistentState('media-keys-enabled', false, (v: any) => typeof v === 'boolean');
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setVolume = (v: number) => {
    const value = Math.max(0, Math.min(100, v));
    setVolumeState(value);
    setVisible(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(false), 1000);
  };

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'XF86AudioRaiseVolume') {
        e.preventDefault();
        setVolume(volume + 5);
      } else if (e.key === 'XF86AudioLowerVolume') {
        e.preventDefault();
        setVolume(volume - 5);
      } else if (e.key === 'XF86AudioMute') {
        e.preventDefault();
        setVolume(0);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, volume]);

  return (
    <MediaKeysContext.Provider value={{ volume, setVolume, enabled, setEnabled, visible }}>
      {children}
    </MediaKeysContext.Provider>
  );
};

export const useMediaKeys = () => {
  const ctx = useContext(MediaKeysContext);
  if (!ctx) throw new Error('useMediaKeys must be used within MediaKeysProvider');
  return ctx;
};

export default useMediaKeys;

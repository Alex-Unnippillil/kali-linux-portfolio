'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import useNotifications from '../../hooks/useNotifications';

interface PresentationModeValue {
  enabled: boolean;
  enable: () => void;
  disable: () => void;
  toggle: () => void;
}

const PresentationModeContext = createContext<PresentationModeValue | null>(null);

export const PresentationModeProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { setMuted } = useNotifications();
  const [enabled, setEnabled] = useState(false);
  const [pointerVisible, setPointerVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setMuted(enabled);
  }, [enabled, setMuted]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!enabled) {
      document.body.classList.remove('presentation-mode');
      return;
    }
    document.body.classList.add('presentation-mode');
    const handleMove = (event: PointerEvent) => {
      setPosition({ x: event.clientX, y: event.clientY });
      setPointerVisible(true);
    };
    const handleLeave = () => setPointerVisible(false);
    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerdown', handleMove);
    document.addEventListener('pointerleave', handleLeave);
    return () => {
      document.body.classList.remove('presentation-mode');
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerdown', handleMove);
      document.removeEventListener('pointerleave', handleLeave);
    };
  }, [enabled]);

  const enable = useCallback(() => setEnabled(true), []);
  const disable = useCallback(() => setEnabled(false), []);
  const toggle = useCallback(() => setEnabled(value => !value), []);

  const value = useMemo<PresentationModeValue>(
    () => ({ enabled, enable, disable, toggle }),
    [enabled, enable, disable, toggle],
  );

  return (
    <PresentationModeContext.Provider value={value}>
      {children}
      {enabled && pointerVisible && (
        <div
          className="presentation-pointer"
          style={{ left: `${position.x}px`, top: `${position.y}px` }}
          aria-hidden="true"
        />
      )}
    </PresentationModeContext.Provider>
  );
};

export const usePresentationMode = (): PresentationModeValue => {
  const ctx = useContext(PresentationModeContext);
  if (!ctx) {
    throw new Error('usePresentationMode must be used within PresentationModeProvider');
  }
  return ctx;
};

export default PresentationModeContext;

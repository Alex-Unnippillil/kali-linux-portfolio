"use client";

import { RefObject, useEffect, useId, useRef } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import useFocusTrap from '../../hooks/useFocusTrap';

interface Props {
  open: boolean;
  onClose: () => void;
  anchorRef?: RefObject<HTMLElement>;
}

const QuickSettings = ({ open, onClose, anchorRef }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);

  const containerRef = useRef<HTMLDivElement>(null);
  const themeButtonRef = useRef<HTMLButtonElement>(null);
  const idBase = useId();
  const headingId = `${idBase}-heading`;
  const soundId = `${idBase}-sound`;
  const networkId = `${idBase}-network`;
  const motionId = `${idBase}-motion`;

  useFocusTrap({
    active: open,
    containerRef,
    initialFocusRef: themeButtonRef,
    onEscape: onClose,
    returnFocusRef: anchorRef,
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [open, onClose, anchorRef]);

  return (
    <div
      id="quick-settings-dialog"
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      aria-hidden={!open}
      tabIndex={-1}
      className={`absolute bg-ub-cool-grey rounded-md py-4 top-9 right-3 shadow border-black border border-opacity-20 focus:outline-none ${
        open ? '' : 'hidden'
      }`}
    >
      <h2 id={headingId} className="sr-only">
        Quick settings
      </h2>
      <div className="px-4 pb-2">
        <button
          ref={themeButtonRef}
          type="button"
          className="w-full flex items-center justify-between gap-4 px-2 py-1 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubb-orange"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          <span>Theme</span>
          <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
      <label
        htmlFor={soundId}
        className="px-4 pb-2 flex items-center justify-between gap-4 text-left"
      >
        <span>Sound</span>
        <input
          id={soundId}
          type="checkbox"
          checked={sound}
          onChange={() => setSound(!sound)}
        />
      </label>
      <label
        htmlFor={networkId}
        className="px-4 pb-2 flex items-center justify-between gap-4 text-left"
      >
        <span>Network</span>
        <input
          id={networkId}
          type="checkbox"
          checked={online}
          onChange={() => setOnline(!online)}
        />
      </label>
      <label
        htmlFor={motionId}
        className="px-4 flex items-center justify-between gap-4 text-left"
      >
        <span>Reduced motion</span>
        <input
          id={motionId}
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
        />
      </label>
    </div>
  );
};

export default QuickSettings;

import React, { useEffect, useRef, useState } from 'react';
import Toast from '../ui/Toast';
import usePersistentState from '../../hooks/usePersistentState';

const EVENT_NAME = 'micmutechange';

const MicOnIcon = () => (
  <svg
    className="inline status-symbol w-4 h-4"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
    <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
  </svg>
);

const MicOffIcon = () => (
  <svg
    className="inline status-symbol w-4 h-4"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
    <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
    <path
      d="M5 5l14 14"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

export default function Microphone() {
  const [muted, setMuted] = usePersistentState('settings:micMuted', false);
  const [toast, setToast] = useState('');
  const first = useRef(true);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ muted: boolean }>).detail;
      if (detail && typeof detail.muted === 'boolean') {
        setMuted(detail.muted);
      }
    };
    window.addEventListener(EVENT_NAME, handler as EventListener);
    return () => window.removeEventListener(EVENT_NAME, handler as EventListener);
  }, [setMuted]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setToast(muted ? 'Microphone Muted' : 'Microphone On');
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { muted } }));
  }, [muted]);

  const toggle = () => setMuted(m => !m);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <>
      <span
        className="mx-1.5"
        onMouseDown={handleMouseDown}
        title={muted ? 'Microphone muted' : 'Microphone on'}
      >
        {muted ? <MicOffIcon /> : <MicOnIcon />}
      </span>
      {toast && (
        <Toast
          message={toast}
          onClose={() => setToast('')}
          duration={2000}
        />
      )}
    </>
  );
}


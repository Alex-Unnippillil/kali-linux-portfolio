'use client';

import { useEffect, useState } from 'react';

/**
 * Displays keyboard hints for the terminal and announces copy events
 * for screen reader users via an ARIA live region.
 */
export default function Hints() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handleCopy = () => {
      setMessage('Copied to clipboard');
      clearTimeout(timer);
      timer = setTimeout(() => setMessage(''), 2000);
    };

    window.addEventListener('copy', handleCopy);
    return () => {
      window.removeEventListener('copy', handleCopy);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="p-2 text-xs text-gray-400">
      <p>
        Press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd> to copy,{' '}
        <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd> to paste.
      </p>
      <div aria-live="polite" className="sr-only">
        {message}
      </div>
    </div>
  );
}


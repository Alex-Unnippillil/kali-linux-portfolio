'use client';
import { useEffect } from 'react';

export default function StickyNotes() {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/apps/sticky_notes/styles.css';
    document.head.appendChild(link);

    if (typeof window !== 'undefined') {
      import('./main');
    }
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <div>
      <button id="add-note">Add Note</button>
      <div id="notes" />
    </div>
  );
}


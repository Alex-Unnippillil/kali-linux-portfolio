'use client';
import { useEffect } from 'react';

export default function StickyNotes() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('./main');
    }
  }, []);

  return (
    <div>
      <button id="add-note" type="button" className="focus-visible-ring">
        Add Note
      </button>
      <div id="notes" />
    </div>
  );
}


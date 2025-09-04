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
      <div className="toolbar">
        <button id="add-note">Add Note</button>
        <input
          id="search-notes"
          type="text"
          placeholder="Search..."
        />
      </div>
      <div id="notes" />
    </div>
  );
}


'use client';
import { useEffect } from 'react';

import './styles.css';

export default function StickyNotes() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('./main');
    }
  }, []);

  return (
    <div className="sticky-notes-app">
      <button id="add-note">Add Note</button>
      <div id="notes" />
    </div>
  );
}


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
    <div>
      <button id="add-note">Add Note</button>
      <button id="export-notes">Export Notes</button>
      <button id="import-notes-btn">Import Notes</button>
      <input type="file" id="import-notes" accept="application/json" style={{ display: 'none' }} />
      <div id="notes" />
    </div>
  );
}


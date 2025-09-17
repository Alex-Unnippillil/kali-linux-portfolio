'use client';
import { useEffect } from 'react';

export default function StickyNotes() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('./main');
    }
  }, []);

  return (
    <div className="sticky-notes-app" role="application" aria-label="Sticky notes">
      <div
        className="sticky-notes-toolbar"
        role="toolbar"
        aria-label="Sticky notes actions"
      >
        <button id="add-note" type="button">
          Add Note
        </button>
        <button id="export-notes" type="button">
          Export JSON
        </button>
        <button id="import-notes" type="button">
          Import JSON
        </button>
        <button id="undo-merge" type="button" disabled>
          Undo Merge
        </button>
        <input
          id="import-notes-input"
          type="file"
          accept="application/json"
          hidden
        />
      </div>
      <div id="notes-status" className="sticky-notes-status" role="status" aria-live="polite" />
      <div id="notes" />
      <div id="merge-root" aria-hidden="true" />
    </div>
  );
}


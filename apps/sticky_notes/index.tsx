'use client';
import { useEffect, useRef } from 'react';
import './styles.css';

export default function StickyNotes() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    import('./main').then(({ mountStickyNotes }) => {
      if (!cancelled && root.current) cleanup = mountStickyNotes(root.current);
    }).catch(() => {
      if (!cancelled) {
        const status = root.current?.querySelector('#notes-status');
        if (status) status.textContent = 'Unable to load notes. Close and reopen this app to retry.';
      }
    });
    return () => { cancelled = true; cleanup?.(); };
  }, []);
  return <div ref={root} className="sticky-notes-app">
    <div className="notes-toolbar">
      <button id="add-note" type="button">Add Note</button>
      <button id="undo-note" type="button" hidden>Undo delete</button>
      <p id="notes-status" role="status">Loading saved notes…</p>
    </div>
    <div id="notes" />
  </div>;
}

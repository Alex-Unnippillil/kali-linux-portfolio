'use client';
import { isBrowser } from '@/utils/env';
import { useEffect } from 'react';

export default function StickyNotes() {
  useEffect(() => {
    if (isBrowser()) {
      import('./main');
    }
  }, []);

  return (
    <div>
      <button id="add-note">Add Note</button>
      <div id="notes" />
    </div>
  );
}


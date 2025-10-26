'use client';

import dynamic from 'next/dynamic';

const NotesApp = dynamic(() => import('../../../apps/notes'), {
  ssr: false,
});

export default NotesApp;

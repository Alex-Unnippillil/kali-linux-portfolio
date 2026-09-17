import React from 'react';

const paths = {
  menu: 'M4 6h16M4 12h16M4 18h16',
  search: 'm21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  home: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
  playlist: 'M4 5h16M4 10h16M4 15h8M4 20h8m4-6 6 4-6 4z',
  clock: 'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  refresh: 'M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 2M18 18A8 8 0 0 1 5 16',
  back: 'm14 5-7 7 7 7M7 12h14',
  next: 'm9 5 7 7-7 7',
  previous: 'm15 5-7 7 7 7',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  external: 'M14 3h7v7m0-7L10 14M10 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6',
  share: 'M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7',
  theatre: 'M3 5h18v14H3zM7 9h10v6H7z',
  play: 'm9 5 11 7-11 7z',
};

export default function VideoIcon({ name }: { name: keyof typeof paths }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name]} /></svg>;
}

import dynamic from 'next/dynamic';

const StickyNotes = dynamic(() => import('../../apps/sticky_notes'), { ssr: false });

export default function StickyNotesPage() {
  return <StickyNotes />;
}


import dynamic from '@/utils/dynamic';

const StickyNotes = dynamic(() => import('../../apps/sticky_notes'));

export default function StickyNotesPage() {
  return <StickyNotes />;
}


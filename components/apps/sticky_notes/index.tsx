import dynamic from 'next/dynamic';
import StickyNotesSkeleton from './StickyNotesSkeleton';

const StickyNotes = dynamic(() => import('../../../apps/sticky_notes'), {
  ssr: false,
  loading: () => <StickyNotesSkeleton />,
});

export default StickyNotes;

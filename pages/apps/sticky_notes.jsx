import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const StickyNotes = dynamic(() => import('../../apps/sticky_notes'), {
  ssr: false,
  loading: () => getAppSkeleton('sticky_notes', 'Sticky Notes'),
});

export default function StickyNotesPage() {
  return <StickyNotes />;
}

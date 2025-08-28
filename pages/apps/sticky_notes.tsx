import dynamic from 'next/dynamic';
import AppLoader from '../../components/AppLoader';

const StickyNotes = dynamic(() => import('../../apps/sticky_notes'), {
  ssr: false,
  loading: () => <AppLoader />,
});

export default function StickyNotesPage() {
  return <StickyNotes />;
}


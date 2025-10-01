import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const StickyNotes = dynamic(() => import('../../apps/sticky_notes'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

function StickyNotesPage() {
  return <StickyNotes />;
}

export default withDeepLinkBoundary('sticky_notes', StickyNotesPage);

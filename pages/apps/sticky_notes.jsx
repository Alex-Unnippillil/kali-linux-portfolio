import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/sticky_notes');

const StickyNotes = dynamic(() => import('../../apps/sticky_notes'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function StickyNotesPage() {
  return <StickyNotes />;
}


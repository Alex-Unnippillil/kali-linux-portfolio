import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../app-skeletons';

const StickyNotes = dynamic(() => import('../../../apps/sticky_notes'), {
  ssr: false,
  loading: () => getAppSkeleton('sticky_notes', 'Sticky Notes'),
});

export default StickyNotes;

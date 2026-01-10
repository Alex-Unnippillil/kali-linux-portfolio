import dynamic from 'next/dynamic';
import { createLiveRegionLoader } from '../createLiveRegionLoader';

const StickyNotes = dynamic(() => import('../../../apps/sticky_notes'), {
  ssr: false,
  loading: createLiveRegionLoader('Loading Sticky Notes...', {
    className: 'flex min-h-[4rem] w-full items-center justify-center rounded bg-ub-cool-grey px-4 py-3 text-center',
  }),
});

export default StickyNotes;

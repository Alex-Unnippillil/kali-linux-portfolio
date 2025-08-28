import dynamic from 'next/dynamic';

const StickyNotes = dynamic(() => import('../../../apps/sticky_notes'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default StickyNotes;

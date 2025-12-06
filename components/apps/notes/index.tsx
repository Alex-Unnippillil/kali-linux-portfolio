import dynamic from 'next/dynamic';

const NotesApp = dynamic(() => import('../../../apps/notes'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-ub-cool-grey text-white">
      Loading Notes...
    </div>
  ),
});

export default NotesApp;


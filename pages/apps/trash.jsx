import dynamic from 'next/dynamic';

const TrashApp = dynamic(() => import('../../apps/trash'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-ub-cool-grey text-white">
      Loading trash workspace…
    </div>
  ),
});

export default TrashApp;

import dynamic from 'next/dynamic';

const Terminal = dynamic(() => import('../../apps/terminal'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
      Loading Terminal...
    </div>
  ),
});

export default Terminal;

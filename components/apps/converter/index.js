import dynamic from 'next/dynamic';

const Converter = dynamic(() => import('../../../apps/converter'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
      Loading Converter...
    </div>
  ),
});

export default Converter;


import dynamic from 'next/dynamic';

const SpfFlattener = dynamic(() => import('../../apps/spf-flattener'), {
  ssr: false,
});

export default function SpfFlattenerPage() {
  return <SpfFlattener />;
}

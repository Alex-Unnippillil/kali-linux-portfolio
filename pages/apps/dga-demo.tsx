import dynamic from 'next/dynamic';

const DgaDemoApp = dynamic(() => import('../../apps/dga-demo'), {
  ssr: false,
});

export default function DgaDemoPage() {
  return <DgaDemoApp />;
}


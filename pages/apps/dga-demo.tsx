import dynamic from 'next/dynamic';

const DgaDemoApp = dynamic(() => import('../../components/apps/dga-demo'), {
  ssr: false,
});

export default function DgaDemoPage() {
  return <DgaDemoApp />;
}


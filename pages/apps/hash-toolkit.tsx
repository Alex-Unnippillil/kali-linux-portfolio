import dynamic from 'next/dynamic';

const HashToolkit = dynamic(() => import('../../apps/hash-toolkit'), {
  ssr: false,
});

export default function HashToolkitPage() {
  return <HashToolkit />;
}


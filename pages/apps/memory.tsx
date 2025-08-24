import dynamic from 'next/dynamic';

const Memory = dynamic(() => import('../../apps/memory'), { ssr: false });

export default function MemoryPage() {
  return <Memory />;
}


import dynamic from 'next/dynamic';

const FaviconHash = dynamic(() => import('../../apps/favicon-hash'), { ssr: false });

export default function FaviconHashPage() {
  return <FaviconHash />;
}


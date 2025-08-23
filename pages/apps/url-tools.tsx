import dynamic from 'next/dynamic';

const UrlTools = dynamic(() => import('../../apps/url-tools'), { ssr: false });

export default function UrlToolsPage() {
  return <UrlTools />;
}


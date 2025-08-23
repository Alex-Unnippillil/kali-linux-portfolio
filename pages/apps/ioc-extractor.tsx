import dynamic from 'next/dynamic';

const IocExtractor = dynamic(() => import('../../apps/ioc-extractor'), { ssr: false });

export default function IocExtractorPage() {
  return <IocExtractor />;
}


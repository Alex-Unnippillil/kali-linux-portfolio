import dynamic from 'next/dynamic';

const HeaderAnalyzer = dynamic(() => import('../../apps/header-analyzer'), {
  ssr: false,
});

export default function HeaderAnalyzerPage() {
  return <HeaderAnalyzer />;
}

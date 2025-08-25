import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const HeaderAnalyzer = dynamic(() => import('../../apps/header-analyzer'), {
  ssr: false,
});

export default function HeaderAnalyzerPage() {
  return (
    <UbuntuWindow title="header analyzer">
      <HeaderAnalyzer />
    </UbuntuWindow>
  );
}

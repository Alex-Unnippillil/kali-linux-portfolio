import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const IocExtractor = dynamic(() => import('../../apps/ioc-extractor'), {
  ssr: false,
});

export default function IocExtractorPage() {
  return (
    <UbuntuWindow title="ioc extractor">
      <IocExtractor />
    </UbuntuWindow>
  );
}

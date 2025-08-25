import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const UrlTools = dynamic(() => import('../../apps/url-tools'), { ssr: false });

export default function UrlToolsPage() {
  return (
    <UbuntuWindow title="url tools">
      <UrlTools />
    </UbuntuWindow>
  );
}

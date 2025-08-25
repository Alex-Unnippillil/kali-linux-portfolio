import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const FaviconHash = dynamic(() => import('../../apps/favicon-hash'), {
  ssr: false,
});

export default function FaviconHashPage() {
  return (
    <UbuntuWindow title="favicon hash">
      <FaviconHash />
    </UbuntuWindow>
  );
}

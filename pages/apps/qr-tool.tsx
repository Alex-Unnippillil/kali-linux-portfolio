import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const QrTool = dynamic(() => import('../../apps/qr-tool'), { ssr: false });

export default function QrToolPage() {
  return (
    <UbuntuWindow title="qr tool">
      <QrTool />
    </UbuntuWindow>
  );
}
